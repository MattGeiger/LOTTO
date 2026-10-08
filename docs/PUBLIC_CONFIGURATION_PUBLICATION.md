# Public configuration publication — RC.7

## Current contract

Neon remains authoritative for staff work. An independently gated Cloudflare
document supplies public appearance, enabled/ready language inputs and completed
translation-pack text, including the active announcement. Public pages, layouts,
metadata, manifest, catalogs and compatible legacy pack requests use it with
`LOTTO_PUBLIC_CONFIGURATION_SNAPSHOT_ENABLED=true`. Public queue snapshots and
the 120-second WebSocket grace retain their separate existing gates.

Each document is schema-validated, checksummed, agency-scoped and release-scoped.
It contains only public fields, no drafts, historical announcement text, job
metadata, cost records, provider credentials or staff data. Public reads use
Cloudflare fetches with `no-store`; this is not a guarantee of CDN-cache hits.
Cloudflare costs and Vercel invocation costs are separate from Neon compute.

Missing, invalid, mismatched or unavailable documents never cause SQL fallback.
Branding falls back to the compiled profile and its existing Admin warning.
Visitor catalog/pack APIs return HTTP 503; core language strings remain compiled
in the client. Successful API responses identify `cloudflare` in
`x-lotto-configuration-source`. The header alone is not evidence of zero SQL.
The full management catalog/metrics/appearance APIs keep their access rules and
authoritative reads. FEED public inventory remains on its separate HTTP server.

## Staff writes and bounded repair

Existing successful-write wrappers invalidate the legacy shared cache and, when
the configuration gate is enabled, publish after brand, language, translation,
announcement, restore and undo/redo saves. Failed writes publish nothing. No
public read, timer, cron or cache expiry performs a publication.

Staff translation discovery reads committed branding directly, so a delayed
public copy does not change the content being prepared. Find Missing, processing,
recovery and bulk retry group their internal saves into one publication per
logical operation, including partial commits if a later step fails. Nested
operations share the group; concurrent requests remain independent. A job that
makes no writes publishes nothing. This avoids four extra reads and a Worker
publication for every staged translation row.

The publisher reserves a monotonically increasing generation **before** four
authoritative reads: active brand, enabled catalog, completed translations and
current state. The Worker atomically stores chunks and their manifest. A newer
reservation supersedes older work; duplicate envelopes are safe. Uninitialized
or different releases require explicit activation, preventing an old deployment
from silently republishing over a newer release. Public readers require their
own package version. Storage is limited to an 8 MB document; individual chunks
are at most 8,000 UTF-16 units. Existing queue state storage is untouched.

A publication failure preserves the already committed staff success and the
previous public document. It attempts to enqueue one private
`lotto-public-configuration-repair` message, delayed 30 seconds, retained for one
hour, with at most eight deliveries and capped exponential retry delays. Each
repair checks Cloudflare progress/release before reading SQL; already delivered,
cross-agency and old-release jobs do no authoritative reads. No successful save
creates a recurring job. If enqueue also fails or the budget expires, an
operator must republish explicitly. Do not re-enter saved staff changes.

Catalog reads perform one SELECT and merge missing compiled defaults in memory.
Only explicit staff language enablement seeds missing rows (one bulk INSERT,
`ON CONFLICT DO NOTHING`), preserving saved choices.

## WTH rollout

The owner approved WTH implementation on October 7. WTH now owns Vercel, Neon
and Cloudflare operations; the personal GitHub source remains the owner's IP.
Verify the live target and configuration before each provider operation.

1. Verify WTH Vercel project `wthlotto`, its current deployment and rollback
   reference; verify the production hub's exact host, agency and WTH Cloudflare
   account. Do not recreate the retired personal WTH Worker or beta resources.
   Leave St. Johns and shared-account resources untouched.
2. Deploy the additive Worker routes to WTH's existing production Worker and
   namespace, preserving existing state, secrets, origins and sockets.
3. Build/deploy RC.7 first with the new read gate **off**. Existing public reads
   retain the shared-cache path while the document is seeded. No schema migration
   or saved operational-state change is required.
4. From an authenticated staff session on that deployment, explicitly
   `POST /api/state/configuration` with JSON `{ "activate": true }`.
   This maintenance action is allowed with the read gate off. Verify the
   returned publication is accepted and not superseded; GET the public
   Cloudflare `/v1/agencies/<agency>/configuration` document and independently
   verify agency, release, checksum and public content against the current
   authoritative configuration. If concurrent saves supersede it, repeat.
