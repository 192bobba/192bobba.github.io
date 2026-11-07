// Package mc contient tout le calcul (données, statistiques, simulation,
// graphiques, rapport) sans dépendance à Windows, pour pouvoir être testé
// et réutilisé (application Windows et version web).
package mc

import (
	"errors"
	"math"
	"strconv"
	"strings"
)

// nbsp est l'espace insécable utilisé comme séparateur de milliers.
const nbsp = " "

// ParseNumber lit un nombre saisi de façon tolérante :
// « 12,5 », « 12.5 », « 1'234.5 », « 1 234,5 », « 12 % », « -3,2% ».
// present vaut false si le champ est vide.
func ParseNumber(s string) (v float64, present bool, err error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0, false, nil
	}
	var b strings.Builder
	for _, r := range s {
		switch r {
		case ' ', ' ', ' ', ' ', '\t', '\'', '’', '‘', '´', '`', '%':
			// ignorés : espaces, apostrophes de milliers, signe %
		case '−', '–':
			b.WriteRune('-')
		default:
			b.WriteRune(r)
		}
	}
	t := b.String()
	if t == "" || t == "-" || t == "+" {
		return 0, true, errors.New("nombre invalide")
	}
	lastComma := strings.LastIndex(t, ",")
	lastDot := strings.LastIndex(t, ".")
	switch {
	case lastComma >= 0 && lastDot >= 0:
		// Le dernier séparateur rencontré est le séparateur décimal.
		if lastComma > lastDot {
			t = strings.ReplaceAll(t, ".", "")
			t = strings.Replace(t, ",", ".", 1)
		} else {
			t = strings.ReplaceAll(t, ",", "")
		}
	case lastComma >= 0:
		if strings.Count(t, ",") > 1 {
			t = strings.ReplaceAll(t, ",", "")
		} else {
			t = strings.Replace(t, ",", ".", 1)
		}
	case lastDot >= 0:
		if strings.Count(t, ".") > 1 {
			t = strings.ReplaceAll(t, ".", "")
		}
	}
	v, err = strconv.ParseFloat(t, 64)
	if err != nil || math.IsNaN(v) || math.IsInf(v, 0) {
		return 0, true, errors.New("nombre invalide")
	}
	return v, true, nil
}

// FormatNumber formate x à la française : « 1 234,56 ».
func FormatNumber(x float64, decimals int) string {
	if math.IsNaN(x) || math.IsInf(x, 0) {
		return "-"
	}
	s := strconv.FormatFloat(math.Abs(x), 'f', decimals, 64)
	intPart, frac := s, ""
	if i := strings.IndexByte(s, '.'); i >= 0 {
		intPart, frac = s[:i], s[i+1:]
	}
	var b strings.Builder
	if x < 0 && strings.Trim(s, "0.") != "" {
		b.WriteByte('-')
	}
	n := len(intPart)
	for i := 0; i < n; i++ {
		if i > 0 && (n-i)%3 == 0 {
			b.WriteString(nbsp)
		}
		b.WriteByte(intPart[i])
	}
	if frac != "" {
		b.WriteByte(',')
		b.WriteString(frac)
	}
	return b.String()
}

// PriceDecimals choisit un nombre de décimales adapté au niveau de prix.
func PriceDecimals(p float64) int {
	p = math.Abs(p)
	switch {
	case p == 0:
		return 2
	case p < 1:
		return 4
	case p < 10000:
		return 2
	default:
		return 0
	}
}

// FormatPrice formate un cours.
func FormatPrice(p float64) string { return FormatNumber(p, PriceDecimals(p)) }

// FormatPct formate une fraction (0,123 -> « 12,3 % »).
func FormatPct(frac float64, decimals int, signed bool) string {
	s := FormatNumber(frac*100, decimals)
	if signed && frac*100 >= 0.5*math.Pow(10, -float64(decimals)) {
		s = "+" + s
	}
	return s + nbsp + "%"
}

// FormatPctPlain formate une valeur déjà exprimée en pour cent pour un
// champ de saisie (« 12,3 »).
func FormatPctPlain(frac float64) string {
	return strings.ReplaceAll(FormatNumber(frac*100, 1), nbsp, "")
}
