package mc

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"
)

// MinPrices est le nombre minimal de cours nécessaires.
const MinPrices = 30

// Series est un historique de cours journaliers.
type Series struct {
	Symbol    string
	Name      string
	Currency  string
	Source    string // « Yahoo Finance » ou « Fichier CSV : x.csv »
	Dates     []time.Time
	Adj       []float64 // cours ajustés (dividendes, splits), servent aux rendements
	LastPrice float64   // dernier cours réel : point de départ de la simulation
	LastDate  time.Time
}

// UserError est une erreur à montrer telle quelle à l'utilisateur.
type UserError struct{ Msg string }

func (e *UserError) Error() string { return e.Msg }

func userErr(format string, a ...interface{}) error {
	return &UserError{Msg: fmt.Sprintf(format, a...)}
}

// CSVHint est la suggestion ajoutée quand Yahoo ne répond pas.
const CSVHint = "Si Yahoo Finance ne répond pas, utilisez le bouton « Ouvrir un CSV... » " +
	"avec un fichier d'historique de cours (colonnes Date et Adj Close ou Close)."

// UserAgent imite un navigateur : Yahoo refuse souvent les clients inconnus.
const UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
	"(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

// NormalizeTicker nettoie la saisie du ticker.
func NormalizeTicker(t string) string {
	return strings.ToUpper(strings.Join(strings.Fields(t), ""))
}

// YahooURL construit l'adresse de l'API chart de Yahoo Finance.
func YahooURL(host, ticker string, years int, now time.Time) string {
	p2 := now.Unix()
	p1 := now.AddDate(-years, 0, -3).Unix()
	return fmt.Sprintf("https://%s/v8/finance/chart/%s?period1=%d&period2=%d&interval=1d&includeAdjustedClose=true",
		host, url.PathEscape(ticker), p1, p2)
}

var errNotFound = errors.New("not found")

// FetchYahoo télécharge l'historique journalier d'un ticker (query1 puis
// query2 en secours).
func FetchYahoo(ctx context.Context, ticker string, years int) (*Series, error) {
	ticker = NormalizeTicker(ticker)
	if ticker == "" {
		return nil, userErr("Saisissez un ticker Yahoo Finance (ex. AMD, AAPL, NESN.SW, UBSG.SW).")
	}
	client := &http.Client{Timeout: 25 * time.Second}
	now := time.Now()
	var lastErr error
	for _, host := range []string{"query1.finance.yahoo.com", "query2.finance.yahoo.com"} {
		body, status, err := yahooGet(ctx, client, YahooURL(host, ticker, years, now))
		if err != nil {
			lastErr = err
			if ctx.Err() != nil {
				break
			}
			continue
		}
		s, perr := ParseYahooJSON(body, ticker, status)
		if perr == nil {
			s = TrimYears(s, years)
			if len(s.Adj) < MinPrices {
				return nil, notEnough(len(s.Adj))
			}
			return s, nil
		}
		if errors.Is(perr, errNotFound) {
			return nil, userErr("Ticker « %s » inconnu sur Yahoo Finance.\n\n"+
				"Vérifiez l'orthographe et le suffixe de la bourse "+
				"(ex. AMD, AAPL, NESN.SW pour Zurich, MC.PA pour Paris).\n\n"+
				"Vous pouvez aussi charger un historique de cours avec « Ouvrir un CSV... ».", ticker)
		}
		var ue *UserError
		if errors.As(perr, &ue) {
			return nil, perr
		}
		lastErr = perr
	}
	var ne net.Error
	var oe *net.OpError
	var dnsErr *net.DNSError
	if errors.As(lastErr, &dnsErr) || errors.As(lastErr, &oe) || (errors.As(lastErr, &ne) && ne.Timeout()) {
		return nil, userErr("Impossible de joindre Yahoo Finance : pas de connexion Internet, "+
			"ou le site ne répond pas.\n\nDétail : %v\n\n%s", shortErr(lastErr), CSVHint)
	}
	return nil, userErr("Yahoo Finance ne répond pas correctement.\n\nDétail : %v\n\n%s",
		shortErr(lastErr), CSVHint)
}

func shortErr(err error) string {
	if err == nil {
		return "erreur inconnue"
	}
	var ue *url.Error
	if errors.As(err, &ue) {
		err = ue.Err
	}
	s := err.Error()
	if len(s) > 220 {
		s = s[:220] + "..."
	}
	return s
}

func yahooGet(ctx context.Context, client *http.Client, u string) ([]byte, int, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", u, nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("User-Agent", UserAgent)
	req.Header.Set("Accept", "application/json,text/plain,*/*")
	req.Header.Set("Accept-Language", "fr-FR,fr;q=0.9,en;q=0.8")
	resp, err := client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 50<<20))
	if err != nil {
		return nil, resp.StatusCode, err
	}
	if resp.StatusCode != 200 && resp.StatusCode != 404 {
		return nil, resp.StatusCode, fmt.Errorf("code HTTP %d (%s)", resp.StatusCode, http.StatusText(resp.StatusCode))
	}
	return body, resp.StatusCode, nil
}

