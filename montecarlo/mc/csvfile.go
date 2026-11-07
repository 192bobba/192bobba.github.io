package mc

import (
	"bytes"
	"encoding/csv"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode"
)

func csvErr(file, reason string) error {
	return userErr("Fichier CSV invalide : « %s »\n\n%s\n\nLe fichier doit contenir une colonne « Date » "+
		"et une colonne « Adj Close » (ou à défaut « Close »), séparées par des virgules ou des points-virgules.",
		file, reason)
}

// normHeader simplifie un nom de colonne : minuscules, sans accents, sans
// ponctuation superflue.
func normHeader(h string) string {
	h = strings.ToLower(strings.TrimSpace(strings.Trim(h, "\"'\ufeff ")))
	repl := strings.NewReplacer("é", "e", "è", "e", "ê", "e", "à", "a", "â", "a", "ô", "o",
		"û", "u", "ù", "u", "ç", "c", "î", "i", "ï", "i", "*", "", "_", " ", ".", " ", "-", " ")
	h = repl.Replace(h)
	return strings.Join(strings.Fields(h), " ")
}

var (
	dateNames = []string{"date", "data", "datum", "fecha", "jour", "time", "timestamp", "date time", "datetime"}
	adjNames  = []string{"adj close", "adjclose", "adjusted close", "adj close price", "adjusted",
		"close ajuste", "cours ajuste", "cloture ajustee", "cloture ajuste", "adj kurs"}
	closeNames = []string{"close", "close last", "close/last", "cloture", "clot", "dernier", "dernier cours",
		"price", "prix", "cours", "last", "zamkniecie", "schluss", "schlusskurs", "chiusura"}
)

func findCol(headers []string, names []string) int {
	for _, n := range names {
		for i, h := range headers {
			if h == n {
				return i
			}
		}
	}
	return -1
}

// ParseCSV lit un historique de cours depuis un fichier CSV.
// years > 0 limite l'historique aux dernières années.
func ParseCSV(data []byte, path string, years int) (*Series, error) {
	file := filepath.Base(path)
	data = bytes.TrimPrefix(data, []byte("\xef\xbb\xbf"))
	text := strings.ReplaceAll(strings.ReplaceAll(string(data), "\r\n", "\n"), "\r", "\n")
	lines := strings.Split(text, "\n")
	// Ligne d'en-tête : première ligne non vide.
	start := 0
	for start < len(lines) && strings.TrimSpace(lines[start]) == "" {
		start++
	}
	if start >= len(lines) {
		return nil, csvErr(file, "Le fichier est vide.")
	}
	header := lines[start]
	sep := ','
	switch {
	case strings.Count(header, ";") > 0:
		sep = ';'
	case strings.Count(header, "\t") > 0:
		sep = '\t'
	}
	r := csv.NewReader(strings.NewReader(strings.Join(lines[start:], "\n")))
	r.Comma = sep
	r.LazyQuotes = true
	r.FieldsPerRecord = -1
	r.TrimLeadingSpace = true
	recs, err := r.ReadAll()
	if err != nil {
		return nil, csvErr(file, "Lecture impossible : "+err.Error())
	}
	if len(recs) < 2 {
		return nil, csvErr(file, "Aucune ligne de données après l'en-tête.")
	}
	heads := make([]string, len(recs[0]))
	for i, h := range recs[0] {
		heads[i] = normHeader(h)
	}
	di := findCol(heads, dateNames)
	if di < 0 {
		return nil, csvErr(file, "Colonne « Date » introuvable dans l'en-tête : "+strings.Join(recs[0], " | "))
	}
	ai := findCol(heads, adjNames)
	ci := findCol(heads, closeNames)
	pi := ai
	if pi < 0 {
		pi = ci
	}
	if pi < 0 {
		return nil, csvErr(file, "Colonne « Adj Close » ou « Close » introuvable dans l'en-tête : "+strings.Join(recs[0], " | "))
	}
	rows := recs[1:]
	dateStrs := make([]string, 0, len(rows))
	for _, rec := range rows {
		if di < len(rec) {
			dateStrs = append(dateStrs, rec[di])
		} else {
			dateStrs = append(dateStrs, "")
		}
	}
	dates, okDates := parseDates(dateStrs)
	s := &Series{Source: "Fichier CSV : " + file}
	base := strings.TrimSuffix(file, filepath.Ext(file))
	s.Symbol, s.Name = base, base
	type pt struct {
		d          time.Time
		adj, close float64
	}
	var pts []pt
	for k, rec := range rows {
		if !okDates[k] || pi >= len(rec) {
			continue
		}
		v, ok := parsePrice(rec[pi])
		if !ok {
			continue
		}
		c := 0.0
		if ci >= 0 && ci < len(rec) {
			c, _ = parsePrice(rec[ci])
		}
		pts = append(pts, pt{dates[k], v, c})
	}
	if len(pts) == 0 {
		return nil, csvErr(file, "Aucune ligne avec une date et un cours valides.")
	}
	for _, p := range pts {
		s.Dates = append(s.Dates, p.d)
		s.Adj = append(s.Adj, p.adj)
	}
	// Dernier cours réel : colonne Close de la date la plus récente si elle existe.
	last := pts[0]
	for _, p := range pts {
		if !p.d.Before(last.d) {
			last = p
		}
	}
	s.LastPrice, s.LastDate = last.adj, last.d
	if last.close > 0 {
		s.LastPrice = last.close
	}
	sortSeries(s)
	s = TrimYears(s, years)
	if len(s.Adj) < MinPrices {
		return nil, notEnough(len(s.Adj))
	}
	return s, nil
}

