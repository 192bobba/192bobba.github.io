//go:build windows

// MonteCarlo : simulation Monte Carlo de cours d'actions (interface Win32).
package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"syscall"
	"time"

	"github.com/lxn/walk"
	. "github.com/lxn/walk/declarative"
	"github.com/lxn/win"

	"montecarlo/mc"
)

// rowModel alimente un TableView avec des lignes mc.Row.
type rowModel struct {
	walk.TableModelBase
	rows []mc.Row
}

func (m *rowModel) RowCount() int { return len(m.rows) }

func (m *rowModel) Value(row, col int) interface{} {
	if row < 0 || row >= len(m.rows) {
		return ""
	}
	r := m.rows[row]
	switch col {
	case 0:
		return r.Label
	case 1:
		return r.Value
	default:
		return r.Extra
	}
}

func (m *rowModel) set(rows []mc.Row) {
	m.rows = rows
	m.PublishRowsReset()
}

type app struct {
	mw *walk.MainWindow

	tickerLE, yearsLE, horizonLE, simsLE, retLE, volLE, targetLE *walk.LineEdit
	methodCB                                                     *walk.ComboBox
	retHist, volHist                                             *walk.Label
	loadBtn, csvBtn, runBtn, exportBtn                           *walk.PushButton

	infoVals [8]*walk.Label
	warnLbl  *walk.TextLabel

	tabs            *walk.TabWidget
	fanCW, histCW   *walk.CustomWidget
	pctTV, riskTV   *walk.TableView
	hypTV           *walk.TableView
	pctM, riskM     *rowModel
	hypM            *rowModel
	stateSB, discSB *walk.StatusBarItem

	series *mc.Series
	hist   *mc.HistStats
	res    *mc.Result
	busy   bool
}

var infoLabels = [8]string{"Nom :", "Devise :", "Dernier cours :", "Rendement annuel hist. :",
	"Volatilité annuelle hist. :", "Pire baisse historique :", "Période :", "Source :"}

func main() {
	a := &app{pctM: &rowModel{}, riskM: &rowModel{}, hypM: &rowModel{}}
	if err := a.build(); err != nil {
		walk.MsgBox(nil, "Simulation Monte Carlo", "Impossible de créer la fenêtre :\n"+err.Error(),
			walk.MsgBoxIconError)
		return
	}
	a.mw.Run()
}

func bold() Font { return Font{Family: "MS Shell Dlg 2", PointSize: 8, Bold: true} }

