#!/bin/bash
# =============================================================================
# Rich Dating Network — Server Deploy Script (Bash)
# Run this directly on the server via SSH:
#   bash /path/to/scripts/deploy-server.sh
# Or after git pull:
#   bash scripts/deploy-server.sh
# =============================================================================

# Critical steps use set -e; migration steps use || true so PM2 always starts

# ─── CONFIGURATION ────────────────────────────────────────────────────────────

GITHUB_REPO="https://github.com/topazdigital/Latest-Rich.git"
SITE_DIR="/home/admin/domains/test.richdatingnetwork.com/public_html"
OLD_UPLOADS_DIR="/home/admin/domains/richdatingnetwork.com/public_html/assets/sources/uploads"
NEW_UPLOADS_DIR="$SITE_DIR/assets/sources/uploads"

DB_HOST="localhost"
DB_NAME="admin_testdating"
DB_USER="admin_testdating"
DB_PASS="EEhm0XRgtewBSUBditW7"
JWT_SECRET="rdn-jwt-secret-CHANGE-THIS-to-something-long-and-random"
APP_URL="https://test.richdatingnetwork.com"
API_PORT=8080

ADMIN_EMAIL="patrickndungu.pnn@gmail.com"
ADMIN_PASSWORD="dj@Topaz27899310"

DATABASE_URL="mysql://${DB_USER}:${DB_PASS}@${DB_HOST}:3306/${DB_NAME}"

# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo "====================================================="
echo "  Rich Dating Network — Server Deploy"
echo "====================================================="
echo "  Site dir : $SITE_DIR"
echo "  DB       : $DATABASE_URL"
echo "  API port : $API_PORT"
echo "====================================================="
echo ""


# ─── STEP 1: Ensure Node.js, pnpm, PM2 ────────────────────────────────────────

set -e
echo "[1/8] Checking Node.js, pnpm, PM2..."

# NVM (most DirectAdmin setups use NVM)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

if ! command -v node &>/dev/null || [[ $(node -v | cut -d. -f1 | tr -d 'v') -lt 18 ]]; then
  echo "  Installing Node.js 20 via NVM..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  source "$NVM_DIR/nvm.sh"
  nvm install 20
  nvm use 20
  nvm alias default 20
fi

echo "  Node.js: $(node -v)"

if ! command -v pnpm &>/dev/null; then
  echo "  Installing pnpm..."
  npm install -g pnpm
fi
echo "  pnpm: $(pnpm -v)"

if ! command -v pm2 &>/dev/null; then
  echo "  Installing PM2..."
  npm install -g pm2
fi
echo "  PM2: $(pm2 -v)"
echo ""


# ─── STEP 2: Pull latest code ─────────────────────────────────────────────────

echo "[2/8] Pulling latest code from GitHub..."
mkdir -p "$SITE_DIR"
cd "$SITE_DIR"

if [ -d '.git' ]; then
  git fetch origin
  git reset --hard origin/main
  echo "  Code updated from GitHub."
else
  git clone "$GITHUB_REPO" .
  echo "  Repository cloned."
fi

echo "  Installing dependencies..."
pnpm install --frozen-lockfile
echo ""


# ─── STEP 3: Write .env ───────────────────────────────────────────────────────

echo "[3/8] Writing .env..."
cat > "$SITE_DIR/.env" << ENVEOF
DATABASE_URL=$DATABASE_URL
JWT_SECRET=$JWT_SECRET
APP_URL=$APP_URL
NODE_ENV=production
PORT=$API_PORT
ENVEOF
echo "  .env written."
echo ""


# ─── STEP 4: Build API + frontend ─────────────────────────────────────────────

echo "[4/8] Building API server and frontend (takes 2-4 minutes)..."
cd "$SITE_DIR"
export DATABASE_URL JWT_SECRET NODE_ENV=production

echo "  Building API server..."
pnpm --filter @workspace/api-server run build

echo "  Building frontend..."
BASE_PATH=/ pnpm --filter @workspace/rich-dating-network run build

echo "  Copying frontend to public_html..."
cp -r "$SITE_DIR/artifacts/rich-dating-network/dist/." "$SITE_DIR/"
echo "  Build complete."
echo ""


