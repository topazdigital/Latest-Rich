#!/bin/bash
# =============================================================
# Link old site photos to new uploads directory
# Run from: /home/admin/domains/test.richdatingnetwork.com/public_html
# =============================================================
set -e

OLD_UPLOADS="/home/admin/domains/richdatingnetwork.com/public_html/assets/sources/uploads"
NEW_UPLOADS="/home/admin/domains/test.richdatingnetwork.com/public_html/uploads"

echo "==========================="
echo "  Photo Import / Link"
echo "==========================="

if [ ! -d "$OLD_UPLOADS" ]; then
  echo "ERROR: Old uploads dir not found: $OLD_UPLOADS"
  exit 1
fi

COUNT=$(ls "$OLD_UPLOADS" | wc -l)
echo "Found $COUNT photos in old site"

# Back up any new uploads first
if [ -d "$NEW_UPLOADS" ] && [ ! -L "$NEW_UPLOADS" ]; then
  echo "Backing up current uploads to uploads.backup..."
  mv "$NEW_UPLOADS" "${NEW_UPLOADS}.backup"
fi

# Remove old symlink if any
[ -L "$NEW_UPLOADS" ] && rm "$NEW_UPLOADS"

# Create symlink pointing to old uploads
ln -s "$OLD_UPLOADS" "$NEW_UPLOADS"
echo "Linked: $OLD_UPLOADS -> $NEW_UPLOADS"
echo ""
echo "Done! All $COUNT old photos are now served at /api/uploads/<filename>"
echo ""
echo "Note: User photo fields in the DB must contain just the filename"
echo "      (e.g. '-11755710492.jpeg'), not the full path."
echo "      If photos still don't show, check with:"
echo "      curl http://localhost:8080/api/uploads/<filename>"