func (a *app) build() error {
	infoChildren := []Widget{}
	for i, l := range infoLabels {
		infoChildren = append(infoChildren,
			Label{Text: l, MinSize: Size{Width: 140}, MaxSize: Size{Width: 140}},
			Label{AssignTo: &a.infoVals[i], Text: "-", EllipsisMode: EllipsisEnd})
	}

	tvCol := func(title string, w int, far bool) TableViewColumn {
		c := TableViewColumn{Title: title, Width: w}
		if far {
			c.Alignment = AlignFar
		}
		return c
	}

	mwDecl := MainWindow{
		AssignTo: &a.mw,
		Title:    "Simulation Monte Carlo – Actions",
		MinSize:  Size{Width: 1100, Height: 700},
		Size:     Size{Width: 1200, Height: 760},
		Layout:   HBox{Margins: Margins{Left: 6, Top: 6, Right: 6, Bottom: 2}, Spacing: 6, Alignment: AlignHNearVNear},
		Children: []Widget{
			Composite{
				MinSize: Size{Width: 410},
				MaxSize: Size{Width: 410},
				Layout:  VBox{MarginsZero: true, Spacing: 6},
				Children: []Widget{
					GroupBox{
						Title:  "Données",
						Layout: Grid{Columns: 3, Spacing: 4},
						Children: []Widget{
							Label{Text: "Ticker Yahoo Finance :"},
							LineEdit{AssignTo: &a.tickerLE, Text: "AMD", MinSize: Size{Width: 90}, MaxSize: Size{Width: 90},
								ToolTipText: "Exemples : AMD, AAPL, NESN.SW, UBSG.SW",
								OnKeyDown: func(k walk.Key) {
									if k == walk.KeyReturn {
										a.loadYahoo()
									}
								}},
							Label{Text: "ex. NESN.SW"},
							Label{Text: "Années d'historique :"},
							LineEdit{AssignTo: &a.yearsLE, Text: "5", MinSize: Size{Width: 90}, MaxSize: Size{Width: 90}},
							Label{Text: "(1 à 40)"},
							Composite{
								ColumnSpan: 3,
								Layout:     HBox{MarginsZero: true},
								Children: []Widget{
									PushButton{AssignTo: &a.loadBtn, Text: "Charger les données", OnClicked: a.loadYahoo},
									PushButton{AssignTo: &a.csvBtn, Text: "Ouvrir un CSV...", OnClicked: a.openCSV},
								},
							},
						},
					},
					GroupBox{
						Title:  "Paramètres de simulation",
						Layout: Grid{Columns: 3, Spacing: 4},
						Children: []Widget{
							Label{Text: "Horizon (jours de bourse) :"},
							LineEdit{AssignTo: &a.horizonLE, Text: "252", MinSize: Size{Width: 90}, MaxSize: Size{Width: 90}},
							Label{Text: "252 = 1 an"},
							Label{Text: "Nombre de simulations :"},
							LineEdit{AssignTo: &a.simsLE, Text: "10 000", MinSize: Size{Width: 90}, MaxSize: Size{Width: 90}},
							Label{Text: "(100 à 200 000)"},
							Label{Text: "Méthode de simulation :", ColumnSpan: 3},
							ComboBox{AssignTo: &a.methodCB, Model: mc.MethodNames, CurrentIndex: 0, ColumnSpan: 3},
							Label{Text: "Rendement annuel attendu (%) :"},
							LineEdit{AssignTo: &a.retLE, MinSize: Size{Width: 90}, MaxSize: Size{Width: 90},
								ToolTipText: "Facultatif : vide = rendement historique"},
							Label{AssignTo: &a.retHist, Text: "vide = historique"},
							Label{Text: "Volatilité annuelle (%) :"},
							LineEdit{AssignTo: &a.volLE, MinSize: Size{Width: 90}, MaxSize: Size{Width: 90},
								ToolTipText: "Facultatif : vide = volatilité historique"},
							Label{AssignTo: &a.volHist, Text: "vide = historique"},
							Label{Text: "Prix cible :"},
							LineEdit{AssignTo: &a.targetLE, MinSize: Size{Width: 90}, MaxSize: Size{Width: 90},
								ToolTipText: "Facultatif"},
							Label{Text: "(facultatif)"},
							PushButton{AssignTo: &a.runBtn, Text: "Lancer la simulation", ColumnSpan: 3,
								OnClicked: a.runSimulation},
							PushButton{AssignTo: &a.exportBtn, Text: "Exporter le rapport HTML", ColumnSpan: 3,
								OnClicked: a.exportReport},
						},
					},
					GroupBox{
						Title:  "Infos du titre",
						Layout: VBox{Spacing: 6},
						Children: []Widget{
							Composite{Layout: Grid{Columns: 2, Spacing: 4, MarginsZero: true}, Children: infoChildren},
							TextLabel{AssignTo: &a.warnLbl, Text: "", TextColor: walk.RGB(190, 0, 0),
								Font: bold(), Visible: false, MinSize: Size{Width: 380}, MaxSize: Size{Width: 380}},
						},
					},
					VSpacer{},
				},
			},
			TabWidget{
				AssignTo: &a.tabs,
				Pages: []TabPage{
					{
						Title:  "Trajectoires",
						Layout: VBox{MarginsZero: true},
						Children: []Widget{
							CustomWidget{AssignTo: &a.fanCW, PaintMode: PaintBuffered, InvalidatesOnResize: true,
								PaintPixels: func(c *walk.Canvas, _ walk.Rectangle) error { return a.paint(c, a.fanCW, true) }},
						},
					},
					{
						Title:  "Distribution",
						Layout: VBox{MarginsZero: true},
						Children: []Widget{
							CustomWidget{AssignTo: &a.histCW, PaintMode: PaintBuffered, InvalidatesOnResize: true,
								PaintPixels: func(c *walk.Canvas, _ walk.Rectangle) error { return a.paint(c, a.histCW, false) }},
						},
					},
					{
						Title:  "Chiffres",
						Layout: VBox{MarginsZero: true},
						Children: []Widget{
							Composite{
								Layout: VBox{Margins: Margins{Left: 8, Top: 8, Right: 8, Bottom: 8}, Spacing: 4},
								Children: []Widget{
									Label{Text: "Cours à l'horizon", Font: bold()},
									TableView{AssignTo: &a.pctTV, Model: a.pctM, ColumnsOrderable: false, StretchFactor: 7,
										Columns: []TableViewColumn{tvCol("Scénario", 260, false), tvCol("Cours", 120, true), tvCol("Variation", 110, true)}},
									Label{Text: "Probabilités et risques", Font: bold()},
									TableView{AssignTo: &a.riskTV, Model: a.riskM, ColumnsOrderable: false, StretchFactor: 8,
										Columns: []TableViewColumn{tvCol("Indicateur", 380, false), tvCol("Valeur", 120, true), tvCol("Précision", 230, false)}},
									Label{Text: "Hypothèses utilisées", Font: bold()},
									TableView{AssignTo: &a.hypTV, Model: a.hypM, ColumnsOrderable: false, StretchFactor: 13,
										Columns: []TableViewColumn{tvCol("Hypothèse", 220, false), tvCol("Valeur", 260, false), tvCol("Précision", 220, false)}},
								},
							},
						},
					},
				},
			},
		},
		StatusBarItems: []StatusBarItem{
			{AssignTo: &a.stateSB, Text: "Prêt. Saisissez un ticker puis « Charger les données ».", Width: 610},
			{AssignTo: &a.discSB, Text: mc.Disclaimer, Width: 460},
		},
	}
	if err := mwDecl.Create(); err != nil {
		return err
	}
	if ic, err := walk.NewIconFromResource("APP"); err == nil {
		a.mw.SetIcon(ic)
	}
	a.updateButtons()
	return nil
}

