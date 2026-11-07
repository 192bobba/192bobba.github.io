package mc

import (
	"context"
	"errors"
	"math"
	"math/rand/v2"
	"runtime"
	"sort"
	"sync"
	"time"
)

// Method est la méthode de tirage des rendements journaliers.
type Method int

const (
	MethodNormal    Method = iota // mouvement brownien géométrique
	MethodBootstrap               // tirage parmi les rendements historiques
)

// MethodNames sont les libellés de la liste déroulante.
var MethodNames = []string{
	"Loi normale (mouvement brownien géométrique)",
	"Bootstrap (rendements historiques réels)",
}

func (m Method) String() string {
	if int(m) >= 0 && int(m) < len(MethodNames) {
		return MethodNames[m]
	}
	return "?"
}

// Limites des paramètres.
const (
	MinYears, MaxYears     = 1, 40
	MinHorizon, MaxHorizon = 1, 2520
	MinSims, MaxSims       = 100, 200000
	NumThinPaths           = 60
	maxGridPoints          = 200
)

// Params sont les paramètres d'une simulation.
type Params struct {
	S0             float64
	Horizon        int
	NSims          int
	Method         Method
	AnnReturn      float64 // rendement annuel utilisé
	AnnVol         float64 // volatilité annuelle utilisée
	ReturnFromHist bool
	VolFromHist    bool
	Target         float64 // <= 0 : pas de cible
}

// Quantiles affichés.
var BandQs = [5]float64{0.05, 0.25, 0.50, 0.75, 0.95}

// Result contient tout ce qu'il faut pour les graphiques et les tableaux.
type Result struct {
	P          Params
	DriftDaily float64
	SigmaDaily float64
	Days       []int        // jours de la grille du graphique (0 = aujourd'hui)
	Bands      [5][]float64 // percentiles 5, 25, 50, 75, 95 % pour chaque jour de la grille
	Paths      [][]float64  // quelques trajectoires (sur la grille)
	Final      []float64    // cours finaux triés
	FinalQ     [5]float64   // percentiles des cours finaux
	Mean       float64      // moyenne des cours finaux
	MaxDD      []float64    // baisse maximale de chaque trajectoire, triée (fraction positive)
	ProbLoss   float64      // P(cours final < cours actuel)
	ProbLoss20 float64      // P(perte > 20 %)
	ProbGain20 float64      // P(gain > 20 %)
	ProbAbove  float64      // P(cours final > cible)
	ProbHit    float64      // P(cible touchée au moins une fois)
	Elapsed    time.Duration
}

// HasTarget indique si une cible a été saisie.
func (r *Result) HasTarget() bool { return r.P.Target > 0 }

// Validate vérifie les paramètres et renvoie un message en français.
func (p *Params) Validate() error {
	switch {
	case p.S0 <= 0:
		return userErr("Cours actuel invalide.")
	case p.Horizon < MinHorizon || p.Horizon > MaxHorizon:
		return userErr("L'horizon doit être compris entre %d et %d jours de bourse.", MinHorizon, MaxHorizon)
	case p.NSims < MinSims || p.NSims > MaxSims:
		return userErr("Le nombre de simulations doit être compris entre %d et %s.", MinSims, FormatNumber(MaxSims, 0))
	case p.AnnReturn <= -0.99 || p.AnnReturn > 10:
		return userErr("Le rendement annuel doit être compris entre -99 %% et 1000 %%.")
	case p.AnnVol <= 0 || p.AnnVol > 5:
		return userErr("La volatilité annuelle doit être strictement positive et au plus 500 %%.")
	case p.Target < 0:
		return userErr("Le prix cible doit être positif.")
	}
	return nil
}

// gridDays répartit au plus maxGridPoints points sur l'horizon.
func gridDays(h int) []int {
	g := h
	if g > maxGridPoints {
		g = maxGridPoints
	}
	days := make([]int, 0, g+1)
	for k := 0; k <= g; k++ {
		d := int(math.Round(float64(k) * float64(h) / float64(g)))
		if len(days) == 0 || d > days[len(days)-1] {
			days = append(days, d)
		}
	}
	return days
}

