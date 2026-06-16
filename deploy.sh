#!/bin/bash
# =============================================================
# Rich Dating Network — Server Deployment Script
# Run this on your DirectAdmin server after git pull:
#   bash deploy.sh
#
# How it works:
#   - Express (port 8080) serves BOTH the API AND the React app
#   - Apache proxies the ENTIRE domain to port 8080
#   - No mod_proxy_html needed — one simple ProxyPass rule
#
# Requires: .env file at project root (same folder as this script)
#
# DATABASE: Production uses MySQL (DirectAdmin).
#   DATABASE_URL must start with mysql:// in .env
#   Replit dev environment uses PostgreSQL (auto-detected by code).
# =============================================================

set -e
cd "$(dirname "$0")"

echo "==============================="
echo "  Rich Dating Network Deploy"
echo "==============================="

# ── 0. Pull latest code from GitHub ────────────────────────
echo "[0/7] Pulling latest code from GitHub..."
# Stash local files (.env, uploads, etc.) so pull never fails
git stash --quiet 2>/dev/null || true
git pull origin main
# Restore stashed changes — use || true so empty stash never breaks the chain
git stash pop --quiet 2>/dev/null; true
echo "      Code updated ✓"

# ── Load .env ──────────────────────────────────────────────
if [ -f ".env" ]; then
  set -a
  source .env
  set +a
  echo "[env] Loaded .env ✓"
else
  echo "[env] ERROR: No .env file found."
  echo "      Copy .env.example to .env and fill in values."
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  echo "[env] ERROR: DATABASE_URL is not set in .env"
  exit 1
fi

# ── 1. Node.js ─────────────────────────────────────────────
if ! command -v node &>/dev/null || [[ $(node -v | cut -d. -f1 | tr -d 'v') -lt 20 ]]; then
  echo "[1/7] Installing Node.js 22 via NVM..."
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
  nvm install 22
  nvm use 22
  nvm alias default 22
else
  echo "[1/7] Node.js $(node -v) ✓"
fi

# Load NVM if installed but not in PATH
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

# ── 2. pnpm ────────────────────────────────────────────────
if ! command -v pnpm &>/dev/null; then
  echo "[2/7] Installing pnpm..."
  npm install -g pnpm
else
  echo "[2/7] pnpm $(pnpm -v) ✓"
fi

# ── 3. PM2 ─────────────────────────────────────────────────
if ! command -v pm2 &>/dev/null; then
  echo "[3/7] Installing PM2..."
  npm install -g pm2
else
  echo "[3/7] PM2 $(pm2 -v) ✓"
fi

# ── 4. Install deps ────────────────────────────────────────
echo "[4/7] Installing dependencies..."
pnpm install --frozen-lockfile

# ── 5. DB migration + schema sync ──────────────────────────
# This single SQL script handles EVERYTHING:
#   - Creates all new app tables (CREATE TABLE IF NOT EXISTS)
#   - Adds missing columns to existing tables (ALTER TABLE ... ADD COLUMN IF NOT EXISTS)
#   - Migrates data from legacy PHP tables
#   - Safe to re-run — all statements are idempotent
# We do NOT use drizzle-kit push here because it requires interactive input
# when it detects the many legacy tables in the database.
echo "[5/7] Running database migration + schema sync..."
echo "      (Safe to re-run — all idempotent)"

DB_USER=$(echo "$DATABASE_URL" | sed 's|mysql[0-9]*://||' | cut -d: -f1)
DB_PASS=$(echo "$DATABASE_URL" | sed 's|mysql[0-9]*://[^:]*:||' | cut -d@ -f1)
DB_HOST=$(echo "$DATABASE_URL" | sed 's|mysql[0-9]*://[^@]*@||' | cut -d: -f1 | cut -d/ -f1)
DB_PORT_RAW=$(echo "$DATABASE_URL" | sed 's|mysql[0-9]*://[^@]*@[^:]*:||' | cut -d/ -f1)
DB_NAME=$(echo "$DATABASE_URL" | sed 's|.*/||' | cut -d? -f1)
DB_PORT=${DB_PORT_RAW:-3306}

MYSQL_CMD="mysql -u${DB_USER} -h${DB_HOST} -P${DB_PORT} ${DB_NAME}"
if [ -n "$DB_PASS" ]; then
  MYSQL_CMD="mysql -u${DB_USER} -p${DB_PASS} -h${DB_HOST} -P${DB_PORT} ${DB_NAME}"
fi

$MYSQL_CMD < scripts/migrate-from-legacy.sql && echo "      Migration + schema sync OK ✓" || echo "      Migration warning (check output above)"

echo "      Linking legacy photos to user profiles..."
node scripts/import-legacy-photos.mjs && echo "      Photo import OK ✓" || echo "      Photo import warning (non-fatal)"

# ── 6. Build ───────────────────────────────────────────────
echo "[6/7] Building..."
pnpm --filter @workspace/api-server run build
echo "      API server built ✓"

BASE_PATH=/ pnpm --filter @workspace/rich-dating-network run build
echo "      Frontend built ✓"

# ── 7. Configure Apache + start PM2 ───────────────────────
echo "[7/7] Configuring Apache proxy & starting PM2..."

# Write .htaccess at project root — proxies EVERYTHING to Node.js on 8080
# This requires mod_proxy + mod_proxy_http to be enabled in Apache.
# If your DirectAdmin doesn't support .htaccess ProxyPass, use the
# CustomHTTP configuration in DirectAdmin > Domains > domain.conf instead.
cat > .htaccess << 'HTACCESS'
# Proxy all requests to Node.js server on port 8080
# Requires mod_proxy and mod_proxy_http in Apache
DirectoryIndex disabled

RewriteEngine On
RewriteRule ^(.*)$ http://localhost:8080/$1 [P,L,QSA]

# Fallback for websockets
RewriteCond %{HTTP:Upgrade} websocket [NC]
RewriteCond %{HTTP:Connection} upgrade [NC]
RewriteRule ^(.*)$ ws://localhost:8080/$1 [P,L]
HTACCESS

# Stop PM2 process and wait for port 8080 to be released
pm2 stop rdn-api 2>/dev/null || true
pm2 delete rdn-api 2>/dev/null || true
sleep 2
# Force-free port 8080 if something is still holding it (EADDRINUSE prevention)
fuser -k 8080/tcp 2>/dev/null || lsof -ti :8080 | xargs kill -9 2>/dev/null || true
sleep 1

pm2 start ecosystem.config.cjs
pm2 save
# Run pm2 startup (may need sudo — skip if it fails)
pm2 startup 2>/dev/null | grep -v "^$" | grep "sudo" | bash 2>/dev/null || true

echo ""
echo "==============================="
echo "  Deployment Complete! ✓"
echo "==============================="
echo "  Node.js: http://localhost:8080"
echo "  Site:    https://test.richdatingnetwork.com"
echo ""
echo "  Status:  pm2 status"
echo "  Logs:    pm2 logs rdn-api --lines 50"
echo ""
echo "  NOTE: Apache must have mod_proxy enabled."
echo "  If site still shows PHP/old content, see README"
echo "  for DirectAdmin Node.js App configuration."
echo "==============================="
