# Rich Dating Network

A luxury dating web app for successful, ambitious singles. Supports real users, AI-managed fake profiles, moderator reply tools, and a full admin panel.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/rich-dating-network run dev` — run the frontend (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes (Replit dev / PostgreSQL only — NEVER run on production MySQL)
- Required env: `DATABASE_URL` — PostgreSQL in Replit dev, MySQL on production server

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite (port 5000), Tailwind CSS 4, Radix UI, Wouter routing
- API: Express 5 (port 8080)
- DB: **Production = MySQL** (DirectAdmin server), **Dev = PostgreSQL** (Replit built-in). Code auto-detects from `DATABASE_URL`. Both dialects must always be kept working.
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Auth: JWT (stored in localStorage as `rdn_auth`)

## Where things live

- `lib/db/src/schema/index.ts` — DB schema (source of truth)
- `artifacts/api-server/src/routes/` — all API routes
- `artifacts/rich-dating-network/src/pages/` — page components
- `artifacts/rich-dating-network/src/components/admin/` — admin panel components
- `artifacts/api-server/src/lib/fake-message-scheduler.ts` — auto fake message logic

## Architecture decisions

- **Role system**: `users.admin` column is a level: 0=user, 1=moderator, 2=admin. Admin panel (`/admin`) requires `admin >= 2`. Moderator panel (`/moderator`) requires `admin >= 1`.
- **Chat locking**: `chat_locks` table ensures only one moderator handles a fake↔real conversation at a time. Locks expire after 10 minutes of inactivity and auto-extend on reply.
- **Fake users**: Marked with `users.fake = 1`. Auto messages are scheduled via the fake message scheduler. Moderators reply to real users *as* fake users through the moderator panel.
- **Phone storage**: Full international format stored (e.g., `+254712345678`). Country code auto-detected on registration from IP geolocation.
- **Location autocomplete**: `/api/location/autocomplete` — public endpoint, no auth required. Searches local city list + Nominatim fallback. `authFetch` used in component (gracefully handles no-token).

## Product

- **Registration**: 4-step flow — Account (name/email/password/username/phone with country code) → About You (gender/looking-for/DOB) → Location (city autocomplete + country) → Photo upload
- **Discovery**: Browse real + fake profiles with filters
- **Chat**: Real-time messaging between users (fake messages sent by moderators or scheduled automatically)
- **Moderator Panel** (`/moderator`): See all fake↔real conversations, lock one to reply as the fake user, conversation expires lock after 10 min inactivity
- **Admin Panel** (`/admin`): Full user management, fake user management, fake message templates, photo moderation, payment config, site settings, activity log
- **Video Calls**: Fake incoming video calls from fake profiles (with profile photo shown during ringing)
- **Premium/Credits**: Subscription + credit economy for unlocking features

## User preferences

- Keep existing code structure unless instructed to change it
- Use Tailwind CSS (not inline styles) for new frontend components
- Admin panel uses inline styles (existing pattern — maintain it)
- Phone numbers stored with full international dial code prefix

## Gotchas

- **Production site**: `richdatingnetwork.com` — deploy by SSHing into the server and running `bash /home/admin/domains/richdatingnetwork.com/public_html/deploy.sh`
- After editing DB schema in **Replit dev**: run `pnpm --filter @workspace/db run push` (PostgreSQL only). For **production MySQL**, schema changes are applied via `scripts/migrate-from-legacy.sql` — add new `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements there. Never run drizzle-kit push on the production server — it hangs interactively on legacy tables.
- API server must be restarted after route changes (esbuild rebuild)
- Vite proxies `/api` → `http://localhost:8080` (configured in `artifacts/rich-dating-network/vite.config.ts`)
- The `admin` column repurposed: old PHP site had admin=1 for admins, new system uses admin=2 for admins and admin=1 for moderators — existing admin users need their level bumped to 2 after import
- `authFetch` in frontend adds auth token if available, falls back to regular fetch if not — safe to use on public endpoints

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
