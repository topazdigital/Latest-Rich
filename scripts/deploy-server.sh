#!/bin/bash
##############################################################
# Production Deployment Script — Rich Dating Network
# Run this on your server AFTER pushing changes to GitHub.
#
# PowerShell / SSH usage:
#   ssh admin@157.250.205.180
#   cd /home/admin/domains/test.richdatingnetwork.com/public_html
#   bash scripts/deploy-server.sh
##############################################################
set -e

SITE_DIR="/home/admin/domains/test.richdatingnetwork.com/public_html"
OLD_SITE_UPLOADS="/home/admin/domains/richdatingnetwork.com/public_html/assets/sources/uploads"
NEW_SITE_UPLOADS="$SITE_DIR/assets/sources/uploads"

echo "==> 1. Pulling latest code from GitHub..."
cd "$SITE_DIR"
git pull origin main

echo "==> 2. Installing / updating dependencies..."
pnpm install --frozen-lockfile

echo "==> 3. Building API server..."
pnpm --filter @workspace/api-server run build

echo "==> 4. Restarting PM2 API process..."
pm2 restart rdn-api --update-env

echo "==> 5. Ensuring uploads symlink exists..."
mkdir -p "$SITE_DIR/assets/sources"
if [ ! -e "$NEW_SITE_UPLOADS" ]; then
  if [ -d "$OLD_SITE_UPLOADS" ]; then
    ln -s "$OLD_SITE_UPLOADS" "$NEW_SITE_UPLOADS"
    echo "    ✅ Symlink created: $NEW_SITE_UPLOADS -> $OLD_SITE_UPLOADS"
  else
    mkdir -p "$NEW_SITE_UPLOADS"
    echo "    ✅ Created fresh uploads dir (old site uploads not found at $OLD_SITE_UPLOADS)"
  fi
else
  echo "    ✅ Uploads path already exists"
fi

echo ""
echo "✅ Deployment complete! API is restarting in the background."
echo "   Check logs with: pm2 logs rdn-api --lines 50"
