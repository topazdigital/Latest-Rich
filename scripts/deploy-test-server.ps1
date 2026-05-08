# =============================================================================
# Rich Dating Network — PowerShell Deployment Script
# Deploys the new Node.js app to test.richdatingnetwork.com
#
# HOW TO USE:
#   1. Fill in the variables in the CONFIGURATION section below
#   2. Open PowerShell (Windows) and run:
#        Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#        .\scripts\deploy-test-server.ps1
#   3. Follow the step prompts
# =============================================================================

# ─── CONFIGURATION — FILL THESE IN ──────────────────────────────────────────

$SERVER_IP       = "157.250.205.180"
$SSH_USER        = "admin"                         # Your DirectAdmin SSH username
$SSH_PORT        = 22                              # Usually 22
$GITHUB_REPO     = "https://github.com/topazdigital/Latest-Rich.git"
$SITE_DIR        = "/home/admin/domains/test.richdatingnetwork.com/public_html"
$OLD_UPLOADS_DIR = "/home/admin/domains/richdatingnetwork.com/public_html/assets/sources/uploads"
$NEW_UPLOADS_DIR = "$SITE_DIR/assets/sources/uploads"

$DB_HOST         = "localhost"
$DB_NAME         = "admin_testdating"
$DB_USER         = ""                              # Your MySQL username (e.g. admin_testuser)
$DB_PASS         = ""                              # Your MySQL password
$JWT_SECRET      = ""                              # Any long random string, e.g. use: openssl rand -hex 32
$APP_URL         = "https://test.richdatingnetwork.com"

# ─────────────────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  Rich Dating Network — Test Server Deployment" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server : $SERVER_IP" -ForegroundColor Yellow
Write-Host "Site   : $APP_URL" -ForegroundColor Yellow
Write-Host "DB     : $DB_NAME" -ForegroundColor Yellow
Write-Host ""

if (-not $DB_USER -or -not $DB_PASS -or -not $JWT_SECRET) {
    Write-Host "ERROR: Please fill in DB_USER, DB_PASS, and JWT_SECRET in the script before running." -ForegroundColor Red
    exit 1
}

$DATABASE_URL = "mysql://${DB_USER}:${DB_PASS}@${DB_HOST}/${DB_NAME}"


# ─── STEP 1: Deploy code via SSH ─────────────────────────────────────────────

Write-Host "STEP 1: Deploying code to $SITE_DIR ..." -ForegroundColor Green

$deployCommands = @"
set -e

# Install Node.js 20 if not present
if ! command -v node &>/dev/null; then
  echo 'Installing Node.js 20...'
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs 2>/dev/null || true
fi
node --version

# Install pnpm if not present
if ! command -v pnpm &>/dev/null; then
  echo 'Installing pnpm...'
  npm install -g pnpm
fi
pnpm --version

# Install PM2 if not present
if ! command -v pm2 &>/dev/null; then
  echo 'Installing PM2...'
  npm install -g pm2
fi

# Remove old code and clone fresh
rm -rf $SITE_DIR/Latest-Rich 2>/dev/null || true
mkdir -p $SITE_DIR
cd $SITE_DIR

# Clone repo if not exists, else pull latest
if [ -d '.git' ]; then
  echo 'Pulling latest code...'
  git pull origin main
else
  echo 'Cloning repository...'
  git clone $GITHUB_REPO .
fi

# Install dependencies
pnpm install --frozen-lockfile

echo 'Code deployed successfully.'
"@

ssh -p $SSH_PORT "${SSH_USER}@${SERVER_IP}" $deployCommands

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Code deployment failed." -ForegroundColor Red
    exit 1
}
Write-Host "Code deployed." -ForegroundColor Green


# ─── STEP 2: Write .env file on server ───────────────────────────────────────

Write-Host ""
Write-Host "STEP 2: Writing environment configuration..." -ForegroundColor Green

$envContent = @"
DATABASE_URL=$DATABASE_URL
JWT_SECRET=$JWT_SECRET
APP_URL=$APP_URL
NODE_ENV=production
PORT=3100
LOG_LEVEL=info
"@

$writeEnvCmd = "cat > $SITE_DIR/.env << 'ENVEOF'" + "`n" + $envContent + "`nENVEOF"
ssh -p $SSH_PORT "${SSH_USER}@${SERVER_IP}" $writeEnvCmd

Write-Host ".env written." -ForegroundColor Green


# ─── STEP 3: Build the app ───────────────────────────────────────────────────

Write-Host ""
Write-Host "STEP 3: Building the application (this may take 2-3 minutes)..." -ForegroundColor Green

