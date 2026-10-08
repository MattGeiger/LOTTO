## Deployment migration plan (Neon + scanner-safe Auth.js email sign-in)

### Overview
Goal: run the same stack locally and on Vercel using Neon Postgres, Auth.js v5
scanner-safe Magic Link plus Verification Code (Resend), and keep parity between
development and production. Local Docker should read `.env.local`.
**Production requires `DATABASE_URL`; file-system storage is development-only.**

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
     # Verify first against production (Neon) — applies in a transaction and
     # rolls back, writing nothing:
     DATABASE_URL='postgresql://...neon...sslmode=require' \
       node scripts/apply-schema.mjs --dry-run
     # Then apply for real (atomic: all-or-nothing):
     DATABASE_URL='postgresql://...neon...sslmode=require' \
       node scripts/apply-schema.mjs
     # Or, when .env.local already points at the target DB:
     npm run db:migrate            # add -- --dry-run to verify, --arcade for arcade
     ```
     The runner uses `pg` (standard wire protocol), so it works against both
     local Docker Postgres and Neon. Each schema file is applied inside a single
     `BEGIN/COMMIT` transaction, so a failure rolls back cleanly and never leaves
     a half-migrated database. Because every statement is `CREATE ... IF NOT
     EXISTS`, re-running against a DB that already has the core tables only adds
     the new ones.

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
     - Sets both email credentials to a ten-minute expiry and sends through the
       shared runtime-branded email service.
   - `src/app/api/auth/[...nextauth]/route.ts`:
     - Redirects email callback GETs to `/login/confirm` without consuming the
       token; only the explicit confirmation POST delegates to Auth.js.
   - `verification_token.type`:
     - Defaults existing/Auth.js rows to `magic_link`; OTP queries only mutate
       `otp` rows. Apply the complete `schema.sql` before v1.22.0.

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
   - Email arrives with the active brand and verified sender. The link opens
     `/login/confirm`; refreshing is harmless; pressing **Sign in** completes
     authentication.
   - A six-digit Verification Code also signs in, and requesting it does not
     invalidate a pending Magic Link.
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

### WTH infrastructure handoff — October 6, 2026

The production Vercel project and both production databases now belong to the
WTH team `wth_apps`, owned solely by `technology@williamtemple.org`. On October 7,
the owner explicitly directed removal of backup Owner `mgeiger@williamtemple.org`
and temporary Member `et2.geiger@gmail.com`; both removals were verified. Automatic
paid-seat enrollment is Off (Manual approval). The detailed upcoming invoice for
November 6 now shows $20 total, with one Pro subscription and no additional-seat
charge. This estimate can still change with usage. Other vendors' backup-admin
roles were not changed by this Vercel-only instruction. This is an infrastructure
handoff only. Matt Geiger retains source, copyright, repository ownership and
code maintenance for LOTTO and FEED. St. Johns and its shared personal-account
resources are outside this migration.

#### Database replacement and cutover record

The native Marketplace resource transfer failed repeatedly with a Neon HTTP
500 conflict. Rather than wait for ticket `01036737`, the owner approved a
manual migration during the pantry closure. Fresh permanent Neon snapshots and
protected PostgreSQL custom-format dumps were taken before restoring into empty
WTH-owned replacements. The owner approved PostgreSQL 18 for these replacements.

| Purpose | Preserved legacy project | Active WTH project | Plan / region |
| --- | --- | --- | --- |
| LOTTO core | `shiny-night-80863059` (`wthlotto`) | `plain-queen-72358253` (`wthlotto-production`) | Free / AWS Oregon |
| Arcade scores | `sparkling-cake-20179334` (`arcade-high-scores`) | `patient-cherry-31173304` (`wth-arcade-high-scores`) | Free / AWS Oregon |

Core restore preserved all 17 application tables, five sequence states and
application grants. Arcade preserved all 184 scores and its SELECT/INSERT-only
runtime role, with a fresh password. Schema, indexes, constraints, triggers,
enums, nullability and full table fingerprints matched. PostgreSQL 18 exposes
NOT NULL constraints differently; nullability was independently compared.
Arcade `pgcrypto` is 1.4 rather than the source's 1.3, an approved difference.

All 32 database environment values were switched; 21 other settings were not
changed. The target stores are administered through WTH's Neon integration;
their application connections were configured manually to preserve Arcade's
restricted role. Do not reconnect a store in a way that replaces that role with
the database-owner credential.

Production was redeployed from the exact previously live commit
`7ea12d346fb4c7a8e10f9fcf81ece40731e04178`, still `2.0.0-rc.6`, then transferred
to WTH. The resulting deployment is `dpl_7Ci3wh8aPdoQAt7CYiVM8Lvgb1Au` in
project `prj_zNP9ZGxuCuG6OhXgtyCwth1KTzdm`, team
`team_wrtoOljQrNtcWuOGpv0oKF8V`. The `MattGeiger/LOTTO` Git link and existing
apex, www redirect and Vercel aliases were preserved. This migration did not
release application changes or modify saved operating settings.

After cutover, staff OTP sign-in succeeded and Admin showed **Persistence
confirmed**, all 1,129 snapshots and the existing FEED pairing. All 18 public
Arcade leaderboards matched the restored scores. FEED's existing credential
successfully read all 24 daily summaries. The only subsequent core-data changes
observed were the authorized OTP use and FEED credential last-use timestamp.
The existing idempotent language seed advanced its sequence without changing
language rows; all other sequence states remained unchanged.

All five compute endpoints across the two legacy projects were set
`disabled=true` and verified idle. Both legacy production SQL connections were
rejected with PostgreSQL code `28000`; both replacement connections succeeded.
The two temporary project-scoped management keys were revoked and verified to
return HTTP 401. Legacy data, branches and permanent snapshots remain preserved.
Disabled compute is a reversible connection restriction, not project deletion
or cancellation of the shared Launch integration. Retained storage can still
incur charges, and provider availability checks can temporarily run compute.
Do not cancel that shared integration: it also contains St. Johns.

Private receipts and dumps were recorded under
`/private/tmp/wth-neon-manual-2026-10-06` with restricted permissions; they are
not repository assets. That temporary directory was not present during the
October 7 local check, so do not assume those local exports remain available.
WTH post-restore snapshots were verified during cutover in each replacement
project. Recheck recovery availability and establish durable export custody
before permanent legacy deletion. The Free plan's one manual-snapshot slot is
occupied in each replacement; do not delete those snapshots to run another test.

#### Progress checklist and responsibility

The owner subsequently directed complete retirement of the hosted beta and
legacy WTH system. The beta Vercel project `lotto-beta`
(`prj_Eu3mG5qzpXRDFxjuYsl1OnaTdZhv`) was deleted; WTH's project inventory now
contains only `wthlotto`. Both accounts' `lotto-realtime-beta` Workers and their
Durable Object namespaces were removed. No GitHub ownership, source branch,
St. Johns Worker or shared Neon installation was changed.

Exactly two sending-only Resend keys were prepared in the WTH team:
`wth-lotto-production-20261006` and `wth-feed-production-20261006`. No beta
key was created. FEED's backend was recreated with that replacement key and the
unchanged `et2geiger/feed-backend:1.8.1` image; its container and JSON health
endpoint both report healthy. LOTTO's replacement deployment
`dpl_9G12h8cjUqkBU1JgjGXyoT6oBHUy` was promoted from the same live commit,
with WTH's email and realtime credentials. The apex alias independently resolves
to that deployment. Existing staff sessions still work in both apps.
The old personal FEED connector `feed-cloudflared` was stopped. Its Compose
service now requires the explicit `retired-personal-tunnel` profile, so ordinary
application startup will not revive it; a protected copy of the prior Compose
file is in the Pi handoff backup directory. The WTH connector remains running,
and FEED's public URL and frontend health check still return HTTP 200.

WTH's production realtime Worker was seeded with the exact public state:
revision `1032`, checksum
`sha256:a5ca2e43f309b1a6532f2eaeb0b250b10bcad40e41741dfa27b9645bf1161278`.
After promotion, two controlled saves of the unchanged operating-hours settings
advanced publication through revisions `1033` and `1034`. Database comparison
confirmed that every operational setting remained identical; only the diagnostic
write timestamps changed. WTH's live snapshot and WebSocket matched revision
`1034` and checksum
`sha256:98786ea264cd97ce6c6a90a593f20b51e964e4c1835751a2321e5e6cf94fd5ed`.
Both publications were accepted, and the transferred Vercel recovery queue
invoked its private consumer for revision `1034`; it correctly did no repair
because direct publication had already succeeded. This validates routing and
queue authorization, not a deliberately induced publication failure.
The personal `lotto-realtime-production` Worker and its namespace were retired
after these checks. Personal Worker inventory now contains only St. Johns,
whose namespace was verified intact. Already-open WTH displays need a refresh
to load the new Worker address; physical-device refresh remains a human step.
Resend accepted the published ownership TXT record but refused direct claim
because the personal account recently sent email. Its UI requires releasing
only `williamtemple.app` from that account, then adding/verifying it under WTH.
The owner deleted the personal account's WTH sender domain. Its remaining domain
inventory contains only `stjohnsfoodshare.app`. WTH's domain is now present at
`75b75458-3b20-46d5-a482-b68bcbffe7fc`, now verified; enforced TLS
was restored and its new DKIM public key was published. The new domain requires
DNS-only CNAME records `rsend` → `rsend.forge.rmta.net` and
`send` → `send.forge.rmta.net`. Cloudflare explicitly deletes/recreates a record
when its type changes; the owner approved and both replacements were saved.
Authoritative Cloudflare DNS and the public `1.1.1.1` resolver return both exact
CNAME targets. Resend initially verified DKIM while its sending CNAMEs remained
pending, temporarily preventing new sign-in email despite both applications
using the WTH keys. The domain subsequently verified without further DNS
changes or payments; fresh lookups through both Cloudflare and Google public
resolvers also match. Both production OTP endpoints now return HTTP 200, and
WTH's Resend dashboard reports both emails delivered to
`mgeiger@williamtemple.org`. The old
WTH-only keys have not been recorded as revoked. Permanent deletion of the two
obsolete personal production databases remains pending confirmation; the owner
reported deleting the WTH beta database on October 7. On October 7, the owner confirmed
successful logins in fresh browser sessions for both LOTTO and FEED. This is
human-reported evidence, not a separately observed physical-iPad test or proof
of separate magic-link and OTP coverage.
Actual OTP requests to `mgeiger@williamtemple.org` were attempted through both
production applications and failed during this verification window. Preserve
that failure as historical evidence of the temporary interruption; existing
sessions and public-page HTTP success did not prove new email delivery.
WTH's Resend logs independently identify the correct new key for each request
and HTTP 403 with `Domain not verified: Verify williamtemple.app or update your
from domain.` Provider verification subsequently cleared that rejection. Both
applications retain their existing sender addresses.

**Agent** means the agent can complete the technical work using authorized
sessions. **Human** means staff must perform the step themselves. **Both** means
the agent can prepare and validate it, but a human action or policy decision is
required. Unchecked items remain outstanding; the full handoff is not complete.

- [x] **Both:** Establish WTH Vercel Pro and Owner access; the user handled
  billing and authentication, and the approved backup Owner invitation was accepted.
- [x] **Agent:** Transfer Blob while preserving all 31 asset URLs and checksums.
- [x] **Agent:** Create source snapshots/dumps; restore both WTH Neon databases;
  compare full data, structure, grants and sequences before cutover.
- [x] **Both:** Approve PostgreSQL 18 and verify WTH Neon account activation.
- [x] **Agent:** Switch database settings, redeploy the existing live commit and
  transfer the Vercel production project to WTH with its domains and Git link.
- [x] **Both:** Confirm staff sign-in, history, public URLs, Arcade parity and
  FEED's existing integration credential after migration.
- [x] **Agent:** Disable all legacy WTH compute connections, preserve recovery
  data, revoke temporary keys and validate replacement/public access afterward.
- [x] **Both:** Move only WTH's Cloudflare zone and Namecheap delegation to the
  WTH account; verify active free HTTPS and the WTH FEED tunnel.
- [x] **Agent:** Delete the hosted beta Vercel project and both beta realtime
  Workers; confirm their Durable Object namespaces are gone and St. Johns remains.
- [x] **Agent:** Prepare exactly two WTH email keys, stage the FEED environment
  change and build the unchanged LOTTO release without moving its live domain.
- [x] **Agent:** Seed the WTH production Worker with the exact current public
  state and verify its revision, checksum and payload.
- [x] **Agent:** Complete the WTH realtime Worker cutover, seed production state,
  validate publication/recovery and the transferred Vercel queue authorization.
- [x] **Agent:** Retire the personal WTH production Worker and verify that
  St. Johns' Worker and namespace remain intact.
- [x] **Agent:** Stop the obsolete personal FEED connector, prevent ordinary
  Compose startup from reviving it, and verify continued access through WTH.
- [ ] **Human:** Refresh already-open WTH displays to load the new Worker address.
- [x] **Agent:** Complete the WTH Resend sender-domain and application-key
  cutover; verify both production OTP requests and both provider delivery receipts.
- [x] **Human:** Confirm fresh LOTTO and FEED sign-in. The owner reported both
  fresh-browser logins successful on October 7.
- [ ] **Both:** Revoke the personal Resend keys `WTH App`, `Feed App` and
  `LOTTO Beta` after fresh sign-in validation and required deletion confirmation.
  Preserve `St Johns App`; no beta replacement key is required.
- [ ] **Both:** Permanently delete the verified obsolete databases `wthlotto`
  (`shiny-night-80863059`), `arcade-high-scores` (`sparkling-cake-20179334`)
  from the personal account; remove obsolete beta DNS. Permanent deletion
  confirmation for these remaining resources is pending. Preserve the active WTH
  copies, their snapshots and protected exports, and the shared St. Johns installation.
  October 7 live review: WTH's `neon-copper-queen` resource matches the retired
  beta project `frosty-recipe-62470369`, created August 31. Its Vercel Projects
  page shows no connections; Neon lists one branch and one compute, suspended
  for approximately 19 hours. Missing integration connections alone does not
  rule out direct clients. The production cutover record identifies the two
  separate replacement databases above. The specific beta resource's permanent
  deletion dialog was prepared, and the owner subsequently reported completing
  the deletion themselves.
- [x] **Human:** Delete the retired beta `neon-copper-queen`
  (`frosty-recipe-62470369`). Owner confirmed deletion on October 7.
- [ ] **Both:** Review the unattached `lotto-beta-blob` store. It appeared in the
  October 7 WTH storage inventory; deletion has not been recorded. Preserve the
  active `wthlotto-blob` store and its original production asset URLs.
- [ ] **Both:** Establish WTH-controlled FEED image availability and independent
  Pi access/recovery. Application restore/startup was not separately rehearsed.
- [x] **Human:** Complete free Docker Hub signup for `williamtempletech` using
  `technology@williamtemple.org`, including password creation, terms acceptance
  and email verification. The owner selected this name because `wthtechnology`
  was taken. The agent verified Docker marks Technology's email VERIFIED on
  October 7. The first CLI device request expired; the owner-approved retry
  succeeded as `williamtempletech` in an isolated migration configuration.
- [x] **Agent:** Create the empty public image repositories
  `williamtempletech/feed-backend` and `williamtempletech/feed-frontend` under
  Technology's Docker account. Public visibility matches the current images,
  which were verified anonymously pullable. No paid service was activated.
- [x] **Agent:** Copy the exact retained FEED 1.8.1 backend/frontend images into
  WTH's registry, preserving their contents, architecture, existing visibility
  and licensing. Both full OCI indexes, ARM64 builds and attestations match the
  originals. Backend index: `sha256:dfc2a13f5a9f3ae70509824ca242cf7f1dcd52dae98f3b46557961a0d9f0cc17`.
  Frontend index: `sha256:ab9e1f897d596dd9fb5fa2f876ceaf72a0351b8751486bbf6d1e8590dee368f9`.
  Source/target manifest parity and anonymous manifest retrieval passed using
  explicit empty-auth configuration, excluding the personal credential helper.
- [ ] **Agent:** Pull the WTH images on the FEED Pi and change production image
  references without rebuilding the app; verify service health afterward.
  Manifest retrieval alone does not establish a full layer pull or startup.
- [ ] **Agent:** Verify temporary Docker session cleanup. Its protected local
  credential was removed, but the logout OAuth refresh-token revocation request
  was blocked by local network restrictions, so server-side revocation is
  unconfirmed. The agent then deactivated this migration's sole auto-generated
  CLI registry token (created October 7 at 13:43:29 Pacific) in Docker settings
  and verified Inactive. Local credential removal and registry-token
  deactivation are confirmed; OAuth refresh-token revocation is not. No personal
  Docker credentials were changed.
- [x] **Human:** Complete a free Raspberry Pi ID for
  `technology@williamtemple.org`, including password creation, terms acceptance
  and email verification. The owner completed signup on October 7; the agent
  verified the WTH Technology profile and signed in to its free Connect account.
  The account has no devices yet. After the owner's proceed instruction, an
  unused six-hour Technology linking key was created. Its value appeared in
  tool output, so it must not be used. Automatic approval review rejected its
  revocation/replacement and creation of a separate personal recovery key;
  explicit bundled approval was requested. Neither device was signed out or
  relinked. Safari confirmed the personal account and both devices online, but
  its blank-page rendering prevented reliable remote-shell access. A working
  personal Chrome Pi Connect shell was requested before continuing.
- [ ] **Both:** Relink only `feed-app-host`
  (`2ef59d24-116a-48a1-9cfd-39331a50f766`) and `wth-lotto`
  (`b545b92e-48e6-48f2-a6e4-719a9d944349`) to Technology's Pi Connect account.
  Both devices are online under the personal account with Connect 2.7.0 and
  shell/screen sharing allowed. The UI transfer option is between personal and
  organizational accounts, not separate free identities. FEED SSH is active,
  but the direct route from the operator's computer timed out. Verify a
  disconnect-surviving relink and recovery path before changing credentials;
  do not remove the current access first. No paid organization or OS/client
  upgrade is authorized. Verify shell and screen access under Technology before
  recording completion. Other agency devices remain outside scope.
- [x] **Human:** Choose FEED's existing Admin backup-download workflow. On
  October 7, the owner explicitly declined additional backup action. Do not add
  backup infrastructure, scheduling or retention changes. This decision does
  not establish that an Admin downloaded or restored a backup during handoff.
- [ ] **Human:** Place account recovery and required operational credentials in
  MyGlue. The user explicitly reserved this step for themselves.
- [x] **Agent:** Remove both extra Vercel memberships as explicitly directed on
  October 7, retain Technology as sole Owner and disable automatic paid-seat
  enrollment. Verify the detailed upcoming invoice has no additional-seat line.
- [ ] **Both:** Confirm Technology's organizational recovery and BILL billing
  custody, plus independent backup-admin access for other vendors where designated.
- [x] **Human:** Choose immediate retirement of the old WTH system and hosted beta.
  Permanent deletion still requires its specific at-action confirmation.
- [ ] **Agent:** Finish the ownership/dependency review and record final evidence.

#### Recovery boundary

**Remaining personal-account ties, based on the last verified configuration:**
FEED uses `et2geiger/feed-backend:1.8.1` and `et2geiger/feed-frontend:1.8.1`;
identical full OCI indexes are now available in WTH's `williamtempletech`
registry. Pi pulls, production image-reference changes and independent Pi
remote access/recovery are not yet verified. The retired personal FEED tunnel/credential remains a
cleanup item, although its connector was stopped and ordinary startup cannot
revive it. The two disabled old production Neon resources and three obsolete
personal Resend keys are cleanup/custody concerns, not current production
connections. Subsequent RC.7 and RC.8 releases verified direct production
deployment using Technology's WTH-owned Vercel account after personal membership
was removed; the [activation record](PUBLIC_CONFIGURATION_PUBLICATION.md#wth-production-activation--october-7-2026)
preserves the account and release receipts. A full recovery rehearsal remains
separate from that deployment evidence. The retained personal GitHub
repositories are intentional source ownership; do not transfer them. MyGlue
custody, physical-display refresh and finance acceptance remain human steps.

To reopen a legacy database for investigation, an authorized administrator can
set its endpoint `disabled=false`. This does not authorize switching production
back. After cutover, new staff or integration activity is authoritative in the
replacement databases; a rollback must first reconcile that activity and obtain
owner approval. Do not restore an old snapshot over the active replacements.
Keep the old environment records and protected dumps private. Preserve WTH's
existing URLs and credentials until any replacement has been validated.
