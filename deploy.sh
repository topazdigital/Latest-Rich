#!/bin/bash
# =============================================================
# Rich Dating Network — Server Deployment Script
# Run this on your DirectAdmin server after git pull
# Usage: bash deploy.sh
# =============================================================

set -e

echo "==============================="
echo "  Rich Dating Network Deploy"
echo "==============================="

# 1. Install Node.js 22+ via NVM if not present
if ! command -v node &> /dev/null || [[ $(node -v | cut -d. -f1 | tr -d 'v') -lt 20 ]]; then
  echo "[1/8] Installing Node.js via NVM..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  source ~/.bashrc
  source ~/.nvm/nvm.sh
  nvm install 22
  nvm use 22
  nvm alias default 22
else
  echo "[1/8] Node.js $(node -v) found ✓"
fi

# 2. Install pnpm if not present
if ! command -v pnpm &> /dev/null; then
  echo "[2/8] Installing pnpm..."
  npm install -g pnpm
else
  echo "[2/8] pnpm $(pnpm -v) found ✓"
fi

# 3. Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
  echo "[3/8] Installing PM2..."
  npm install -g pm2
else
  echo "[3/8] PM2 $(pm2 -v) found ✓"
fi

# 4. Install dependencies
echo "[4/8] Installing dependencies..."
pnpm install --frozen-lockfile

# 5. Build API server
echo "[5/8] Building API server..."
pnpm --filter @workspace/api-server run build

# 6. Build frontend
echo "[6/8] Building frontend..."
BASE_PATH=/ pnpm --filter @workspace/rich-dating-network run build

# 7. Copy built frontend to public_html
echo "[7/8] Deploying frontend to public_html..."
DOMAIN_DIR="/home/admin/domains/test.richdatingnetwork.com/public_html"
mkdir -p "$DOMAIN_DIR"
\cp -rf artifacts/rich-dating-network/dist/public/. "$DOMAIN_DIR/"

# Create .htaccess for SPA routing
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

# 8. Start/restart PM2
echo "[8/8] Starting/restarting with PM2..."
pm2 stop rdn-api 2>/dev/null || true
pm2 delete rdn-api 2>/dev/null || true

PORT=8080 DATABASE_URL="mysql://admin_testdating:EEhm0XRgtewBSUBditW7@localhost:3306/admin_testdating" \
  pm2 start artifacts/api-server/dist/index.mjs \
  --name rdn-api \
  --env production \
  --max-memory-restart 512M \
  --log ~/.pm2/logs/rdn-api.log

pm2 save
pm2 startup | tail -1 | bash 2>/dev/null || true

echo ""
echo "==============================="
echo "  Deployment Complete! ✓"
echo "==============================="
echo "  API: http://localhost:8080"
echo "  Site: https://test.richdatingnetwork.com"
echo ""
echo "  Check status: pm2 status"
echo "  View logs: pm2 logs rdn-api"
echo "==============================="
