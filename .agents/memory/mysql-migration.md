---
name: MySQL migration patterns
description: Drizzle ORM patterns that work in PostgreSQL but break in MySQL — all found and fixed in this codebase
---

## Patterns that do NOT work in MySQL with Drizzle ORM

**Why:** The codebase was originally written against Drizzle's PostgreSQL adapter. Several Drizzle APIs are PostgreSQL-only. When the DB switches to MySQL these all silently compile but throw runtime errors.

**How to apply:** Any time you add a new DB write or upsert, use the MySQL-safe alternatives below.

### 1. `.returning()` — NOT supported in MySQL
Drizzle's `.returning()` is PostgreSQL-only. MySQL has no equivalent.

**Fix:** Insert without `.returning()`, then immediately SELECT by a unique value you just inserted:
```ts
await db.insert(table).values({ email, ... })
const [row] = await db.select().from(table).where(eq(table.email, email)).limit(1)
```

### 2. `.onConflictDoUpdate({ target, set })` — NOT supported in MySQL
PostgreSQL upsert syntax. MySQL uses `onDuplicateKeyUpdate`.

**Fix:**
```ts
// Instead of:
.onConflictDoUpdate({ target: table.key, set: { value: v } })
// Use:
.onDuplicateKeyUpdate({ set: { value: v } })
```

### 3. `.onConflictDoNothing()` — NOT supported in MySQL
**Fix:** Wrap the insert in a try/catch and swallow duplicate key errors:
```ts
try { await db.insert(table).values(...) } catch { /* ignore duplicate */ }
```

### 4. `ANY(ARRAY[...]::int[])` in raw SQL — PostgreSQL-only
**Fix:** Use `inArray()` from drizzle-orm:
```ts
import { inArray } from "drizzle-orm"
.where(inArray(table.id, ids.filter((id): id is number => id !== null)))
```

## drizzle.config.ts must auto-detect MySQL vs PostgreSQL
`lib/db/drizzle.config.ts` now auto-detects from DATABASE_URL prefix (`mysql://` → mysql dialect + mysql.ts schema, else postgresql + pg.ts schema).

## Files fixed (for reference, not re-derivable from code alone)
All 13 `.returning()` calls, all `onConflictDoUpdate`, all `onConflictDoNothing`, and both `ANY(ARRAY[])` raw SQL patterns were replaced. Key files: `auth.ts`, `photos.ts`, `chat.ts`, `feed.ts`, `admin.ts`, `boost.ts`, `custom-payments.ts`, `moderator.ts`, `social-auth.ts`, `video-calls.ts`, `websocket.ts`, `fake-message-scheduler.ts`, `block.ts`, `push.ts`, `branding.ts`.
