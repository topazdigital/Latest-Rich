#!/bin/bash
# =============================================================================
# Rich Dating Network — Production Deploy Script
# Run this on your server after pulling from GitHub:
#   bash scripts/deploy.sh
#
# Prerequisites:
#   - .env file exists at project root with DATABASE_URL=mysql://...
#   - Node.js 20+ and pnpm installed
#   - MySQL database already exists (admin_testdating or similar)
# =============================================================================

set -e
cd "$(dirname "$0")/.."
ROOT="$(pwd)"

echo ""
echo "==========================================="
echo "  Rich Dating Network — Deploy"
echo "==========================================="
echo ""

# ---- 1. Install dependencies ------------------------------------------------
echo "[1/6] Installing dependencies..."
pnpm install --frozen-lockfile
echo "      Done."

# ---- 2. Load .env -----------------------------------------------------------
if [ -f "$ROOT/.env" ]; then
  export $(grep -v '^#' "$ROOT/.env" | grep -v '^$' | xargs)
  echo "[2/6] Loaded .env"
else
  echo "[2/6] WARNING: No .env file found at $ROOT/.env"
  echo "      Create one from .env.example before deploying."
fi

if [ -z "$DATABASE_URL" ]; then
  echo "      ERROR: DATABASE_URL is not set. Aborting."
  exit 1
fi

# ---- 3. Run legacy migration ------------------------------------------------
echo "[3/6] Running legacy database migration..."
echo "      This maps old PHP tables to the new schema."
echo "      (Safe to re-run — uses INSERT IGNORE / WHERE NOT EXISTS)"

# Extract DB credentials from DATABASE_URL
# Format: mysql://user:pass@host:port/dbname
DB_USER=$(echo "$DATABASE_URL" | sed 's|mysql://||' | cut -d: -f1)
DB_PASS=$(echo "$DATABASE_URL" | sed 's|mysql://[^:]*:||' | cut -d@ -f1)
DB_HOST=$(echo "$DATABASE_URL" | sed 's|mysql://[^@]*@||' | cut -d: -f1 | cut -d/ -f1)
DB_PORT=$(echo "$DATABASE_URL" | sed 's|mysql://[^@]*@[^:]*:||' | cut -d/ -f1)
DB_NAME=$(echo "$DATABASE_URL" | sed 's|.*/||')

# Default port
DB_PORT=${DB_PORT:-3306}

if [ -n "$DB_PASS" ]; then
  mysql -u"$DB_USER" -p"$DB_PASS" -h"$DB_HOST" -P"$DB_PORT" "$DB_NAME" < scripts/migrate-from-legacy.sql
else
  mysql -u"$DB_USER" -h"$DB_HOST" -P"$DB_PORT" "$DB_NAME" < scripts/migrate-from-legacy.sql
fi
echo "      Done."

# ---- 4. Push Drizzle schema (add any missing columns/tables) ----------------
echo "[4/6] Syncing database schema with Drizzle..."
pnpm --filter @workspace/db run push-force
echo "      Done."

# ---- 5. Build API server ----------------------------------------------------
echo "[5/6] Building API server..."
pnpm --filter @workspace/api-server run build
echo "      Done."

# ---- 6. Build frontend -------------------------------------------------------
echo "[6/6] Building frontend..."
pnpm --filter @workspace/rich-dating-network run build
echo "      Done."

echo ""
echo "==========================================="
echo "  Deploy complete!"
echo "  Restart your Node.js process to apply."
echo "  Example:  pm2 restart all"
echo "==========================================="
echo ""