func parsePrice(f string) (float64, bool) {
	var b strings.Builder
	for _, r := range f {
		if unicode.IsDigit(r) || strings.ContainsRune(".,-+'’  ", r) {
			b.WriteRune(r)
		}
	}
	v, present, err := ParseNumber(b.String())
	if !present || err != nil || v <= 0 {
		return 0, false
	}
	return v, true
}

var (
	reNumDate  = regexp.MustCompile(`^(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})$`)
	reDateTime = regexp.MustCompile(`^(\d{1,4}[./-]\d{1,2}[./-]\d{1,4})[T ]`)
	frMonths   = strings.NewReplacer(
		"janvier", "Jan", "janv.", "Jan", "janv", "Jan",
		"février", "Feb", "fevrier", "Feb", "févr.", "Feb", "févr", "Feb", "fevr", "Feb", "fév.", "Feb", "fév", "Feb",
		"mars", "Mar", "avril", "Apr", "avr.", "Apr", "avr", "Apr", "mai", "May", "juin", "Jun",
		"juillet", "Jul", "juil.", "Jul", "juil", "Jul", "août", "Aug", "aout", "Aug",
		"septembre", "Sep", "sept.", "Sep", "sept", "Sep", "octobre", "Oct", "oct.", "Oct",
		"novembre", "Nov", "nov.", "Nov", "décembre", "Dec", "decembre", "Dec", "déc.", "Dec", "déc", "Dec")
	textLayouts = []string{"Jan 2, 2006", "January 2, 2006", "Jan 2 2006", "2-Jan-2006", "2-Jan-06",
		"2 Jan 2006", "2 January 2006", "02 Jan 2006", "Jan 02, 2006", "2. Jan 2006", "Mon, 2 Jan 2006", "Monday, January 2, 2006"}
)

// cleanDate enlève guillemets et partie horaire éventuelle.
func cleanDate(s string) string {
	s = strings.TrimSpace(strings.Trim(strings.TrimSpace(s), "\"'"))
	if m := reDateTime.FindStringSubmatch(s); m != nil {
		return m[1]
	}
	return s
}

func year2(y int, digits int) int {
	if digits <= 2 {
		if y < 70 {
			return 2000 + y
		}
		return 1900 + y
	}
	return y
}

