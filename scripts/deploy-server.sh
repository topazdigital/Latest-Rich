#!/bin/bash
##############################################################
# Rich Dating Network — Production Deploy Script
#
# USAGE (always the same command):
#   bash /home/admin/domains/test.richdatingnetwork.com/public_html/scripts/deploy-server.sh
#
# What it does:
#   1. Pulls latest code from GitHub (safe even with local changes)
#   2. Installs/updates dependencies
#   3. Builds API + frontend
#   4. Restarts the PM2 process
##############################################################
set -e

SITE_DIR="/home/admin/domains/test.richdatingnetwork.com/public_html"

echo ""
echo "============================================"
echo "  Rich Dating Network — Deploy"
echo "============================================"

cd "$SITE_DIR"

# ── 1. Pull latest code ─────────────────────────────────────
echo ""
echo "[1/4] Pulling latest code from GitHub..."

# Stash any local changes (config files, .env, etc.) so pull never fails
git stash --quiet 2>/dev/null || true

# Pull
git pull origin main

# Restore stashed local changes (non-fatal if nothing was stashed)
git stash pop --quiet 2>/dev/null || true

echo "      ✅ Code updated"

# ── 2. Install dependencies ─────────────────────────────────
echo ""
echo "[2/4] Installing dependencies..."
pnpm install --frozen-lockfile --silent
echo "      ✅ Dependencies ready"

# ── 3. Build ────────────────────────────────────────────────
echo ""
echo "[3/4] Building..."

pnpm --filter @workspace/api-server run build
echo "      ✅ API server built"

BASE_PATH=/ pnpm --filter @workspace/rich-dating-network run build
echo "      ✅ Frontend built"

# ── 4. Restart PM2 ──────────────────────────────────────────
echo ""
echo "[4/4] Restarting server..."

if pm2 describe rdn-api > /dev/null 2>&1; then
  pm2 restart rdn-api --update-env
  echo "      ✅ PM2 process restarted"
else
  # First time — start it fresh from ecosystem config
  if [ -f "$SITE_DIR/ecosystem.config.cjs" ]; then
    pm2 start ecosystem.config.cjs
    pm2 save
    echo "      ✅ PM2 process started (first time)"
  else
    echo "      ⚠️  No ecosystem.config.cjs found — run deploy.sh first for initial setup"
    exit 1
  fi
fi

# ── Done ────────────────────────────────────────────────────
echo ""
echo "============================================"
echo "  ✅ Deploy complete!"
echo "  Site: https://test.richdatingnetwork.com"
echo ""
echo "  Useful commands:"
echo "    pm2 status              — process health"
echo "    pm2 logs rdn-api        — live logs"
echo "    pm2 logs rdn-api --lines 100  — last 100 lines"
echo "============================================"
echo ""
