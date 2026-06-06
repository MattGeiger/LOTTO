# Deployment & Operations

Operational reference for running LOTTO locally and in production. For a product
overview see the [README](../README.md); for release history see
[`CHANGELOG.md`](../CHANGELOG.md) and [`docs/RELEASES.md`](./RELEASES.md).

## Local URLs

- Personalized homepage (client): http://localhost:3000/
- Public board: http://localhost:3000/display
- Inventory lookup: http://localhost:3000/inventory
- Arcade: http://localhost:3000/arcade
- Staff dashboard (admin): http://localhost:3000/admin
- Staff landing: http://localhost:3000/staff
- Help: http://localhost:3000/help
- Login: http://localhost:3000/login

## Scripts

- `npm run dev` — start the Next.js dev server.
- `npm run build` — production build.
- `npm start` — run the built app.
- `npm run readonly` — optional standalone read-only board on port 4000
  (configurable via `READONLY_PORT`).
- `npm test` — Vitest suite.
- `npm run lint` — ESLint.

## Local development (no external deps)

`docker compose` runs the app, Postgres, and MailDev (SMTP + web UI):

```bash
docker compose up --build
```

- App on http://localhost:3000; MailDev inbox on http://localhost:1080.
- Stored state lives in the host `./data` directory (survives restarts).
- Local `npm run dev` on localhost bypasses auth automatically (no OTP needed).
- Fully offline: leave `RESEND_API_KEY` unset and keep `EMAIL_FROM=login@localhost`.
- To exercise the full email flow, keep `AUTH_BYPASS=false`, start docker, and open
  magic links from MailDev.

### Environment setup

1. Copy the example: `cp .env.example .env.local`
2. Generate a secret: `openssl rand -base64 32`
3. Fill `.env.local`:
   - `AUTH_SECRET` (required) and `AUTH_TRUST_HOST=true`
   - `DATABASE_URL=postgresql://postgres:postgres@db:5432/neondb?sslmode=disable`
   - `EMAIL_FROM=login@localhost`, `EMAIL_SERVER_HOST=maildev`, `EMAIL_SERVER_PORT=1025`
   - `ADMIN_EMAIL_DOMAIN` (optional; restrict sign-ins)
   - Optional: `RESEND_API_KEY` + production `EMAIL_FROM` to test Resend instead of MailDev

See `.env.example` for the full list.

## Read-only board options

- Built-in: `/display` is the QR-enabled public board.
- FEED inventory: `/inventory` reads `NEXT_PUBLIC_FEED_PUBLIC_INVENTORY_URL` when
  set, otherwise defaults to `https://feed.williamtemple.app/api/public/inventory.json`.
- Optional standalone server: `npm run readonly` (port `4000`), polling
  `data/state.json` for legacy/edge hosting. Configure via `READONLY_PORT`,
  `READONLY_POLL_MS`, `READONLY_DATA_DIR`.

## Persistence

- Development fallback: `data/state.json` with timestamped backups
  (`state-YYYYMMDDHHMMSSmmm-XXXXXX.json`); the `data/` dir is gitignored except
  `data/.gitkeep`.
- Production: Neon Postgres (the file store is only used when `DATABASE_URL` is
  absent in development).

## Production deployment (Vercel + Neon + Resend)

- **Live:** https://williamtemple.app (Vercel, custom domain).
- **Auth:** NextAuth magic link + OTP fallback; sign-ins restricted to
  `@williamtemple.org`.
- **Email:** Resend (`login@williamtemple.app`; configure SPF/DKIM/DMARC in DNS).
- **Database:** Neon Postgres (serverless) with a shared connection pool.

### Production environment variables

```
AUTH_BYPASS=false
AUTH_SECRET=<generated>
AUTH_TRUST_HOST=true
DATABASE_URL=postgresql://...sslmode=require
EMAIL_FROM=login@williamtemple.app
RESEND_API_KEY=re_...
ADMIN_EMAIL_DOMAIN=williamtemple.org
NODE_ENV=production
```

### Postgres schema (run once)

```sql
create table if not exists raffle_state (
  id text primary key default 'singleton',
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists raffle_snapshots (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists raffle_snapshots_created_at_idx on raffle_snapshots (created_at desc);
```

- Use `@neondatabase/serverless`. On persist: upsert `raffle_state` and insert a
  `raffle_snapshots` row (unless backups are skipped). On load: read
  `raffle_state`, seeding a default row if missing. Undo/redo/restore query
  `raffle_snapshots` ordered by `created_at desc`.
- Snapshot retention: a daily Vercel Cron route trims old snapshots (e.g. keep
  last 500 or 30 days) to stay within free-tier storage.

### Deploy checklist

1. Provision Neon (Vercel Marketplace) and note `DATABASE_URL`; create the tables above.
2. Set all env vars in the Vercel project.
3. Deploy; verify `/display` (public), `/admin` (auth required), and `/api/state`
   reads/writes against Neon.
4. Confirm magic-link delivery for an `@williamtemple.org` address.

## Theme / design tokens

Global palette and design tokens live in `src/app/globals.css`
(`--color-primary`, surfaces, borders, focus, status colors). UI components
consume those tokens rather than hard-coded colors — change the tokens to restyle
app-wide. See [`docs/UI_DESIGN.md`](./UI_DESIGN.md) for the design system.
