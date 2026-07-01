#!/bin/bash
# Stage, commit, and push current changes to GitHub.
# Requires GITHUB_TOKEN env var (set as a Replit Secret).
# Usage: bash scripts/push-to-github.sh [optional commit message]
set -e

if [ -z "$GITHUB_TOKEN" ]; then
  echo "ERROR: GITHUB_TOKEN is not set. Add it as a Replit Secret."
  exit 1
fi

MSG="${1:-"Update SEO landing pages, locations hub and sitemap"}"
REMOTE="https://topazdigital:${GITHUB_TOKEN}@github.com/topazdigital/Latest-Rich.git"

echo "Staging all changes…"
git add -A

if git diff --cached --quiet; then
  echo "Nothing to commit — already up to date."
else
  echo "Committing: $MSG"
  git -c user.email="agent@replit.com" -c user.name="Replit Agent" commit -m "$MSG"
fi

echo "Pushing main → github.com/topazdigital/Latest-Rich …"
git push "$REMOTE" main
echo "Done."
