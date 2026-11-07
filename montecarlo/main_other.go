//go:build !windows

// Hors de Windows, le programme fonctionne en ligne de commande : il sert à
// tester le calcul et à produire le rapport HTML.
package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"time"

	"montecarlo/mc"
)

func main() {
	ticker := flag.String("ticker", "AMD", "ticker Yahoo Finance")
	csvPath := flag.String("csv", "", "fichier CSV (remplace le ticker)")
	years := flag.Int("annees", 5, "années d'historique")
	horizon := flag.Int("horizon", 252, "horizon en jours de bourse")
	sims := flag.Int("sims", 10000, "nombre de simulations")
	method := flag.Int("methode", 0, "0 = loi normale, 1 = bootstrap")
	target := flag.Float64("cible", 0, "prix cible (0 = aucun)")
	out := flag.String("rapport", "", "fichier HTML du rapport")
	flag.Parse()

	var s *mc.Series
	var err error
	if *csvPath != "" {
		var data []byte
		if data, err = os.ReadFile(*csvPath); err == nil {
			s, err = mc.ParseCSV(data, *csvPath, *years)
		}
	} else {
		s, err = mc.FetchYahoo(context.Background(), *ticker, *years)
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, "ERREUR :", err)
		os.Exit(1)
	}
	h, err := mc.ComputeStats(s)
	if err != nil {
		fmt.Fprintln(os.Stderr, "ERREUR :", err)
		os.Exit(1)
	}
	for _, r := range mc.InfoRows(s, h) {
		fmt.Printf("%-32s %s %s\n", r.Label, r.Value, r.Extra)
	}
	if w := mc.Warning(h); w != "" {
		fmt.Println(w)
	}
	p := mc.Params{S0: s.LastPrice, Horizon: *horizon, NSims: *sims, Method: mc.Method(*method),
		AnnReturn: h.AnnReturn, AnnVol: h.AnnVol, ReturnFromHist: true, VolFromHist: true, Target: *target}
	r, err := mc.Simulate(context.Background(), h, p, nil)
	if err != nil {
		fmt.Fprintln(os.Stderr, "ERREUR :", err)
		os.Exit(1)
	}
	for _, rows := range [][]mc.Row{mc.PercentileRows(r), mc.RiskRows(r), mc.AssumptionRows(s, h, r)} {
		fmt.Println()
		for _, x := range rows {
			fmt.Printf("%-55s %-22s %s\n", x.Label, x.Value, x.Extra)
		}
	}
	if *out != "" {
		if err := os.WriteFile(*out, []byte(mc.BuildReport(s, h, r, time.Now())), 0o644); err != nil {
			fmt.Fprintln(os.Stderr, "ERREUR :", err)
			os.Exit(1)
		}
		fmt.Println("\nRapport :", *out)
	}
}