5. Enable `LOTTO_PUBLIC_CONFIGURATION_SNAPSHOT_ENABLED=true` on WTH's intended
   production deployment and redeploy the same RC.7 source. Verify Home,
   Display, Inventory, manifest, branding, client languages, packs, legacy
   `/api/state` and staff sign-in/state. Confirm live version and release notes.
6. Measure a bounded public-request interval using live SQL counters and a
   staff-read positive control; exclude bootstrap and diagnostics. Verify a
   subsequent relevant staff save publishes promptly and retains saved state.
7. Start a clean 48–72-hour daily/overnight comparison. Measure CU-hour **rate**
   and wake/suspend events in matching timezones, identifying legitimate staff,
   auth, integration, direct-client and Arcade reads separately.

For explicit repair on the active release, authenticated
`POST /api/state/configuration` with `{}` republishes current data. The endpoint
rejects an absent or errored staff session before database access. Only an
operator deliberately selecting a new release should use `activate: true`.
If recovery is required, review logs before any rollback; rollback is a separate
authorized operation. Another release must be explicitly published before its
configuration read gate is enabled. Merely changing application version is
insufficient.

## Verification record

Local tests exercise forced cache misses and fail-on-access SQL mocks for
branding, catalogs, packs and announcement selection; missing/wrong release,
agency and checksum; custom legacy-safe branding; staff commit/publication
failure; bounded repair and duplicate-job skipping. A separate test runs the
actual local Cloudflare Worker with synthetic tokens/agency and SQLite-backed
Durable Object, including overlapping revisions, release activation, CORS,
authentication and large Unicode chunk round trips.

On October 7 the final full suite passed **141 files / 1,035 tests**. Worker type
check and production dry-run passed. The application webpack production build
passed after correcting existing route-export/signature validation problems.
Browser chunk filenames/hashes changed (99 baseline assets, 101 after changes),
so the release cannot be called browser-unaffected. No dependency graph changes
were made. The final RC.7 webpack production build passed; the legacy scan found
no flagged regex syntax in 44 JavaScript chunks. The standard Turbopack build
could not bind its build-worker port in this execution environment; this does
not establish a source failure in Turbopack.

Automatic approval review rejected `npm run smoke:legacy` because it controls
Chrome through Puppeteer. The approved Computer interface instead verified
Home's language/announcement/ticket flow, both login tabs, editable email input,
the local RC.7 version and its release-notes dialog in modern Chrome. Auth.js
reported missing local production `RESEND_API_KEY`/`EMAIL_FROM`; no email was
submitted and actual authentication is not verified. This is a manual desktop
smoke, not a passing run of the automated command or the iOS support floor.

The initial host simulator attempt failed because CoreSimulator rejects iOS
15.4 on macOS 27.0.1. Later on October 7, the owner supplied a running macOS 26
UTM guest with `LOTTO-iPadMini4-iOS15` / iOS 15.4; its runtime label and Safari
were visibly verified. RC.7 was rebuilt with webpack and the legacy scan again
passed all 44 chunks. The owner assisted with guest navigation because Computer
Use could capture its screen but mouse clicks failed and typed punctuation was
corrupted. This is a user-assisted simulator check, not an automated or physical
iPad result.

The built application used the configuration read gate enabled against a
synthetic, checksummed HTTPS publication fixture for `lotto-legacy-test`, with
WTH-template branding and a distinct `Legacy RC.7 Test Service` heading. The
test server's SQL connection pointed to unused localhost port 9 and queue state
used local file storage; no production Worker or Neon endpoint was used. The
HTTPS fixture certificate was trusted only by that Node process, without
disabling certificate verification or changing system/browser trust. Language
catalog, Chinese pack and manifest requests succeeded; the pack returned the
synthetic Chinese brand translation through the published-data path.

Screenshots verified RC.7 login with an interactive Verification Code form and
its failed-submit response, and a populated Home in portrait and landscape
with the published heading, runtime-generated theme, ticket grid and updating
clock. The owner reported responsive controls, working language and theme
switches, and completion of the requested flows, and accepted proceeding toward
WTH production despite the unverified sign-in workflow. Evidence images remain
local at `/tmp/lotto-rc7-vm-login.png` and `/tmp/lotto-rc7-vm-home.png`.

Actual OTP/magic-link delivery and authenticated Admin persistence remain
unverified in RC.7. The isolated local server intentionally lacked Resend
credentials; an owner-submitted OTP attempt returned the expected failure.
Safari's JavaScript console was not inspected, and these interactions do not
prove absence of every runtime exception or validate live WebSocket recovery,
staff publication, hosted queues or cost savings. No application/dependency
changes were made during the simulator check. **Production remains unchanged
at this checkpoint.**

