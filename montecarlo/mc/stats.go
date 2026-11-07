package mc

import (
	"math"
	"time"
)

// TradingDays est le nombre de jours de bourse par an.
const TradingDays = 252

// HistStats résume l'historique.
type HistStats struct {
	NPrices     int
	Start, End  time.Time
	MeanLog     float64 // moyenne des rendements log journaliers
	StdLog      float64 // écart-type des rendements log journaliers
	AnnReturn   float64 // exp(moyenne×252 + vol²/2) − 1
	AnnVol      float64 // écart-type × √252
	MaxDrawdown float64 // pire baisse historique (fraction positive)
	Returns     []float64
}

// ComputeStats calcule rendement, volatilité et pire baisse historiques.
func ComputeStats(s *Series) (*HistStats, error) {
	n := len(s.Adj)
	if n < MinPrices {
		return nil, notEnough(n)
	}
	h := &HistStats{NPrices: n, Start: s.Dates[0], End: s.Dates[n-1]}
	h.Returns = make([]float64, 0, n-1)
	for i := 1; i < n; i++ {
		h.Returns = append(h.Returns, math.Log(s.Adj[i]/s.Adj[i-1]))
	}
	var sum float64
	for _, r := range h.Returns {
		sum += r
	}
	m := sum / float64(len(h.Returns))
	var ss float64
	for _, r := range h.Returns {
		ss += (r - m) * (r - m)
	}
	sd := math.Sqrt(ss / float64(len(h.Returns)-1))
	if sd == 0 || math.IsNaN(sd) {
		return nil, userErr("Les cours ne varient pas sur la période : volatilité nulle, simulation impossible.")
	}
	h.MeanLog, h.StdLog = m, sd
	h.AnnVol = sd * math.Sqrt(TradingDays)
	h.AnnReturn = math.Exp(m*TradingDays+h.AnnVol*h.AnnVol/2) - 1
	h.MaxDrawdown = MaxDrawdown(s.Adj)
	return h, nil
}

// MaxDrawdown renvoie la baisse maximale depuis un plus haut (fraction positive).
func MaxDrawdown(p []float64) float64 {
	if len(p) == 0 {
		return 0
	}
	peak, worst := p[0], 0.0
	for _, v := range p {
		if v > peak {
			peak = v
		} else if dd := 1 - v/peak; dd > worst {
			worst = dd
		}
	}
	return worst
}
