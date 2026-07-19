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
   - `ADMIN_EMAIL_ALLOWLIST` (exact addresses) and/or `ADMIN_EMAIL_DOMAIN`
     (managed domain); when both are set either path is accepted, and production
     fails closed when neither is set
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

**If another agency's production project already exists (e.g. `williamtemple.app`),
treat it as read-only for the duration of a new agency's launch.** All of the
steps below happen in a *new*, separate Vercel project, a *new* Neon database,
and that agency's own DNS/Resend accounts. The only time the existing project is
touched is the one shared step everyone deploys through — merging to `main` (see
[Shared branch, one merge affects everyone](#shared-branch-one-merge-affects-everyone)
below) — and that step should only ship code already verified to build cleanly
for every brand profile.

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
Until managed `@stjohnsfoodshare.org` mailboxes exist, authorize the shared Gmail
address exactly and combine it with the trusted Temple PDX administrative
domain. Do not authorize the entire `gmail.com` domain:

```text
NEXT_PUBLIC_LOTTO_BRAND=st-johns-food-share
AUTH_BYPASS=false
AUTH_SECRET=<new St. Johns secret>
AUTH_TRUST_HOST=true
DATABASE_URL=<new St. Johns Neon connection>
EMAIL_FROM=<verified St. Johns sender>
RESEND_API_KEY=<St. Johns-capable Resend key>
ADMIN_EMAIL_ALLOWLIST=stjohnsfoodshare@gmail.com
ADMIN_EMAIL_DOMAIN=templepdx.com
AUTH_URL=https://stjohnsfoodshare.app
NODE_ENV=production
```

Leave `NEXT_PUBLIC_FEED_PUBLIC_INVENTORY_URL` unset for queue-only deployment.
Set `EMAIL_FROM=login@stjohnsfoodshare.app` after Resend verifies the purchased
domain. This policy also authorizes `matt@templepdx.com`. When individual
organizational mailboxes are available, remove the temporary Gmail exception
and replace the domain with `ADMIN_EMAIL_DOMAIN=stjohnsfoodshare.org`.

## New agency deployment runbook

This is the full, step-by-step path from "nothing exists yet" to a live
production deployment for a new agency, written up after actually launching
St. Johns Food Share (2026-07-18). Follow it in order — several steps have
non-obvious failure modes that are easy to misdiagnose as something else. Where
a step is Vercel/Neon/Resend/Namecheap-specific, that's called out; swap in
whatever registrar/host the agency actually uses.

### 0. Prerequisites

- The agency's brand profile already exists in `src/config/brand.ts` (see
  [`WHITE_LABEL_BRANDING_PLAN.md`](./WHITE_LABEL_BRANDING_PLAN.md) for the
  schema and asset requirements) and its code has already merged to `main`.
  Confirm both `npm run build` (default/no brand env) and
  `NEXT_PUBLIC_LOTTO_BRAND=<new-profile> npm run build` succeed locally before
  merging — a merge to `main` redeploys **every** agency sharing this repo (see
  [Shared branch, one merge affects everyone](#shared-branch-one-merge-affects-everyone)).
- You have (or can get) admin access to: the shared Vercel team, a Neon
  account/project for this agency, a Resend account, and the agency's domain
  registrar.

### 1. Create the Vercel project and connect Git

1. In the Vercel dashboard, create a new project for the agency (or use one a
   teammate already scaffolded — check **Settings → Git** first; it may not be
   connected yet).
2. **Settings → Git → Connect Git Repository** → pick the same repo every other
   agency deploys from (e.g. `MattGeiger/LOTTO`). This opens a repo-picker
   that may appear as a **separate OS-level popup window** outside whatever
   browser-automation tooling you're using — if a click on "GitHub" appears to
   hang, check for a popup before assuming it failed.
3. **Settings → Environments**: confirm the `Production` environment's branch
   tracking is `main` (this is usually already correct — it's the repo's
   default branch — but verify it explicitly).
4. **Verify Settings → Build and Deployment → Framework Preset reads "Next.js".**
   This is the single most important checkbox in this whole runbook and it is
   **not guaranteed to auto-detect correctly**, especially for a project that
   was scaffolded before Git was connected (e.g. by connecting a database
   first). If it silently defaults to **"Other"**, `npm run build` still
   succeeds and the deployment shows **Ready** — but every route serves
   Vercel's generic `404: NOT_FOUND` in production, because the build output
   isn't wired up as a Next.js app. There is no error anywhere pointing at this
   — you have to know to check it. See
   [`docs/ISSUES.md`](./ISSUES.md) for the full failure story. If you have to
   fix this *after* a deployment already ran, saving the corrected setting does
   **not** retroactively fix that deployment — you must trigger a new one
   (**Deployments → ⋯ → Redeploy**, "latest Project Settings" applied).
5. Connecting Git does **not** automatically trigger a first deployment. If
   **Deployments** is empty after connecting, trigger one manually:
   **Deployments → ⋯ (top right) → Create Deployment**, type `main`, and
   confirm it resolves to **Production** before deploying.

### 2. Provision a dedicated Neon database

1. In the new Vercel project: **Storage → Create Database → Neon → Continue**.
   This uses Vercel's Neon Marketplace integration on the "Launch" plan
   (usage-based: storage + compute-hours; not contractually free, but
   typically near-zero for a low-traffic queue app). **Never reuse another
   agency's database** — always create a new one here.
2. Name it something recognizable (matching the project name is a good
   default) and pick the same region as the Vercel deployment.
3. When connecting the new database to the project, Vercel asks which
   **Environments** to inject its variables into — the default is
   **Production and Preview**, which is correct; take it. (WTH's database was
   set up Production-only at some point, which is why its PR/branch preview
   builds fail — see
   [Known issue: WTH previews fail](#known-issue-wth-preview-deployments-fail-production-is-unaffected)
   below. Don't repeat that for a new agency.) Leave the **Custom Environment
   Variable Prefix** field empty — the app expects the bare `DATABASE_URL`
   name, not a prefixed one.

### 3. Apply the database schema

**This step is easy to skip and the failure mode is confusing** — the app will
otherwise deploy successfully, the public `/display` board will even work (it
falls back to defaults), but staff sign-in silently breaks: OTP requests fail
with a generic "Unable to issue code," and Magic Link fails with NextAuth's
generic "Configuration" error. Neither error mentions the database. Root cause:
those flows read/write `verification_token`, `users`, `accounts`, `sessions`,
and `otp_failures` — tables that don't exist yet on a freshly created database.

The canonical schema lives in [`schema.sql`](../schema.sql) at the repo root
(applied idempotently by `scripts/apply-schema.mjs`, run via `npm run
db:migrate`). **Do not hand-copy a subset of it into this doc again** — that's
exactly how this step got missed on the first St. Johns launch: an older
version of this doc embedded a two-table snippet (`raffle_state` +
`raffle_snapshots` only) that predated the NextAuth and AI-translation tables
being added to `schema.sql`, and following the doc instead of the real file
silently reproduced the same gap. Always point at the file.

**How you apply it depends on how you got the connection string:**

- **If you have `DATABASE_URL` locally** (e.g. you provisioned the Neon
  database directly at [console.neon.tech](https://console.neon.tech) instead
  of through Vercel's Marketplace flow, then linked it to Vercel as an
  *existing* database): put it in `.env.local` and run
  `npm run db:migrate` from the repo root. This is the easy path — prefer it
  for future agencies if you have the choice.
- **If the database was created through Vercel's "Create Database" flow (as
  in step 2 above)**: `DATABASE_URL` is stored as a Vercel **Sensitive**
  environment variable, which **cannot be revealed again after creation** —
  not in the dashboard (no reveal/eye icon, only a lock icon), not via
  `vercel env pull` (even with `--yes`, even from a real interactive
  terminal — it writes the literal string `"[SENSITIVE]"` to the `.env` file
  instead of the value), and not via the Neon integration's own
  ".env.local"/"Show secret" panel. This is intentional Vercel platform
  behavior for that variable type, not a bug to work around by trying harder.
  Instead, run the SQL directly against the database without ever needing the
  connection string:
  1. Vercel dashboard → project → **Storage** → the database → **Query** (in
     the left nav, under "Database").
  2. The first write query in a session prompts for **2FA** (authenticator
     code or passkey) — this is your Vercel account's own security, not
     something to route around; have the account owner complete it.
  3. Toggle **Read-only** off.
  4. The query box only accepts **one SQL statement per run** — pasting the
     whole multi-statement `schema.sql` fails with `cannot insert multiple
     commands into a prepared statement`. Copy each `CREATE TABLE` /
     `CREATE INDEX` statement from `schema.sql` one at a time, in file order
     (foreign keys mean order matters — e.g. `users` before `accounts` and
     `sessions`; `ai_configurations`/`translations` before `usage_records`),
     and run each with the ⌘+Enter / Run button.
  5. Verify: **Schema** tab in the same left nav, switch the schema selector
     from Neon's own default (`neon_auth`) to **`public`**, and confirm all 13
     tables from `schema.sql` are listed (`accounts`, `ai_configurations`,
     `languages`, `otp_failures`, `raffle_snapshots`, `raffle_state`,
     `sessions`, `system_prompts`, `translations`, `usage_records`, `users`,
     `verification_token`).

### 4. Set environment variables

Set the agency's full variable block (see the St. Johns example above as a
template) in the new Vercel project, scoped to **Production** (and Preview,
for the app-config vars — not the database ones, which you already scoped in
step 2). Double check `NEXT_PUBLIC_LOTTO_BRAND` matches the profile id exactly
as it appears in `src/config/brand.ts`.

### 5. Point the domain at Vercel

1. **Vercel → project → Domains → Add** the agency's domain. Vercel shows the
   DNS record(s) needed (typically an `A` record for the apex domain pointing
   at Vercel's anycast IP, refreshed periodically — use whatever Vercel's
   Domains page currently displays, don't hard-code an IP here).
2. At the registrar (Namecheap, in St. Johns' case): a newly purchased domain
   is usually still parked with the registrar's own placeholder records — a
   **URL Redirect Record** for `@` and a **CNAME** for `www` pointing at the
   registrar's parking page. **Remove those first**, then add Vercel's `A`
   record for `@`. Leaving the parking redirect in place will make the domain
   keep resolving to the registrar's placeholder instead of Vercel.
3. DNS propagation for a fresh `A` record is often much faster than the
   "may take a few hours" warnings suggest (it took well under a minute for
   `stjohnsfoodshare.app`), but don't assume — verify before moving on:
   `dig +short A <domain> @8.8.8.8` should return Vercel's IP, and the
   Vercel Domains page should show "Valid Configuration"/no warning icon.

### 6. Verify the sending domain in Resend

1. Resend dashboard → **Domains → Add Domain** → the agency's domain.
2. Resend shows a DKIM `TXT` record, an SPF `MX` + `TXT` record pair (both on
   a `send` subdomain), and an optional DMARC `TXT` record. Add all of them at
   the registrar.
3. **Namecheap-specific gotcha:** a fresh domain's Mail Settings default to
   **"Email Forwarding"**, which does not expose a way to add a custom `MX`
   record in the UI at all. Switch **Advanced DNS → Mail Settings** to
   **"Custom MX"** first (safe to do on a brand-new domain with no configured
   forwarding addresses yet — check the forwarding-addresses list is actually
   empty before switching on a domain that isn't brand new), *then* add
   Resend's `MX` record alongside the `TXT` records.
4. Verification is asynchronous and happens in stages — expect the domain
   status to move `Not Started` → `Pending` → `Verified` over a couple of
   minutes as DKIM, then SPF/MX, are individually confirmed. Click
   **Verify DNS Records** to kick off a check rather than only waiting
   passively; each individual record's status updates independently
   (DKIM commonly verifies before SPF/MX).
5. Once verified, create a **new API key** scoped to **Sending access**
   (least privilege — matches the pattern of existing agency keys) under
   **API Keys → Create API Key**, and put it in the Vercel project as
   `RESEND_API_KEY`. Domain-scoping the key is only available once the domain
   itself shows Verified.

### 7. First production deployment

If you haven't already triggered one in step 1.5, do it now
(**Deployments → ⋯ → Create Deployment**, branch `main`) so the app is running
against the schema and env vars from steps 3–4.

### 8. Deploy checklist

1. `/display` loads and shows the agency's brand (logo, colors, copy) — not
   another agency's.
2. `/admin` redirects to sign-in (auth required); `/api/state` reads/writes
   succeed once signed in.
3. **OTP and Magic Link both succeed** for an address allowed by the agency's
   `ADMIN_EMAIL_ALLOWLIST`/`ADMIN_EMAIL_DOMAIN` policy, and both are rejected
   for a disallowed address. Don't just check that the request returns
   `200` — confirm the actual email arrives, since a `200` with a missing
   schema (step 3) can still surface as a generic error *after* that point in
   some flows. If either fails with "Unable to issue code" or NextAuth's
   "Configuration" page, re-check step 3 first — that's the most likely cause
   even though neither error message mentions the database.
4. For queue-only deployments: nav omits Inventory, `/inventory` returns 404,
   CSP has no FEED origin. For FEED-enabled deployments: confirm the
   agency-specific inventory and CSP origin, and that a failed feed never
   falls back to another agency's endpoint.
5. On an actual mobile device or a resized mobile viewport, check the
   personalized homepage (`/`) for the header logo overlapping "NOW SERVING" —
   this only shows up for brands whose logo lockup is taller relative to its
   width than William Temple House's wide horizontal wordmark. See
   [`docs/ISSUES.md`](./ISSUES.md) for the fix if it recurs (it shouldn't — the
   header logo is now height-capped independent of aspect ratio — but re-check
   after any change to `BrandLogo` or the personalized homepage header).
6. Install the PWA to a homescreen and confirm the label matches the
   profile's intended `shortName` (`manifest.ts` maps `shortName` →
   `short_name`, which iOS/Android prefer over `name` for the launcher label).

### Known issue: WTH preview deployments fail (production is unaffected)

Every PR/branch preview build in the `wthlotto` Vercel project fails with
`Error: DATABASE_URL is required for production deployment`, while
`williamtemple.app` itself (which only ever builds from `main`) stays green.
Root cause: the Neon-integration variables in that project (`DATABASE_URL` and
siblings) are scoped **Production only**, not **Production and Preview** —
likely because that integration was connected before Vercel defaulted new
connections to include Preview. This is a real, open gap (nobody can preview a
WTH branch before merging), but it is **not** a production risk, and fixing it
means editing the live WTH project's environment variables — do not do that
without explicit direction, per the standing rule that WTH's production
project is look-but-don't-touch. If asked to fix it: re-scope those specific
variables to include Preview in **Settings → Environment Variables**, which
does not require rotating the secret.

### Shared branch, one merge affects everyone

Every agency's Vercel project tracks the same `main` branch. Merging a PR to
`main` triggers a new production deployment for **every** agency's project
simultaneously — there is no way to ship a change to just one agency's
project. Before merging anything (not just new-agency setup work): run
`npm run build` for the default profile and for every other agency's
`NEXT_PUBLIC_LOTTO_BRAND` locally first. A change that only breaks one
agency's brand profile will still ship to everyone the moment it merges.

## Theme / design tokens

`src/app/globals.css` is the ordered theme import manifest. Shared foundations,
protected operational semantics, and component rules live under
`src/app/styles/shared/`; deployment identity layers live under
`src/app/styles/brands/`. Agency selectors must not replace universal status
semantics. See [`docs/CSS_THEME_ARCHITECTURE.md`](./CSS_THEME_ARCHITECTURE.md)
and [`docs/UI_DESIGN.md`](./UI_DESIGN.md).
