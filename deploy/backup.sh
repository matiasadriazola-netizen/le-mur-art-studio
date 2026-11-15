#!/usr/bin/env bash
# Respaldo diario de Le Mur: base de datos (pg_dump) + fotos subidas.
# Se instala en /opt/lemur/backup.sh y corre por cron. Guarda 30 días en /root/backups/lemur.
set -euo pipefail
DEST=/root/backups/lemur
KEEP_DAYS=${KEEP_DAYS:-30}
STAMP=$(date -u +%Y%m%d-%H%M%S)
mkdir -p "$DEST"
chmod 700 "$DEST"

DBURL=$(grep ^DATABASE_URL= /opt/lemur/shared/.env | cut -d= -f2- | tr -d '"')
pg_dump --format=custom --no-owner --dbname="$DBURL" --file="$DEST/db-$STAMP.dump"
tar -czf "$DEST/uploads-$STAMP.tgz" -C /opt/lemur/shared uploads

# Verificación mínima: el dump se puede leer
pg_restore --list "$DEST/db-$STAMP.dump" >/dev/null

find "$DEST" -type f \( -name 'db-*.dump' -o -name 'uploads-*.tgz' \) -mtime +"$KEEP_DAYS" -delete
echo "$(date -u +%FT%TZ) ok db-$STAMP.dump $(du -h "$DEST/db-$STAMP.dump" | cut -f1) uploads $(du -h "$DEST/uploads-$STAMP.tgz" | cut -f1)" >> "$DEST/backup.log"
