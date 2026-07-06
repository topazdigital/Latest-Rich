#!/bin/bash
# ============================================================
# Rich Dating Network — Push to GitHub + Deploy to Server
#
# ONE COMMAND that does everything:
#   1. Pushes latest code to GitHub
#   2. SSHes into the production server and runs deploy.sh
#
# Usage (from Replit shell):
#   bash scripts/push-to-github.sh
#   bash scripts/push-to-github.sh "your commit message"
#
# Required Replit Secrets:
#   GITHUB_TOKEN    — GitHub personal access token (repo scope)
#   SSH_PRIVATE_KEY — Private key to SSH into richdatingnetwork.com
# Optional:
#   SSH_PORT        — SSH port (default: 22)
# ============================================================
set -e

GITHUB_TOKEN="${GITHUB_TOKEN:-$GITHUB_PERSONAL_ACCESS_TOKEN}"
if [ -z "$GITHUB_TOKEN" ]; then
  echo "ERROR: Neither GITHUB_TOKEN nor GITHUB_PERSONAL_ACCESS_TOKEN secret is set."
  exit 1
fi

if [ -z "$SSH_PRIVATE_KEY" ]; then
  echo "ERROR: SSH_PRIVATE_KEY secret is not set."
  echo "       Add your server's SSH private key as a Replit Secret named SSH_PRIVATE_KEY"
  exit 1
fi

MSG="${1:-"Update richdatingnetwork.com"}"
REMOTE="https://topazdigital:${GITHUB_TOKEN}@github.com/topazdigital/Latest-Rich.git"
SSH_PORT="${SSH_PORT:-22}"
SSH_HOST="richdatingnetwork.com"
SSH_USER="admin"
DEPLOY_CMD="bash /home/admin/domains/richdatingnetwork.com/public_html/deploy.sh"

# ── 1. Push to GitHub ─────────────────────────────────────
echo ""
echo "========================================"
echo "  [1/2] Pushing to GitHub..."
echo "========================================"

git push "$REMOTE" main
echo "  ✅ GitHub updated"

# ── 2. SSH into server and deploy ────────────────────────
echo ""
echo "========================================"
echo "  [2/2] Deploying to richdatingnetwork.com..."
echo "========================================"

# Write private key to a temp file (SSH requires a file, not a variable)
KEY_FILE=$(mktemp)
chmod 600 "$KEY_FILE"
echo "$SSH_PRIVATE_KEY" > "$KEY_FILE"

ssh -i "$KEY_FILE" \
    -p "$SSH_PORT" \
    -o StrictHostKeyChecking=no \
    -o ConnectTimeout=30 \
    "${SSH_USER}@${SSH_HOST}" \
    "$DEPLOY_CMD"

rm -f "$KEY_FILE"

echo ""
echo "========================================"
echo "  ✅ All done! richdatingnetwork.com is live."
echo "========================================"
echo ""