// ---------------------------------------------------------------- dessin

func (a *app) paint(c *walk.Canvas, cw *walk.CustomWidget, fan bool) error {
	b := cw.ClientBoundsPixels()
	s := newGDISurface(c.HDC(), c.DPI())
	defer s.close()
	w, h := float64(b.Width)/s.scale, float64(b.Height)/s.scale
	cur := ""
	if a.series != nil {
		cur = a.series.Currency
	}
	if a.res == nil {
		s.FillRect(0, 0, w, h, mc.RGB{R: 255, G: 255, B: 255})
		msg := "Chargez des données (ticker ou CSV), puis cliquez sur « Lancer la simulation »."
		if a.series != nil {
			msg = a.series.Name + " chargé. Cliquez sur « Lancer la simulation »."
		}
		s.Text(w/2, h/2, msg, mc.RGB{R: 90, G: 90, B: 90}, 13, mc.AlignCenter, false)
		return nil
	}
	if fan {
		mc.DrawFan(s, w, h, a.res, cur, 12)
	} else {
		mc.DrawHistogram(s, w, h, a.res, cur, 12)
	}
	return nil
}

func (a *app) redraw() {
	a.fanCW.Invalidate()
	a.histCW.Invalidate()
}

// ---------------------------------------------------------------- état

func (a *app) setStatus(s string) { a.stateSB.SetText(s) }

func (a *app) updateButtons() {
	a.loadBtn.SetEnabled(!a.busy)
	a.csvBtn.SetEnabled(!a.busy)
	a.runBtn.SetEnabled(!a.busy && a.series != nil)
	a.exportBtn.SetEnabled(!a.busy && a.res != nil)
}

func (a *app) setBusy(b bool, status string) {
	a.busy = b
	if status != "" {
		a.setStatus(status)
	}
	a.updateButtons()
	if b {
		a.mw.SetCursor(walk.CursorAppStarting())
	} else {
		a.mw.SetCursor(nil)
	}
}