// Simulate lance la simulation Monte Carlo. progress (facultatif) reçoit
// l'avancement entre 0 et 1.
func Simulate(ctx context.Context, h *HistStats, p Params, progress func(float64)) (*Result, error) {
	if err := p.Validate(); err != nil {
		return nil, err
	}
	if p.Method == MethodBootstrap && (h == nil || len(h.Returns) < 2) {
		return nil, userErr("Le bootstrap nécessite l'historique des rendements.")
	}
	t0 := time.Now()
	n := p.NSims
	res := &Result{P: p}
	res.SigmaDaily = p.AnnVol / math.Sqrt(TradingDays)
	res.DriftDaily = (math.Log(1+p.AnnReturn) - p.AnnVol*p.AnnVol/2) / TradingDays
	drift, sig := res.DriftDaily, res.SigmaDaily

	// Rendements historiques recentrés puis remis à l'échelle de la volatilité choisie.
	var boot []float64
	if p.Method == MethodBootstrap {
		scale := sig / h.StdLog
		boot = make([]float64, len(h.Returns))
		for i, r := range h.Returns {
			boot[i] = (r - h.MeanLog) * scale
		}
	}

	x0 := math.Log(p.S0)
	logS := make([]float64, n)
	peak := make([]float64, n)
	ddLog := make([]float64, n)
	hit := make([]bool, n)
	for i := range logS {
		logS[i], peak[i] = x0, x0
	}
	hasT := p.Target > 0
	up := p.Target > p.S0
	lt := 0.0
	if hasT {
		lt = math.Log(p.Target)
		if p.Target == p.S0 {
			for i := range hit {
				hit[i] = true
			}
		}
	}

	res.Days = gridDays(p.Horizon)
	G := len(res.Days)
	for q := range res.Bands {
		res.Bands[q] = make([]float64, G)
		res.Bands[q][0] = p.S0
	}
	nPaths := NumThinPaths
	if nPaths > n {
		nPaths = n
	}
	res.Paths = make([][]float64, nPaths)
	for j := range res.Paths {
		res.Paths[j] = make([]float64, G)
		res.Paths[j][0] = p.S0
	}

	nw := runtime.GOMAXPROCS(0)
	if nw > n/100 {
		nw = n / 100
	}
	if nw < 1 {
		nw = 1
	}
	seed := uint64(time.Now().UnixNano())
	rngs := make([]*rand.Rand, nw)
	for w := range rngs {
		rngs[w] = rand.New(rand.NewPCG(seed, uint64(w)*0x9E3779B97F4A7C15+1))
	}
	buf := make([]float64, n)

	for g := 1; g < G; g++ {
		if err := ctx.Err(); err != nil {
			return nil, errors.New("simulation annulée")
		}
		steps := res.Days[g] - res.Days[g-1]
		var wg sync.WaitGroup
		for w := 0; w < nw; w++ {
			a, b := w*n/nw, (w+1)*n/nw
			wg.Add(1)
			go func(rng *rand.Rand, a, b int) {
				defer wg.Done()
				nb := len(boot)
				for i := a; i < b; i++ {
					x, pk, dd, ht := logS[i], peak[i], ddLog[i], hit[i]
					for d := 0; d < steps; d++ {
						if nb > 0 {
							x += drift + boot[rng.IntN(nb)]
						} else {
							x += drift + sig*rng.NormFloat64()
						}
						if x > pk {
							pk = x
						} else if pk-x > dd {
							dd = pk - x
						}
						if hasT && !ht && ((up && x >= lt) || (!up && x <= lt)) {
							ht = true
						}
					}
					logS[i], peak[i], ddLog[i], hit[i] = x, pk, dd, ht
				}
			}(rngs[w], a, b)
		}
		wg.Wait()
		copy(buf, logS)
		qs := quantilesUnsorted(buf, BandQs[:])
		for q := range qs {
			res.Bands[q][g] = math.Exp(qs[q])
		}
		for j := 0; j < nPaths; j++ {
			res.Paths[j][g] = math.Exp(logS[j])
		}
		if progress != nil {
			progress(float64(res.Days[g]) / float64(p.Horizon))
		}
	}

	res.Final = make([]float64, n)
	res.MaxDD = make([]float64, n)
	var sum float64
	var nLoss, nLoss20, nGain20, nAbove, nHit int
	for i := 0; i < n; i++ {
		f := math.Exp(logS[i])
		res.Final[i] = f
		res.MaxDD[i] = 1 - math.Exp(-ddLog[i])
		sum += f
		if f < p.S0 {
			nLoss++
		}
		if f < 0.8*p.S0 {
			nLoss20++
		}
		if f > 1.2*p.S0 {
			nGain20++
		}
		if hasT && f > p.Target {
			nAbove++
		}
		if hit[i] {
			nHit++
		}
	}
	sort.Float64s(res.Final)
	sort.Float64s(res.MaxDD)
	fn := float64(n)
	res.Mean = sum / fn
	for q, v := range BandQs {
		res.FinalQ[q] = Quantile(res.Final, v)
	}
	res.ProbLoss = float64(nLoss) / fn
	res.ProbLoss20 = float64(nLoss20) / fn
	res.ProbGain20 = float64(nGain20) / fn
	if hasT {
		res.ProbAbove = float64(nAbove) / fn
		res.ProbHit = float64(nHit) / fn
	}
	res.Elapsed = time.Since(t0)
	if progress != nil {
		progress(1)
	}
	return res, nil
}