### WTH production activation — October 7, 2026

After the owner accepted the simulator check, isolated release sessions were
authenticated as `technology@williamtemple.org` / Vercel `technology-3236`.
Vercel confirmed team `team_wrtoOljQrNtcWuOGpv0oKF8V` (`wth-apps`) and project
`prj_zNP9ZGxuCuG6OhXgtyCwth1KTzdm` (`wthlotto`). The first isolated login had
selected the personal account and was not used for deployment. Personal global
CLI credentials, GitHub ownership, other agencies and saved service settings
were preserved. No Git push or repository ownership change was made.

The owner authorized narrowed Cloudflare access for account/user reads,
Worker-script writes and Worker-log reads, plus OAuth background access. The
session confirmed only WTH account `818dcedfd7ee838741c00e480ba36386`. The existing
production Worker was updated to version
`21149d9e-ce6a-43fc-98b3-456c8cb0472a`, retaining Durable Object namespace
`63097b3128f14af9b313745ed18347e9`, the apex-only origin and existing secrets.
The previous Worker version is `d9397c17-86bb-4964-bad3-ae1a18c5606a`.

RC.7 was uploaded directly from the working-tree snapshot based on `ced96024`,
without Git metadata or local environment files. Its source manifest SHA-256
is `d9b28d753ade0409b7ea6cee85c290eb56bfb06b744600f990ab8bd15158d67c`.
The deployment artifact selected the tested webpack build without changing the
project's global build command. The first ready deployment,
`dpl_FXb8XdwKV2DobXvMGv9LH5jqKgjo`, was promoted with the configuration gate
off. Authenticated `POST /api/state/configuration` accepted revision 1. The
published document independently passed schema, agency, release and checksum
validation: nine enabled languages, 903 completed translations and the existing
active announcement. No operational state was written for this bootstrap.

The production gate was then enabled and the same source rebuilt/promoted as
`dpl_7aBtc5gwnPXuWAsuziv3W3t1cXbq`, hostname
`wthlotto-byz7xsdjr-wth-apps.vercel.app`. Both hosted builds passed. The previous
RC.6 deployment is `dpl_9G12h8cjUqkBU1JgjGXyoT6oBHUy`. Production `/login` and
the release-notes dialog visibly show RC.7; `/display` hydrated with the saved
queue/hours and no captured console errors. This is modern Chrome evidence.
Actual new OTP/magic-link delivery and physical iPad validation remain untested;
the existing authenticated staff session successfully read authoritative state.

At **21:06:05–21:06:26 PDT**, ten rounds across Home, Display, Inventory,
manifest, client languages, Chinese/Spanish packs and anonymous legacy
`/api/state?realtime=poll` completed **80 requests**, all HTTP 200. Requests had
unique query parameters and no authentication cookies. Catalog/pack responses
identified `cloudflare`; state responses also identified `cloudflare`.
Neon's live Query performance counters were unchanged:

| SQL owner | Before | After public requests | After staff positive control |
| --- | ---: | ---: | ---: |
| Active branding SELECT | 2 | 2 | 2 |
| Queue state SELECT | 3 | 3 | 4 |
| Language catalog SELECT | 1 | 1 | 1 |
| Filtered translations SELECT | 1 | 1 | 1 |

The authenticated positive control returned `x-lotto-state-source: database`
and increased the state counter, confirming it refreshed. Bootstrap, staff
reads and monitoring are deliberate diagnostic activity, excluded from idle
cost observation. These counters verify this interval, not all future traffic
or the historical bill. A live staff configuration edit/publication-failure
exercise was not performed; those boundaries have local regression coverage.

Local evidence remains under `/tmp/lotto-rc7-*`, including request results,
counter captures and production screenshots. The test server and synthetic
fixture were stopped after the owner shut down the VM. The verified `.next`
build was moved out of the repository to preserve it while restoring a clean
development-build location. A Vercel CLI candidate probe automatically created
an automation bypass; it was unused and specifically revoked after verification.
Actual daily/overnight CU-hour savings still require a clean 48–72-hour window.

The production audit at session start reported 36 advisories: 26 moderate,
9 high and 1 critical. Dependencies were not changed in this cost-work scope.
Vercel's selective shared-cache misses remain under investigation in support
case `CSE_01zfXCRUacYJiBxZ`; publication removes reliance on that cache for the
covered public reads without claiming historical attribution is resolved.

