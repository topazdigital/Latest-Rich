---
name: Production deploy command
description: The permanent command to deploy to the production server from GitHub
---

The deploy.sh script lives in the project root on the server. Always use the absolute path to avoid "No such file or directory" errors (which happen if the current directory gets deleted/replaced during deploy).

**Command to always use:**
```
bash /home/admin/domains/test.richdatingnetwork.com/public_html/deploy.sh
```

If the files ever move to the main domain folder:
```
bash /home/admin/domains/richdatingnetwork.com/public_html/deploy.sh
```

**Why:** The user ran `bash deploy.sh` from inside `public_html`, but after deploy.sh re-launched itself (because code changed), the parent directory no longer existed in the process's working directory. Absolute path bypasses this.

**How the deploy pipeline works:**
1. deploy.sh does `git pull` from GitHub (topazdigital/Latest-Rich, main branch)
2. Installs pnpm dependencies
3. Runs `scripts/migrate-from-legacy.sql` on MySQL (idempotent)
4. Builds API server (esbuild)
5. Builds frontend (Vite)
6. Stops/deletes old PM2 process, starts fresh as `rdn-api`
7. Saves PM2 process list

**PM2 process ID:** dynamically assigned each deploy (was 56, became 57 after redeploy). Use `pm2 logs rdn-api` not the ID.
