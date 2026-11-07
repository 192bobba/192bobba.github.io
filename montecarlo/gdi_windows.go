//go:build windows

package main

import (
	"syscall"
	"unsafe"

	"github.com/lxn/win"

	"montecarlo/mc"
)

var (
	gdi32            = syscall.NewLazyDLL("gdi32.dll")
	user32           = syscall.NewLazyDLL("user32.dll")
	procPolygon      = gdi32.NewProc("Polygon")
	procSetTextAlign = gdi32.NewProc("SetTextAlign")
	procCreateBrush  = gdi32.NewProc("CreateSolidBrush")
	procFillRect     = user32.NewProc("FillRect")
)

const (
	taLeft       = 0
	taRight      = 2
	taCenter     = 6
	taBaseline   = 24
	nullPen      = 8
	psGeometric  = 0x00010000
	psEndcapFlat = 0x00000200
	psJoinRound  = 0x00000000
)

// gdiSurface dessine les graphiques de mc avec GDI. Les coordonnées sont en
// unités logiques (96 ppp) multipliées par scale.
type gdiSurface struct {
	hdc   win.HDC
	scale float64
	fonts map[[3]int]win.HFONT
}

func newGDISurface(hdc win.HDC, dpi int) *gdiSurface {
	if dpi <= 0 {
		dpi = 96
	}
	return &gdiSurface{hdc: hdc, scale: float64(dpi) / 96, fonts: map[[3]int]win.HFONT{}}
}

func (s *gdiSurface) close() {
	for _, f := range s.fonts {
		win.DeleteObject(win.HGDIOBJ(f))
	}
}

func colorref(c mc.RGB) win.COLORREF {
	return win.COLORREF(uint32(c.R) | uint32(c.G)<<8 | uint32(c.B)<<16)
}

func (s *gdiSurface) px(v float64) int32 {
	if v >= 0 {
		return int32(v*s.scale + 0.5)
	}
	return int32(v*s.scale - 0.5)
}

func (s *gdiSurface) points(p []mc.Pt) []win.POINT {
	out := make([]win.POINT, len(p))
	for i, q := range p {
		out[i] = win.POINT{X: s.px(q.X), Y: s.px(q.Y)}
	}
	return out
}

func (s *gdiSurface) FillRect(x, y, w, h float64, c mc.RGB) {
	if w <= 0 || h <= 0 {
		return
	}
	br, _, _ := procCreateBrush.Call(uintptr(colorref(c)))
	if br == 0 {
		return
	}
	r := win.RECT{Left: s.px(x), Top: s.px(y), Right: s.px(x + w), Bottom: s.px(y + h)}
	if r.Right == r.Left {
		r.Right++
	}
	procFillRect.Call(uintptr(s.hdc), uintptr(unsafe.Pointer(&r)), br)
	win.DeleteObject(win.HGDIOBJ(br))
}

func (s *gdiSurface) FillPolygon(p []mc.Pt, c mc.RGB) {
	if len(p) < 3 {
		return
	}
	br, _, _ := procCreateBrush.Call(uintptr(colorref(c)))
	if br == 0 {
		return
	}
	oldBr := win.SelectObject(s.hdc, win.HGDIOBJ(br))
	oldPen := win.SelectObject(s.hdc, win.GetStockObject(nullPen))
	pts := s.points(p)
	procPolygon.Call(uintptr(s.hdc), uintptr(unsafe.Pointer(&pts[0])), uintptr(len(pts)))
	win.SelectObject(s.hdc, oldPen)
	win.SelectObject(s.hdc, oldBr)
	win.DeleteObject(win.HGDIOBJ(br))
}

func (s *gdiSurface) Polyline(p []mc.Pt, c mc.RGB, width float64, dashed bool) {
	if len(p) < 2 {
		return
	}
	w := uint32(width*s.scale + 0.5)
	if w < 1 {
		w = 1
	}
	style := uint32(win.PS_SOLID)
	if dashed {
		style = win.PS_DASH
	}
	lb := win.LOGBRUSH{LbStyle: win.BS_SOLID, LbColor: colorref(c)}
	pen := win.ExtCreatePen(psGeometric|style|psEndcapFlat|psJoinRound, w, &lb, 0, nil)
	if pen == 0 {
		return
	}
	old := win.SelectObject(s.hdc, win.HGDIOBJ(pen))
	pts := s.points(p)
	win.Polyline(s.hdc, unsafe.Pointer(&pts[0]), int32(len(pts)))
	win.SelectObject(s.hdc, old)
	win.DeleteObject(win.HGDIOBJ(pen))
}

func (s *gdiSurface) font(size float64, bold bool, vertical bool) win.HFONT {
	h := int(size*s.scale + 0.5)
	key := [3]int{h, 0, 0}
	if bold {
		key[1] = 1
	}
	if vertical {
		key[2] = 1
	}
	if f, ok := s.fonts[key]; ok {
		return f
	}
	lf := win.LOGFONT{LfHeight: -int32(h), LfWeight: 400, LfCharSet: win.DEFAULT_CHARSET,
		LfQuality: win.CLEARTYPE_QUALITY}
	if bold {
		lf.LfWeight = 700
	}
	if vertical {
		lf.LfEscapement, lf.LfOrientation = 900, 900
	}
	name, _ := syscall.UTF16FromString("Segoe UI")
	copy(lf.LfFaceName[:], name)
	f := win.CreateFontIndirect(&lf)
	s.fonts[key] = f
	return f
}

func (s *gdiSurface) textOut(x, y int32, t string, c mc.RGB, f win.HFONT, align uint32) {
	u, err := syscall.UTF16FromString(t)
	if err != nil || len(u) <= 1 {
		return
	}
	old := win.SelectObject(s.hdc, win.HGDIOBJ(f))
	win.SetBkMode(s.hdc, win.TRANSPARENT)
	win.SetTextColor(s.hdc, colorref(c))
	procSetTextAlign.Call(uintptr(s.hdc), uintptr(align|taBaseline))
	win.TextOut(s.hdc, x, y, &u[0], int32(len(u)-1))
	win.SelectObject(s.hdc, old)
}

func (s *gdiSurface) Text(x, y float64, t string, c mc.RGB, size float64, align mc.Align, bold bool) {
	a := uint32(taLeft)
	switch align {
	case mc.AlignCenter:
		a = taCenter
	case mc.AlignRight:
		a = taRight
	}
	s.textOut(s.px(x), s.px(y), t, c, s.font(size, bold, false), a)
}

func (s *gdiSurface) TextVertical(x, y float64, t string, c mc.RGB, size float64) {
	// Texte tourné de 90° : la ligne de base est verticale, décalée pour centrer.
	s.textOut(s.px(x+size*0.35), s.px(y), t, c, s.font(size, false, true), taCenter)
}

func (s *gdiSurface) Clip(x, y, w, h float64) {
	win.SaveDC(s.hdc)
	win.IntersectClipRect(s.hdc, s.px(x), s.px(y), s.px(x+w), s.px(y+h))
}

func (s *gdiSurface) Unclip() { win.RestoreDC(s.hdc, -1) }
