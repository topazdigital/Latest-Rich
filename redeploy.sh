#!/bin/bash
# =============================================================
# Rich Dating Network — Quick Redeploy Script
# Rebuilds and deploys ONLY the frontend (fast, no PM2 restart)
# Usage: bash redeploy.sh
# Run from: /home/admin/domains/richdatingnetwork.com/public_html
# =============================================================
set -e

echo "=============================="
echo "  Rich Dating Network Redeploy"
echo "=============================="

echo "[1/3] Building frontend..."
BASE_PATH=/ pnpm --filter @workspace/rich-dating-network run build

echo "[2/3] Deploying to public_html..."
DOMAIN_DIR="/home/admin/domains/richdatingnetwork.com/public_html"
\cp -rf artifacts/rich-dating-network/dist/public/. "$DOMAIN_DIR/"

echo "[3/3] Restarting API server..."
pm2 restart rdn-api 2>/dev/null || true

echo ""
echo "=============================="
echo "  Done! Site updated ✓"
echo "  https://richdatingnetwork.com"
echo "=============================="
