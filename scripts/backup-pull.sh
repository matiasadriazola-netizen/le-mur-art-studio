#!/usr/bin/env bash
# Descarga a este Mac los respaldos del VPS (copia fuera del servidor). Uso: npm run backup:pull
set -euo pipefail
DEST=${LEMUR_BACKUP_DIR:-$HOME/Respaldos/le-mur}
mkdir -p "$DEST"
rsync -a --ignore-existing srv681041:/root/backups/lemur/ "$DEST/"
echo "Respaldos en $DEST:"; ls -1t "$DEST" | grep -E '^db-' | head -3
