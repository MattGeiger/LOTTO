# St. Johns Food Share RC.8 configuration cutover

## Authorized scope — October 8, 2026

The owner authorized the same Neon compute improvements deployed to WTH for
the personal-account St. Johns deployment. This follows the existing isolated
release and staged configuration-publication pattern. Preserve saved branding,
languages, announcements, operating hours, queue data, credentials and source
ownership. WTH production and its idle observation remain outside this cutover.
There is no dependency upgrade, new database schema, Git push or version bump
beyond the existing RC.8 release.

## Verified baseline

- Domain: `https://stjohnsfoodshare.app`.
- Vercel user: `mattgeiger`; scope `matthew-geigers-projects-73851078`.
- Team: `team_qomI17X2JbmFUIvPdo19u2gJ`.
- Project: `prj_l9AVyDAMFCc2U9cKy9jr1WGNpZH6`, `stjohns-food-share`.
- Pre-cutover RC.6 deployment: `dpl_AS1awFSfQkakwn6qaktgMYtX1iXc`.
- Cloudflare personal account: `557beda5619d787b60c6973fdef05ce1`.
- Worker: `lotto-realtime-stjohns-production`; environment `stjohns-production`.
- Pre-cutover Worker version: `e94e1395-49c3-4028-9e95-bdd295106a6b`.
- Durable Object namespace: `041365b8bfd540b384499ba55201e288`.
- Agency: `stjohns-food-share`; allowed browser origin `https://stjohnsfoodshare.app`.
- Neon: `late-violet-21570715`, branch `br-fancy-waterfall-aums9n9e`.
- Existing Safari staff session visibly reached RC.6 Persistence confirmed.
- Queue snapshots and realtime source flags are enabled. The new configuration
  read gate is absent and therefore off.

## Release sequence

1. Use an isolated copy of the already validated WTH RC.8 source, linked only
   to the St. Johns Vercel project. Recheck relevant tests, lint and Worker types;
   preserve the tested webpack build command and dependency lock graph.
2. Record the current public queue snapshot and St. Johns public identity.
   Update only the existing St. Johns Worker with the additive configuration
   routes. Retain its namespace, migration tag, existing secrets and origins.
3. Build and promote RC.8 with the configuration gate off. Verify its live
   agency identity, version, release notes and existing staff access.
4. Through that real staff session, explicitly activate
   `POST /api/state/configuration` with `{ "activate": true }`. Independently
   validate the Cloudflare document's schema, agency, release and checksum.
5. Build/promote the same RC.8 source with
   `LOTTO_PUBLIC_CONFIGURATION_SNAPSHOT_ENABLED=true`. Verify Home, Display,
   manifest, visitor catalog/packs and compatible anonymous legacy queue reads.
   Confirm queue snapshot and saved presentation remain intact.
6. Where available, inspect SQL counters before/after a bounded anonymous
   request interval and use an intentional staff read as positive control.
   Routing headers alone do not establish zero SQL or compute savings.
7. Record deployed identities and validation limits. Stop diagnostic traffic
   before a separate 48–72-hour compute-rate and overnight wake comparison.

## Recovery and evidence boundaries

Retain the RC.6 and staged RC.8 deployments. Rollback requires separate owner
authorization. Any release activation must publish matching configuration
before enabling its read gate. Never use SQL fallback to mask a publication
failure or copy WTH configuration, secrets or state into St. Johns.

The accepted RC.7 iOS 15.4 simulator check and RC.8 legacy scan remain prior
evidence; a new St. Johns desktop check does not establish physical-iPad
acceptance. The production audit at this session's start is 26 moderate,
9 high and 1 critical advisory. No dependency changes are included.

## Deployment record

The staged release completed on October 8. The existing personal-account Worker
now runs version `9935f2cf-509d-4f59-9341-c68f600f4999`, retaining its namespace,
secrets, migration tag and St. Johns-only origin. The queue snapshot remained
byte-identical after that deployment.

