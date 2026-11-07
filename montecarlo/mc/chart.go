package mc

import (
	"math"
)

// RGB est une couleur.
type RGB struct{ R, G, B uint8 }

// Pt est un point en pixels.
type Pt struct{ X, Y float64 }

// Align est l'alignement horizontal d'un texte.
type Align int

const (
	AlignLeft Align = iota
	AlignCenter
	AlignRight
)

// Surface est une zone de dessin. Elle est implémentée en GDI (fenêtre
// Windows) et en SVG (rapport HTML, version web) : les graphiques sont donc
// identiques partout.
type Surface interface {
	FillRect(x, y, w, h float64, c RGB)
	FillPolygon(pts []Pt, c RGB)
	Polyline(pts []Pt, c RGB, width float64, dashed bool)
	// Text dessine un texte dont la ligne de base est en y.
	Text(x, y float64, s string, c RGB, size float64, align Align, bold bool)
	// TextVertical dessine un texte tourné de 90° (lecture de bas en haut), centré en (x, y).
	TextVertical(x, y float64, s string, c RGB, size float64)
	Clip(x, y, w, h float64)
	Unclip()
}

// Couleurs communes.
var (
	colBg       = RGB{255, 255, 255}
	colAxis     = RGB{64, 64, 64}
	colGrid     = RGB{225, 225, 225}
	colText     = RGB{30, 30, 30}
	colBand90   = RGB{204, 222, 240}
	colBand50   = RGB{140, 182, 222}
	colMedian   = RGB{8, 48, 107}
	colThin     = RGB{165, 165, 165}
	colCurrent  = RGB{0, 0, 0}
	colTarget   = RGB{230, 120, 0}
	colHistUp   = RGB{70, 130, 180}
	colHistDown = RGB{205, 40, 40}
)

// niceStep renvoie un pas « rond » (1, 2, 2,5 ou 5 × 10^k).
func niceStep(span float64, target int) float64 {
	if span <= 0 || target < 1 {
		return 1
	}
	raw := span / float64(target)
	mag := math.Pow(10, math.Floor(math.Log10(raw)))
	for _, m := range []float64{1, 2, 2.5, 5, 10} {
		if raw <= m*mag {
			return m * mag
		}
	}
	return 10 * mag
}

func ticks(lo, hi float64, target int) []float64 {
	st := niceStep(hi-lo, target)
	var out []float64
	for v := math.Ceil(lo/st-1e-9) * st; v <= hi+st*1e-9; v += st {
		if math.Abs(v) < st*1e-9 {
			v = 0
		}
		out = append(out, v)
	}
	return out
}

func tickDecimals(step float64) int {
	if step >= 1 {
		if step == math.Floor(step) {
			return 0
		}
		return 1
	}
	d := int(math.Ceil(-math.Log10(step) - 1e-9))
	if step*math.Pow(10, float64(d)) != math.Floor(step*math.Pow(10, float64(d))) {
		d++
	}
	return d
}

type frame struct {
	x0, y0, x1, y1 float64 // zone de tracé
	xlo, xhi       float64
	ylo, yhi       float64
}

func (f frame) X(v float64) float64 { return f.x0 + (v-f.xlo)/(f.xhi-f.xlo)*(f.x1-f.x0) }
func (f frame) Y(v float64) float64 { return f.y1 - (v-f.ylo)/(f.yhi-f.ylo)*(f.y1-f.y0) }

// axes dessine la grille, les graduations et les libellés des axes.
func axes(s Surface, f frame, xt, yt []float64, xfmt, yfmt func(float64) string, xlabel, ylabel string, fs float64) {
	for _, v := range yt {
		y := f.Y(v)
		s.Polyline([]Pt{{f.x0, y}, {f.x1, y}}, colGrid, 1, false)
		s.Polyline([]Pt{{f.x0 - 4, y}, {f.x0, y}}, colAxis, 1, false)
		s.Text(f.x0-7, y+fs*0.35, yfmt(v), colText, fs, AlignRight, false)
	}
	for _, v := range xt {
		x := f.X(v)
		s.Polyline([]Pt{{x, f.y0}, {x, f.y1}}, colGrid, 1, false)
		s.Polyline([]Pt{{x, f.y1}, {x, f.y1 + 4}}, colAxis, 1, false)
		s.Text(x, f.y1+fs+6, xfmt(v), colText, fs, AlignCenter, false)
	}
	s.Polyline([]Pt{{f.x0, f.y0}, {f.x0, f.y1}, {f.x1, f.y1}}, colAxis, 1, false)
	if xlabel != "" {
		s.Text((f.x0+f.x1)/2, f.y1+2*fs+12, xlabel, colText, fs, AlignCenter, false)
	}
	if ylabel != "" {
		s.TextVertical(f.x0-62-fs*0.2, (f.y0+f.y1)/2, ylabel, colText, fs)
	}
}