# ─── STEP 5: Write .htaccess ──────────────────────────────────────────────────

echo "[5/8] Writing Apache .htaccess..."
cat > "$SITE_DIR/.htaccess" << 'HTEOF'
Options -MultiViews
RewriteEngine On

# Proxy /api/* and /ws/* to the Node.js API on port 8080
RewriteCond %{REQUEST_URI} ^/(api|ws)(/|$)
RewriteRule ^(.*)$ http://127.0.0.1:8080/$1 [P,L]

# SPA fallback — serve index.html for all other routes
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [QSA,L]
HTEOF
echo "  .htaccess written."
echo ""


# ─── STEP 6: Copy uploads from old site ───────────────────────────────────────

echo "[6/8] Copying uploads from old site..."
mkdir -p "$NEW_UPLOADS_DIR"

if [ -d "$OLD_UPLOADS_DIR" ]; then
  echo "  Starting rsync (may take a few minutes for 15,000+ files)..."
  rsync -a --info=progress2 "$OLD_UPLOADS_DIR/" "$NEW_UPLOADS_DIR/"
  COUNT=$(ls "$NEW_UPLOADS_DIR" | wc -l)
  echo "  Done. Files in new location: $COUNT"
else
  echo "  WARNING: Old uploads folder not found at $OLD_UPLOADS_DIR"
  echo "  You can manually rsync later: rsync -a $OLD_UPLOADS_DIR/ $NEW_UPLOADS_DIR/"
fi
echo ""


# ─── STEP 7: Photo migration + password hashing + admin password ───────────────

# Turn off exit-on-error for migrations — PM2 must start regardless
set +e

echo "[7/8] Running photo migration, password hashing, and admin password setup..."
cd "$SITE_DIR"
export DATABASE_URL

echo "  Phase A: Linking photos to user profiles..."
node scripts/migrate-photos.mjs \
  && echo "  Photo migration done." \
  || echo "  WARNING: Photo migration had issues — continuing."

echo ""
echo "  Phase B: Hashing remaining plaintext passwords..."
node scripts/hash-passwords.mjs \
  && echo "  Password hashing done." \
  || echo "  WARNING: Password hashing had issues — continuing."

echo ""
echo "  Phase C: Setting admin password for $ADMIN_EMAIL..."
node scripts/set-admin-password.mjs "$ADMIN_EMAIL" "$ADMIN_PASSWORD" \
  && echo "  Admin password set." \
  || echo "  WARNING: Admin password step failed — you can set it manually later."
echo ""


# ─── STEP 8: Start with PM2 ───────────────────────────────────────────────────

set -e

echo "[8/8] Starting API server with PM2..."
cd "$SITE_DIR"

pm2 stop rdn-api 2>/dev/null || true
pm2 delete rdn-api 2>/dev/null || true

PORT=$API_PORT \
DATABASE_URL="$DATABASE_URL" \
JWT_SECRET="$JWT_SECRET" \
NODE_ENV=production \
pm2 start artifacts/api-server/dist/index.mjs \
  --name rdn-api \
  --max-memory-restart 512M \
  --log ~/.pm2/logs/rdn-api.log \
  --time

pm2 save
pm2 startup 2>/dev/null | tail -1 | bash 2>/dev/null || true

echo ""
echo "PM2 status:"
pm2 list

echo ""
echo "Testing API..."
sleep 3
curl -sf "http://127.0.0.1:$API_PORT/api/health" && echo "  API is UP!" || echo "  (no /api/health endpoint — check: pm2 logs rdn-api)"

echo ""
echo "====================================================="
echo "  DEPLOYMENT COMPLETE"
echo "====================================================="
echo ""
echo "  Site  : $APP_URL"
echo "  Admin : $APP_URL/admin"
echo ""
echo "  Login with:"
echo "    Email   : $ADMIN_EMAIL"
echo "    Password: $ADMIN_PASSWORD"
echo ""
echo "  Useful commands:"
echo "    pm2 logs rdn-api     — view live API logs"
echo "    pm2 status           — check process status"
echo "    pm2 restart rdn-api  — restart the API"
echo "====================================================="
