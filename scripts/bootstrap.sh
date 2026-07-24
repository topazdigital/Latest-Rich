#!/usr/bin/env bash
# bootstrap.sh — one-shot Replit dev environment setup
# Run this after cloning or importing the repo on Replit.
# Safe to re-run; all steps are idempotent.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Installing dependencies..."
pnpm install

echo "==> Pushing schema to dev database (PostgreSQL)..."
pnpm --filter @workspace/db run push

echo ""
echo "==> Done. Start the app with:"
echo "    pnpm --filter @workspace/api-server run dev        # API on :8080"
echo "    pnpm --filter @workspace/rich-dating-network run dev  # Frontend on :5000"
