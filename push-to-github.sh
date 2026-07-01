#!/bin/bash
# Push to GitHub
# Usage: bash push-to-github.sh YOUR_GITHUB_TOKEN
#   or set GITHUB_TOKEN env var and run: bash push-to-github.sh

TOKEN="${1:-$GITHUB_TOKEN}"

if [ -z "$TOKEN" ]; then
  echo "Usage: bash push-to-github.sh YOUR_GITHUB_TOKEN"
  echo "  or:  GITHUB_TOKEN=your_token bash push-to-github.sh"
  exit 1
fi

REMOTE="https://topazdigital:${TOKEN}@github.com/topazdigital/Latest-Rich.git"

git push "$REMOTE" main
echo "Done!"
