//go:build js && wasm

// Passerelle WebAssembly : expose le moteur mc à la version web
// (montecarlo.html). Chaque fonction renvoie un texte JSON.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"syscall/js"
	"time"

	"montecarlo/mc"
)

var (
	series *mc.Series
	hist   *mc.HistStats
	result *mc.Result
)

func toJSON(v interface{}) string {
	b, err := json.Marshal(v)
	if err != nil {
		return `{"error":"erreur interne"}`
	}
	return string(b)
}

type errOut struct {
	Error string `json:"error"`
	Field string `json:"field,omitempty"`
	Final bool   `json:"final"` // erreur définitive (inutile d'essayer une autre source)
}

func fail(err error, field string) string {
	var ue *mc.UserError
	return toJSON(errOut{Error: err.Error(), Field: field, Final: errors.As(err, &ue)})
}

type dataOut struct {
	Info     []mc.Row `json:"info"`
	Warning  string   `json:"warning"`
	HistRet  string   `json:"histRet"`
	HistVol  string   `json:"histVol"`
	Name     string   `json:"name"`
	Symbol   string   `json:"symbol"`
	Status   string   `json:"status"`
	NPrices  int      `json:"nPrices"`
	Currency string   `json:"currency"`
}

func loaded(s *mc.Series) string {
	h, err := mc.ComputeStats(s)
	if err != nil {
		return fail(err, "")
	}
	series, hist, result = s, h, nil
	return toJSON(dataOut{
		Info:     mc.InfoRows(s, h),
		Warning:  mc.Warning(h),
		HistRet:  mc.FormatPct(h.AnnReturn, 1, true),
		HistVol:  mc.FormatPct(h.AnnVol, 1, false),
		Name:     s.Name,
		Symbol:   s.Symbol,
		Currency: s.Currency,
		NPrices:  h.NPrices,
		Status: s.Symbol + " chargé : " + mc.FormatNumber(float64(h.NPrices), 0) + " cours du " +
			mc.FormatDate(h.Start) + " au " + mc.FormatDate(h.End) + ".",
	})
}

// mcCheck(ticker, years) -> {ticker, years, urls} ou {error}
func check(_ js.Value, a []js.Value) interface{} {
	years, err := mc.ParseYears(a[1].String())
	if err != nil {
		return fail(err, mc.FieldYears)
	}
	t := mc.NormalizeTicker(a[0].String())
	if t == "" {
		return fail(&mc.UserError{Msg: "Saisissez un ticker Yahoo Finance (ex. AMD, AAPL, NESN.SW, UBSG.SW)."}, "ticker")
	}
	now := time.Now()
	return toJSON(map[string]interface{}{
		"ticker": t, "years": years,
		"urls": []string{mc.YahooURL("query1.finance.yahoo.com", t, years, now),
			mc.YahooURL("query2.finance.yahoo.com", t, years, now)},
	})
}

// mcLoadYahoo(body, ticker, years, status)
func loadYahoo(_ js.Value, a []js.Value) interface{} {
	s, err := mc.SeriesFromYahoo([]byte(a[0].String()), a[1].String(), a[3].Int(), a[2].Int())
	if err != nil {
		return fail(err, "")
	}
	return loaded(s)
}

// mcLoadCSV(texte, nomFichier, années)
func loadCSV(_ js.Value, a []js.Value) interface{} {
	years, err := mc.ParseYears(a[2].String())
	if err != nil {
		return fail(err, mc.FieldYears)
	}
	s, err := mc.ParseCSV([]byte(a[0].String()), a[1].String(), years)
	if err != nil {
		return fail(err, "")
	}
	return loaded(s)
}

type simIn struct {
	Horizon, Sims, Ret, Vol, Target string
	Method                          int
	Width, Height                   float64
}

type simOut struct {
	Fan     string   `json:"fan"`
	Hist    string   `json:"hist"`
	Pct     []mc.Row `json:"pct"`
	Risk    []mc.Row `json:"risk"`
	Hyp     []mc.Row `json:"hyp"`
	Summary string   `json:"summary"`
	Title   string   `json:"title"`
}

// mcSimulate(json) ; progression envoyée par postMessage({type:"progress"}).
func simulate(_ js.Value, a []js.Value) interface{} {
	if series == nil {
		return fail(&mc.UserError{Msg: "Chargez d'abord des données (ticker ou CSV)."}, "")
	}
	var in simIn
	if err := json.Unmarshal([]byte(a[0].String()), &in); err != nil {
		return fail(err, "")
	}
	p, field, err := mc.ParseParams(mc.ParamInput{Horizon: in.Horizon, Sims: in.Sims, Return: in.Ret,
		Vol: in.Vol, Target: in.Target, Method: in.Method}, series, hist)
	if err != nil {
		return fail(err, field)
	}
	post := js.Global().Get("postMessage")
	last := -1
	r, err := mc.Simulate(context.Background(), hist, p, func(f float64) {
		pc := int(f * 100)
		if pc != last && post.Truthy() {
			last = pc
			post.Invoke(map[string]interface{}{"type": "progress", "value": pc})
		}
	})
	if err != nil {
		return fail(err, "")
	}
	result = r
	return toJSON(output(in.Width, in.Height))
}

func output(w, h float64) simOut {
	if w < 320 {
		w = 940
	}
	if h < 240 {
		h = 440
	}
	return simOut{
		Fan:     mc.FanSVG(result, series.Currency, w, h),
		Hist:    mc.HistogramSVG(result, series.Currency, w, h),
		Pct:     mc.PercentileRows(result),
		Risk:    mc.RiskRows(result),
		Hyp:     mc.AssumptionRows(series, hist, result),
		Summary: mc.Summary(result),
		Title:   "Cours à l'horizon (" + mc.FormatNumber(float64(result.P.Horizon), 0) + " jours de bourse)",
	}
}

// mcCharts(largeur, hauteur) : redessine les graphiques à une autre taille.
func charts(_ js.Value, a []js.Value) interface{} {
	if result == nil {
		return `{}`
	}
	o := output(a[0].Float(), a[1].Float())
	return toJSON(map[string]string{"fan": o.Fan, "hist": o.Hist})
}

// mcReport() -> {html, name}
func report(_ js.Value, _ []js.Value) interface{} {
	if result == nil {
		return fail(&mc.UserError{Msg: "Lancez d'abord une simulation."}, "")
	}
	now := time.Now()
	return toJSON(map[string]string{
		"html": mc.BuildReport(series, hist, result, now),
		"name": mc.ReportFileName(series, now),
	})
}

func main() {
	g := js.Global()
	g.Set("mcCheck", js.FuncOf(check))
	g.Set("mcLoadYahoo", js.FuncOf(loadYahoo))
	g.Set("mcLoadCSV", js.FuncOf(loadCSV))
	g.Set("mcSimulate", js.FuncOf(simulate))
	g.Set("mcCharts", js.FuncOf(charts))
	g.Set("mcReport", js.FuncOf(report))
	g.Set("mcCSVHint", mc.CSVHint)
	g.Set("mcDisclaimer", mc.Disclaimer)
	if ready := g.Get("mcReady"); ready.Type() == js.TypeFunction {
		ready.Invoke()
	}
	select {}
}
