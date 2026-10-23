#!/bin/bash
# Push to GitHub
# Usage: set GITHUB_TOKEN or GITHUB_PERSONAL_ACCESS_TOKEN as a Replit Secret,
# then run: bash push-to-github.sh
set -euo pipefail

if [ -z "${GITHUB_TOKEN:-}" ] && [ -n "${GITHUB_PERSONAL_ACCESS_TOKEN:-}" ]; then
  export GITHUB_TOKEN="$GITHUB_PERSONAL_ACCESS_TOKEN"
fi

if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "ERROR: Set GITHUB_TOKEN or GITHUB_PERSONAL_ACCESS_TOKEN in Replit Secrets."
  exit 1
fi

ASKPASS=$(mktemp)
trap 'rm -f "$ASKPASS"' EXIT
cat > "$ASKPASS" <<'EOF'
#!/bin/sh
case "$1" in
  *Username*) printf '%s\n' "x-access-token" ;;
  *Password*) printf '%s\n' "$GITHUB_TOKEN" ;;
  *) exit 1 ;;
esac
EOF
chmod 700 "$ASKPASS"

GIT_ASKPASS="$ASKPASS" GIT_TERMINAL_PROMPT=0 git -c credential.helper= push https://github.com/topazdigital/Latest-Rich.git main
echo "Done!"
