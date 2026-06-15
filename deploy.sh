#!/bin/bash
# =============================================================
# Rich Dating Network — Server Deployment Script
# Run this on your DirectAdmin server after git pull:
#   bash deploy.sh
# Requires: .env file at project root with DATABASE_URL set
# =============================================================

set -e
cd "$(dirname "$0")"

echo "==============================="
echo "  Rich Dating Network Deploy"
echo "==============================="

# Load .env
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | grep -v '^$' | xargs)
  echo "[env] Loaded .env"
else
  echo "[env] ERROR: No .env file found. Copy .env.example to .env and fill in values."
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  echo "[env] ERROR: DATABASE_URL is not set in .env"
  exit 1
fi

# 1. Install Node.js 22+ via NVM if not present
if ! command -v node &> /dev/null || [[ $(node -v | cut -d. -f1 | tr -d 'v') -lt 20 ]]; then
  echo "[1/9] Installing Node.js via NVM..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  source ~/.bashrc
  source ~/.nvm/nvm.sh 2>/dev/null || true
  nvm install 22
  nvm use 22
  nvm alias default 22
else
  echo "[1/9] Node.js $(node -v) found ✓"
fi

# 2. Install pnpm if not present
if ! command -v pnpm &> /dev/null; then
  echo "[2/9] Installing pnpm..."
  npm install -g pnpm
else
  echo "[2/9] pnpm $(pnpm -v) found ✓"
fi

# 3. Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
  echo "[3/9] Installing PM2..."
  npm install -g pm2
else
  echo "[3/9] PM2 $(pm2 -v) found ✓"
fi

# 4. Install dependencies
echo "[4/9] Installing dependencies..."
pnpm install --frozen-lockfile

# 5. Run legacy PHP → new schema migration
echo "[5/9] Running legacy database migration..."
echo "      (Safe to re-run — uses INSERT IGNORE / WHERE NOT EXISTS)"

DB_USER=$(echo "$DATABASE_URL" | sed 's|mysql[0-9]*://||' | cut -d: -f1)
DB_PASS=$(echo "$DATABASE_URL" | sed 's|mysql[0-9]*://[^:]*:||' | cut -d@ -f1)
DB_HOST=$(echo "$DATABASE_URL" | sed 's|mysql[0-9]*://[^@]*@||' | cut -d: -f1 | cut -d/ -f1)
DB_PORT=$(echo "$DATABASE_URL" | sed 's|mysql[0-9]*://[^@]*@[^:]*:||' | cut -d/ -f1)
DB_NAME=$(echo "$DATABASE_URL" | sed 's|.*/||' | cut -d? -f1)
DB_PORT=${DB_PORT:-3306}

if [ -n "$DB_PASS" ]; then
  mysql -u"$DB_USER" -p"$DB_PASS" -h"$DB_HOST" -P"$DB_PORT" "$DB_NAME" < scripts/migrate-from-legacy.sql && echo "      Migration OK ✓"
else
  mysql -u"$DB_USER" -h"$DB_HOST" -P"$DB_PORT" "$DB_NAME" < scripts/migrate-from-legacy.sql && echo "      Migration OK ✓"
fi

# 6. Push Drizzle schema (create/alter any missing tables or columns)
echo "[6/9] Syncing Drizzle schema..."
pnpm --filter @workspace/db run push-force
echo "      Schema sync OK ✓"

# 7. Build API server
echo "[7/9] Building API server..."
pnpm --filter @workspace/api-server run build

# 8. Build frontend
echo "[8/9] Building frontend..."
BASE_PATH=/ pnpm --filter @workspace/rich-dating-network run build

# Copy built frontend to public_html
DOMAIN_DIR="/home/admin/domains/test.richdatingnetwork.com/public_html"
mkdir -p "$DOMAIN_DIR"
\cp -rf artifacts/rich-dating-network/dist/public/. "$DOMAIN_DIR/"

# Create .htaccess for SPA routing + API proxy
cat > "$DOMAIN_DIR/.htaccess" << 'HTACCESS'
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_URI} !^/api/
RewriteRule ^ index.html [QSA,L]

# Proxy /api to Node.js server on port 8080
RewriteCond %{REQUEST_URI} ^/api/
RewriteRule ^api/(.*) http://localhost:8080/api/$1 [P,L]
HTACCESS

# 9. Start/restart PM2
echo "[9/9] Starting/restarting with PM2..."
pm2 stop rdn-api 2>/dev/null || true
pm2 delete rdn-api 2>/dev/null || true

pm2 start artifacts/api-server/dist/index.mjs \
  --name rdn-api \
  --env production \
  --max-memory-restart 512M \
  --log ~/.pm2/logs/rdn-api.log

pm2 save
pm2 startup 2>/dev/null | tail -1 | bash 2>/dev/null || true

echo ""
echo "==============================="
echo "  Deployment Complete! ✓"
echo "==============================="
echo "  API: http://localhost:8080"
echo "  Site: https://test.richdatingnetwork.com"
echo ""
echo "  Check status:  pm2 status"
echo "  View logs:     pm2 logs rdn-api"
echo "==============================="
