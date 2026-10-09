# St. Johns isolated Arcade database

## Authorization and plan — October 9, 2026

The owner authorized shared Arcade high scores for St. Johns Food Share using
a separate database so score traffic cannot wake its queue database. This is
an activation of the existing v2.0.0 feature, not a gameplay or dependency
change. Only St. Johns infrastructure is in scope; WTH and the personally
owned GitHub source remain unchanged.

1. Verify the personal Neon/Vercel account and the St. Johns production target
   (`stjohns-food-share`, `prj_l9AVyDAMFCc2U9cKy9jr1WGNpZH6`).
2. Provision a dedicated Neon **project with its own compute**, not another
   database on the queue project's compute. Use the smallest suitable compute
   with scale to zero enabled; record the actual plan and settings.
3. Apply `schema.arcade.sql` atomically to the new database. Do not copy WTH
   scores, core tables, credentials or optional tribute seeds.
4. Create a SQL runtime role with only database connection, schema usage and
   `SELECT`/`INSERT` on `arcade_high_scores`. Verify it lacks table mutation,
   schema creation, role creation and elevated-role membership.
5. Set only St. Johns' production `ARCADE_DATABASE_URL` as a protected Vercel
   setting. Keep administrative credentials out of the app and repository.
6. Redeploy the current stable source only to St. Johns. Preserve the existing
   Cloudflare queue/configuration settings and published documents.
7. Check all five leaderboard scopes and a controlled save/readback. Remove
   only identified diagnostic score rows with the database owner connection.
   Verify the public queue/configuration still use Cloudflare and remain
   unchanged, and verify distinct Neon project/endpoint identities.
8. Record deployment, permissions, checks, compute settings and remaining
   limits. Exclude deliberate deployment, diagnostic and score activity from
   the scheduled quiet-compute comparison.

## Existing guarantees

`src/arcade/lib/high-score-store.ts` constructs its connection solely from
`ARCADE_DATABASE_URL`; missing/failed Arcade connections return unavailable,
without falling back to `DATABASE_URL`. Game actions do not write raffle state.
The public score API validates game/difficulty, initials and score bounds and
applies its existing request limits. Ready/completion/scope changes can read
scores; explicit Save writes them. Gameplay moves and idle time do not poll.

The Arcade database can still incur its own compute for genuine leaderboard
reads and saves. Independent compute prevents those operations from extending
the queue database's billable idle window; it does not promise zero Neon cost.

## Initial checks

- Production audit: four high, zero moderate/critical findings, unchanged from
  the documented Nodemailer/Auth.js exception.
- Existing API/store/type suite: 3 files, 20 tests passed.
- Before activation, St. Johns has no `ARCADE_DATABASE_URL`; score requests
  return `{scores:[],unavailable:true}`. The stable deployment is v2.0.0.

## Provisioning evidence

- Personal Vercel scope: `matthew-geigers-projects-73851078`; existing Neon
  Marketplace Launch installation. No plan upgrade or Neon Auth activation.
- Dedicated project: `stjohns-arcade-high-scores` / `wispy-darkness-55751569`.
- Main branch: `br-winter-tree-b8613fc0`; compute `ep-aged-paper-b86pw57r`.
- Vercel resource: `store_GuM8icKWlG1Z6uBI`; region AWS `us-east-1`.
- Fixed minimum and maximum **0.25 CU**, scale to zero after **five minutes**.
  The existing Launch rate shown was $0.106/CU-hour and $0.35/GB-month,
  before applicable taxes/fees. There is no replica or additional branch.
- Queue project remains `late-violet-21570715`, branch
  `br-fancy-waterfall-aums9n9e`, compute `ep-weathered-surf-aulagqr4`.
  This is a distinct project and endpoint, not merely a second database on
  the queue compute.
- Applied the current five-game `schema.arcade.sql` atomically to the empty
  project. Created SQL role `stjohns_arcade_runtime`; verified `SELECT` and
  `INSERT` allowed, `UPDATE`, `DELETE`, schema creation, role creation and
  `neon_superuser` membership denied. Five transactional scope inserts were
  rolled back; no tribute seed or existing agency scores were copied.
- Added only `ARCADE_DATABASE_URL`, sensitive and production-only. All 61
  existing environment records retained their IDs, targets, types and available
  value fingerprints. Sensitive values are masked by Vercel, so their
  fingerprints cannot independently prove the underlying plaintext.

The resource is manually configured: Vercel's automatic Connect flow was
skipped to avoid injecting an administrative `DATABASE_URL` into the app.
Keep the restricted Arcade connection separate when reconnecting or rotating
credentials. Administrative credentials are never application settings.

## Production activation

- Production became ready **October 9, 2026 at 14:59:16 PDT** (21:59:16 UTC).
  Deployment `dpl_4j8kFpkyVLE69UXcPFjL5nsMg5g4`, source
  `30a413edc294d8d919445e500d4d5fc8de97b2b3`, stable **2.0.0**.
  `stjohnsfoodshare.app` points to this deployment. Previous deployment
  `dpl_qzJc6fGJahTZau4qAAwLvhZfAdRL` remains available as a rollback reference;
  no rollback was performed.
- All five games' Normal score GETs returned 200 with available boards. In
  Chrome, a real seven-move Easy Hanoi completion saved `TST / 2000` at
  14:59:58 PDT. Independent HTTP readback and a SELECT on the new Arcade
  endpoint confirmed that exact row. At 15:02:32 PDT only that identified
  diagnostic row was removed; zero rows remained. No real scores were deleted.
- Anonymous `/api/state`, `/api/languages?client` and
  `/api/translations/pack?code=zh` returned 200 with Cloudflare source headers.
  Direct Cloudflare state revision **3** and configuration revision **2** had
  identical parsed JSON to their pre-activation captures. There was
  no core schema change, staff write or configuration republication.
- Login shows **2.0.0** and its release-notes dialog responds. Chrome showed
  no captured warning/error logs during the score exercise.
- Fifteen of the 17 login script files retained identical filenames and
  SHA-256 hashes. The two framework/runtime files changed: parsing and
  normalizing bound local variable names, the known deployment ID and the
  referenced framework filename produced identical code. This is not a claim
  of byte-identical bundles. No application source, dependency or package
  version changed; no new physical-iPad test was performed for this activation.
- The hosted production build passed. Existing score API/store/type tests
  passed (20 tests); the earlier stable-release checks and device acceptance
  remain separate evidence, not a newly repeated full-suite/device run.
- Temporary administrative/runtime credential copies were emptied after
  verification. Vercel retains only the restricted production connection.

## Observation limits

Do not count this provisioning, console, schema and controlled-score activity
(approximately **14:43–15:04 PDT**, plus suspension tails) as unexplained idle
wakes. The scheduled October 11 comparison must inspect the queue projects
separately from these intentional Arcade reads/writes. Public source headers,
unchanged projections and distinct credentials are boundary evidence; this
activation did not repeat the core SQL-counter experiment or establish a daily
CU-hour saving. Other staff, integration or direct-client traffic can still
wake the queue compute.

No WTH infrastructure was changed. The prior stable tag remains immutable;
this configuration activation does not introduce another application version.
