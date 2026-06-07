## Deployment migration plan (Neon + NextAuth magic links)

### Overview
Goal: run the same stack locally and on Vercel using Neon Postgres, NextAuth v5 email/magic-link auth (Resend), and keep parity between dev and production. Local Docker should read `.env.local`. **Production now requires `DATABASE_URL`; file-system storage is development-only.**

### Steps (canonical)
1) Provision Neon
   - Create a project in Neon (free tier OK).
   - Copy the connection string (`postgresql://...sslmode=require`).
   - Run schema once in Neon SQL editor using `schema.sql` at the repo root. It
     creates raffle tables, snapshots, indexes, NextAuth tables, and the
     **AI-translation tables** (`languages`, `ai_configurations`,
     `system_prompts`, `translations`, `usage_records`).
   - `schema.sql` is idempotent (`CREATE ... IF NOT EXISTS`), so re-running it to
     pick up new tables is safe and non-destructive.
   - Alternatively, apply it programmatically with the migration runner:
     ```
     # Local Docker DB (after `docker compose up -d db`):
     DATABASE_URL=postgresql://postgres:postgres@localhost:5432/neondb \
       node scripts/apply-schema.mjs
     # Any environment whose .env.local has DATABASE_URL set:
     npm run db:migrate            # add --arcade to also apply schema.arcade.sql
     ```
     The runner uses `pg` (standard wire protocol), so it works against both
     local Docker Postgres and Neon.

   > **Dev without a database:** language settings (and other AI-translation
   > features as they land) fall back to file storage under `data/` when
   > `STATE_STORAGE=file` or no `DATABASE_URL` is reachable — mirroring the
   > raffle-state file fallback. No schema/DB is required for local file-mode dev.
   - For Arcade high scores, create a separate Neon project/database and run
     `schema.arcade.sql` there. Use its least-privilege runtime role connection
     string as `ARCADE_DATABASE_URL`; do not point Arcade at the core
     `DATABASE_URL`.

2) Update env for local (Docker reads `.env.local` via `env_file`)
   - Add/edit `.env.local`:
     ```
     DATABASE_URL=postgresql://postgres:postgres@db:5432/neondb?sslmode=disable
     # Optional: separate Arcade leaderboard database.
     # ARCADE_DATABASE_URL=postgresql://arcade_scores_runtime:pass@host/db?sslmode=require
     EMAIL_FROM=login@localhost
     EMAIL_SERVER_HOST=maildev
     EMAIL_SERVER_PORT=1025
     ADMIN_EMAIL_DOMAIN=williamtemple.org
     AUTH_SECRET=<openssl rand -base64 32>
     AUTH_BYPASS=false
     AUTH_TRUST_HOST=true
     # RESEND_API_KEY=... (only needed when testing Resend instead of MailDev)
     ```
   - Docker pulls these via `env_file: .env.local`.
   - For production, use `.env.production.example` as a template; `DATABASE_URL` is mandatory.

3) Dependencies
   - Install `@auth/pg-adapter` (for Neon) alongside existing `@neondatabase/serverless`.

4) Code changes (auth)
   - `src/lib/auth.ts`:
     - Uses `DATABASE_URL` exclusively for the adapter; fails fast when missing (production required).
     - Resend only when `RESEND_API_KEY` is set; otherwise defaults to MailDev settings above for local.
     - Domain allowlist enforced; `trustHost` true.

5) Docker config
   - `docker-compose.yml` uses:
     ```yaml
     env_file:
       - .env.local
    environment:
       - NODE_ENV=development
     ```
   - Services: app, Postgres (`db`), MailDev (`maildev`).

6) Test flow checklist
   - `docker compose down && docker compose up --build`
   - Visit `/login`, submit `@williamtemple.org`.
   - Email arrives from `login@williamtemple.app`; link signs in.
   - Neon tables show user rows; verification_token row appears then is consumed.
   - `/admin` accessible post-login; non-allowed domains rejected.

7) Vercel notes
  - Set envs in Vercel: `DATABASE_URL`, `ARCADE_DATABASE_URL`, `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAIL_DOMAIN`, and `ENCRYPTION_MASTER_KEY` (base64-encoded 32-byte value used to encrypt AI provider API keys at rest; generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`). Without it, the AI Configuration tab cannot store keys.
   - Same auth config works on Vercel; Neon free tier is sufficient. Production will fail fast without `DATABASE_URL`.
   - Next.js 16 renamed `middleware` → `proxy`; file lives at `src/proxy.ts` with the same matcher guarding `/admin` and `/api/state` and runs on the Node.js runtime by default (no Edge support).

### Status
- Core schema captured in `schema.sql`; adapter uses `DATABASE_URL` exclusively.
- Arcade leaderboard schema captured in `schema.arcade.sql`; public high-score
  writes use `ARCADE_DATABASE_URL` only.
- Vercel production deployed on `williamtemple.app` with Neon Postgres, Resend magic links, and admin routes protected (auth bypass off).
- Populate `.env.local` / `.env.production` before deployment. Local MailDev remains the default mailer without RESEND.
- Production env on Vercel uses: `DATABASE_URL` (Neon), `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, `RESEND_API_KEY`, `EMAIL_FROM=noreply@williamtemple.app`, `ADMIN_EMAIL_DOMAIN=williamtemple.org`, `AUTH_BYPASS=false`, `NODE_ENV=production`.
