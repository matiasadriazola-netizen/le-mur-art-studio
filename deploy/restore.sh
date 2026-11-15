#!/usr/bin/env bash
# Restaura un respaldo de Le Mur en el VPS. Uso:
#   bash /opt/lemur/restore.sh /root/backups/lemur/db-AAAAMMDD-HHMMSS.dump [/root/backups/lemur/uploads-AAAAMMDD-HHMMSS.tgz]
# Antes de restaurar hace un respaldo del estado actual.
set -euo pipefail
DUMP=${1:?Indica el archivo db-*.dump}
UPL=${2:-}
bash /opt/lemur/backup.sh
DBURL=$(grep ^DATABASE_URL= /opt/lemur/shared/.env | cut -d= -f2- | tr -d '"')
pm2 stop lemur
pg_restore --clean --if-exists --no-owner --dbname="$DBURL" "$DUMP"
if [ -n "$UPL" ]; then
  mv /opt/lemur/shared/uploads "/opt/lemur/shared/uploads.antes-$(date +%s)"
  tar -xzf "$UPL" -C /opt/lemur/shared
fi
pm2 start lemur
echo "Restaurado desde $DUMP"
