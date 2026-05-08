# =============================================================================
# Rich Dating Network — PowerShell Deployment Script
# Deploys the new Node.js app to test.richdatingnetwork.com
#
# HOW TO USE:
#   1. Review the CONFIGURATION section below — DB credentials are pre-filled
#   2. Set JWT_SECRET to any long random string (or generate one)
#   3. Open PowerShell (Windows) and run:
#        Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#        .\scripts\deploy-test-server.ps1
# =============================================================================

# ─── CONFIGURATION ───────────────────────────────────────────────────────────

$SERVER_IP       = "157.250.205.180"
$SSH_USER        = "admin"                         # DirectAdmin SSH username
$SSH_PORT        = 22
$GITHUB_REPO     = "https://github.com/topazdigital/Latest-Rich.git"
$SITE_DIR        = "/home/admin/domains/test.richdatingnetwork.com/public_html"
$PUBLIC_HTML     = $SITE_DIR                       # frontend served from here
$OLD_UPLOADS_DIR = "/home/admin/domains/richdatingnetwork.com/public_html/assets/sources/uploads"
$NEW_UPLOADS_DIR = "$SITE_DIR/assets/sources/uploads"

$DB_HOST         = "localhost"
$DB_NAME         = "admin_testdating"
$DB_USER         = "admin_testdating"
$DB_PASS         = "EEhm0XRgtewBSUBditW7"
$JWT_SECRET      = "rdn-jwt-secret-change-this-to-something-long-and-random"
$APP_URL         = "https://test.richdatingnetwork.com"
$API_PORT        = 8080

# Admin account to set/confirm after deployment
$ADMIN_EMAIL     = "patrickndungu.pnn@gmail.com"
$ADMIN_PASSWORD  = "dj@Topaz27899310"

# ─────────────────────────────────────────────────────────────────────────────

$DATABASE_URL = "mysql://${DB_USER}:${DB_PASS}@${DB_HOST}:3306/${DB_NAME}"

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  Rich Dating Network — Test Server Deployment" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server : $SERVER_IP" -ForegroundColor Yellow
Write-Host "Site   : $APP_URL" -ForegroundColor Yellow
Write-Host "DB     : $DATABASE_URL" -ForegroundColor Yellow
Write-Host ""


# ─── STEP 1: Pull latest code from GitHub ────────────────────────────────────

Write-Host "STEP 1: Pulling latest code from GitHub..." -ForegroundColor Green

$step1 = @"
set -e
echo '--- Node.js version ---'
node --version 2>/dev/null || (curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs)

echo '--- pnpm ---'
if ! command -v pnpm &>/dev/null; then npm install -g pnpm; fi
pnpm --version

echo '--- PM2 ---'
if ! command -v pm2 &>/dev/null; then npm install -g pm2; fi
pm2 --version

echo '--- Code ---'
mkdir -p $SITE_DIR
cd $SITE_DIR
if [ -d '.git' ]; then
  git fetch origin && git reset --hard origin/main
  echo 'Code updated from GitHub.'
else
  git clone $GITHUB_REPO .
  echo 'Repository cloned.'
fi

echo '--- Dependencies ---'
pnpm install --frozen-lockfile
echo 'Dependencies installed.'
"@

ssh -p $SSH_PORT "${SSH_USER}@${SERVER_IP}" $step1
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: Step 1 failed." -ForegroundColor Red; exit 1 }
Write-Host "Step 1 done." -ForegroundColor Green


# ─── STEP 2: Write .env file on server ───────────────────────────────────────

Write-Host ""
Write-Host "STEP 2: Writing .env configuration..." -ForegroundColor Green

$step2 = @"
cat > $SITE_DIR/.env << 'ENVEOF'
DATABASE_URL=$DATABASE_URL
JWT_SECRET=$JWT_SECRET
APP_URL=$APP_URL
NODE_ENV=production
PORT=$API_PORT
ENVEOF
echo '.env written.'
cat $SITE_DIR/.env
"@

ssh -p $SSH_PORT "${SSH_USER}@${SERVER_IP}" $step2
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: Step 2 failed." -ForegroundColor Red; exit 1 }
Write-Host "Step 2 done." -ForegroundColor Green


# ─── STEP 3: Build API server + frontend ─────────────────────────────────────

Write-Host ""
Write-Host "STEP 3: Building API server and frontend (takes 2-4 minutes)..." -ForegroundColor Green

$step3 = @"
set -e
cd $SITE_DIR
export DATABASE_URL=$DATABASE_URL
export JWT_SECRET=$JWT_SECRET
export NODE_ENV=production

echo '--- Building API server ---'
pnpm --filter @workspace/api-server run build

echo '--- Building frontend ---'
BASE_PATH=/ pnpm --filter @workspace/rich-dating-network run build

echo '--- Copying frontend to public_html ---'
cp -r $SITE_DIR/artifacts/rich-dating-network/dist/. $PUBLIC_HTML/

echo 'Build complete.'
ls -la $PUBLIC_HTML/index.html
"@

ssh -p $SSH_PORT "${SSH_USER}@${SERVER_IP}" $step3
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: Step 3 (build) failed." -ForegroundColor Red; exit 1 }
Write-Host "Step 3 done." -ForegroundColor Green


# ─── STEP 4: Create .htaccess for Apache reverse proxy ───────────────────────

Write-Host ""
Write-Host "STEP 4: Writing Apache .htaccess for API proxy + SPA routing..." -ForegroundColor Green

$step4 = @"
cat > $PUBLIC_HTML/.htaccess << 'HTEOF'
Options -MultiViews
RewriteEngine On

