package mc

import (
	"html"
	"regexp"
	"strings"
	"time"
)

var reUnsafe = regexp.MustCompile(`[^A-Za-z0-9._-]+`)

// ReportFileName propose un nom de fichier pour le rapport.
func ReportFileName(s *Series, t time.Time) string {
	sym := reUnsafe.ReplaceAllString(s.Symbol, "_")
	if sym == "" {
		sym = "titre"
	}
	return "Rapport_" + sym + "_" + t.Format("2006-01-02_150405") + ".html"
}

func rowsTable(title string, head []string, rows []Row) string {
	var b strings.Builder
	b.WriteString("<h2>" + html.EscapeString(title) + "</h2>\n<table>")
	if len(head) > 0 {
		b.WriteString("<thead><tr>")
		for _, h := range head {
			b.WriteString("<th>" + html.EscapeString(h) + "</th>")
		}
		b.WriteString("</tr></thead>")
	}
	b.WriteString("<tbody>")
	for _, r := range rows {
		cls := ""
		if looksNumeric(r.Value) {
			cls = ` class="n"`
		}
		b.WriteString("<tr><td>" + html.EscapeString(r.Label) + "</td><td" + cls + ">" +
			html.EscapeString(r.Value) + "</td><td class=\"x\">" + html.EscapeString(r.Extra) + "</td></tr>")
	}
	b.WriteString("</tbody></table>\n")
	return b.String()
}

// looksNumeric : la valeur commence par un chiffre ou un signe.
func looksNumeric(v string) bool {
	for _, r := range v {
		return (r >= '0' && r <= '9') || r == '-' || r == '+'
	}
	return false
}

const reportCSS = `
body{font-family:"Segoe UI",Tahoma,Arial,sans-serif;font-size:14px;color:#1e1e1e;background:#fff;margin:0}
main{max-width:980px;margin:0 auto;padding:20px 16px 40px}
h1{font-size:22px;margin:0 0 4px}
h2{font-size:16px;margin:26px 0 8px;border-bottom:1px solid #ccc;padding-bottom:4px}
.sub{color:#555;margin:0 0 12px}
.warn{background:#fff4e5;border:1px solid #e6a23c;padding:8px 12px;margin:12px 0}
table{border-collapse:collapse;width:100%;margin:4px 0}
th,td{border:1px solid #d0d0d0;padding:5px 8px;text-align:left;vertical-align:top}
th{background:#f0f0f0}
td.n{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
td.x{color:#555}
.chart{border:1px solid #d0d0d0;margin:6px 0}
footer{margin-top:28px;padding-top:10px;border-top:1px solid #ccc;color:#555;font-size:13px}
@media print{.chart{break-inside:avoid}}
`

// BuildReport produit une page HTML autonome (graphiques SVG intégrés).
func BuildReport(s *Series, h *HistStats, r *Result, now time.Time) string {
	var b strings.Builder
	title := "Simulation Monte Carlo – " + s.Name
	b.WriteString("<!DOCTYPE html>\n<html lang=\"fr\"><head><meta charset=\"utf-8\">" +
		"<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
		"<title>" + html.EscapeString(title) + "</title><style>" + reportCSS + "</style></head><body><main>\n")
	b.WriteString("<h1>" + html.EscapeString(title) + "</h1>\n")
	b.WriteString("<p class=\"sub\">Rapport généré le " + now.Format("02.01.2006 à 15:04") + " – " +
		html.EscapeString(FormatNumber(float64(r.P.NSims), 0)) + " simulations sur " +
		html.EscapeString(FormatNumber(float64(r.P.Horizon), 0)) + " jours de bourse.</p>\n")
	if w := Warning(h); w != "" {
		b.WriteString("<div class=\"warn\">" + html.EscapeString(w) + "</div>\n")
	}
	b.WriteString(rowsTable("Infos du titre", nil, InfoRows(s, h)))
	b.WriteString("<h2>Trajectoires</h2>\n<div class=\"chart\">" + FanSVG(r, s.Currency, 940, 440) + "</div>\n")
	b.WriteString("<h2>Distribution des cours à l'horizon</h2>\n<div class=\"chart\">" + HistogramSVG(r, s.Currency, 940, 400) + "</div>\n")
	b.WriteString(rowsTable("Cours à l'horizon ("+FormatNumber(float64(r.P.Horizon), 0)+" jours de bourse)",
		[]string{"Scénario", "Cours", "Variation"}, PercentileRows(r)))
	b.WriteString(rowsTable("Probabilités et risques", []string{"Indicateur", "Valeur", "Précision"}, RiskRows(r)))
	b.WriteString(rowsTable("Hypothèses utilisées", []string{"Hypothèse", "Valeur", "Précision"}, AssumptionRows(s, h, r)))
	b.WriteString("<footer>" + html.EscapeString(Disclaimer) + "</footer>\n</main></body></html>\n")
	return b.String()
}