// textWidth estime la largeur d'un texte (police proportionnelle).
func textWidth(t string, fs float64, bold bool) float64 {
	w := 0.0
	for _, r := range t {
		switch {
		case r == ' ' || r == '\u00a0' || r == '.' || r == ',' || r == 'i' || r == 'l' || r == '\'':
			w += 0.30
		case r >= 'A' && r <= 'Z' || r == 'm' || r == 'w' || r == '%':
			w += 0.70
		default:
			w += 0.55
		}
	}
	if bold {
		w *= 1.08
	}
	return w * fs
}

// boxedText écrit un texte sur un fond blanc pour qu'il reste lisible.
func boxedText(s Surface, x, y float64, t string, c RGB, fs float64, align Align, bold bool) {
	w := textWidth(t, fs, bold) + 6
	x0 := x - 3
	switch align {
	case AlignCenter:
		x0 = x - w/2
	case AlignRight:
		x0 = x - w + 3
	}
	s.FillRect(x0, y-fs*0.95, w, fs*1.3, colBg)
	s.Text(x, y, t, c, fs, align, bold)
}

// legendItem dessine un élément de légende et renvoie la position suivante.
func legendItem(s Surface, x, y float64, label string, c RGB, kind int, fs float64) float64 {
	switch kind {
	case 0: // carré plein
		s.FillRect(x, y-fs*0.75, 14, fs*0.85, c)
	case 1: // trait épais
		s.Polyline([]Pt{{x, y - fs*0.35}, {x + 18, y - fs*0.35}}, c, 3, false)
	case 2: // trait fin
		s.Polyline([]Pt{{x, y - fs*0.35}, {x + 18, y - fs*0.35}}, c, 1, false)
	case 3: // pointillé
		s.Polyline([]Pt{{x, y - fs*0.35}, {x + 18, y - fs*0.35}}, c, 1.5, true)
	}
	s.Text(x+22, y, label, colText, fs, AlignLeft, false)
	return x + 22 + textWidth(label, fs, false) + 16
}

