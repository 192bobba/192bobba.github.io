//go:build !js

package mc

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"time"
)

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
		s, perr := SeriesFromYahoo(body, ticker, status, years)
		if perr == nil {
			return s, nil
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
