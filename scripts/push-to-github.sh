#!/bin/bash
# Push current main branch to GitHub.
# Requires GITHUB_TOKEN env var (set as a Replit Secret).
# Usage: bash scripts/push-to-github.sh
set -e

if [ -z "$GITHUB_TOKEN" ]; then
  echo "ERROR: GITHUB_TOKEN is not set. Add it as a Replit Secret."
  exit 1
fi

REMOTE="https://topazdigital:${GITHUB_TOKEN}@github.com/topazdigital/Latest-Rich.git"
echo "Pushing main → github.com/topazdigital/Latest-Rich …"
git push "$REMOTE" main
echo "Done."
