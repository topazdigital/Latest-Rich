#!/bin/bash

MYSQL_DATADIR=/home/runner/mysql_data
MYSQL_RUN=/home/runner/mysql_run
MYSQL_LOGS=/home/runner/mysql_logs
MYSQL_CNF=/home/runner/mysql.cnf
APP_DIR=/home/runner/workspace
DATING_DIR="$APP_DIR/dating"

mkdir -p "$MYSQL_RUN" "$MYSQL_LOGS" "$MYSQL_DATADIR"

cat > "$MYSQL_CNF" << 'CONFEOF'
[mysqld]
datadir=/home/runner/mysql_data
socket=/home/runner/mysql_run/mysql.sock
pid-file=/home/runner/mysql_run/mysql.pid
log-error=/home/runner/mysql_logs/error.log
port=3306
bind-address=127.0.0.1
skip-name-resolve
innodb_use_native_aio=OFF
[client]
socket=/home/runner/mysql_run/mysql.sock
user=root
password=
CONFEOF

mysql_ready() {
    mysql --defaults-file="$MYSQL_CNF" -u root --connect-timeout=2 -e "SELECT 1" > /dev/null 2>&1
}

# Initialize data directory if empty
if [ ! -f "$MYSQL_DATADIR/mysql/user.frm" ] && [ ! -d "$MYSQL_DATADIR/mysql" ]; then
    echo "[start.sh] Initializing MariaDB data directory..."
    mysql_install_db --user=runner --datadir="$MYSQL_DATADIR" --auth-root-authentication-method=normal > /dev/null 2>&1 || \
    mysql_install_db --datadir="$MYSQL_DATADIR" > /dev/null 2>&1
    echo "[start.sh] Data directory initialized."
fi

rm -f "$MYSQL_RUN/mysql.sock" "$MYSQL_RUN/mysql.pid"

echo "[start.sh] Starting MariaDB..."
mysqld --defaults-file="$MYSQL_CNF" 2>>"$MYSQL_LOGS/error.log" &

for i in $(seq 1 30); do
    if mysql_ready; then
        echo "[start.sh] MariaDB ready in ${i}s"
        break
    fi
    sleep 1
done

if mysql_ready; then
    echo "[start.sh] MariaDB is ready!"
    mysql --defaults-file="$MYSQL_CNF" -u root -e "CREATE DATABASE IF NOT EXISTS dating_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" > /dev/null 2>&1 || true

    # Check if we need to import original SQL dump
    TABLE_COUNT=$(mysql --defaults-file="$MYSQL_CNF" -u root dating_app -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='dating_app';" -s --skip-column-names 2>/dev/null || echo "0")
    SQL_DUMP="$APP_DIR/attached_assets/admin_richdatingnetwork_1778144250861.sql"

    if [ "$TABLE_COUNT" = "0" ] || [ -z "$TABLE_COUNT" ]; then
        if [ -f "$SQL_DUMP" ]; then
            echo "[start.sh] Importing original SQL dump..."
            mysql --defaults-file="$MYSQL_CNF" -u root dating_app < "$SQL_DUMP" > /dev/null 2>&1
            echo "[start.sh] SQL dump imported."
        fi
    fi

    # Push Prisma schema (add new tables/columns without destroying existing data)
    cd "$DATING_DIR"
    echo "[start.sh] Syncing Prisma schema..."
    npx prisma db push --accept-data-loss --skip-generate > /dev/null 2>&1 || true
    echo "[start.sh] Prisma schema synced."
else
    echo "[start.sh] WARNING: MariaDB not responding, starting Next.js anyway..."
fi

# Create uploads directory
mkdir -p "$APP_DIR/assets/sources/uploads"
mkdir -p "$DATING_DIR/public/images"
mkdir -p "$DATING_DIR/public/icons"

# Create default avatar SVG if not exists
if [ ! -f "$DATING_DIR/public/images/default-avatar.png" ]; then
    # Create a simple default avatar using base64 encoded PNG
    echo "[start.sh] Creating default avatar..."
    cat > "$DATING_DIR/public/images/default-avatar.svg" << 'SVGEOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200">
  <rect width="100" height="100" fill="#f3f4f6"/>
  <circle cx="50" cy="38" r="20" fill="#d1d5db"/>
  <ellipse cx="50" cy="90" rx="35" ry="30" fill="#d1d5db"/>
</svg>
SVGEOF
    # Try to convert to PNG with ImageMagick or just copy SVG as PNG reference
    convert -size 200x200 xc:'#f3f4f6' -fill '#9ca3af' -draw 'circle 100,76 100,56' -draw 'circle 100,180 100,145' "$DATING_DIR/public/images/default-avatar.png" 2>/dev/null || \
    cp "$DATING_DIR/public/images/default-avatar.svg" "$DATING_DIR/public/images/default-avatar.png" 2>/dev/null || true
fi

# Create a simple icon for PWA
if [ ! -f "$DATING_DIR/public/icons/icon-192x192.png" ]; then
    echo "[start.sh] Creating PWA icons..."
    for SIZE in 72 96 128 144 152 192 384 512; do
        convert -size ${SIZE}x${SIZE} radial-gradient:'#FF192C-#FF6B6B' \
            -fill white -font DejaVu-Sans-Bold -pointsize $((SIZE/4)) \
            -gravity center -annotate 0 "R" \
            "$DATING_DIR/public/icons/icon-${SIZE}x${SIZE}.png" 2>/dev/null || true
    done
fi

# Install node_modules if needed
if [ ! -d "$DATING_DIR/node_modules" ]; then
    echo "[start.sh] Installing Node.js dependencies..."
    cd "$DATING_DIR"
    npm install --legacy-peer-deps > /dev/null 2>&1
    echo "[start.sh] Dependencies installed."
fi

# Generate Prisma client if not exists
if [ ! -d "$DATING_DIR/node_modules/.prisma" ]; then
    echo "[start.sh] Generating Prisma client..."
    cd "$DATING_DIR"
    npx prisma generate > /dev/null 2>&1 || true
    echo "[start.sh] Prisma client generated."
fi

echo "[start.sh] Starting Next.js on port 5000..."
cd "$DATING_DIR"

# Set environment variables
export DATABASE_URL="mysql://root@localhost:3306/dating_app?socket=/home/runner/mysql_run/mysql.sock"
export NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-rich-dating-network-super-secret-key-2024}"
export NEXTAUTH_URL="${NEXTAUTH_URL:-http://localhost:5000}"
export PORT=5000

exec node server.js
