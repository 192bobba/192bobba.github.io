# Simulation Monte Carlo – code source

- `mc/` : calcul (Yahoo Finance, CSV, statistiques, simulation, graphiques, rapport HTML), sans dépendance à Windows.
- `main_windows.go`, `gdi_windows.go` : interface Win32 (bibliothèque lxn/walk) et dessin GDI.
- `main_other.go` : version ligne de commande hors Windows (tests).
- `wasm/` : passerelle WebAssembly utilisée par la version web (`../montecarlo.html`, fichiers dans `../montecarlo-web/`).
- `winres/` : icône, manifeste et informations de version ; `rsrc_windows_amd64.syso` en est la version compilée.

Compilation de l'exe (depuis ce dossier) :

    GOOS=windows GOARCH=amd64 go build -trimpath -ldflags "-H windowsgui -s -w" -o ../MonteCarlo.exe .

Tests : `go test ./mc` (ajouter `MC_NET=1` pour tester Yahoo Finance en direct).

Module WebAssembly de la version web :

    GOOS=js GOARCH=wasm go build -trimpath -ldflags "-s -w" -o ../montecarlo-web/mc.wasm ./wasm
