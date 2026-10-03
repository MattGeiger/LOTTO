# Public-read Neon isolation — RC.6 validation

## Authorized scope

October 2, 2026: implement the public-read fixes and deploy only WTH's linked
`wthlotto` project while keeping service available. The owner explicitly excluded
operating-schedule/UI changes related to the shutdown and directed that FEED
public access remain unchanged. No schedule/state mutation, FEED/authentication
gate change, Worker deployment, database migration or dependency upgrade is
included. See [plan](PUBLIC_READ_NEON_ISOLATION_PLAN.md) and
[complete SQL inventory](NEON_READ_AUDIT.md).

## Local verification

- Required production audit: 33 advisories (26 moderate, six high, one critical).
  This release does not change dependencies. Lockfile comparison confirms only
  the two root version fields changed to `2.0.0-rc.6`.
- Approved final targeted run: eight files, 91 tests passed. Coverage includes
  100 anonymous legacy reads with zero authoritative state reads, strict snapshot
  validation, three-second abort, repeated failures without SQL fallback,
  validated staff sessions, disabled deployments and configuration invalidation.
- Additional realtime/state regression run: eight files, 200 tests passed.
  These counts overlap on the configuration-cache file; they are separate runs.
- TypeScript production builds and ESLint pass. Existing Browserslist stale-data
  notice remains. No dependency update was performed to silence it.
- Controlled builds before release metadata changes produced identical filenames
  and SHA-256 hashes for all 50 JS/CSS chunks. After the RC.6 version bump, 49
  chunks remain identical; the Admin chunk is renamed and contains the new
  version. No client runtime source file changed.
- Legacy regex scan passed all 47 JavaScript chunks. Built-app smoke passed
  hydration/interactivity on `/` and `/login`. Local missing backend/Auth.js and
  analytics resources generated nonfatal console errors; this is not a live
  authentication or physical iPad proof.
- Physical iPadOS 15 validation was not performed. The iOS 15.4 simulator is
  unavailable on this host as recorded in the RC.5 validation. Server behavior
  was checked separately from browser compatibility; unchanged runtime chunks
  do not replace real-device evidence for future client/dependency changes.

## Deployment baseline

- Target project: `prj_zNP9ZGxuCuG6OhXgtyCwth1KTzdm`, personal team
  `team_qomI17X2JbmFUIvPdo19u2gJ`, domain `williamtemple.app`.
- Previous RC.5 commit: `8548ec29c5f6359f97f966034cee84e350ae588e`.
- Previous deployment: `dpl_FVMCS1X2NFZmonTofg8CwRveCqCq`.
- Added only `LOTTO_PUBLIC_STATE_SNAPSHOT_ENABLED=true` to this project's
  Production environment. The existing deployment ignores the new flag.
  Expected hub is `lotto-realtime-production.et2-geiger.workers.dev`, agency
  `william-temple-house`; browser application and source flags were already true.
- Read-only staff baseline before release: authoritative revision 991, complete
  state SHA-256 `fb03d851316ae0c57d8dff5a4680ea85d77f671f589a11ddd5be64945b51baf9`,
  timezone `America/Los_Angeles`. The saved schedule already had every day marked
  closed at baseline. This release must preserve that state exactly.
- Candidate production deployment and post-release measurements are pending at
  this checkpoint. They must be recorded before claiming live success.

## Observation boundary

No monthly or overnight savings have yet been established for RC.6. Public queue
SQL is eliminated for anonymous snapshot-enabled GETs, while configuration cache
misses, authenticated clients, management APIs and direct connections can still
read Neon. Public inventory remains served by FEED's separate HTTP server.

After live verification, stop diagnostic/staff/SQL-console traffic and observe
Neon operations and hourly CU-hours alongside Vercel requests. Do not treat a
period without queue SQL as proof that every Neon wakeup has been eliminated.