### RC.8 navigation release — October 7, 2026

The owner approved the nested-pill navigation previews and authorized WTH
production deployment. A comparison against the deployed RC.7 source artifact
found only the core navigation styling changed in application source. Package
and root lockfile versions moved to RC.8; the dependency graph is identical.
Worker source and deployed Worker version were unchanged. No Git push or
other agency deployment was made.

The release artifact at `/tmp/lotto-rc8-wth-release` is based on `ced96024` plus
the preserved, previously deployed RC.7 work and this approved RC.8 change.
Its source manifest SHA-256 is
`0913b39e15911679494dfe38e1bfb0f3bc4355fd06d730c6889b4a149bf1f5a7`.
The artifact retained the tested webpack build command and WTH project/team
IDs. Production originally served `dpl_7aBtc5gwnPXuWAsuziv3W3t1cXbq`.

The gate-off deployment `dpl_EvExGVAVSmYfMyAhiCf4NNL5JM7S`
(`wthlotto-6ptzaq14s-wth-apps.vercel.app`) was promoted first. Authenticated
`POST /api/state/configuration` with `activate: true` returned HTTP 200,
`accepted: true`, revision 2. The independently fetched document verified
agency `william-temple-house`, release `2.0.0-rc.8` and its checksum. Its public
data matched RC.7 byte-for-byte: nine enabled languages and 903 completed
translations. The operational queue snapshot remained byte-identical at
revision 1034. This maintenance publication performed deliberate authoritative
reads; it did not save queue, branding, language or operating-hour changes.

The final gate-on deployment `dpl_9WhNMhPkMXF2KYGUzrQJ5aw7QjSu`
(`wthlotto-ftl9hd98s-wth-apps.vercel.app`) was then promoted to
`williamtemple.app`. Both hosted builds passed. Live client catalog,
Chinese/Spanish packs, anonymous legacy state and manifest checks returned
HTTP 200. Catalog/pack headers identified Cloudflare, and the legacy state
header identified Cloudflare. These headers confirm routing; this RC.8 check
did not repeat the RC.7 SQL-counter experiment or establish new cost savings.

Local webpack build, ESLint, 26 targeted tests and the legacy scan of 44 browser
chunks passed. Computer Use verified the built login tabs, editable email,
release notes and pill CSS. The local production server rejected the existing
`AUTH_BYPASS` setting; backend auth and queue loading were not verified there.
Live Chrome verified RC.8's version and release-notes dialog, fully rounded
Admin selector, Persistence confirmed and no captured error logs. Existing
staff authentication worked; fresh OTP/magic-link delivery and another iOS
15.4 runtime check were not performed. No client dependency or JavaScript API
changes were introduced by RC.8.

The local server was stopped and `.next` moved to
`/tmp/lotto-rc8-verified-webpack-build`, leaving development ready for a new
build. The borrowed staff-cookie file was emptied after publication. Receipts,
public-document comparisons and live screenshots remain under `/tmp/lotto-rc8-*`.
The start-of-release audit remained at 26 moderate, 9 high and 1 critical
advisory. RC.7/RC.8 compute savings still require the planned 48–72-hour daily
and overnight comparison. Any rollback requires separate authorization and
explicit activation of that release's configuration document.

### St. Johns production activation — October 8, 2026

The owner authorized deploying the same improvements to personal-account
`stjohns-food-share` / `stjohnsfoodshare.app`. Its existing Worker and isolated
Vercel release used the same gate-off → own-document publication → gate-on
sequence, without changing WTH. RC.8 revision 1 independently passed schema,
agency, release and checksum validation with eight enabled languages and seven
completed translations. The production configuration gate is enabled.

Eighty anonymous requests across public pages, manifest, catalog/packs and
legacy queue GETs added no covered application SQL reads. An authenticated
staff positive control increased the queue counter from 5 to 7; queue and
manifest content were unchanged. Modern Chrome display/login controls and
Safari staff persistence/release notes passed live checks. Fresh email sign-in,
physical iPad testing and measured 48–72-hour savings remain unverified.
See [the complete cutover record](STJOHNS_RC8_CUTOVER.md) for target identities,
deployment receipts, exact counter values and diagnostic-traffic limits.

## Provider references

- [Cloudflare SQLite storage and transactions](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/)
- [Cloudflare Durable Object limits](https://developers.cloudflare.com/durable-objects/platform/limits/)
- [Vercel Queues delivery and retries](https://vercel.com/docs/queues)
