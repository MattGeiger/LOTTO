# Deployment & Operations

Operational reference for running LOTTO locally and in production. For a product
overview see the [README](../README.md); for release history see
[`CHANGELOG.md`](../CHANGELOG.md) and [`docs/RELEASES.md`](./RELEASES.md).

## Local URLs

- Personalized homepage (client): http://localhost:3000/
- Public board: http://localhost:3000/display
- Inventory lookup (only when FEED is configured): http://localhost:3000/inventory
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
   - `ADMIN_EMAIL_ALLOWLIST` (exact addresses) or `ADMIN_EMAIL_DOMAIN`
     (domain-wide fallback); production fails closed when neither is set
   - Optional: `RESEND_API_KEY` + production `EMAIL_FROM` to test Resend instead of MailDev

See `.env.example` for the full list.

### Select a brand profile

`NEXT_PUBLIC_LOTTO_BRAND` selects a typed, public brand profile at build/start
time. If it is omitted, LOTTO uses `william-temple-house` to preserve the
existing production project. The included values are:

```text
william-temple-house
st-johns-food-share
```

Run the St. Johns queue-only profile while retaining every database, Resend,
auth, and storage value already present in `.env.local`:

```bash
NEXT_PUBLIC_LOTTO_BRAND=st-johns-food-share \
NEXT_PUBLIC_FEED_PUBLIC_INVENTORY_URL= \
npm run dev
```

An unknown profile or malformed FEED URL fails early instead of silently using
another agency's identity or inventory. The profile schema, assets, and process
for adding another organization are documented in
[`WHITE_LABEL_BRANDING_PLAN.md`](./WHITE_LABEL_BRANDING_PLAN.md).

## Read-only board options

- Built-in: `/display` is the QR-enabled public board.
- FEED inventory: `/inventory` is available only when the selected profile has
  a default FEED endpoint or `NEXT_PUBLIC_FEED_PUBLIC_INVENTORY_URL` is set. The
  William Temple House profile declares its current production endpoint. The
  St. Johns profile is queue-only by default, so its Inventory nav item is
  omitted and `/inventory` returns not found.
- Optional standalone server: `npm run readonly` (port `4000`), polling
  `data/state.json` for legacy/edge hosting. Configure via `READONLY_PORT`,
  `READONLY_POLL_MS`, `READONLY_DATA_DIR`.

## Persistence

- Development fallback: `data/state.json` with timestamped backups
  (`state-YYYYMMDDHHMMSSmmm-XXXXXX.json`); the `data/` dir is gitignored except
  `data/.gitkeep`.
- Production: Neon Postgres (the file store is only used when `DATABASE_URL` is
  absent in development).

## Production deployment (one Vercel project per agency)

All agencies deploy the same repository and branch. Each agency must have a
separate Vercel project, Neon database, auth secret, Resend sender/domain,
allowed staff-email policy, and public domain. Do not share databases or secrets
between agencies. Set `NEXT_PUBLIC_LOTTO_BRAND` independently in each Vercel
project; set `NEXT_PUBLIC_FEED_PUBLIC_INVENTORY_URL` only if that agency has its
own FEED deployment.

### William Temple House production

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

`NEXT_PUBLIC_LOTTO_BRAND` may remain unset for this existing project; the safe
default is `william-temple-house`. It may also be set explicitly to that value.

### St. Johns Food Share production

The profile targets `https://stjohnsfoodshare.app` in its own Vercel project.
Until managed `@stjohnsfoodshare.org` mailboxes exist, use an exact Gmail
allowlist rather than authorizing the entire `gmail.com` domain:

```text
NEXT_PUBLIC_LOTTO_BRAND=st-johns-food-share
AUTH_BYPASS=false
AUTH_SECRET=<new St. Johns secret>
AUTH_TRUST_HOST=true
DATABASE_URL=<new St. Johns Neon connection>
EMAIL_FROM=<verified St. Johns sender>
RESEND_API_KEY=<St. Johns-capable Resend key>
ADMIN_EMAIL_ALLOWLIST=<approved address@gmail.com>
ADMIN_EMAIL_DOMAIN=
AUTH_URL=https://stjohnsfoodshare.app
NODE_ENV=production
```

Leave `NEXT_PUBLIC_FEED_PUBLIC_INVENTORY_URL` unset for queue-only deployment.
Set `EMAIL_FROM=login@stjohnsfoodshare.app` after Resend verifies the purchased
domain. When individual organizational mailboxes are available, remove the
allowlist and set `ADMIN_EMAIL_DOMAIN=stjohnsfoodshare.org`.

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

1. Create or select the agency's dedicated Vercel project.
2. Provision that agency's Neon database and note `DATABASE_URL`; create the tables above.
3. Set the brand, auth, email, and optional FEED variables in that Vercel project.
4. Deploy; verify `/display` (public), `/admin` (auth required), and `/api/state`
   reads/writes against Neon.
5. Confirm OTP and magic-link delivery for an address allowed by that agency's
   exact-address or domain policy, and confirm another address is rejected.
6. For queue-only deployments, confirm the nav omits Inventory, `/inventory`
   returns 404, and CSP does not include a FEED origin. For FEED-enabled
   deployments, confirm the agency-specific inventory and CSP origin.

## Theme / design tokens

`src/app/globals.css` is the ordered theme import manifest. Shared foundations,
protected operational semantics, and component rules live under
`src/app/styles/shared/`; deployment identity layers live under
`src/app/styles/brands/`. Agency selectors must not replace universal status
semantics. See [`docs/CSS_THEME_ARCHITECTURE.md`](./CSS_THEME_ARCHITECTURE.md)
and [`docs/UI_DESIGN.md`](./UI_DESIGN.md).