// DrawFan dessine le graphique en éventail des trajectoires.
func DrawFan(s Surface, w, h float64, r *Result, currency string, fs float64) {
	s.FillRect(0, 0, w, h, colBg)
	if r == nil {
		return
	}
	f := frame{x0: 86, y0: 38, x1: w - 24, y1: h - 2*fs - 26}
	if f.x1-f.x0 < 60 || f.y1-f.y0 < 40 {
		return
	}
	lo, hi := math.Inf(1), math.Inf(-1)
	for g := range r.Days {
		lo = math.Min(lo, r.Bands[0][g])
		hi = math.Max(hi, r.Bands[4][g])
	}
	lo = math.Min(lo, r.P.S0)
	hi = math.Max(hi, r.P.S0)
	if r.HasTarget() {
		lo = math.Min(lo, r.P.Target)
		hi = math.Max(hi, r.P.Target)
	}
	pad := (hi - lo) * 0.06
	if pad == 0 {
		pad = math.Max(hi*0.05, 1e-6)
	}
	f.ylo, f.yhi = math.Max(0, lo-pad), hi+pad
	f.xlo, f.xhi = 0, float64(r.P.Horizon)
	if f.xhi == f.xlo {
		f.xhi = f.xlo + 1
	}
	yt := ticks(f.ylo, f.yhi, int(math.Max(3, (f.y1-f.y0)/55)))
	ydec := 0
	if len(yt) > 1 {
		ydec = tickDecimals(yt[1] - yt[0])
	}
	xt := ticks(0, f.xhi, int(math.Max(2, (f.x1-f.x0)/90)))
	xdec := 0
	if len(xt) > 1 {
		xdec = tickDecimals(xt[1] - xt[0])
	}
	ylabel := "Cours"
	if currency != "" {
		ylabel += " (" + currency + ")"
	}
	axes(s, f, xt, yt,
		func(v float64) string { return FormatNumber(v, xdec) },
		func(v float64) string { return FormatNumber(v, ydec) },
		"Jours de bourse", ylabel, fs)

	s.Clip(f.x0+1, f.y0, f.x1-f.x0, f.y1-f.y0)
	band := func(a, b []float64, c RGB) {
		pts := make([]Pt, 0, 2*len(r.Days))
		for g, d := range r.Days {
			pts = append(pts, Pt{f.X(float64(d)), f.Y(b[g])})
		}
		for g := len(r.Days) - 1; g >= 0; g-- {
			pts = append(pts, Pt{f.X(float64(r.Days[g])), f.Y(a[g])})
		}
		s.FillPolygon(pts, c)
	}
	band(r.Bands[0], r.Bands[4], colBand90)
	band(r.Bands[1], r.Bands[3], colBand50)
	for _, p := range r.Paths {
		pts := make([]Pt, len(r.Days))
		for g, d := range r.Days {
			pts[g] = Pt{f.X(float64(d)), f.Y(p[g])}
		}
		s.Polyline(pts, colThin, 1, false)
	}
	med := make([]Pt, len(r.Days))
	for g, d := range r.Days {
		med[g] = Pt{f.X(float64(d)), f.Y(r.Bands[2][g])}
	}
	s.Polyline(med, colMedian, 3, false)
	yc := f.Y(r.P.S0)
	s.Polyline([]Pt{{f.x0, yc}, {f.x1, yc}}, colCurrent, 1.5, true)
	if r.HasTarget() {
		yt := f.Y(r.P.Target)
		s.Polyline([]Pt{{f.x0, yt}, {f.x1, yt}}, colTarget, 2, false)
	}
	s.Unclip()
	// Étiquettes des lignes horizontales.
	boxedText(s, f.x0+6, yc-5, "Cours actuel "+FormatPrice(r.P.S0), colCurrent, fs, AlignLeft, false)
	if r.HasTarget() {
		ytg := f.Y(r.P.Target)
		dy := -5.0
		if math.Abs(ytg-yc) < fs+4 {
			if ytg > yc {
				dy = fs + 3
			}
		}
		boxedText(s, f.x1-6, ytg+dy, "Cible "+FormatPrice(r.P.Target), colTarget, fs, AlignRight, true)
	}
	// Légende.
	x := f.x0
	y := 22.0
	x = legendItem(s, x, y, "Médiane", colMedian, 1, fs)
	x = legendItem(s, x, y, "25–75 %", colBand50, 0, fs)
	x = legendItem(s, x, y, "5–95 %", colBand90, 0, fs)
	x = legendItem(s, x, y, "Trajectoires", colThin, 2, fs)
	x = legendItem(s, x, y, "Cours actuel", colCurrent, 3, fs)
	if r.HasTarget() {
		legendItem(s, x, y, "Cible", colTarget, 1, fs)
	}
}

// HistBins calcule l'histogramme des cours finaux. Les bornes des classes
// sont alignées sur le cours actuel pour séparer nettement pertes et gains.
func HistBins(r *Result, nb int) (edges []float64, pct []float64) {
	lo := Quantile(r.Final, 0.005)
	hi := Quantile(r.Final, 0.995)
	lo = math.Min(lo, r.P.S0)
	hi = math.Max(hi, r.P.S0)
	if r.HasTarget() {
		lo = math.Min(lo, r.P.Target)
		hi = math.Max(hi, r.P.Target)
	}
	if hi <= lo {
		hi = lo*1.01 + 1e-9
		lo = lo * 0.99
	}
	bw := (hi - lo) / float64(nb)
	k := math.Ceil((r.P.S0 - lo) / bw)
	start := r.P.S0 - k*bw
	cnt := int(math.Ceil((hi-start)/bw)) + 0
	if cnt < 1 {
		cnt = 1
	}
	edges = make([]float64, cnt+1)
	for i := range edges {
		edges[i] = start + float64(i)*bw
	}
	pct = make([]float64, cnt)
	n := float64(len(r.Final))
	for _, v := range r.Final {
		i := int(math.Floor((v - start) / bw))
		if i >= 0 && i < cnt {
			pct[i] += 100 / n
		}
	}
	return edges, pct
}

