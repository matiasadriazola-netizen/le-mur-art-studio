#!/usr/bin/env bash
# Publica el último commit en el VPS: sube el código, instala, compila y reinicia sin tocar otros sitios.
# Uso: npm run deploy   (requiere el acceso SSH "srv681041" en ~/.ssh/config)
set -euo pipefail
HOST=${DEPLOY_HOST:-srv681041}
SHA=$(git rev-parse --short HEAD)
[ -z "$(git status --porcelain)" ] || echo "Aviso: hay cambios sin commit; se publica solo el último commit ($SHA)."
REL=/opt/lemur/releases/$(date +%Y%m%d-%H%M%S)-$SHA
echo "Publicando $SHA en $HOST:$REL"
git archive --format=tar HEAD | ssh "$HOST" "mkdir -p $REL && tar -x -C $REL"
ssh "$HOST" "bash -s" <<REMOTE
set -euo pipefail
cd $REL
ln -sfn /opt/lemur/shared/.env .env
rm -rf public/uploads && ln -sfn /opt/lemur/shared/uploads public/uploads
npm ci --no-audit --no-fund --loglevel=error
set -a; . ./.env; set +a
npx prisma generate >/dev/null && npx prisma db push --skip-generate
NEXT_TELEMETRY_DISABLED=1 npm run build >/tmp/lemur-build.log 2>&1 || { tail -40 /tmp/lemur-build.log; exit 1; }
ln -sfn $REL /opt/lemur/current
if pm2 describe lemur >/dev/null 2>&1; then pm2 reload lemur --update-env; else pm2 start $REL/ecosystem.config.cjs; fi
pm2 save >/dev/null
# conserva las 5 versiones más recientes
ls -1dt /opt/lemur/releases/* | tail -n +6 | xargs -r rm -rf
sleep 3; curl -s -o /dev/null -w "app responde: %{http_code}\n" -H 'Host: www.lemurstudio.cl' http://127.0.0.1:3040/
REMOTE