# Proxy /api/* and /ws/* to the Node.js API on port $API_PORT
RewriteCond %{REQUEST_URI} ^/(api|ws)(/|$)
RewriteRule ^(.*)$ http://127.0.0.1:${API_PORT}/`$1 [P,L]

# SPA fallback — serve index.html for all other routes
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [QSA,L]
HTEOF
echo '.htaccess written.'
cat $PUBLIC_HTML/.htaccess
"@

ssh -p $SSH_PORT "${SSH_USER}@${SERVER_IP}" $step4
if ($LASTEXITCODE -ne 0) { Write-Host "WARNING: .htaccess step had issues." -ForegroundColor Yellow }
Write-Host "Step 4 done." -ForegroundColor Green


# ─── STEP 5: Copy uploads folder from old site ───────────────────────────────

Write-Host ""
Write-Host "STEP 5: Copying uploads folder from old site (may take several minutes)..." -ForegroundColor Green
Write-Host "  From: $OLD_UPLOADS_DIR" -ForegroundColor Yellow
Write-Host "  To  : $NEW_UPLOADS_DIR" -ForegroundColor Yellow

$step5 = @"
set -e
mkdir -p $NEW_UPLOADS_DIR
if [ -d "$OLD_UPLOADS_DIR" ]; then
  echo 'Starting rsync of uploads...'
  rsync -a --info=progress2 $OLD_UPLOADS_DIR/ $NEW_UPLOADS_DIR/
  COUNT=`$(ls "$NEW_UPLOADS_DIR" | wc -l)
  echo "rsync complete. Files in new location: `$COUNT"
else
  echo 'WARNING: Old uploads folder not found at $OLD_UPLOADS_DIR'
  echo 'You may need to manually copy files later.'
fi
"@

ssh -p $SSH_PORT "${SSH_USER}@${SERVER_IP}" $step5
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Upload copy had issues — check manually." -ForegroundColor Yellow
} else {
    Write-Host "Step 5 done." -ForegroundColor Green
}


# ─── STEP 6: Run photo migration + password hashing ──────────────────────────

Write-Host ""
Write-Host "STEP 6: Running photo migration and password hashing..." -ForegroundColor Green

$step6 = @"
set -e
cd $SITE_DIR
export DATABASE_URL=$DATABASE_URL

echo '--- Phase A: Photo migration (links uploads to user profiles) ---'
if node scripts/migrate-photos.mjs; then
  echo 'Photo migration complete.'
else
  echo 'WARNING: migrate-photos.mjs failed or old_activity missing. Running hash-passwords only.'
fi

echo '--- Phase B: Hash remaining plaintext passwords ---'
node scripts/hash-passwords.mjs
echo 'Password hashing complete.'
"@

ssh -p $SSH_PORT "${SSH_USER}@${SERVER_IP}" $step6
if ($LASTEXITCODE -ne 0) { Write-Host "WARNING: Step 6 had issues — check logs." -ForegroundColor Yellow }
Write-Host "Step 6 done." -ForegroundColor Green


# ─── STEP 7: Set admin account password ──────────────────────────────────────

Write-Host ""
Write-Host "STEP 7: Setting admin account password for $ADMIN_EMAIL ..." -ForegroundColor Green

$step7 = @"
set -e
cd $SITE_DIR
export DATABASE_URL=$DATABASE_URL
node scripts/set-admin-password.mjs "$ADMIN_EMAIL" "$ADMIN_PASSWORD"
"@

ssh -p $SSH_PORT "${SSH_USER}@${SERVER_IP}" $step7
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Admin password step had issues." -ForegroundColor Yellow
} else {
    Write-Host "Admin password set." -ForegroundColor Green
}


# ─── STEP 8: Start API server with PM2 ───────────────────────────────────────

Write-Host ""
Write-Host "STEP 8: Starting API server with PM2 on port $API_PORT ..." -ForegroundColor Green

$step8 = @"
set -e
cd $SITE_DIR

pm2 stop rdn-api 2>/dev/null || true
pm2 delete rdn-api 2>/dev/null || true

PORT=$API_PORT \
DATABASE_URL=$DATABASE_URL \
JWT_SECRET=$JWT_SECRET \
NODE_ENV=production \
pm2 start artifacts/api-server/dist/index.mjs \
  --name rdn-api \
  --max-memory-restart 512M \
  --log ~/.pm2/logs/rdn-api.log \
  --time

pm2 save
pm2 startup 2>/dev/null | tail -1 | bash 2>/dev/null || true

echo ''
echo 'PM2 status:'
pm2 list
echo ''
echo 'Testing API health check...'
sleep 3
curl -sf http://127.0.0.1:$API_PORT/api/health && echo ' API is up!' || echo ' (health endpoint not available yet - check pm2 logs)'
"@

ssh -p $SSH_PORT "${SSH_USER}@${SERVER_IP}" $step8
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: Step 8 (PM2 start) failed." -ForegroundColor Red; exit 1 }
Write-Host "Step 8 done." -ForegroundColor Green


# ─── DONE ────────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Site  : $APP_URL" -ForegroundColor Green
Write-Host "  API   : $APP_URL/api/health" -ForegroundColor Green
Write-Host "  Admin : $APP_URL/admin" -ForegroundColor Green
Write-Host ""
Write-Host "  Admin login:" -ForegroundColor Yellow
Write-Host "    Email    : $ADMIN_EMAIL" -ForegroundColor White
Write-Host "    Password : $ADMIN_PASSWORD" -ForegroundColor White
Write-Host ""
Write-Host "  SSH to server for logs:" -ForegroundColor Yellow
Write-Host "    ssh ${SSH_USER}@${SERVER_IP}" -ForegroundColor Gray
Write-Host "    pm2 logs rdn-api" -ForegroundColor Gray
Write-Host "    pm2 status" -ForegroundColor Gray
Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
