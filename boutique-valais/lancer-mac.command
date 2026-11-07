#!/bin/bash
# Double-cliquez sur ce fichier pour lancer la boutique (Mac).
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js n'est pas installé. Installez-le depuis https://nodejs.org puis relancez ce fichier."
  read -r -p "Appuyez sur Entrée pour fermer."
  exit 1
fi
node server.js --open