func (a *app) showError(err error) {
	msg := err.Error()
	var ue *mc.UserError
	if !errors.As(err, &ue) {
		msg = "Erreur inattendue :\n" + msg
	}
	walk.MsgBox(a.mw, "Simulation Monte Carlo – Erreur", msg, walk.MsgBoxIconError|walk.MsgBoxOK)
}

func userError(format string, args ...interface{}) error {
	return &mc.UserError{Msg: fmt.Sprintf(format, args...)}
}

// readYears lit le nombre d'années d'historique.
func (a *app) readYears() (int, error) {
	y, err := mc.ParseYears(a.yearsLE.Text())
	if err != nil {
		a.yearsLE.SetFocus()
	}
	return y, err
}

// ---------------------------------------------------------------- données

func (a *app) loadYahoo() {
	if a.busy {
		return
	}
	years, err := a.readYears()
	if err != nil {
		a.showError(err)
		return
	}
	ticker := mc.NormalizeTicker(a.tickerLE.Text())
	if ticker == "" {
		a.tickerLE.SetFocus()
		a.showError(userError("Saisissez un ticker Yahoo Finance (ex. AMD, AAPL, NESN.SW, UBSG.SW)."))
		return
	}
	a.tickerLE.SetText(ticker)
	a.setBusy(true, "Chargement... ("+ticker+" sur Yahoo Finance)")
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 70*time.Second)
		defer cancel()
		s, err := mc.FetchYahoo(ctx, ticker, years)
		var h *mc.HistStats
		if err == nil {
			h, err = mc.ComputeStats(s)
		}
		a.mw.Synchronize(func() { a.dataLoaded(s, h, err) })
	}()
}

func (a *app) openCSV() {
	if a.busy {
		return
	}
	years, err := a.readYears()
	if err != nil {
		a.showError(err)
		return
	}
	dlg := &walk.FileDialog{
		Title:  "Ouvrir un historique de cours (CSV)",
		Filter: "Fichiers CSV (*.csv;*.txt)|*.csv;*.txt|Tous les fichiers (*.*)|*.*",
	}
	ok, err := dlg.ShowOpen(a.mw)
	if err != nil || !ok {
		return
	}
	path := dlg.FilePath
	a.setBusy(true, "Chargement... ("+filepath.Base(path)+")")
	go func() {
		var s *mc.Series
		var h *mc.HistStats
		data, err := os.ReadFile(path)
		if err != nil {
			err = userError("Impossible de lire le fichier « %s » :\n%v", filepath.Base(path), err)
		} else {
			s, err = mc.ParseCSV(data, path, years)
		}
		if err == nil {
			h, err = mc.ComputeStats(s)
		}
		a.mw.Synchronize(func() { a.dataLoaded(s, h, err) })
	}()
}

func (a *app) dataLoaded(s *mc.Series, h *mc.HistStats, err error) {
	a.setBusy(false, "")
	if err != nil {
		if a.series != nil {
			a.setStatus("Échec du chargement. Données précédentes conservées : " + a.series.Name)
		} else {
			a.setStatus("Échec du chargement.")
		}
		a.showError(err)
		return
	}
	a.series, a.hist, a.res = s, h, nil
	for i, r := range mc.InfoRows(s, h) {
		txt := r.Value
		if r.Extra != "" {
			txt += " (" + r.Extra + ")"
		}
		a.infoVals[i].SetText(txt)
		a.infoVals[i].SetToolTipText(txt)
	}
	if w := mc.Warning(h); w != "" {
		a.warnLbl.SetText(w)
		a.warnLbl.SetVisible(true)
	} else {
		a.warnLbl.SetVisible(false)
	}
	a.retHist.SetText("hist. : " + mc.FormatPct(h.AnnReturn, 1, true))
	a.volHist.SetText("hist. : " + mc.FormatPct(h.AnnVol, 1, false))
	a.pctM.set(nil)
	a.riskM.set(nil)
	a.hypM.set(nil)
	a.setStatus(fmt.Sprintf("%s chargé : %s cours du %s au %s.",
		s.Symbol, mc.FormatNumber(float64(h.NPrices), 0), mc.FormatDate(h.Start), mc.FormatDate(h.End)))
	a.updateButtons()
	a.redraw()
}