// Quantile d'un tableau trié (interpolation linéaire).
func Quantile(sorted []float64, q float64) float64 {
	n := len(sorted)
	if n == 0 {
		return math.NaN()
	}
	pos := q * float64(n-1)
	k := int(math.Floor(pos))
	if k >= n-1 {
		return sorted[n-1]
	}
	if k < 0 {
		return sorted[0]
	}
	f := pos - float64(k)
	return sorted[k]*(1-f) + sorted[k+1]*f
}

// quantilesUnsorted calcule des quantiles (croissants) sans trier tout le
// tableau, par sélections successives. buf est modifié.
func quantilesUnsorted(buf []float64, qs []float64) []float64 {
	n := len(buf)
	out := make([]float64, len(qs))
	lo := 0
	for i, q := range qs {
		pos := q * float64(n-1)
		k := int(math.Floor(pos))
		f := pos - float64(k)
		if k < lo {
			k = lo
		}
		selectK(buf, lo, n-1, k)
		v := buf[k]
		if f > 0 && k+1 < n {
			next := math.Inf(1)
			for _, x := range buf[k+1:] {
				if x < next {
					next = x
				}
			}
			v = v*(1-f) + next*f
		}
		out[i] = v
		lo = k
	}
	return out
}

// selectK place en position k le k-ième plus petit élément de a[lo..hi].
func selectK(a []float64, lo, hi, k int) {
	for hi > lo {
		mid := lo + (hi-lo)/2
		// médiane de trois comme pivot
		if a[mid] < a[lo] {
			a[mid], a[lo] = a[lo], a[mid]
		}
		if a[hi] < a[lo] {
			a[hi], a[lo] = a[lo], a[hi]
		}
		if a[hi] < a[mid] {
			a[hi], a[mid] = a[mid], a[hi]
		}
		pivot := a[mid]
		i, j := lo, hi
		for i <= j {
			for a[i] < pivot {
				i++
			}
			for a[j] > pivot {
				j--
			}
			if i <= j {
				a[i], a[j] = a[j], a[i]
				i++
				j--
			}
		}
		switch {
		case k <= j:
			hi = j
		case k >= i:
			lo = i
		default:
			return
		}
	}
}
