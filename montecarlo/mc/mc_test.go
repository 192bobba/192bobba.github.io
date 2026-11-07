package mc

import (
	"context"
	"errors"
	"math"
	"strings"
	"testing"
	"time"
)

func TestParseNumber(t *testing.T) {
	cases := map[string]float64{
		"12,5": 12.5, "12.5": 12.5, "1'234.5": 1234.5, "1 234,5": 1234.5, "12 %": 12,
		"-3,2%": -3.2, "1’234’567": 1234567, "1.234,56": 1234.56, "1,234.56": 1234.56,
		"10000": 10000, "10'000": 10000, "+8": 8, "−5": -5, "0,5": 0.5, " 252 ": 252,
	}
	for in, want := range cases {
		v, ok, err := ParseNumber(in)
		if err != nil || !ok || math.Abs(v-want) > 1e-9 {
			t.Errorf("ParseNumber(%q) = %v,%v,%v ; attendu %v", in, v, ok, err, want)
		}
	}
	if _, ok, err := ParseNumber("   "); ok || err != nil {
		t.Error("champ vide mal géré")
	}
	for _, bad := range []string{"abc", "12a", "%", "1..2,3,4x"} {
		if _, _, err := ParseNumber(bad); err == nil {
			t.Errorf("ParseNumber(%q) devrait échouer", bad)
		}
	}
}

func TestFormat(t *testing.T) {
	if got := FormatNumber(1234567.891, 2); got != "1 234 567,89" {
		t.Errorf("FormatNumber = %q", got)
	}
	if got := FormatPct(0.1234, 1, true); got != "+12,3 %" {
		t.Errorf("FormatPct = %q", got)
	}
	if got := FormatPct(-0.05, 1, true); got != "-5,0 %" {
		t.Errorf("FormatPct = %q", got)
	}
}

func genCSV(sep string, dateFmt string, dec string, n int, reverse bool) string {
	var b strings.Builder
	b.WriteString(strings.Join([]string{"Date", "Open", "High", "Low", "Close", "Adj Close", "Volume"}, sep) + "\n")
	d := time.Date(2023, 1, 2, 0, 0, 0, 0, time.UTC)
	p := 100.0
	var lines []string
	for i := 0; i < n; i++ {
		p *= 1 + 0.01*math.Sin(float64(i)*0.7)
		adj := strings.ReplaceAll(FormatNumber(p, 4), " ", "")
		cl := strings.ReplaceAll(FormatNumber(p*1.1, 4), " ", "")
		if dec == "." {
			adj = strings.ReplaceAll(adj, ",", ".")
			cl = strings.ReplaceAll(cl, ",", ".")
		}
		lines = append(lines, strings.Join([]string{d.Format(dateFmt), "1", "1", "1", cl, adj, "1000"}, sep))
		d = d.AddDate(0, 0, 1)
		if d.Weekday() == time.Saturday {
			d = d.AddDate(0, 0, 2)
		}
	}
	if reverse {
		for i, j := 0, len(lines)-1; i < j; i, j = i+1, j-1 {
			lines[i], lines[j] = lines[j], lines[i]
		}
	}
	b.WriteString(strings.Join(lines, "\n"))
	return b.String()
}

func TestParseCSVFormats(t *testing.T) {
	for _, c := range []struct {
		sep, fmt, dec string
		rev           bool
	}{
		{",", "2006-01-02", ".", false},
		{";", "02.01.2006", ",", true},
		{";", "02/01/2006", ",", false},
		{",", "01/02/2006", ".", true},
		{",", "Jan 2, 2006", ".", true},
		{"\t", "20060102", ".", false},
	} {
		data := genCSV(c.sep, c.fmt, c.dec, 80, c.rev)
		if c.fmt == "Jan 2, 2006" {
			// les virgules des dates imposent des guillemets
			data = genCSVQuoted(80)
		}
		s, err := ParseCSV([]byte(data), "TEST.csv", 0)
		if err != nil {
			t.Fatalf("%+v : %v", c, err)
		}
		if len(s.Adj) != 80 {
			t.Fatalf("%+v : %d lignes", c, len(s.Adj))
		}
		for i := 1; i < len(s.Dates); i++ {
			if !s.Dates[i].After(s.Dates[i-1]) {
				t.Fatalf("%+v : dates non chronologiques", c)
			}
		}
		if s.Dates[0] != time.Date(2023, 1, 2, 0, 0, 0, 0, time.UTC) {
			t.Fatalf("%+v : première date %v", c, s.Dates[0])
		}
		// Dernier cours réel = Close (ici Adj × 1,1)
		if math.Abs(s.LastPrice/s.Adj[len(s.Adj)-1]-1.1) > 1e-3 {
			t.Fatalf("%+v : dernier cours %v / adj %v", c, s.LastPrice, s.Adj[len(s.Adj)-1])
		}
	}
}

