# CLAUDE.md - AI Developer Guide

## 🎯 Project Profile
* **Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5.x, Tailwind CSS 4, Prisma 7 + Neon PostgreSQL, Better Auth, Stripe, Resend, Zod, Vercel AI SDK. Deployed on Vercel.
* **App Description:** VidMaker turns a topic into a finished 60-second vertical Short: AI script (editable scenes) → ElevenLabs voiceover with timestamps → Pexels stock B-roll per scene → captions → Shotstack render. Currently a private tool locked to `OWNER_EMAILS`; Stripe billing is deferred. Higgsfield AI B-roll is planned, not wired.
* **Core Philosophy:** Type safety, modular feature code, and graceful degradation — every optional provider is capability-flagged so a missing key disables that feature instead of crashing the app.

## 🛠️ Critical Commands
Always use these exact commands. Do not guess or substitute.
* **Install Dependencies:** `npm install` (runs `prisma generate` automatically)
* **Development Server:** `npm run dev`
* **Build Project:** `npm run build`
* **Run Linter:** `npm run lint`
* **Type Check:** `npm run typecheck`
* **Create/Apply DB Migration (dev):** `npm run db:migrate`
* **Apply Migrations (prod):** `npm run db:deploy`
* **Regenerate Better Auth schema:** `npm run better-auth:generate`

There is no formatter or test runner configured yet. Verify changes with `npm run typecheck` and `npm run lint`.

## 🗂️ Project Map
* `src/app/` — Next.js App Router pages, layouts and route handlers.
* `src/lib/env.ts` — Zod-validated environment variables and the `capabilities` flags.
* `src/lib/db.ts` — the shared Prisma client (Neon adapter). Import `db` from here; never instantiate `PrismaClient` elsewhere.
* `prisma/schema.prisma` — database schema. Change it, then run `npm run db:migrate`.
* `src/generated/prisma/` — **generated code. Never edit by hand**; it is rebuilt by `prisma generate`.
* `vercel.json` — build command (runs `prisma migrate deploy`; `CHECKPOINT_DISABLE=1` turns off Prisma's online update check, which crashed a Vercel build) and the `/api/cron/poll-videos` cron (daily, Hobby-plan safe; open video pages poll status themselves).
* `src/features/auth/` — Better Auth server actions and forms. `src/lib/auth.ts` holds the config, `requireUser`, and the owner lock.
* `src/features/videos/` — the core loop: `actions.ts` (Server Actions), `pipeline.ts` (produce + refresh), `timeline.ts` (scene timing, captions, Shotstack edit), `providers/` (one file per external API).
* `.github/workflows/prisma-migrations.yml` — writes migration files on GitHub when `schema.prisma` changes (Prisma engine downloads are blocked in some sandboxes). Pull after pushing a schema change.
* `.env.example` — every environment variable the app reads. Keep it in sync with `src/lib/env.ts`.

## 🔐 Environment & Providers
* Read environment variables only through `env` from `@/lib/env`, never `process.env` directly.
* Before calling an optional provider (Stripe, Resend, Higgsfield, ElevenLabs, Pexels, Vercel Blob, Shotstack, AI Gateway, Google OAuth), check the matching flag in `capabilities` and return a clear "unavailable" state when it is off.
* When adding a new variable, add it to both the Zod schema in `src/lib/env.ts` and `.env.example`.
* Cron routes must verify `CRON_SECRET`.
* Studio access is decided by `hasStudioAccess` in `src/lib/auth.ts`: owner emails, then `User.premiumUntil`. Keep `premiumUntil` the single source of truth for premium gating once billing ships.

## 🎨 Code Style & Quality Standards
Adhere strictly to these patterns. Do not deviate unless explicitly instructed.

### TypeScript & Architecture
* **Type Safety:** Always prefer explicit types over `any`. Avoid `as unknown` casting (the `globalThis` Prisma singleton in `src/lib/db.ts` is the one accepted exception).
* **Imports:** Use the `@/` alias for anything under `src/`.
* **File Structure:** Group new code by feature module, not generic folders (e.g., `src/features/auth/components/` instead of a massive flat `src/components/` folder).
* **Naming Conventions:**
  * Components: PascalCase (e.g., `UserProfile.tsx`)
  * Hooks/Functions: camelCase (e.g., `useAuth.ts`, `calculateTotal.ts`)
  * Constants: UPPER_SNAKE_CASE (e.g., `MAX_RETRY_ATTEMPTS`)

### UI & Styling
* **Tailwind:** This is Tailwind v4 (CSS-first config in `src/app/globals.css`). Use utility classes directly and the theme tokens defined there (e.g., `text-(--color-ink)`). Avoid arbitrary pixel values (`h-[432px]`) — rely on the standard spacing scale.
* **Components:** Build accessible (ARIA-compliant) components. Small hand-rolled primitives live in `src/components/ui/`; no component libraries (no shadcn/ui).

## 🔄 Cognitive Workflow Rules
When working in this codebase, you must follow this mental model:

1. **Analyze First:** Read the target file and its relevant imports *before* suggesting any changes. Do not assume how an unread file functions.
2. **Verify Every Change:** Run `npm run typecheck` and `npm run lint` after changes. If a test runner is added later, locate or create the corresponding `.test.ts` file and confirm existing expectations still pass; ask before introducing a test framework.
3. **No Placeholders:** Write complete code blocks. Do not use `// TODO: implement later` or `// ... rest of code stays the same` unless modifying a massive 500+ line file.
4. **Error Handling:** Always wrap asynchronous network operations or database queries in explicit `try/catch` blocks with typed error handling.
