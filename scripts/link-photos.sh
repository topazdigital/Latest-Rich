#!/bin/bash
# =============================================================
# Link old richdatingnetwork.com photos to API server uploads
# Run from: /home/admin/domains/test.richdatingnetwork.com/public_html
# =============================================================

OLD_UPLOADS="/home/admin/domains/richdatingnetwork.com/public_html/assets/sources/uploads"
API_UPLOADS="/home/admin/domains/test.richdatingnetwork.com/public_html/artifacts/api-server/uploads"

echo "==========================="
echo "  Photo Import / Link"
echo "==========================="

if [ ! -d "$OLD_UPLOADS" ]; then
  echo "ERROR: Old uploads not found at $OLD_UPLOADS"
  exit 1
fi

COUNT=$(ls "$OLD_UPLOADS" 2>/dev/null | wc -l)
echo "Old site photos: $COUNT files"
echo "Target: $API_UPLOADS"

# Back up current API uploads if it's a real dir
if [ -d "$API_UPLOADS" ] && [ ! -L "$API_UPLOADS" ]; then
  echo "Backing up existing API uploads..."
  mv "$API_UPLOADS" "${API_UPLOADS}.backup"
fi

# Remove existing symlink if any
[ -L "$API_UPLOADS" ] && rm "$API_UPLOADS"

# Create the symlink
ln -s "$OLD_UPLOADS" "$API_UPLOADS"
echo "Linked: $OLD_UPLOADS -> $API_UPLOADS"

# Test it
SAMPLE=$(ls "$OLD_UPLOADS" | head -1)
echo ""
echo "Sample file: $SAMPLE"
echo "Test URL:    http://localhost:8080/api/uploads/$SAMPLE"
echo ""
echo "Done! $COUNT photos are now accessible via the API."
