# Simulation Monte Carlo – code source

- `mc/` : calcul (Yahoo Finance, CSV, statistiques, simulation, graphiques, rapport HTML), sans dépendance à Windows.
- `main_windows.go`, `gdi_windows.go` : interface Win32 (bibliothèque lxn/walk) et dessin GDI.
- `main_other.go` : version ligne de commande hors Windows (tests).
- `wasm/` : passerelle WebAssembly et code du worker de la version web (application iPad dans `../montecarlo-web/`).
- `winres/` : icône, manifeste et informations de version ; `rsrc_windows_amd64.syso` en est la version compilée.

Compilation de l'exe (depuis ce dossier) :

    GOOS=windows GOARCH=amd64 go build -trimpath -ldflags "-H windowsgui -s -w" -o ../MonteCarlo.exe .

Tests : `go test ./mc` (ajouter `MC_NET=1` pour tester Yahoo Finance en direct).

Version web (application iPad, dossier `../montecarlo-web/`) : `./build-web.sh`.
Après une mise à jour, changer `VERSION` dans `../montecarlo-web/sw.js` et les `?v=` de `index.html` et `sw.js`.
