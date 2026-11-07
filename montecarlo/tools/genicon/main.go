// genicon dessine l'icône de l'application.
// Usage : genicon fichier.png [taille] [pleine]
// « pleine » remplit tout le carré (icône d'écran d'accueil iPad).
package main

import (
	"image"
	"image/color"
	"image/png"
	"math"
	"os"
	"strconv"
)

func main() {
	size := 256
	if len(os.Args) > 2 {
		size, _ = strconv.Atoi(os.Args[2])
	}
	full := len(os.Args) > 3 && os.Args[3] == "pleine"
	const n = 256
	k := float64(size) / n
	img := image.NewRGBA(image.Rect(0, 0, size, size))
	inRound := func(x, y int) bool {
		if full {
			return x >= 0 && y >= 0 && x < n && y < n
		}
		r := 36.0
		fx, fy := float64(x)+0.5, float64(y)+0.5
		cx := math.Max(r+8, math.Min(fx, n-8-r))
		cy := math.Max(r+8, math.Min(fy, n-8-r))
		return math.Hypot(fx-cx, fy-cy) <= r
	}
	// Dessin en coordonnées 256×256, échantillonné à la taille demandée.
	set := func(x, y int, c color.RGBA) {
		for py := int(float64(y) * k); py < int(float64(y+1)*k); py++ {
			for px := int(float64(x) * k); px < int(float64(x+1)*k); px++ {
				img.Set(px, py, c)
			}
		}
	}
	center := func(x float64) float64 { return 168 - 0.30*(x-28) } // tendance médiane
	for y := 0; y < n; y++ {
		for x := 0; x < n; x++ {
			if !inRound(x, y) {
				continue
			}
			c := color.RGBA{255, 255, 255, 255}
			fx, fy := float64(x), float64(y)
			if fx >= 28 && fx <= 228 {
				t := (fx - 28) / 200
				d := math.Abs(fy - center(fx))
				switch {
				case d <= 78*t+2:
					c = color.RGBA{204, 222, 240, 255}
				}
				if d <= 38*t+1 {
					c = color.RGBA{140, 182, 222, 255}
				}
				if d <= 7 {
					c = color.RGBA{8, 48, 107, 255}
				}
			}
			if fy >= 214 && fy <= 222 && fx >= 24 && fx <= 232 {
				c = color.RGBA{60, 60, 60, 255}
			}
			if fx >= 24 && fx <= 32 && fy >= 30 && fy <= 222 {
				c = color.RGBA{60, 60, 60, 255}
			}
			set(x, y, c)
		}
	}
	// contour
	for y := 0; y < n; y++ {
		for x := 0; x < n; x++ {
			if !full && inRound(x, y) && (!inRound(x-3, y) || !inRound(x+3, y) || !inRound(x, y-3) || !inRound(x, y+3)) {
				set(x, y, color.RGBA{70, 70, 70, 255})
			}
		}
	}
	f, err := os.Create(os.Args[1])
	if err != nil {
		panic(err)
	}
	defer f.Close()
	if err := png.Encode(f, img); err != nil {
		panic(err)
	}
}
