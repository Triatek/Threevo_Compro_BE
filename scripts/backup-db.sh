#!/usr/bin/env bash
# Back up the PostgreSQL database with pg_dump and keep the latest N backups.
#
# Usage:
#   ./scripts/backup-db.sh
#   BACKUP_DIR=/var/backups/threevo KEEP=30 ./scripts/backup-db.sh
#
# DATABASE_URL is read from the environment, or from ENV_FILE (default .env).
# Restore: pg_restore --clean --if-exists --no-owner --dbname "<url>" <file>.dump
# Cron (daily 02:00): 0 2 * * * cd /srv/threevo-api && ./scripts/backup-db.sh >> backups/backup.log 2>&1
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP="${KEEP:-14}"
ENV_FILE="${ENV_FILE:-.env}"

if [[ -z "${DATABASE_URL:-}" && -f "$ENV_FILE" ]]; then
  DATABASE_URL="$(grep -E '^\s*DATABASE_URL\s*=' "$ENV_FILE" | head -n 1 | cut -d= -f2- | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^["'\'']//' -e 's/["'\'']$//')"
fi
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL not found (environment variable or $ENV_FILE)" >&2
  exit 1
fi

# pg_dump does not understand Prisma's "?schema=public" parameter.
DB_URL="${DATABASE_URL%%\?*}"

mkdir -p "$BACKUP_DIR"
FILE="$BACKUP_DIR/threevo_$(date +%Y%m%d_%H%M%S).dump"

pg_dump --dbname="$DB_URL" --format=custom --no-owner --file="$FILE"
echo "Backup created: $FILE"

# Keep only the newest $KEEP backups.
ls -1t "$BACKUP_DIR"/threevo_*.dump 2>/dev/null | tail -n +"$((KEEP + 1))" | while read -r old; do
  rm -f -- "$old"
  echo "Removed old backup: $old"
done