// parseDates reconnaît automatiquement le format des dates (AAAA-MM-JJ,
// JJ.MM.AAAA, JJ/MM/AAAA, MM/JJ/AAAA, AAAAMMJJ, « Jan 2, 2006 »,
// « 2 janv. 2024 », horodatage Unix...).
func parseDates(in []string) ([]time.Time, []bool) {
	out := make([]time.Time, len(in))
	ok := make([]bool, len(in))
	clean := make([]string, len(in))
	// Pour les dates numériques sans année en tête : jour/mois ou mois/jour ?
	dayFirst, monthFirst := false, false
	for i, s := range in {
		clean[i] = cleanDate(s)
		if m := reNumDate.FindStringSubmatch(clean[i]); m != nil && len(m[1]) <= 2 {
			a, _ := strconv.Atoi(m[1])
			b, _ := strconv.Atoi(m[2])
			if a > 12 {
				dayFirst = true
			}
			if b > 12 {
				monthFirst = true
			}
		}
	}
	useMDY := monthFirst && !dayFirst
	for i, s := range clean {
		if s == "" {
			continue
		}
		if m := reNumDate.FindStringSubmatch(s); m != nil {
			a, _ := strconv.Atoi(m[1])
			b, _ := strconv.Atoi(m[2])
			c, _ := strconv.Atoi(m[3])
			var y, mo, d int
			if len(m[1]) == 4 {
				y, mo, d = a, b, c
			} else if useMDY {
				y, mo, d = year2(c, len(m[3])), a, b
			} else {
				y, mo, d = year2(c, len(m[3])), b, a
			}
			if t, good := mkDate(y, mo, d); good {
				out[i], ok[i] = t, true
			}
			continue
		}
		if len(s) == 8 && isDigits(s) {
			y, _ := strconv.Atoi(s[:4])
			mo, _ := strconv.Atoi(s[4:6])
			d, _ := strconv.Atoi(s[6:])
			if t, good := mkDate(y, mo, d); good {
				out[i], ok[i] = t, true
			}
			continue
		}
		if (len(s) == 10 || len(s) == 9) && isDigits(s) {
			sec, _ := strconv.ParseInt(s, 10, 64)
			t := time.Unix(sec, 0).UTC()
			out[i], ok[i] = time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC), true
			continue
		}
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			out[i], ok[i] = time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC), true
			continue
		}
		e := frMonths.Replace(strings.ToLower(s))
		e = strings.Join(strings.Fields(e), " ")
		for _, l := range textLayouts {
			if t, err := time.Parse(l, titleMonth(e)); err == nil {
				out[i], ok[i] = t, true
				break
			}
		}
	}
	return out, ok
}

// titleMonth remet une majuscule aux noms de mois anglais (« jan » -> « Jan »).
func titleMonth(s string) string {
	words := strings.Fields(s)
	for i, w := range words {
		rs := []rune(w)
		if len(rs) > 0 && unicode.IsLetter(rs[0]) {
			rs[0] = unicode.ToUpper(rs[0])
			words[i] = string(rs)
		}
	}
	r := strings.Join(words, " ")
	// « 2-jan-2006 » -> « 2-Jan-2006 »
	if parts := strings.Split(r, "-"); len(parts) == 3 {
		p := []rune(parts[1])
		if len(p) > 0 {
			p[0] = unicode.ToUpper(p[0])
			parts[1] = string(p)
		}
		r = strings.Join(parts, "-")
	}
	return r
}

func mkDate(y, mo, d int) (time.Time, bool) {
	if y < 1900 || y > 2200 || mo < 1 || mo > 12 || d < 1 || d > 31 {
		return time.Time{}, false
	}
	t := time.Date(y, time.Month(mo), d, 0, 0, 0, 0, time.UTC)
	if t.Day() != d {
		return time.Time{}, false
	}
	return t, true
}

func isDigits(s string) bool {
	for _, r := range s {
		if r < '0' || r > '9' {
			return false
		}
	}
	return s != ""
}
