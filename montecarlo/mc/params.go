package mc

import "math"

// ParamInput est la saisie brute du formulaire.
type ParamInput struct {
	Horizon, Sims, Return, Vol, Target string
	Method                             int
}

// Noms des champs renvoyés en cas d'erreur (pour placer le curseur).
const (
	FieldYears   = "years"
	FieldHorizon = "horizon"
	FieldSims    = "sims"
	FieldReturn  = "ret"
	FieldVol     = "vol"
	FieldTarget  = "target"
)

// ParseInt lit un entier dans [lo, hi] (saisie tolérante : « 10'000 », « 10 000 »).
func ParseInt(s, name string, lo, hi int) (int, error) {
	v, ok, err := ParseNumber(s)
	if !ok || err != nil || v != math.Trunc(v) || v < float64(lo) || v > float64(hi) {
		return 0, userErr("%s : saisissez un nombre entier entre %s et %s.", name,
			FormatNumber(float64(lo), 0), FormatNumber(float64(hi), 0))
	}
	return int(v), nil
}

// ParseYears lit le nombre d'années d'historique.
func ParseYears(s string) (int, error) {
	return ParseInt(s, "Années d'historique", MinYears, MaxYears)
}

// ParseParams vérifie la saisie et renvoie les paramètres de simulation.
// En cas d'erreur, field désigne le champ à corriger.
func ParseParams(in ParamInput, s *Series, h *HistStats) (p Params, field string, err error) {
	p = Params{S0: s.LastPrice}
	if p.Horizon, err = ParseInt(in.Horizon, "Horizon", MinHorizon, MaxHorizon); err != nil {
		return p, FieldHorizon, err
	}
	if p.NSims, err = ParseInt(in.Sims, "Nombre de simulations", MinSims, MaxSims); err != nil {
		return p, FieldSims, err
	}
	p.Method = MethodNormal
	if in.Method == int(MethodBootstrap) {
		p.Method = MethodBootstrap
	}
	v, ok, perr := ParseNumber(in.Return)
	switch {
	case perr != nil:
		return p, FieldReturn, userErr("Rendement annuel attendu : nombre invalide (ex. 8 ou 7,5). Laissez vide pour l'historique.")
	case ok:
		p.AnnReturn = v / 100
	default:
		p.AnnReturn, p.ReturnFromHist = h.AnnReturn, true
	}
	v, ok, perr = ParseNumber(in.Vol)
	switch {
	case perr != nil:
		return p, FieldVol, userErr("Volatilité annuelle : nombre invalide (ex. 30 ou 25,5). Laissez vide pour l'historique.")
	case ok:
		p.AnnVol = v / 100
	default:
		p.AnnVol, p.VolFromHist = h.AnnVol, true
	}
	v, ok, perr = ParseNumber(in.Target)
	switch {
	case perr != nil || (ok && v <= 0):
		return p, FieldTarget, userErr("Prix cible : saisissez un prix positif, ou laissez vide.")
	case ok:
		p.Target = v
	}
	if err := p.Validate(); err != nil {
		switch {
		case p.AnnReturn <= -0.99 || p.AnnReturn > 10:
			field = FieldReturn
		case p.AnnVol <= 0 || p.AnnVol > 5:
			field = FieldVol
		}
		return p, field, err
	}
	return p, "", nil
}
