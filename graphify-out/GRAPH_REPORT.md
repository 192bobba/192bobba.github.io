# Graph Report - 192bobba.github.io  (2026-11-12)

## Corpus Check
- 111 files · ~71,035 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 19 file(s) not represented in the graph (top: (none) 9, .command 2, .bat 2)

## Summary
- 1135 nodes · 2889 edges · 39 communities (34 shown, 5 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 251 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d29b0ca9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Boutique : interface et pages
- boutique-valais/server.js
- Boutique : scènes 3D
- Monte Carlo : dessin des graphiques
- Monte Carlo : app web et build
- Monte Carlo : runtime WASM
- Monte Carlo : dépendances Go
- Monte Carlo : interface Windows
- Monte Carlo : formats et rapport
- App Sommeil
- boutique-valais-3d/public/js/app.js
- Script cours Yahoo
- Workflow GitHub Actions
- Monte Carlo : données Yahoo
- Boutique : package.json
- Monte Carlo : import CSV
- Monte Carlo : pont WASM
- Monte Carlo : paramètres et simulation
- Boutique : mise à jour auto
- ComputeStats
- boutique-valais-3d/src/api.js
- Worker web (amorce)
- Script de build web
- Service worker
- Module Go
- terrain.js
- boutique-valais-3d/public/js/three/flag-scene.js
- world.js
- emblem.js
- Boutique 13 Étoiles : version 3D (prototype)
- ref_node_path
- boutique-valais-3d/package.json
- AppError
- boutique-valais/src/api.js
- atmosphere.js
- boutique-valais/src/store.js
- boutique-valais-3d/scripts/update.js
- boutique-valais/public/js/shared/orders.js

## God Nodes (most connected - your core abstractions)
1. `html()` - 39 edges
2. `html()` - 37 edges
3. `app` - 30 edges
4. `renderCheckout()` - 21 edges
5. `renderCheckout()` - 21 edges
6. `DrawHistogram()` - 21 edges
7. `DrawFan()` - 20 edges
8. `Series` - 20 edges
9. `FormatNumber()` - 20 edges
10. `Boutique 13 Etoiles README` - 20 edges

## Surprising Connections (you probably didn't know these)
- `Monte Carlo redirect page (to montecarlo-web/)` --semantically_similar_to--> `Boutique online entry redirect page (to public/, keeps hash)`  [INFERRED] [semantically similar]
  montecarlo.html → boutique-valais/index.html
- `localStorage persistence (sleep_entries, sleep_settings)` --semantically_similar_to--> `GitHub Pages demo mode (demo-store.js, data kept in the browser)`  [INFERRED] [semantically similar]
  sommeilv3.html → boutique-valais/README.md
- `Monte Carlo redirect page (to montecarlo-web/)` --references--> `Monte Carlo web app (iPad / browser) page`  [EXTRACTED]
  montecarlo.html → montecarlo-web/index.html
- `Web release cache-busting (VERSION in sw.js, ?v= in index.html and sw.js)` --references--> `Service worker offline mode (sw.js)`  [INFERRED]
  montecarlo/README.md → montecarlo-web/index.html
- `Web build script (build-web.sh)` --references--> `WASM calculation engine (worker.js + mc.wasm)`  [INFERRED]
  montecarlo/README.md → montecarlo-web/index.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Dual backend: Node server with JSON files vs browser demo store sharing common rules** — boutique_valais_readme_node_server, boutique_valais_readme_json_file_storage, boutique_valais_readme_demo_mode, boutique_valais_readme_shared_rules [EXTRACTED 1.00]
- **Ticker price loading flow (site copy, GitHub fallback, on-demand Actions copy)** — montecarlo_web_index_loadyahoo, montecarlo_web_index_fetchcopy, montecarlo_web_index_requestcopy, montecarlo_web_index_ghfile, montecarlo_readme_cours_yahoo_workflow, montecarlo_web_index_price_data_copies [EXTRACTED 1.00]
- **Shared Go mc core across Win32 GUI, CLI and WebAssembly targets** — montecarlo_readme_mc_package, montecarlo_readme_win32_gui, montecarlo_readme_cli_version, montecarlo_readme_wasm_bridge [INFERRED 0.85]

## Communities (39 total, 5 thin omitted)

### Community 0 - "Boutique : interface et pages"
Cohesion: 0.07
Nodes (95): askAge(), hasAnswered(), isAdult(), listeners, onAgeChange(), setStatus(), status, api (+87 more)

### Community 1 - "boutique-valais/server.js"
Cohesion: 0.14
Nodes (13): server, handleApi(), logout(), requireAdmin(), sessions, tokenFrom(), config, settings (+5 more)

### Community 2 - "Boutique : scènes 3D"
Cohesion: 0.06
Nodes (27): createFlagScene(), buildSkyStars(), buildSnow(), buildStars(), buildTerrain(), createHeroScene(), fbm(), gradientTexture() (+19 more)

### Community 3 - "Monte Carlo : dessin des graphiques"
Cohesion: 0.10
Nodes (21): frame, Surface, SVG, colorref(), newGDISurface(), gdiSurface, axes(), boxedText() (+13 more)

### Community 4 - "Monte Carlo : app web et build"
Cohesion: 0.09
Nodes (48): Monte Carlo redirect page (to montecarlo-web/), Monte Carlo source README, Web build script (build-web.sh), Non-Windows command-line version (main_other.go, for tests), cours-yahoo.yml GitHub Actions workflow (tools/cours_yahoo.py), Windows exe build (GOOS=windows go build -H windowsgui -o ../MonteCarlo.exe), mc package (Yahoo Finance, CSV, statistics, simulation, charts, HTML report), Go tests (go test ./mc, MC_NET=1 for live Yahoo) (+40 more)

### Community 5 - "Monte Carlo : runtime WASM"
Cohesion: 0.05
Nodes (5): constructor(), ready, _resume(), write(), writeSync()

### Community 6 - "Monte Carlo : dépendances Go"
Cohesion: 0.10
Nodes (6): shortErr(), genCSV(), genCSVQuoted(), TestParseCSVFormats(), looksNumeric(), rowsTable()

### Community 7 - "Monte Carlo : interface Windows"
Cohesion: 0.15
Nodes (4): app, bold(), main(), userError()

### Community 8 - "Monte Carlo : formats et rapport"
Cohesion: 0.16
Nodes (28): main(), FormatNumber(), FormatPct(), FormatPctPlain(), FormatPrice(), PriceDecimals(), TestFormat(), BuildReport() (+20 more)

### Community 9 - "App Sommeil"
Cohesion: 0.06
Nodes (45): Boutique online entry redirect page (to public/, keeps hash), Boutique 13 Etoiles SPA shell (public/index.html), Header cart link with count badge (data-cart-count), Footer links (Boutique, Panier, Verification de l'age, Admin), Main content mount (#contenu), Toast notification root (#toast-root), Boutique 13 Etoiles README, Admin space (#/admin, password valais1815) (+37 more)

### Community 10 - "boutique-valais-3d/public/js/app.js"
Cohesion: 0.06
Nodes (103): askAge(), hasAnswered(), isAdult(), listeners, onAgeChange(), setStatus(), status, api (+95 more)

### Community 11 - "Script cours Yahoo"
Cohesion: 0.16
Nodes (9): compact(), download(), fetch(), file_name(), main(), merge(), normalize(), read_lines() (+1 more)

### Community 12 - "Workflow GitHub Actions"
Cohesion: 0.08
Nodes (23): runs-on, steps, timeout-minutes, TICKERS, tickers, jobs, copie, name (+15 more)

### Community 13 - "Monte Carlo : données Yahoo"
Cohesion: 0.20
Nodes (16): UserError, yahooChart, Series, NormalizeTicker(), notEnough(), ParseYahooJSON(), sameDay(), SeriesFromYahoo() (+8 more)

### Community 14 - "Boutique : package.json"
Cohesion: 0.12
Nodes (16): description, engines, node, name, private, scripts, reset, serve (+8 more)

### Community 15 - "Monte Carlo : import CSV"
Cohesion: 0.20
Nodes (11): cleanDate(), csvErr(), findCol(), isDigits(), mkDate(), normHeader(), ParseCSV(), parseDates() (+3 more)

### Community 16 - "Monte Carlo : pont WASM"
Cohesion: 0.28
Nodes (11): charts(), check(), fail(), loadCSV(), loaded(), loadYahoo(), report(), simulate() (+3 more)

### Community 17 - "Monte Carlo : paramètres et simulation"
Cohesion: 0.20
Nodes (8): Method, TestQuantilesUnsorted(), Params, gridDays(), Quantile(), quantilesUnsorted(), selectK(), Simulate()

### Community 18 - "Boutique : mise à jour auto"
Cohesion: 0.21
Nodes (10): ARCHIVE_VERSION_FILE, checkForUpdates(), download(), parsePax(), PROTECTED, readLocalVersion(), readSource(), readTar() (+2 more)

### Community 19 - "ComputeStats"
Cohesion: 0.21
Nodes (14): ParamInput, parsePrice(), TestYahooAMD(), ParseNumber(), syntheticSeries(), TestBigSimulationSpeed(), TestParseNumber(), TestParseParams() (+6 more)

### Community 20 - "boutique-valais-3d/src/api.js"
Cohesion: 0.06
Nodes (45): call(), demo(), modeReady, readToken(), request(), server, writeToken(), createDemoStore() (+37 more)

### Community 26 - "terrain.js"
Cohesion: 0.12
Nodes (21): createNoiseTexture(), fade(), fbm(), noise(), ridged(), smoothstep(), createTerrain(), FACES (+13 more)

### Community 27 - "boutique-valais-3d/public/js/three/flag-scene.js"
Cohesion: 0.10
Nodes (7): createFlagScene(), createRenderer(), disposeScene(), prefersReducedMotion(), startLoop(), trackPointer(), pointer

### Community 28 - "world.js"
Cohesion: 0.13
Nodes (20): createClouds(), createSky(), altitudeMeters(), createWorld(), applyPalette(), computeGoal(), drawFrame(), keepAboveGround() (+12 more)

### Community 29 - "emblem.js"
Cohesion: 0.13
Nodes (15): CONSTELLATION_PATH, createEmblem(), createFlag(), createHeadlamps(), update(), createStars(), update(), createVillage() (+7 more)

### Community 30 - "Boutique 13 Étoiles : version 3D (prototype)"
Cohesion: 0.10
Nodes (20): 1. Lancer le site, 2. Ouvrir le site sur un iPad ou un téléphone, 3. Tester la boutique, 4. Gérer vos produits (photos, prix, ajouts…), 5. Où modifier quoi ?, 6. Organisation du code, 7. Avant une vraie mise en ligne (hors périmètre du prototype), Ajouter la photo d'un produit (+12 more)

### Community 31 - "ref_node_path"
Cohesion: 0.14
Nodes (10): config, settings, DATA_DIR, PUBLIC_DIR, ROOT_DIR, UPLOADS_DIR, categories, FILES (+2 more)

### Community 32 - "boutique-valais-3d/package.json"
Cohesion: 0.12
Nodes (16): description, engines, node, name, private, scripts, reset, serve (+8 more)

### Community 33 - "AppError"
Cohesion: 0.28
Nodes (13): call(), demo(), createDemoStore(), createKeyValueStore(), fetchJson(), openDatabase(), AppError, parseOptionList() (+5 more)

### Community 34 - "boutique-valais/src/api.js"
Cohesion: 0.16
Nodes (9): adminLogin(), adminUpdateProduct(), adminUploadImage(), createOrder(), findProductOr404(), getProduct(), IMAGE_TYPES, routes (+1 more)

### Community 35 - "atmosphere.js"
Cohesion: 0.16
Nodes (5): createSkyStars(), createSnow(), hash(), CLOUD_Y, neighbour()

### Community 36 - "boutique-valais/src/store.js"
Cohesion: 0.16
Nodes (8): DATA_DIR, PUBLIC_DIR, ROOT_DIR, UPLOADS_DIR, categories, FILES, orders, products

### Community 37 - "boutique-valais-3d/scripts/update.js"
Cohesion: 0.26
Nodes (10): ARCHIVE_VERSION_FILE, checkForUpdates(), download(), parsePax(), PROTECTED, readLocalVersion(), readSource(), readTar() (+2 more)

### Community 38 - "boutique-valais/public/js/shared/orders.js"
Cohesion: 0.42
Nodes (7): ageFromBirthDate(), buildOrder(), nextOrderNumber(), PAYMENT_METHODS, pickOption(), text(), toCents()

## Knowledge Gaps
- **12 isolated node(s):** `montecarlo`, `Main content mount (#contenu)`, `Toast notification root (#toast-root)`, `version.txt (git export-subst stamp $Format:%H %ct$)`, `three.js (vendored in public/vendor/three)` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 335 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AppError` connect `AppError` to `Boutique : interface et pages`, `boutique-valais/server.js`, `boutique-valais/src/api.js`, `boutique-valais/public/js/shared/orders.js`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **What connects `montecarlo`, `Main content mount (#contenu)`, `Toast notification root (#toast-root)` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Boutique : interface et pages` be split into smaller, more focused modules?**
  _Cohesion score 0.06551773251673551 - nodes in this community are weakly interconnected._
- **Should `boutique-valais/server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `Boutique : scènes 3D` be split into smaller, more focused modules?**
  _Cohesion score 0.0576271186440678 - nodes in this community are weakly interconnected._
- **Should `Monte Carlo : dessin des graphiques` be split into smaller, more focused modules?**
  _Cohesion score 0.09548022598870057 - nodes in this community are weakly interconnected._
- **Should `Monte Carlo : app web et build` be split into smaller, more focused modules?**
  _Cohesion score 0.08784313725490196 - nodes in this community are weakly interconnected._