# Neon read audit — updated October 8, 2026

## Scope and result

Source audit of every Neon client/pool construction and its callers in `src/`,
plus the schema CLI and hosting configuration. This is a code-path inventory;
it does not identify every external database client or reconstruct historical
traffic. No operating-hours or stored agency-state change is part of the fix.
The owner directed that FEED/public access remain unchanged. No authentication
gate changes are included in this release.

Public queue state uses Cloudflare when its independent gate is enabled. RC.7
adds `LOTTO_PUBLIC_CONFIGURATION_SNAPSHOT_ENABLED`: public branding, visitor
catalogs and packs then use a published Cloudflare document, including active
announcement selection, without SQL fallback on cold or failed reads. With
that gate off, RC.6's shared Data Cache behavior remains: misses can query Neon.
Version alone does not enable the new boundary. See
[publication operations](PUBLIC_CONFIGURATION_PUBLICATION.md) and
[the implementation plan](PUBLIC_CONFIGURATION_PUBLICATION_PLAN.md).

The October 3 St. Johns RC.6 cutover applies the same opt-in boundaries to a
separate agency Worker and database. The application version alone does not
enable snapshot isolation: the agency's publication, source and snapshot flags
must be configured and a valid projection published first. See
[the St. Johns cutover](STJOHNS_RC6_CUTOVER.md) for its configuration and evidence.

## Complete application read inventory

| SQL owner | Entry points and reads | RC.7 boundary (configuration gate enabled) |
| --- | --- | --- |
| `state-manager-db.ts` | Singleton state/revision; state read-modify-write; snapshots/undo/redo; queue summaries; publication status and retry | Anonymous `/api/state` uses Cloudflare when enabled, with no SQL fallback. Staff state and commands, bearer-authorized FEED summaries, Admin diagnostics and private queue retry remain authoritative SQL. |
| `brand-config/store-db.ts` | Active configuration; saved rows/templates; configuration CRUD | Public HTML, RSC/prefetch, metadata, manifest, CSP and email branding read published Cloudflare configuration. Admin list GET still reads SQL and seeds templates. Successful writes invalidate the old shared cache and publish. |
| `translation/languages-store-db.ts` | Catalog/enabled rows; explicit initialization and enablement | Visitor `?client` derives readiness from Cloudflare. Catalog/`?enabled` management reads remain one SQL SELECT with existing access rules and no seeding writes. Explicit staff enablement uses one bulk seed INSERT, preserving saved choices, then publishes. |
| `translation/translations-store-db.ts` | Filtered translations, individual rows and mutations | Public packs derive completed translations, active-brand copy and active announcement from Cloudflare, with no state SELECT. Management/metrics GET still read SQL. Successful single/bulk edits publish. |
| `ai/ai-config-store-db.ts` | Configurations and stored provider credentials, CRUD | Admin component GET still reads SQL with existing access rules; staff-driven translation jobs remain authenticated. No ordinary display consumer. |
| `ai/system-prompt-store-db.ts` | Prompt list/selection, CRUD | Admin component GET still reads SQL with existing access rules; explicit processing remains staff-driven. No ordinary display consumer. |
| `feed-integration-token/store-db.ts` | LOTTO integration token hash/status; usage metadata | Existing LOTTO pairing and daily-summary API behavior remains unchanged. The daily-summary handler reads token status before authorization; supplied tokens are checked against authoritative credentials. This is separate from FEED's public inventory server. |
| `db.ts` pool, `auth.ts`, OTP request and Auth.js Postgres adapter | Users, verification tokens, OTP failures and sign-in operations | Sign-in is intentionally database-backed. Existing session validation uses JWT. Constructing the lazy pool/adapter does not execute a query. Public queue GET without cookies does not initialize Auth.js. |
| `arcade/lib/high-score-store.ts` | Top scores; qualification and score submission | Uses separate `ARCADE_DATABASE_URL`, not WTH's queue database. Reads occur when Ready/Game Over changes game scope, not from the one-second UI countdown. This release leaves that store untouched. |
| `scripts/apply-schema.mjs` | Explicit schema application/transaction | Operator CLI only; no scheduled invocation or application polling. Not run for this release. |

## Consumers and hosting

- Home, Display, Inventory queue alerts and Arcade Now Serving all share the
  Cloudflare source controller. Its lifecycle, failure and language-change
  tests count requests. Legacy/polling-only state requests use the same server
  snapshot boundary. The 120-second socket grace period is unchanged.