type yahooChart struct {
	Chart struct {
		Result []struct {
			Meta struct {
				Currency           string  `json:"currency"`
				Symbol             string  `json:"symbol"`
				LongName           string  `json:"longName"`
				ShortName          string  `json:"shortName"`
				ExchangeName       string  `json:"fullExchangeName"`
				RegularMarketPrice float64 `json:"regularMarketPrice"`
				RegularMarketTime  int64   `json:"regularMarketTime"`
			} `json:"meta"`
			Timestamp  []int64 `json:"timestamp"`
			Indicators struct {
				Quote []struct {
					Close []*float64 `json:"close"`
				} `json:"quote"`
				AdjClose []struct {
					AdjClose []*float64 `json:"adjclose"`
				} `json:"adjclose"`
			} `json:"indicators"`
		} `json:"result"`
		Error *struct {
			Code        string `json:"code"`
			Description string `json:"description"`
		} `json:"error"`
	} `json:"chart"`
}

// ParseYahooJSON décode la réponse de l'API chart de Yahoo Finance.
func ParseYahooJSON(body []byte, ticker string, status int) (*Series, error) {
	var yc yahooChart
	if err := json.Unmarshal(body, &yc); err != nil {
		if status == 404 {
			return nil, errNotFound
		}
		return nil, fmt.Errorf("réponse illisible (%v)", err)
	}
	if e := yc.Chart.Error; e != nil {
		if strings.EqualFold(e.Code, "Not Found") || status == 404 {
			return nil, errNotFound
		}
		return nil, fmt.Errorf("%s : %s", e.Code, e.Description)
	}
	if status == 404 || len(yc.Chart.Result) == 0 {
		return nil, errNotFound
	}
	r := yc.Chart.Result[0]
	var closes, adj []*float64
	if len(r.Indicators.Quote) > 0 {
		closes = r.Indicators.Quote[0].Close
	}
	if len(r.Indicators.AdjClose) > 0 {
		adj = r.Indicators.AdjClose[0].AdjClose
	}
	if len(adj) == 0 {
		adj = closes
	}
	s := &Series{
		Symbol:   r.Meta.Symbol,
		Currency: r.Meta.Currency,
		Source:   "Yahoo Finance",
	}
	if s.Symbol == "" {
		s.Symbol = ticker
	}
	s.Name = strings.TrimSpace(r.Meta.LongName)
	if s.Name == "" {
		s.Name = strings.TrimSpace(r.Meta.ShortName)
	}
	if s.Name == "" {
		s.Name = s.Symbol
	}
	var lastClose float64
	var lastCloseDate time.Time
	for i, ts := range r.Timestamp {
		if i >= len(adj) || adj[i] == nil || *adj[i] <= 0 {
			continue
		}
		d := time.Unix(ts, 0).UTC()
		s.Dates = append(s.Dates, d)
		s.Adj = append(s.Adj, *adj[i])
		if i < len(closes) && closes[i] != nil && *closes[i] > 0 {
			lastClose, lastCloseDate = *closes[i], d
		}
	}
	if len(s.Adj) == 0 {
		return nil, userErr("Yahoo Finance ne fournit aucun cours journalier pour « %s ».\n\n%s", s.Symbol, CSVHint)
	}
	switch {
	case r.Meta.RegularMarketPrice > 0:
		s.LastPrice = r.Meta.RegularMarketPrice
		s.LastDate = time.Unix(r.Meta.RegularMarketTime, 0).UTC()
		if r.Meta.RegularMarketTime == 0 {
			s.LastDate = s.Dates[len(s.Dates)-1]
		}
	case lastClose > 0:
		s.LastPrice, s.LastDate = lastClose, lastCloseDate
	default:
		s.LastPrice, s.LastDate = s.Adj[len(s.Adj)-1], s.Dates[len(s.Dates)-1]
	}
	sortSeries(s)
	return s, nil
}

func notEnough(n int) error {
	return userErr("Pas assez de données : %d cours journaliers trouvés, il en faut au moins %d.\n\n"+
		"Augmentez le nombre d'années d'historique ou choisissez un autre titre.", n, MinPrices)
}

// sortSeries remet les cours dans l'ordre chronologique et supprime les
// doublons de date (on garde la dernière occurrence).
func sortSeries(s *Series) {
	idx := make([]int, len(s.Dates))
	for i := range idx {
		idx[i] = i
	}
	sort.SliceStable(idx, func(a, b int) bool { return s.Dates[idx[a]].Before(s.Dates[idx[b]]) })
	dates := make([]time.Time, 0, len(idx))
	adj := make([]float64, 0, len(idx))
	for _, i := range idx {
		d := s.Dates[i]
		if n := len(dates); n > 0 && sameDay(dates[n-1], d) {
			adj[n-1] = s.Adj[i]
			continue
		}
		dates = append(dates, d)
		adj = append(adj, s.Adj[i])
	}
	s.Dates, s.Adj = dates, adj
}

func sameDay(a, b time.Time) bool {
	ay, am, ad := a.Date()
	by, bm, bd := b.Date()
	return ay == by && am == bm && ad == bd
}

// TrimYears ne garde que les « years » dernières années de l'historique.
func TrimYears(s *Series, years int) *Series {
	if years <= 0 || len(s.Dates) == 0 {
		return s
	}
	cut := s.Dates[len(s.Dates)-1].AddDate(-years, 0, 0)
	i := sort.Search(len(s.Dates), func(i int) bool { return !s.Dates[i].Before(cut) })
	if i == 0 {
		return s
	}
	c := *s
	c.Dates = s.Dates[i:]
	c.Adj = s.Adj[i:]
	return &c
}
