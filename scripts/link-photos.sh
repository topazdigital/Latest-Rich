#!/bin/bash
# =============================================================
# Link old site photos to the API server uploads directory
# Run from: /home/admin/domains/test.richdatingnetwork.com/public_html
# =============================================================

# The API server looks for uploads at: artifacts/api-server/uploads/
# (it uses process.cwd()/uploads, and PM2 starts from artifacts/api-server/)

API_UPLOADS="/home/admin/domains/test.richdatingnetwork.com/public_html/artifacts/api-server/uploads"

echo "==========================="
echo "  Photo Import / Link"
echo "==========================="
echo ""
echo "API server uploads dir: $API_UPLOADS"
echo "Current contents: $(ls $API_UPLOADS 2>/dev/null | wc -l) files"
echo ""

# Try common locations for old site photos
CANDIDATES=(
  "/home/admin/domains/richdatingnetwork.com/public_html/assets/sources/uploads"
  "/home/richdatingnetwork/public_html/assets/sources/uploads"
  "/home/admin/domains/richdatingnetwork.com/public_html/uploads"
  "/var/www/richdatingnetwork.com/uploads"
)

OLD_UPLOADS=""
for dir in "${CANDIDATES[@]}"; do
  if [ -d "$dir" ]; then
    COUNT=$(ls "$dir" 2>/dev/null | wc -l)
    echo "Found: $dir ($COUNT files)"
    if [ "$COUNT" -gt 100 ]; then
      OLD_UPLOADS="$dir"
      break
    fi
  fi
done

if [ -z "$OLD_UPLOADS" ]; then
  echo ""
  echo "Could not auto-detect old uploads directory."
  echo "Run this to search for it:"
  echo "  find /home/admin/domains -name '*.jpg' -path '*/uploads/*' 2>/dev/null | head -5"
  echo "  find /home -name '*.jpg' -path '*/uploads/*' 2>/dev/null | head -5"
  echo ""
  echo "Then re-run this script with the path as an argument:"
  echo "  bash scripts/link-photos.sh /path/to/old/uploads"
  exit 1
fi

# If a path was passed as argument, use that instead
if [ -n "$1" ]; then
  OLD_UPLOADS="$1"
  echo "Using provided path: $OLD_UPLOADS"
fi

COUNT=$(ls "$OLD_UPLOADS" | wc -l)
echo ""
echo "Linking $COUNT photos from: $OLD_UPLOADS"

# Back up current uploads dir if it's a real directory (not symlink)
if [ -d "$API_UPLOADS" ] && [ ! -L "$API_UPLOADS" ]; then
  echo "Backing up current uploads..."
  mv "$API_UPLOADS" "${API_UPLOADS}.backup"
fi

# Remove existing symlink
[ -L "$API_UPLOADS" ] && rm "$API_UPLOADS"

# Create the symlink
ln -s "$OLD_UPLOADS" "$API_UPLOADS"
echo "Linked: $OLD_UPLOADS -> $API_UPLOADS"
echo ""
echo "Test a photo is accessible:"
SAMPLE=$(ls "$OLD_UPLOADS" | head -1)
echo "  curl -I http://localhost:8080/api/uploads/$SAMPLE"
echo ""
echo "Done!"
