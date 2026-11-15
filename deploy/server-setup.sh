#!/usr/bin/env bash
# Preparación única del VPS para Le Mur (idempotente). Corre como root.
set -euo pipefail
mkdir -p /opt/lemur/releases /opt/lemur/shared/uploads /root/backups

# Base de datos y usuario propios
if ! sudo -u postgres psql -tAc "select 1 from pg_roles where rolname='lemur'" | grep -q 1; then
  PGPASS=$(openssl rand -hex 24)
  sudo -u postgres psql -c "create role lemur login password '$PGPASS'"
  sudo -u postgres psql -c "create database lemur owner lemur"
else
  PGPASS=""
fi

# Configuración (solo se crea la primera vez; nunca se sobrescribe)
if [ ! -f /opt/lemur/shared/.env ]; then
  [ -n "$PGPASS" ] || { echo "El rol lemur ya existía pero falta .env: crea DATABASE_URL a mano"; exit 1; }
  cat > /opt/lemur/shared/.env <<ENV
APP_URL=https://www.lemurstudio.cl
DATABASE_URL="postgresql://lemur:${PGPASS}@127.0.0.1:5432/lemur"
ADMIN_PASSWORD=$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-20)
SESSION_SECRET=$(openssl rand -hex 32)
WEBPAY_ENV=integration
WEBPAY_COMMERCE_CODE=597052992296
WEBPAY_API_KEY=
CRON_SECRET=$(openssl rand -hex 16)
ENV
  chmod 600 /opt/lemur/shared/.env
  echo ".env creado"
fi

# Cron: cierra sorteos vencidos aunque nadie visite el sitio
KEY=$(grep ^CRON_SECRET= /opt/lemur/shared/.env | cut -d= -f2)
LINE="* * * * * curl -s -m 20 -H 'Host: www.lemurstudio.cl' 'http://127.0.0.1:3040/api/cron?key=${KEY}' >/dev/null 2>&1 # lemur-cron"
{ crontab -l 2>/dev/null | grep -v '# lemur-cron' || true; echo "$LINE"; } | crontab -
echo "setup ok"
