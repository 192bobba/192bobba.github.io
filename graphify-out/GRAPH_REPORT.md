# Graph Report - 192bobba.github.io  (2026-11-09)

## Corpus Check
- Corpus is ~43,644 words - fits in a single context window. You may not need a graph.

## Summary
- 752 nodes · 1886 edges · 26 communities (20 shown, 6 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 214 edges (avg confidence: 0.85)
- Token cost: 136,363 input · 0 output

## Community Hubs (Navigation)
- Boutique : interface et pages
- Boutique : données, démo et règles
- Boutique : scènes 3D
- Monte Carlo : dessin des graphiques
- Monte Carlo : app web et build
- Monte Carlo : runtime WASM
- Monte Carlo : dépendances Go
- Monte Carlo : interface Windows
- Monte Carlo : formats et rapport
- App Sommeil
- Boutique : documentation et page
- Script cours Yahoo
- Workflow GitHub Actions
- Monte Carlo : données Yahoo
- Boutique : package.json
- Monte Carlo : import CSV
- Monte Carlo : pont WASM
- Monte Carlo : paramètres et simulation
- Boutique : mise à jour auto
- Monte Carlo : tests
- Worker web (amorce)
- Script de build web
- Service worker
- Module Go

## God Nodes (most connected - your core abstractions)
1. `html()` - 37 edges
2. `app` - 30 edges
3. `renderCheckout()` - 21 edges
4. `DrawHistogram()` - 21 edges
5. `DrawFan()` - 20 edges
6. `Series` - 20 edges
7. `FormatNumber()` - 20 edges
8. `Boutique 13 Etoiles README` - 20 edges
9. `Monte Carlo web app (iPad / browser) page` - 20 edges
10. `AppError` - 18 edges

## Surprising Connections (you probably didn't know these)
- `localStorage persistence (sleep_entries, sleep_settings)` --semantically_similar_to--> `GitHub Pages demo mode (demo-store.js, data kept in the browser)`  [INFERRED] [semantically similar]
  sommeilv3.html → boutique-valais/README.md
- `Monte Carlo redirect page (to montecarlo-web/)` --semantically_similar_to--> `Boutique online entry redirect page (to public/, keeps hash)`  [INFERRED] [semantically similar]
  montecarlo.html → boutique-valais/index.html
- `Monte Carlo redirect page (to montecarlo-web/)` --references--> `Monte Carlo web app (iPad / browser) page`  [EXTRACTED]
  montecarlo.html → montecarlo-web/index.html
- `192bobba.github.io README` --references--> `Boutique 13 Etoiles README`  [EXTRACTED]
  README.md → boutique-valais/README.md
- `Windows exe build (GOOS=windows go build -H windowsgui -o ../MonteCarlo.exe)` --references--> `MonteCarlo.exe (Windows build)`  [INFERRED]
  montecarlo/README.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Ticker price loading flow (site copy, GitHub fallback, on-demand Actions copy)** — montecarlo_web_index_loadyahoo, montecarlo_web_index_fetchcopy, montecarlo_web_index_requestcopy, montecarlo_web_index_ghfile, montecarlo_readme_cours_yahoo_workflow, montecarlo_web_index_price_data_copies [EXTRACTED 1.00]
- **Shared Go mc core across Win32 GUI, CLI and WebAssembly targets** — montecarlo_readme_mc_package, montecarlo_readme_win32_gui, montecarlo_readme_cli_version, montecarlo_readme_wasm_bridge [INFERRED 0.85]
- **Dual backend: Node server with JSON files vs browser demo store sharing common rules** — boutique_valais_readme_node_server, boutique_valais_readme_json_file_storage, boutique_valais_readme_demo_mode, boutique_valais_readme_shared_rules [EXTRACTED 1.00]

## Communities (26 total, 6 thin omitted)

### Community 0 - "Boutique : interface et pages"
Cohesion: 0.07
Nodes (95): askAge(), hasAnswered(), isAdult(), listeners, onAgeChange(), setStatus(), status, api (+87 more)

### Community 1 - "Boutique : données, démo et règles"
Cohesion: 0.05
Nodes (50): call(), demo(), createDemoStore(), createKeyValueStore(), fetchJson(), openDatabase(), ageFromBirthDate(), AppError (+42 more)

### Community 2 - "Boutique : scènes 3D"
Cohesion: 0.06
Nodes (27): createFlagScene(), buildSkyStars(), buildSnow(), buildStars(), buildTerrain(), createHeroScene(), fbm(), gradientTexture() (+19 more)

### Community 3 - "Monte Carlo : dessin des graphiques"
Cohesion: 0.11
Nodes (20): frame, Surface, SVG, colorref(), newGDISurface(), gdiSurface, axes(), boxedText() (+12 more)

### Community 4 - "Monte Carlo : app web et build"
Cohesion: 0.09
Nodes (48): Monte Carlo source README, Web build script (build-web.sh), Non-Windows command-line version (main_other.go, for tests), cours-yahoo.yml GitHub Actions workflow (tools/cours_yahoo.py), Windows exe build (GOOS=windows go build -H windowsgui -o ../MonteCarlo.exe), mc package (Yahoo Finance, CSV, statistics, simulation, charts, HTML report), Go tests (go test ./mc, MC_NET=1 for live Yahoo), wasm/ WebAssembly bridge and web worker code (+40 more)

### Community 5 - "Monte Carlo : runtime WASM"
Cohesion: 0.05
Nodes (5): constructor(), ready, _resume(), write(), writeSync()

### Community 6 - "Monte Carlo : dépendances Go"
Cohesion: 0.10
Nodes (8): main(), looksNumeric(), ReportFileName(), rowsTable(), MaxDrawdown(), FanSVG(), HistogramSVG(), NewSVG()

### Community 7 - "Monte Carlo : interface Windows"
Cohesion: 0.12
Nodes (4): app, bold(), userError(), rowModel

### Community 8 - "Monte Carlo : formats et rapport"
Cohesion: 0.19
Nodes (25): Method, main(), HistBins(), FormatNumber(), FormatPct(), FormatPctPlain(), FormatPrice(), PriceDecimals() (+17 more)

### Community 9 - "App Sommeil"
Cohesion: 0.09
Nodes (21): App Sommeil, Sommeil sleep tracking app page (sommeilv3.html), Chip, computeDuration(), computeScore(), deleteEntry(), durationScore(), Personalised sleep insight message (+13 more)

### Community 10 - "Boutique : documentation et page"
Cohesion: 0.15
Nodes (24): Boutique online entry redirect page (to public/, keeps hash), Boutique 13 Etoiles SPA shell (public/index.html), Header cart link with count badge (data-cart-count), Footer links (Boutique, Panier, Verification de l'age, Admin), Main content mount (#contenu), Toast notification root (#toast-root), Boutique 13 Etoiles README, Admin space (#/admin, password valais1815) (+16 more)

### Community 11 - "Script cours Yahoo"
Cohesion: 0.16
Nodes (9): compact(), download(), fetch(), file_name(), main(), merge(), normalize(), read_lines() (+1 more)

### Community 12 - "Workflow GitHub Actions"
Cohesion: 0.08
Nodes (23): runs-on, steps, timeout-minutes, TICKERS, tickers, jobs, copie, name (+15 more)

### Community 13 - "Monte Carlo : données Yahoo"
Cohesion: 0.17
Nodes (16): UserError, yahooChart, Series, NormalizeTicker(), notEnough(), ParseYahooJSON(), sameDay(), SeriesFromYahoo() (+8 more)

### Community 14 - "Boutique : package.json"
Cohesion: 0.12
Nodes (16): description, engines, node, name, private, scripts, reset, serve (+8 more)

### Community 15 - "Monte Carlo : import CSV"
Cohesion: 0.20
Nodes (12): cleanDate(), csvErr(), findCol(), isDigits(), mkDate(), normHeader(), ParseCSV(), parseDates() (+4 more)

### Community 16 - "Monte Carlo : pont WASM"
Cohesion: 0.28
Nodes (13): charts(), check(), fail(), loadCSV(), loaded(), loadYahoo(), output(), report() (+5 more)

### Community 17 - "Monte Carlo : paramètres et simulation"
Cohesion: 0.21
Nodes (9): ParamInput, ParseInt(), ParseParams(), ParseYears(), Params, gridDays(), quantilesUnsorted(), selectK() (+1 more)

### Community 18 - "Boutique : mise à jour auto"
Cohesion: 0.19
Nodes (10): ARCHIVE_VERSION_FILE, checkForUpdates(), download(), parsePax(), PROTECTED, readLocalVersion(), readSource(), readTar() (+2 more)

### Community 19 - "Monte Carlo : tests"
Cohesion: 0.30
Nodes (12): TestYahooAMD(), genCSV(), genCSVQuoted(), syntheticSeries(), TestBigSimulationSpeed(), TestParseCSVCloseOnlyAndErrors(), TestParseCSVFormats(), TestParseNumber() (+4 more)

## Knowledge Gaps
- **12 isolated node(s):** `montecarlo`, `three.js (vendored in public/vendor/three)`, `Main content mount (#contenu)`, `Toast notification root (#toast-root)`, `version.txt (git export-subst stamp $Format:%H %ct$)` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 220 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AppError` connect `Boutique : données, démo et règles` to `Boutique : interface et pages`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `DrawHistogram()` (e.g. with `.X()` and `.Y()`) actually correct?**
  _`DrawHistogram()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `montecarlo`, `three.js (vendored in public/vendor/three)`, `Main content mount (#contenu)` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Boutique : interface et pages` be split into smaller, more focused modules?**
  _Cohesion score 0.06551773251673551 - nodes in this community are weakly interconnected._
- **Why does `app` connect `Monte Carlo : interface Windows` to `Monte Carlo : formats et rapport`, `Monte Carlo : paramètres et simulation`, `Monte Carlo : données Yahoo`, `Monte Carlo : dépendances Go`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `DrawFan()` (e.g. with `.X()` and `.Y()`) actually correct?**
  _`DrawFan()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Should `Boutique : données, démo et règles` be split into smaller, more focused modules?**
  _Cohesion score 0.05048766494549627 - nodes in this community are weakly interconnected._