func genCSVQuoted(n int) string {
	var b strings.Builder
	b.WriteString("\"Date\",\"Close\",\"Adj Close\"\n")
	d := time.Date(2023, 1, 2, 0, 0, 0, 0, time.UTC)
	p := 100.0
	var lines []string
	for i := 0; i < n; i++ {
		p *= 1 + 0.01*math.Sin(float64(i)*0.7)
		lines = append(lines, "\""+d.Format("Jan 2, 2006")+"\","+
			strings.ReplaceAll(strings.ReplaceAll(FormatNumber(p*1.1, 4), " ", ""), ",", ".")+","+
			strings.ReplaceAll(strings.ReplaceAll(FormatNumber(p, 4), " ", ""), ",", "."))
		d = d.AddDate(0, 0, 1)
		if d.Weekday() == time.Saturday {
			d = d.AddDate(0, 0, 2)
		}
	}
	for i, j := 0, len(lines)-1; i < j; i, j = i+1, j-1 {
		lines[i], lines[j] = lines[j], lines[i]
	}
	b.WriteString(strings.Join(lines, "\n"))
	return b.String()
}

func TestParseCSVCloseOnlyAndErrors(t *testing.T) {
	data := "Date;Clôture\n"
	d := time.Date(2024, 3, 1, 0, 0, 0, 0, time.UTC)
	for i := 0; i < 40; i++ {
		data += d.AddDate(0, 0, i).Format("2006-01-02") + ";" + strings.ReplaceAll(FormatNumber(50+float64(i%7), 2), " ", "") + "\n"
	}
	s, err := ParseCSV([]byte(data), "x.csv", 5)
	if err != nil || len(s.Adj) != 40 {
		t.Fatalf("close seul : %v %v", err, s)
	}
	var ue *UserError
	_, err = ParseCSV([]byte("foo,bar\n1,2\n"), "bad.csv", 5)
	if !errors.As(err, &ue) || !strings.Contains(err.Error(), "Date") {
		t.Fatalf("erreur attendue sur colonne Date : %v", err)
	}
	_, err = ParseCSV([]byte("Date,Volume\n2024-01-01,2\n"), "bad.csv", 5)
	if !errors.As(err, &ue) || !strings.Contains(err.Error(), "Close") {
		t.Fatalf("erreur attendue sur colonne Close : %v", err)
	}
	_, err = ParseCSV([]byte("Date,Close\n2024-01-01,2\n2024-01-02,3\n"), "court.csv", 5)
	if !errors.As(err, &ue) || !strings.Contains(err.Error(), "au moins 30") {
		t.Fatalf("erreur attendue sur 30 jours : %v", err)
	}
}

func syntheticSeries(n int, mu, vol float64) *Series {
	s := &Series{Symbol: "SYN", Name: "Synthétique", Currency: "CHF", Source: "test"}
	p := 100.0
	d := time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC)
	for i := 0; i < n; i++ {
		s.Dates = append(s.Dates, d.AddDate(0, 0, i))
		s.Adj = append(s.Adj, p)
		p *= math.Exp(mu/252 + vol/math.Sqrt(252)*math.Sin(float64(i)*1.3))
	}
	s.LastPrice, s.LastDate = p, s.Dates[n-1]
	return s
}

