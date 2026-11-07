package mc

import (
	"fmt"
	"html"
	"strconv"
	"strings"
)

// SVG est une Surface qui produit une image SVG.
type SVG struct {
	W, H   float64
	b      strings.Builder
	clipID int
	open   int
}

// NewSVG crée une surface SVG.
func NewSVG(w, h float64) *SVG { return &SVG{W: w, H: h} }

func f1(v float64) string { return strconv.FormatFloat(v, 'f', 1, 64) }

func (c RGB) hex() string { return fmt.Sprintf("#%02x%02x%02x", c.R, c.G, c.B) }

func (s *SVG) FillRect(x, y, w, h float64, c RGB) {
	if w <= 0 || h <= 0 {
		return
	}
	fmt.Fprintf(&s.b, `<rect x="%s" y="%s" width="%s" height="%s" fill="%s"/>`, f1(x), f1(y), f1(w), f1(h), c.hex())
}

func pts(p []Pt) string {
	var b strings.Builder
	for i, q := range p {
		if i > 0 {
			b.WriteByte(' ')
		}
		b.WriteString(f1(q.X))
		b.WriteByte(',')
		b.WriteString(f1(q.Y))
	}
	return b.String()
}

func (s *SVG) FillPolygon(p []Pt, c RGB) {
	fmt.Fprintf(&s.b, `<polygon points="%s" fill="%s"/>`, pts(p), c.hex())
}

func (s *SVG) Polyline(p []Pt, c RGB, width float64, dashed bool) {
	dash := ""
	if dashed {
		dash = ` stroke-dasharray="6 4"`
	}
	fmt.Fprintf(&s.b, `<polyline points="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linejoin="round"%s/>`,
		pts(p), c.hex(), f1(width), dash)
}

func (s *SVG) Text(x, y float64, t string, c RGB, size float64, align Align, bold bool) {
	anchor := "start"
	switch align {
	case AlignCenter:
		anchor = "middle"
	case AlignRight:
		anchor = "end"
	}
	w := ""
	if bold {
		w = ` font-weight="bold"`
	}
	fmt.Fprintf(&s.b, `<text x="%s" y="%s" fill="%s" font-size="%s" text-anchor="%s"%s>%s</text>`,
		f1(x), f1(y), c.hex(), f1(size), anchor, w, html.EscapeString(t))
}

func (s *SVG) TextVertical(x, y float64, t string, c RGB, size float64) {
	fmt.Fprintf(&s.b, `<text transform="translate(%s,%s) rotate(-90)" fill="%s" font-size="%s" text-anchor="middle" dominant-baseline="central">%s</text>`,
		f1(x), f1(y), c.hex(), f1(size), html.EscapeString(t))
}

func (s *SVG) Clip(x, y, w, h float64) {
	s.clipID++
	fmt.Fprintf(&s.b, `<clipPath id="c%d"><rect x="%s" y="%s" width="%s" height="%s"/></clipPath><g clip-path="url(#c%d)">`,
		s.clipID, f1(x), f1(y), f1(w), f1(h), s.clipID)
	s.open++
}

func (s *SVG) Unclip() {
	if s.open > 0 {
		s.b.WriteString("</g>")
		s.open--
	}
}

// String renvoie le document SVG. prefix rend les identifiants uniques
// quand plusieurs SVG sont dans la même page.
func (s *SVG) String(prefix string) string {
	for s.open > 0 {
		s.Unclip()
	}
	body := s.b.String()
	if prefix != "" {
		body = strings.ReplaceAll(body, `id="c`, `id="`+prefix+`c`)
		body = strings.ReplaceAll(body, `url(#c`, `url(#`+prefix+`c`)
	}
	return fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %s %s" width="100%%" `+
		`font-family="Segoe UI, Tahoma, Arial, sans-serif" role="img">%s</svg>`, f1(s.W), f1(s.H), body)
}

// FanSVG et HistogramSVG produisent les graphiques au format SVG.
func FanSVG(r *Result, currency string, w, h float64) string {
	s := NewSVG(w, h)
	DrawFan(s, w, h, r, currency, 12)
	return s.String("fan")
}

func HistogramSVG(r *Result, currency string, w, h float64) string {
	s := NewSVG(w, h)
	DrawHistogram(s, w, h, r, currency, 12)
	return s.String("hist")
}
