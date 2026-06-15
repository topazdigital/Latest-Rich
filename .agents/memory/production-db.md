---
name: Production vs dev database
description: Production server uses MySQL, Replit dev uses PostgreSQL — the code auto-detects and both must be kept working.
---

## Rule
Production (DirectAdmin server at test.richdatingnetwork.com) uses **MySQL**.
Replit dev environment uses **PostgreSQL** (Replit's built-in DB).

The database layer in `lib/db/src/index.ts` auto-detects by inspecting `DATABASE_URL`:
- Starts with `mysql://` or `mysql2://` → uses MySQL driver + `lib/db/src/schema/mysql.ts`
- Anything else → uses PostgreSQL driver + `lib/db/src/schema/pg.ts`

## What this means for agents

- **Never remove PostgreSQL** from the codebase or `lib/db`. It is used for local Replit development.
- **Never run `pnpm --filter @workspace/db run push`** in production (MySQL) — it hangs interactively when the legacy database has many unrecognised tables.
- **Schema sync for production** is done by running `scripts/migrate-from-legacy.sql` via the MySQL CLI. This is what `deploy.sh` step 5 does. It uses only `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` — fully non-interactive.
- `drizzle-kit push` is only safe to run in **Replit dev** (PostgreSQL, no legacy tables).
- `onDuplicateKeyUpdate` is MySQL-only. PostgreSQL uses `onConflictDoUpdate`. The codebase must use whichever matches the active schema dialect — or, since routes always run against the same DB as configured, just use the correct one for each environment.
- Legacy password column is `pass` (old PHP site), mapped in Drizzle as `legacyPass: text("pass")`. Auth falls back to it automatically. Do NOT add a separate `legacyPass` MySQL column.

**Why:**
The original PHP site at richdatingnetwork.com ran on DirectAdmin + MySQL. The new Node.js app shares that MySQL database for production, but was developed on Replit which provides PostgreSQL. Both environments must work.