func TestStatsAndSimulation(t *testing.T) {
	s := syntheticSeries(1000, 0.05, 0.3)
	h, err := ComputeStats(s)
	if err != nil {
		t.Fatal(err)
	}
	if h.AnnVol <= 0 || h.MaxDrawdown <= 0 || h.MaxDrawdown >= 1 {
		t.Fatalf("stats : %+v", h)
	}
	for _, m := range []Method{MethodNormal, MethodBootstrap} {
		p := Params{S0: 100, Horizon: 252, NSims: 20000, Method: m, AnnReturn: 0.08, AnnVol: 0.25, Target: 130}
		r, err := Simulate(context.Background(), h, p, nil)
		if err != nil {
			t.Fatal(err)
		}
		// Médiane théorique : S0 × exp(ln(1,08) − σ²/2).
		wantMed := 100 * math.Exp(math.Log(1.08)-0.25*0.25/2)
		if math.Abs(r.FinalQ[2]/wantMed-1) > 0.02 {
			t.Errorf("%v : médiane %v, attendu %v", m, r.FinalQ[2], wantMed)
		}
		// Moyenne théorique : S0 × 1,08.
		if math.Abs(r.Mean/108-1) > 0.02 {
			t.Errorf("%v : moyenne %v, attendu 108", m, r.Mean)
		}
		if !(r.ProbHit >= r.ProbAbove) || r.ProbHit <= 0 {
			t.Errorf("%v : touche %v < au-dessus %v", m, r.ProbHit, r.ProbAbove)
		}
		if len(r.Paths) != NumThinPaths || len(r.Days) != 201 || r.Days[len(r.Days)-1] != 252 {
			t.Errorf("%v : grille %d / %d", m, len(r.Paths), len(r.Days))
		}
		for g := range r.Days {
			if !(r.Bands[0][g] <= r.Bands[1][g] && r.Bands[1][g] <= r.Bands[2][g] &&
				r.Bands[2][g] <= r.Bands[3][g] && r.Bands[3][g] <= r.Bands[4][g]) {
				t.Fatalf("%v : bandes non ordonnées au point %d", m, g)
			}
		}
		if math.Abs(r.Bands[2][len(r.Days)-1]/r.FinalQ[2]-1) > 1e-9 {
			t.Errorf("%v : médiane de la grille %v ≠ médiane finale %v", m, r.Bands[2][len(r.Days)-1], r.FinalQ[2])
		}
		t.Logf("%v : médiane %.2f moyenne %.2f P(perte) %.3f P(cible) %.3f / %.3f, %v",
			m, r.FinalQ[2], r.Mean, r.ProbLoss, r.ProbAbove, r.ProbHit, r.Elapsed)
	}
}

func TestQuantilesUnsorted(t *testing.T) {
	a := make([]float64, 1001)
	for i := range a {
		a[i] = float64((i * 7919) % 1001)
	}
	q := quantilesUnsorted(a, BandQs[:])
	want := []float64{50, 250, 500, 750, 950}
	for i := range q {
		if q[i] != want[i] {
			t.Fatalf("quantile %d = %v, attendu %v", i, q[i], want[i])
		}
	}
}

func TestBigSimulationSpeed(t *testing.T) {
	if testing.Short() {
		t.Skip()
	}
	s := syntheticSeries(1300, 0.1, 0.4)
	h, _ := ComputeStats(s)
	p := Params{S0: 100, Horizon: 2520, NSims: 200000, Method: MethodBootstrap, AnnReturn: 0.1, AnnVol: 0.4}
	r, err := Simulate(context.Background(), h, p, nil)
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("200 000 × 2 520 jours : %v", r.Elapsed)
}

func TestParseParams(t *testing.T) {
	s := syntheticSeries(300, 0.05, 0.2)
	h, _ := ComputeStats(s)
	p, f, err := ParseParams(ParamInput{Horizon: "504", Sims: "10'000", Return: "7,5 %", Vol: "", Target: "1 234,5", Method: 1}, s, h)
	if err != nil || f != "" || p.Horizon != 504 || p.NSims != 10000 || math.Abs(p.AnnReturn-0.075) > 1e-12 ||
		p.AnnVol != h.AnnVol || !p.VolFromHist || p.ReturnFromHist || p.Target != 1234.5 || p.Method != MethodBootstrap {
		t.Fatalf("ParseParams : %+v %q %v", p, f, err)
	}
	for _, c := range []struct {
		in    ParamInput
		field string
	}{
		{ParamInput{Horizon: "0", Sims: "1000"}, FieldHorizon},
		{ParamInput{Horizon: "2521", Sims: "1000"}, FieldHorizon},
		{ParamInput{Horizon: "252", Sims: "99"}, FieldSims},
		{ParamInput{Horizon: "252", Sims: "1000", Return: "abc"}, FieldReturn},
		{ParamInput{Horizon: "252", Sims: "1000", Return: "-100"}, FieldReturn},
		{ParamInput{Horizon: "252", Sims: "1000", Vol: "0"}, FieldVol},
		{ParamInput{Horizon: "252", Sims: "1000", Target: "-5"}, FieldTarget},
	} {
		if _, f, err := ParseParams(c.in, s, h); err == nil || f != c.field {
			t.Errorf("%+v : champ %q, erreur %v (attendu %q)", c.in, f, err, c.field)
		}
	}
}
