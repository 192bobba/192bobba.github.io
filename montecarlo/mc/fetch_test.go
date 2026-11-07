//go:build !js

package mc

import (
	"context"
	"errors"
	"os"
	"strings"
	"testing"
)

// Tests réseau (Yahoo Finance) : activés avec MC_NET=1.
func TestYahooAMD(t *testing.T) {
	if os.Getenv("MC_NET") == "" {
		t.Skip("MC_NET non défini")
	}
	s, err := FetchYahoo(context.Background(), " amd ", 5)
	if err != nil {
		t.Fatal(err)
	}
	h, err := ComputeStats(s)
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("%s %s %s : %d cours %s–%s, dernier %v, rdt %.1f%%, vol %.1f%%, pire baisse %.1f%%",
		s.Symbol, s.Name, s.Currency, len(s.Adj), FormatDate(h.Start), FormatDate(h.End), s.LastPrice,
		h.AnnReturn*100, h.AnnVol*100, h.MaxDrawdown*100)
	if s.Currency != "USD" || len(s.Adj) < 1000 || s.LastPrice <= 0 {
		t.Fatal("données AMD incohérentes")
	}
	_, err = FetchYahoo(context.Background(), "ZZZZXQ9", 5)
	var ue *UserError
	if !errors.As(err, &ue) || !strings.Contains(err.Error(), "inconnu") {
		t.Fatalf("ticker invalide : %v", err)
	}
	t.Logf("ticker invalide → %v", err)
	for _, tk := range []string{"NESN.SW", "UBSG.SW", "AAPL"} {
		s, err := FetchYahoo(context.Background(), tk, 2)
		if err != nil {
			t.Fatal(tk, err)
		}
		t.Logf("%s : %s, %s, %d cours, dernier %v", tk, s.Name, s.Currency, len(s.Adj), s.LastPrice)
	}
}
