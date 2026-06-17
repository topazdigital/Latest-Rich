---
name: MySQL only — never PostgreSQL
description: This is a live production site on MySQL. Never use PostgreSQL, never call createDatabase(), never run drizzle-kit push. All schema changes go via SQL migration scripts only.
---

# MySQL only rule — PRODUCTION SITE

The production server is DirectAdmin + MySQL. The developer has explicitly and repeatedly stated that this is a live production site and only MySQL is used.

**Rule:** NEVER provision PostgreSQL for this project. NEVER call `createDatabase()`. NEVER run `pnpm --filter @workspace/db run push` (drizzle-kit push). NEVER change `DATABASE_URL` to a `postgresql://` connection string.

**Why:** The user runs MySQL on their DirectAdmin VPS at richdatingnetwork.com. Any PostgreSQL-specific code, env var, or schema push will break the live production site. The user explicitly said: "this is a real production site don't change anything except what I just asked" and "make sure you update so future agents never try to change to postgres without my prompts."

**How schema changes work:**
- New tables/columns for production → add `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` to `scripts/migrate-from-legacy.sql` (or a dedicated script like `scripts/mysql-migrate-email-campaigns.sql`)
- User deploys via: `bash /home/admin/domains/richdatingnetwork.com/public_html/deploy.sh`
- Then runs the migration manually on the server: `mysql -u USER -p DBNAME < scripts/the-migration.sql`

**What NOT to do (even during Replit environment setup):**
- Do NOT call `createDatabase()` — this provisions Replit PostgreSQL
- Do NOT run `pnpm --filter @workspace/db run push`
- Do NOT set DATABASE_URL to anything other than a mysql:// or mysql2:// URL
- Do NOT install or configure pg/postgres drivers as primary