$buildCommands = @"
set -e
cd $SITE_DIR
export `$(cat .env | grep -v '^#' | xargs)
pnpm --filter @workspace/api-server run build
echo 'Build complete.'
"@

ssh -p $SSH_PORT "${SSH_USER}@${SERVER_IP}" $buildCommands

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed." -ForegroundColor Red
    exit 1
}
Write-Host "Build complete." -ForegroundColor Green


# ─── STEP 4: Copy uploads folder from old site ───────────────────────────────

Write-Host ""
Write-Host "STEP 4: Copying uploads folder from old site..." -ForegroundColor Green
Write-Host "  From: $OLD_UPLOADS_DIR" -ForegroundColor Yellow
Write-Host "  To  : $NEW_UPLOADS_DIR" -ForegroundColor Yellow

$copyUploadsCmd = @"
set -e
mkdir -p $NEW_UPLOADS_DIR
echo 'Copying uploads (this may take several minutes for 15000+ files)...'
rsync -a --progress $OLD_UPLOADS_DIR/ $NEW_UPLOADS_DIR/
echo "Upload copy complete. Files in new location:"
ls $NEW_UPLOADS_DIR | wc -l
"@

ssh -p $SSH_PORT "${SSH_USER}@${SERVER_IP}" $copyUploadsCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Upload copy had issues. Check manually." -ForegroundColor Yellow
} else {
    Write-Host "Uploads copied." -ForegroundColor Green
}


# ─── STEP 5: Run password hash migration ─────────────────────────────────────

Write-Host ""
Write-Host "STEP 5: Hashing user passwords..." -ForegroundColor Green

$hashCmd = @"
set -e
cd $SITE_DIR
export DATABASE_URL=$DATABASE_URL
node scripts/hash-passwords.mjs
"@

ssh -p $SSH_PORT "${SSH_USER}@${SERVER_IP}" $hashCmd

Write-Host "Password hashing complete." -ForegroundColor Green


# ─── STEP 6: Start the API server with PM2 ───────────────────────────────────

Write-Host ""
Write-Host "STEP 6: Starting the application with PM2..." -ForegroundColor Green

$pm2Commands = @"
set -e
cd $SITE_DIR

# Stop existing instance if running
pm2 delete rdn-api 2>/dev/null || true

# Start the API server
pm2 start dist/index.mjs \
  --name rdn-api \
  --env production \
  --env PORT=3100 \
  -- --env-file .env

pm2 save
pm2 startup 2>/dev/null || true

echo 'PM2 process started:'
pm2 list
"@

ssh -p $SSH_PORT "${SSH_USER}@${SERVER_IP}" $pm2Commands

Write-Host "API server started on port 3100." -ForegroundColor Green


# ─── STEP 7: Print Apache/Nginx proxy instructions ───────────────────────────

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  STEP 7: Web Server Proxy Configuration" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "The Node.js API is running on port 3100." -ForegroundColor Yellow
Write-Host "You need to configure a reverse proxy in DirectAdmin." -ForegroundColor Yellow
Write-Host ""
Write-Host "In DirectAdmin > test.richdatingnetwork.com > .htaccess, add:" -ForegroundColor White
Write-Host ""
Write-Host @"
RewriteEngine On
RewriteCond %{REQUEST_URI} ^/api [OR]
RewriteCond %{REQUEST_URI} ^/ws
RewriteRule ^(.*)$ http://127.0.0.1:3100/`$1 [P,L]

# Serve the Vite-built frontend for all other routes
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [L]
"@ -ForegroundColor Gray
Write-Host ""
Write-Host "OR if you have Node.js App support in DirectAdmin:" -ForegroundColor White
Write-Host "  1. Go to DirectAdmin > Extra Features > Node.js App" -ForegroundColor Gray
Write-Host "  2. Set startup file: artifacts/api-server/dist/index.mjs" -ForegroundColor Gray
Write-Host "  3. Set port: 3100" -ForegroundColor Gray
Write-Host "  4. Set document root to: artifacts/rich-dating-network/dist/public" -ForegroundColor Gray
Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test your site at: $APP_URL" -ForegroundColor Green
Write-Host ""
Write-Host "After confirming everything works:" -ForegroundColor Yellow
Write-Host "  1. Point richdatingnetwork.com domain to the new code folder" -ForegroundColor Gray
Write-Host "  2. Or swap the symlinks in DirectAdmin" -ForegroundColor Gray
Write-Host "  3. Archive/delete the old PHP files" -ForegroundColor Gray
Write-Host ""
