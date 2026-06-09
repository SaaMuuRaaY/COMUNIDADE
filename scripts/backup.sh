#!/usr/bin/env bash
# Backup do banco Supabase (Postgres dump).
# Uso: SUPABASE_DB_URL="postgres://postgres:[senha]@db.xxxx.supabase.co:5432/postgres" ./scripts/backup.sh
# A connection string está em: Supabase Dashboard → Project Settings → Database → Connection string.
set -euo pipefail

: "${SUPABASE_DB_URL:?Defina SUPABASE_DB_URL com a connection string do Postgres}"

mkdir -p backups
STAMP="$(date +%F_%H%M)"
OUT="backups/codex-${STAMP}.sql"

echo "Gerando backup em ${OUT}…"
npx supabase db dump --db-url "${SUPABASE_DB_URL}" -f "${OUT}"
echo "OK: ${OUT}"

# Retenção local: mantém os 14 backups mais recentes.
ls -1t backups/codex-*.sql 2>/dev/null | tail -n +15 | xargs -r rm --

# Opcional: enviar para armazenamento externo (descomente e configure):
# rclone copy "${OUT}" remote:codex-backups/
# aws s3 cp "${OUT}" s3://seu-bucket/codex-backups/