Gate-off RC.8 deployment `dpl_AFyBfjjFr9BEKQDGwGhgG2dekqUH` was built and
promoted before publication. The existing authenticated Safari staff session
accepted explicit activation with HTTP 200, `{accepted:true,revision:1}`.
The St. Johns document independently passed the application's schema and
agency/release checks and a SHA-256 recomputation:

- Release: `2.0.0-rc.8`; revision: `1`.
- Checksum: `sha256:6b197d2867ce276b80a245c497f7e789734c35381b8a8094a5ab04046f96adfb`.
- Eight enabled languages and seven completed translations, from St. Johns'
  own authoritative configuration.
- Preserved public identity: St. Johns Food Share / St. Johns Food Share App.

The production project now retains
`LOTTO_PUBLIC_CONFIGURATION_SNAPSHOT_ENABLED=true`. The same application source
was rebuilt and promoted as `dpl_CV8H8mkB2LyjEjmcFnieXa8xiHwZ`, hostname
`stjohns-food-share-k9w7nm5dy-matthew-geigers-projects-73851078.vercel.app`.
Inspection of `stjohnsfoodshare.app` confirmed this ready production deployment.
Both hosted webpack builds passed. The primary checkout's WTH Vercel link was
not changed; St. Johns used `/tmp/lotto-rc8-stjohns-release` with its own link.
Application source and public assets matched the already deployed WTH RC.8
artifact byte for byte. No Git push or ownership change was made.

At **07:37:21–07:37:28 PDT** (14:37:21–14:37:28 UTC), ten rounds across Home,
Display, Login, manifest, client languages, Chinese/Spanish packs and anonymous
legacy `/api/state?realtime=poll` completed **80 requests**, all HTTP 200.
Requests used unique query parameters and no authentication cookies.
Catalog/pack and legacy state responses identified Cloudflare. Neon Query
performance counters on the verified St. Johns project/branch showed:

| SQL owner | Before | After public requests | After staff positive control |
| --- | ---: | ---: | ---: |
| Active branding SELECT | 4 | 4 | 4 |
| Language catalog SELECT | 2 | 2 | 2 |
| Filtered translations SELECT | 1 | 1 | 1 |
| Queue state SELECT | 5 | 5 | 7 |
| Legacy per-row language INSERT | 60 | 60 | 60 |

An intentional authenticated staff read returned HTTP 200 with
`x-lotto-state-source: database`; staff tab activation and the explicit read
increased the queue counter from 5 to 7. This confirms counters were updating.
Provider monitoring issued its own metadata queries; the result is zero added
covered application reads during the anonymous interval, not zero global SQL.
The public queue remained byte-identical at revision 3, as did the manifest.
No saved hours, branding, languages, announcements or queue state were edited.

Live Safari verified RC.8, release notes and existing staff Persistence
confirmed, retaining the October 3 last-write time. Aborted requests during the
final deployment reload produced transient Auth.js load errors; the settled
staff page recovered. Modern Chrome verified the responsive Verification Code
tab, hydrated Display, saved identity/hours and no captured error logs. The
release-notes dialog includes RC.8 navigation and RC.7 public-read changes.

Four targeted test files passed **26 tests**; lint and Worker type checking
passed. No new local production build or automated legacy smoke was run for
this agency cutover. Earlier accepted RC.7 iOS 15.4 simulator checks and RC.8
legacy scan are prior evidence. Fresh OTP/magic-link delivery and a new physical
iPad test were not performed. No live staff configuration-save/failure exercise
was performed; those paths retain regression coverage.

Receipts, request bodies, counters and screenshots remain under
`/tmp/lotto-rc8-stjohns-*`, including `public-checks.json`,
`sql-before.txt`, `sql-after-public.txt`, `sql-after-staff.txt`,
`configuration.json`, `release-notes.png` and `display.png`. The temporary
production environment pull was emptied after deployment. Created staff,
monitoring and public-test tabs were closed after verification.

Deployment, publication, staff controls and diagnostics are deliberate traffic
and must be excluded from the next idle interval. A clean **48–72-hour** daily
CU-hour-rate/overnight comparison is still required to measure savings. Other
authenticated, integration, direct-client and historical deployment URL reads
remain separate boundaries. WTH's deployment and idle observation were untouched.
