#!/bin/sh
# Construit la version web (dossier ../montecarlo-web) : module WebAssembly
# et worker (wasm_exec.js de Go + worker_src.js). À lancer depuis ce dossier.
set -e
GOOS=js GOARCH=wasm go build -trimpath -ldflags "-s -w" -o ../montecarlo-web/mc.wasm ./wasm
EXEC="$(go env GOROOT)/lib/wasm/wasm_exec.js"
[ -f "$EXEC" ] || EXEC="$(go env GOROOT)/misc/wasm/wasm_exec.js"
{ echo "// Fichier généré par build-web.sh : ne pas modifier, voir wasm/worker_src.js."; cat "$EXEC"; echo; cat wasm/worker_src.js; } > ../montecarlo-web/worker.js
echo "OK : ../montecarlo-web/mc.wasm et ../montecarlo-web/worker.js"
