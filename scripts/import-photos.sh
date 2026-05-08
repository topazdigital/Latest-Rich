#!/bin/bash
# ========================================================
# Rich Dating Network — Complete Photo Import
# 1. Fixes the API server uploads symlink
# 2. Copies photo filenames from old DB to new DB
#
# Run from: /home/admin/domains/test.richdatingnetwork.com/public_html
# ========================================================

OLD_DB_USER="admin_richdatingnetwork"
OLD_DB_PASS='dj@Topaz2016'
OLD_DB="admin_richdatingnetwork"

NEW_DB_USER="admin_testdating"
NEW_DB_PASS='RdnDb2025secure'
NEW_DB="admin_testdating"

OLD_UPLOADS="/home/admin/domains/richdatingnetwork.com/public_html/assets/sources/uploads"
API_UPLOADS="/home/admin/domains/test.richdatingnetwork.com/public_html/artifacts/api-server/uploads"

echo "============================================="
echo "  Rich Dating Network — Photo Import"
echo "============================================="

# ── Step 1: Fix the uploads symlink ──────────────
echo ""
echo "[1/3] Setting up photo symlink..."

if [ ! -d "$OLD_UPLOADS" ]; then
  echo "  ERROR: Old uploads dir not found: $OLD_UPLOADS"
  exit 1
fi

# If it's a real directory (not symlink), back it up
if [ -d "$API_UPLOADS" ] && [ ! -L "$API_UPLOADS" ]; then
  mv "$API_UPLOADS" "${API_UPLOADS}.bak" 2>/dev/null
  echo "  Backed up old uploads dir to ${API_UPLOADS}.bak"
fi

# Remove any existing symlink
[ -L "$API_UPLOADS" ] && rm "$API_UPLOADS"

# Create correct symlink
ln -s "$OLD_UPLOADS" "$API_UPLOADS"
FILE_COUNT=$(ls "$OLD_UPLOADS" | wc -l)
echo "  Symlinked $FILE_COUNT photos from old site"

# Quick API test
SAMPLE=$(ls "$OLD_UPLOADS" | head -1)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/api/uploads/$SAMPLE")
if [ "$HTTP_CODE" = "200" ]; then
  echo "  API photo test: 200 OK ✓"
else
  echo "  WARNING: API returned $HTTP_CODE for $SAMPLE — PM2 may need restart"
fi

# ── Step 2: Check old DB structure ───────────────
echo ""
echo "[2/3] Checking old DB users table..."

# Detect photo column name in old DB
OLD_PHOTO_COL=$(mysql -u "$OLD_DB_USER" -p"$OLD_DB_PASS" "$OLD_DB" -N -e \
  "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA='$OLD_DB' AND TABLE_NAME='users'
   AND COLUMN_NAME IN ('photo','profile_photo','avatar','image','thumb')
   ORDER BY FIELD(COLUMN_NAME,'photo','thumb','avatar','profile_photo','image')
   LIMIT 1;" 2>/dev/null)

[ -z "$OLD_PHOTO_COL" ] && OLD_PHOTO_COL="photo"
echo "  Photo column: $OLD_PHOTO_COL"

# Count old users with photos
OLD_COUNT=$(mysql -u "$OLD_DB_USER" -p"$OLD_DB_PASS" "$OLD_DB" -N -e \
  "SELECT COUNT(*) FROM users
   WHERE $OLD_PHOTO_COL IS NOT NULL AND $OLD_PHOTO_COL != ''
   AND email IS NOT NULL AND email != '';" 2>/dev/null)
echo "  Old DB users with photos: $OLD_COUNT"

if [ "$OLD_COUNT" = "0" ] || [ -z "$OLD_COUNT" ]; then
  echo "  ERROR: No photo data found in old DB. Check credentials or column name."
  exit 1
fi

# ── Step 3: Migrate photo filenames ──────────────
echo ""
echo "[3/3] Migrating photo filenames to new DB..."
echo "  (matching users by email address)"

# Generate UPDATE statements:
# - SUBSTRING_INDEX(photo, '/', -1) extracts just the filename from full URLs
#   e.g. "http://richdatingnetwork.com/assets/sources/uploads/thumb_abc.jpg" → "thumb_abc.jpg"
# Pipe them directly into the new DB
UPDATED=$(mysql -u "$OLD_DB_USER" -p"$OLD_DB_PASS" "$OLD_DB" -N 2>/dev/null -e "
  SELECT CONCAT(
    'UPDATE users SET photo=''',
    SUBSTRING_INDEX($OLD_PHOTO_COL, '/', -1),
    ''' WHERE email=''', REPLACE(email, '''', ''\\''''), ''';'
  )
  FROM users
  WHERE $OLD_PHOTO_COL IS NOT NULL
    AND $OLD_PHOTO_COL != ''
    AND email IS NOT NULL
    AND email != ''
" | mysql -u "$NEW_DB_USER" -p"$NEW_DB_PASS" "$NEW_DB" 2>/dev/null)

# Verify result
FINAL_COUNT=$(mysql -u "$NEW_DB_USER" -p"$NEW_DB_PASS" "$NEW_DB" -N -e \
  "SELECT COUNT(*) FROM users WHERE photo IS NOT NULL AND photo != '';" 2>/dev/null)
echo "  New DB users with photos after import: $FINAL_COUNT"

# Show a sample
echo ""
echo "  Sample imported photo values:"
mysql -u "$NEW_DB_USER" -p"$NEW_DB_PASS" "$NEW_DB" -e \
  "SELECT id, name, photo FROM users WHERE photo IS NOT NULL AND photo != '' LIMIT 5;" 2>/dev/null

echo ""
echo "============================================="
echo "  Done!"
echo "  → Visit https://test.richdatingnetwork.com"
echo "  → Photos should now appear on all profiles"
echo "============================================="
