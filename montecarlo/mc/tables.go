package mc

import (
	"fmt"
	"math"
	"strings"
	"time"
)

// Row est une ligne de tableau : libellé, valeur, complément.
type Row struct{ Label, Value, Extra string }

// Disclaimer est affiché dans la barre d'état et le rapport.
const Disclaimer = "Scénarios statistiques, pas une prévision ni un conseil d'investissement."

// FormatDate formate une date en JJ.MM.AAAA.
func FormatDate(t time.Time) string { return t.Format("02.01.2006") }

// CurrencyLabel renvoie la devise ou « inconnue ».
func CurrencyLabel(s *Series) string {
	if s.Currency == "" {
		return "inconnue"
	}
	return s.Currency
}

func years(h *HistStats) float64 { return h.End.Sub(h.Start).Hours() / 24 / 365.25 }

// InfoRows sont les informations du titre affichées après chargement.
func InfoRows(s *Series, h *HistStats) []Row {
	name := s.Name
	if s.Symbol != "" && !strings.EqualFold(s.Symbol, s.Name) {
		name += " (" + s.Symbol + ")"
	}
	return []Row{
		{"Nom", name, ""},
		{"Devise", CurrencyLabel(s), ""},
		{"Dernier cours", FormatPrice(s.LastPrice), "au " + FormatDate(s.LastDate)},
		{"Rendement annuel historique", FormatPct(h.AnnReturn, 1, true), ""},
		{"Volatilité annuelle historique", FormatPct(h.AnnVol, 1, false), ""},
		{"Pire baisse historique", FormatPct(-h.MaxDrawdown, 1, false), ""},
		{"Période", FormatDate(h.Start) + " – " + FormatDate(h.End),
			FormatNumber(float64(h.NPrices), 0) + " cours, " + FormatNumber(years(h), 1) + " ans"},
		{"Source", s.Source, ""},
	}
}

// Warning renvoie l'avertissement si le rendement historique dépasse 25 %.
func Warning(h *HistStats) string {
	if h == nil || h.AnnReturn <= 0.25 {
		return ""
	}
	return "Attention : le rendement historique (" + FormatPct(h.AnnReturn, 1, true) +
		" par an) est très élevé. Le prolonger tel quel donne des scénarios optimistes ; " +
		"envisagez de saisir un rendement attendu plus modeste."
}

// PercentileRows : cours à l'horizon.
func PercentileRows(r *Result) []Row {
	labels := []string{"Percentile 5 % (pessimiste)", "Percentile 25 %", "Médiane (50 %)",
		"Percentile 75 %", "Percentile 95 % (optimiste)"}
	rows := make([]Row, 0, 6)
	for i, l := range labels {
		v := r.FinalQ[i]
		rows = append(rows, Row{l, FormatPrice(v), FormatPct(v/r.P.S0-1, 1, true)})
	}
	rows = append(rows, Row{"Moyenne", FormatPrice(r.Mean), FormatPct(r.Mean/r.P.S0-1, 1, true)})
	return rows
}

// RiskRows : probabilités et baisses maximales.
func RiskRows(r *Result) []Row {
	ddMed := Quantile(r.MaxDD, 0.5)
	dd95 := Quantile(r.MaxDD, 0.95)
	rows := []Row{
		{"Probabilité de perte (cours final < cours actuel)", FormatPct(r.ProbLoss, 1, false), ""},
		{"Probabilité de perte > 20 %", FormatPct(r.ProbLoss20, 1, false), "cours final < " + FormatPrice(0.8*r.P.S0)},
		{"Probabilité de gain > 20 %", FormatPct(r.ProbGain20, 1, false), "cours final > " + FormatPrice(1.2*r.P.S0)},
		{"Baisse maximale en cours de route : médiane", FormatPct(-ddMed, 1, false), "depuis un plus haut"},
		{"Baisse maximale : 5 % pires cas", FormatPct(-dd95, 1, false) + " ou pire", "1 scénario sur 20"},
	}
	if r.HasTarget() {
		t := FormatPrice(r.P.Target)
		way := "en montant"
		if r.P.Target < r.P.S0 {
			way = "en descendant"
		}
		rows = append(rows,
			Row{"Probabilité d'être au-dessus de la cible (" + t + ") à l'horizon", FormatPct(r.ProbAbove, 1, false), ""},
			Row{"Probabilité de toucher la cible au moins une fois", FormatPct(r.ProbHit, 1, false), way + " jusqu'à " + t})
	}
	return rows
}

// AssumptionRows : hypothèses utilisées.
func AssumptionRows(s *Series, h *HistStats, r *Result) []Row {
	src := func(hist bool) string {
		if hist {
			return "historique"
		}
		return "saisi"
	}
	horizonYears := float64(r.P.Horizon) / TradingDays
	return []Row{
		{"Données", s.Source, s.Name},
		{"Période historique", FormatDate(h.Start) + " – " + FormatDate(h.End),
			FormatNumber(float64(h.NPrices), 0) + " cours, " + FormatNumber(years(h), 1) + " ans"},
		{"Cours de départ", FormatPrice(r.P.S0) + " " + s.Currency, "dernier cours au " + FormatDate(s.LastDate)},
		{"Rendement annuel historique", FormatPct(h.AnnReturn, 1, true), ""},
		{"Rendement annuel utilisé", FormatPct(r.P.AnnReturn, 1, true), src(r.P.ReturnFromHist)},
		{"Volatilité annuelle historique", FormatPct(h.AnnVol, 1, false), ""},
		{"Volatilité annuelle utilisée", FormatPct(r.P.AnnVol, 1, false), src(r.P.VolFromHist)},
		{"Dérive journalière", FormatPct(r.DriftDaily, 4, true), "(ln(1+rendement) − vol²/2) / 252"},
		{"Méthode", r.P.Method.String(), ""},
		{"Horizon", FormatNumber(float64(r.P.Horizon), 0) + " jours de bourse", "≈ " + FormatNumber(horizonYears, 1) + " an(s)"},
		{"Nombre de simulations", FormatNumber(float64(r.P.NSims), 0), ""},
		{"Durée du calcul", FormatDuration(r.Elapsed), ""},
	}
}

// FormatDuration formate une durée en secondes.
func FormatDuration(d time.Duration) string {
	sec := d.Seconds()
	if sec < 1 {
		return FormatNumber(math.Round(sec*1000), 0) + " ms"
	}
	return FormatNumber(sec, 2) + " s"
}

// Summary résume la simulation en une ligne (barre d'état).
func Summary(r *Result) string {
	return fmt.Sprintf("Médiane à %s jours : %s (%s), probabilité de perte %s, calcul %s",
		FormatNumber(float64(r.P.Horizon), 0), FormatPrice(r.FinalQ[2]),
		FormatPct(r.FinalQ[2]/r.P.S0-1, 1, true), FormatPct(r.ProbLoss, 1, false), FormatDuration(r.Elapsed))
}
