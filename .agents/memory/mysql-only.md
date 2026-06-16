---
name: MySQL only — never PostgreSQL
description: The live production server uses MySQL. Replit dev also uses MySQL (user's choice). Never switch to PostgreSQL or add PG-specific code.
---

# MySQL only rule

The production server is DirectAdmin + MySQL. The developer has explicitly stated:

> "don't ever update to use PostgreSQL … I am using mysql on a live server … revert to use mysql"

**Rule:** `DATABASE_URL` must always point to MySQL. Never provision or configure PostgreSQL for this project. Never run `pnpm --filter @workspace/db run push` (drizzle-kit push — it only works with PG). Schema changes for dev go via `scripts/migrate-from-legacy.sql`.

**Why:** The user runs MySQL on their DirectAdmin VPS. Any PostgreSQL-specific code or env var will break the production site.

**How to apply:** If a future agent sets up Replit's built-in PostgreSQL or changes DATABASE_URL to a `postgresql://` URL, revert it immediately and restore the MySQL URL. Never call `createDatabase()` for this project.
