---
name: Production deploy command
description: The permanent command to deploy to the production server from GitHub
---

The deploy.sh script lives in the project root on the server. Always use the absolute path.

**Command:**
```
bash /home/admin/domains/richdatingnetwork.com/public_html/deploy.sh
```

**Why absolute path:** Running `bash deploy.sh` from inside `public_html` fails when deploy.sh replaces the directory during git pull.

**Port assignment (NEVER change without checking server):**
- `rdn-api` uses **port 7080** — chosen because the server runs multiple Node apps:
  - 3000, 3001 (betcheza Next.js), 3005, 5000 — next-server apps
  - 8080 — wet3camp-api
  - 7080 — **rdn-api (Rich Dating Network)**
- `ecosystem.config.cjs` and `deploy.sh` both set `PORT: 7080`
- `.htaccess` proxies `http://localhost:7080`

**Why:** EADDRINUSE crash loop: wet3camp-api occupied 8080, betcheza occupied 3001. 7080 was the first free port confirmed with `ss -tlnp`.

**How to apply:** If adding new sites to this server, check `ss -tlnp | grep node` first and avoid 7080.

**How the deploy pipeline works:**
1. `git pull` from GitHub (topazdigital/Latest-Rich, main branch)
2. Installs pnpm dependencies
3. Runs `scripts/migrate-from-legacy.sql` on MySQL (idempotent)
4. Builds API server (esbuild)
5. Builds frontend (Vite)
6. Stops/deletes old PM2 process, kills port 7080, starts fresh as `rdn-api`
7. Saves PM2 process list

**PM2 process name:** `rdn-api` (ID changes each deploy — use `pm2 logs rdn-api`, not the ID).
