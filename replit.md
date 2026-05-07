# Rich Dating Network

A full-featured luxury dating platform for affluent singles — with profiles, swipe-to-meet, real-time chat, notifications, premium subscriptions, and credits.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/rich-dating-network run dev` — run the React frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS v4, wouter routing, react-hot-toast
- API: Express 5, JWT auth (custom HS256), multer for file uploads
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/rich-dating-network/src/` — React frontend
  - `pages/` — page-level route wrappers (fetch data, render components)
  - `components/` — feature components (landing, layout, home, discover, meet, chat, profile, notifications, settings, premium, credits)
  - `hooks/useAuth.ts` — JWT auth context + `AuthContext`
  - `lib/auth.ts` — localStorage auth persistence helpers
  - `lib/utils.ts` — shared utilities (timeAgo, getPhotoUrl, etc.)
  - `index.css` — global styles, brand CSS classes, Tailwind theme
- `artifacts/api-server/src/` — Express API
  - `routes/` — auth, users, likes, chat, feed, notifications, photos, premium, credits, payments, stories, uploads
  - `lib/jwt.ts` — custom HS256 JWT sign/verify
  - `lib/auth-middleware.ts` — requireAuth / optionalAuth middleware
  - `lib/password.ts` — salt+SHA256 password hashing
- `lib/db/src/schema/index.ts` — full Drizzle schema (users, photos, likes, messages, feed, notifications, orders, stories)

## Architecture decisions

- **JWT in localStorage**: Replaced NextAuth with custom JWT tokens stored in localStorage; sent as `Authorization: Bearer <token>` header on every API call.
- **No Socket.io**: Chat uses 5-second polling instead of websockets for simplicity.
- **Custom JWT**: Uses `crypto` built-in (no jsonwebtoken dependency) — HS256 with HMAC-SHA256.
- **Password hashing**: Salt + SHA256 (16-byte random salt), no bcrypt dependency.
- **Multer for uploads**: Photos saved to `artifacts/api-server/uploads/` and served via `/api/uploads/:filename`.

## Product

- **Landing page**: Hero, stats, features, CTA — public, no auth required
- **Register**: 3-step wizard (basic info → about you → location)
- **Home**: Social feed with posts + suggested members sidebar
- **Discover**: Grid of member profiles with search + filters (gender, country, age)
- **Meet**: Tinder-style swipe cards with like/pass/superlike/chat
- **Chat**: Conversation list + chat window with 5s polling
- **Profile**: Full profile view with photos, details, like/message CTA
- **Notifications**: Like, match, superlike, visit, message notifications
- **Settings**: Profile edit, photo upload/delete, password change
- **Premium**: Subscription packages (1/3/6/12 months) with Stripe integration
- **Credits**: Credit packages (100/250/500/1000) with purchase history

## User preferences

- Brand color: #FF192C (red-pink gradient)
- Mobile-first design with bottom nav on mobile, top nav on desktop

## Gotchas

- `pnpm --filter @workspace/db run push` must be run after any schema changes
- API server must rebuild before starting (`dev` script does both automatically)
- Vite proxies `/api/*` to the API server — configure via `vite.config.ts` proxy if needed
- Photo uploads go to `artifacts/api-server/uploads/` (not version-controlled)
- `JWT_SECRET` env var should be set in production

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