- `LanguageProvider` requests `?client` when a picker needs it and a completed
  pack for a non-English language. These public exceptions remain accessible.
  `/api/languages?enabled`, full translations/metrics, AI configurations, system
  prompts and appearance lists are called by Admin components, not displays.
- Public inventory fetches the configured FEED HTTP origin. It does not use
  LOTTO's Neon connection. LOTTO also exposes a separate bearer-protected
  daily-summary API; external callers/scheduling are not verified by this audit.
- `vercel.json` has two private publication-queue triggers and no cron. Queue
  state repair retains its existing outbox. Configuration repair is enqueued
  only after a failed staff-triggered publication; success creates no job.
  Each has an eight-delivery/one-hour budget. Configuration repair checks the
  Cloudflare release/progress before authoritative reads and skips already
  published generations. No public read enqueues either queue.
- Configuration publication deliberately performs four authoritative reads
  after a relevant staff save or explicit maintenance action: active brand,
  enabled catalog, completed translations and current state. It is not a
  periodic synchronization job. It can still incur compute during staff work
  and bounded repair; this audit does not claim zero total Neon use.
- Staff translation discovery reads committed appearance directly rather than
  a potentially delayed public copy. Translation preparation, processing,
  recovery and bulk retry group internal saves into one public publication
  per logical operation, preserving batching rather than adding four reads
  for every staged row.
- Importing the state manager constructs the HTTP SQL client but does not read
  the state. Brand template seeding happens in the Admin configuration GET,
  not in public page rendering.

## Attribution limits and next measurement

Configurable database-backed branding first appears in release commit
`1f093a3b422049fec18c3ee9fcd617882d8c65a8`, July 20, 2026 at 00:33:48 PDT.
The Vercel user-event API records deployment of that commit from `main` to
WTH production at 00:33:58 PDT (07:33:58.156 UTC). This event is not proof of the
exact build-ready time. July 18's v1.19.0 used compiled brand profiles. The
July 20 change is consistent with an elevated July monthly total: a monthly
bucket does not establish that the increase began July 1. Branding is a strong
candidate for added late-July usage. Its share of the increase has not been
measured, and the June reporting discrepancy still needs reconciliation.

The July 20 resolver deliberately called `noStore()` and read the active brand
row on every server render, even when the resulting selection was the compiled
default. React `cache()` shared that work only within a request, not between
visits. This establishes a database-wake mechanism independent of queue-state
polling; it does not establish how often unattended displays rendered a page.

Observed half-hour `/api/state` groups correlated with compute starts before
the release. Branding SELECTs were confirmed on fresh page/prefetch requests.
That proves two independent public sources, not that branding caused the entire
invoice. The current Neon endpoint remains 0.25 CU with five-minute suspension.

RC.6's controlled warm-request verification subsequently added zero active-brand,
language, translation or queue SELECTs across 80 public requests. A staff-read
positive control increased the queue counter, confirming that it was updating.
See [production validation](PUBLIC_READ_NEON_ISOLATION_VALIDATION.md). Cold cache
misses remain SQL reads with the configuration gate off; an unattended comparison
after RC.7 activation is still required. RC.7's local regression suite forces
cold module/shared caches and asserts zero authoritative reads across repeated
public branding, catalog and pack requests, including failure paths. That is
code-level evidence, distinct from live SQL counters and measured savings.

RC.7 was activated on WTH's organization-owned production project on October 7.
Eighty anonymous, cache-busting requests across public pages, manifest,
catalog/packs and legacy queue GETs added no branding, language, translation or
queue SELECTs in the measured interval. An authenticated staff positive control
increased the queue counter from 3 to 4. See the [activation record](PUBLIC_CONFIGURATION_PUBLICATION.md#wth-production-activation--october-7-2026).
The configuration gate was enabled on this WTH deployment; its October 7
rollout did not deploy other agencies.

On October 8 the owner authorized the same update for personal-account St.
Johns Food Share. Its own RC.8 configuration was published and validated before
enabling its production gate. Eighty anonymous requests added no covered
branding, language, translation or queue SELECTs; a staff positive control
increased the queue counter from 5 to 7. Queue data and manifest were unchanged.
See [St. Johns cutover](STJOHNS_RC8_CUTOVER.md). Future writes/failures and
48–72-hour consumption remain separate verification boundaries for both agencies.

The live source header, warm configuration counters and staff access passed
controlled verification. Next compare compute start/
suspend operations and hourly consumption against arriving HTTP paths. Keep
Hobby runtime-log retention (one hour) in mind. Remaining wakes must be attributed
to cold configuration reads, authenticated clients, FEED sync, direct clients,
or another measured source before proposing further changes.