// ---------------------------------------------------------------- simulation

func (a *app) readParams() (mc.Params, error) {
	in := mc.ParamInput{
		Horizon: a.horizonLE.Text(),
		Sims:    a.simsLE.Text(),
		Return:  a.retLE.Text(),
		Vol:     a.volLE.Text(),
		Target:  a.targetLE.Text(),
		Method:  a.methodCB.CurrentIndex(),
	}
	p, field, err := mc.ParseParams(in, a.series, a.hist)
	if err != nil {
		le := map[string]*walk.LineEdit{mc.FieldHorizon: a.horizonLE, mc.FieldSims: a.simsLE,
			mc.FieldReturn: a.retLE, mc.FieldVol: a.volLE, mc.FieldTarget: a.targetLE}[field]
		if le != nil {
			le.SetFocus()
		}
	}
	return p, err
}

func (a *app) runSimulation() {
	if a.busy || a.series == nil {
		return
	}
	p, err := a.readParams()
	if err != nil {
		a.showError(err)
		return
	}
	a.setBusy(true, "Simulation...")
	h := a.hist
	go func() {
		last := -1
		progress := func(f float64) {
			pc := int(f * 100)
			if pc/5 != last/5 {
				last = pc
				a.mw.Synchronize(func() {
					if a.busy {
						a.setStatus(fmt.Sprintf("Simulation... %d %%", pc))
					}
				})
			}
		}
		r, err := mc.Simulate(context.Background(), h, p, progress)
		a.mw.Synchronize(func() { a.simDone(r, err) })
	}()
}

func (a *app) simDone(r *mc.Result, err error) {
	a.setBusy(false, "")
	if err != nil {
		a.setStatus("Échec de la simulation.")
		a.showError(err)
		return
	}
	a.res = r
	a.pctM.set(mc.PercentileRows(r))
	a.riskM.set(mc.RiskRows(r))
	a.hypM.set(mc.AssumptionRows(a.series, a.hist, r))
	a.setStatus(mc.Summary(r))
	a.updateButtons()
	a.redraw()
}

// ---------------------------------------------------------------- rapport

func (a *app) exportReport() {
	if a.res == nil {
		a.showError(userError("Lancez d'abord une simulation."))
		return
	}
	now := time.Now()
	page := mc.BuildReport(a.series, a.hist, a.res, now)
	name := mc.ReportFileName(a.series, now)
	var dirs []string
	if exe, err := os.Executable(); err == nil {
		dirs = append(dirs, filepath.Join(filepath.Dir(exe), "Rapports Monte Carlo"))
	}
	if home, err := os.UserHomeDir(); err == nil {
		dirs = append(dirs, filepath.Join(home, "Documents", "Rapports Monte Carlo"))
	}
	var path string
	var lastErr error
	for _, d := range dirs {
		if err := os.MkdirAll(d, 0o755); err != nil {
			lastErr = err
			continue
		}
		p := filepath.Join(d, name)
		if err := os.WriteFile(p, []byte(page), 0o644); err != nil {
			lastErr = err
			continue
		}
		path = p
		break
	}
	if path == "" {
		a.showError(userError("Impossible d'enregistrer le rapport :\n%v", lastErr))
		return
	}
	a.setStatus("Rapport enregistré : " + path)
	verb, _ := syscall.UTF16PtrFromString("open")
	file, _ := syscall.UTF16PtrFromString(path)
	if !win.ShellExecute(a.mw.Handle(), verb, file, nil, nil, win.SW_SHOWNORMAL) {
		walk.MsgBox(a.mw, "Rapport HTML", "Rapport enregistré ici :\n"+path+
			"\n\nOuvrez-le avec votre navigateur.", walk.MsgBoxIconInformation)
	}
}