// DrawHistogram dessine la distribution des cours finaux.
func DrawHistogram(s Surface, w, h float64, r *Result, currency string, fs float64) {
	s.FillRect(0, 0, w, h, colBg)
	if r == nil {
		return
	}
	f := frame{x0: 86, y0: 38, x1: w - 24, y1: h - 2*fs - 26}
	if f.x1-f.x0 < 60 || f.y1-f.y0 < 40 {
		return
	}
	edges, pct := HistBins(r, 60)
	maxp := 0.0
	for _, p := range pct {
		maxp = math.Max(maxp, p)
	}
	f.xlo, f.xhi = edges[0], edges[len(edges)-1]
	f.ylo, f.yhi = 0, maxp*1.12
	if f.yhi == 0 {
		f.yhi = 1
	}
	yt := ticks(0, f.yhi, int(math.Max(3, (f.y1-f.y0)/55)))
	ydec := 0
	if len(yt) > 1 {
		ydec = tickDecimals(yt[1] - yt[0])
	}
	xt := ticks(f.xlo, f.xhi, int(math.Max(2, (f.x1-f.x0)/90)))
	xdec := 0
	if len(xt) > 1 {
		xdec = tickDecimals(xt[1] - xt[0])
	}
	xlabel := "Cours à l'horizon de " + FormatNumber(float64(r.P.Horizon), 0) + " jours"
	if currency != "" {
		xlabel += " (" + currency + ")"
	}
	axes(s, f, xt, yt,
		func(v float64) string { return FormatNumber(v, xdec) },
		func(v float64) string { return FormatNumber(v, ydec) + " %" },
		xlabel, "Part des scénarios", fs)
	s.Clip(f.x0+1, f.y0, f.x1-f.x0, f.y1-f.y0)
	for i, p := range pct {
		if p <= 0 {
			continue
		}
		xa, xb := f.X(edges[i]), f.X(edges[i+1])
		c := colHistUp
		if (edges[i]+edges[i+1])/2 < r.P.S0 {
			c = colHistDown
		}
		gap := 0.0
		if xb-xa > 4 {
			gap = 1
		}
		s.FillRect(xa, f.Y(p), xb-xa-gap, f.y1-f.Y(p), c)
	}
	xc := f.X(r.P.S0)
	s.Polyline([]Pt{{xc, f.y0}, {xc, f.y1}}, colCurrent, 1.5, true)
	if r.HasTarget() {
		xg := f.X(r.P.Target)
		s.Polyline([]Pt{{xg, f.y0}, {xg, f.y1}}, colTarget, 2, false)
	}
	s.Unclip()
	if xc > f.x1-140 {
		boxedText(s, xc-4, f.y0+fs+2, "Actuel "+FormatPrice(r.P.S0), colCurrent, fs, AlignRight, false)
	} else {
		boxedText(s, xc+4, f.y0+fs+2, "Actuel "+FormatPrice(r.P.S0), colCurrent, fs, AlignLeft, false)
	}
	if r.HasTarget() {
		xg := f.X(r.P.Target)
		al, dx := AlignLeft, 4.0
		if xg > (f.x0+f.x1)/2 || math.Abs(xg-xc) < 120 && xg < xc {
			al, dx = AlignRight, -4
		}
		boxedText(s, xg+dx, f.y0+2*fs+8, "Cible "+FormatPrice(r.P.Target), colTarget, fs, al, true)
	}
	x := f.x0
	y := 22.0
	x = legendItem(s, x, y, "Sous le cours actuel ("+FormatPct(r.ProbLoss, 1, false)+")", colHistDown, 0, fs)
	x = legendItem(s, x, y, "Au-dessus", colHistUp, 0, fs)
	x = legendItem(s, x, y, "Cours actuel", colCurrent, 3, fs)
	if r.HasTarget() {
		legendItem(s, x, y, "Cible", colTarget, 1, fs)
	}
}
