# Neon read audit — October 2, 2026

## Scope and result

Source audit of every Neon client/pool construction and its callers in `src/`,
plus the schema CLI and hosting configuration. This is a code-path inventory;
it does not identify every external database client or reconstruct historical
traffic. No operating-hours or stored agency-state change is part of the fix.
The owner directed that FEED/public access remain unchanged. No authentication
gate changes are included in this release.

Public queue state uses Cloudflare. Public configuration uses Next's shared
Data Cache, not Cloudflare. Warm configuration reads avoid SQL; cache cold
starts/evictions can still query Neon. Thus RC.6 does not claim every possible
anonymous request is database-free. A durable Cloudflare configuration projection
would require a separately planned protocol/publication extension.

## Complete application read inventory

| SQL owner | Entry points and reads | RC.6 boundary |
| --- | --- | --- |
| `state-manager-db.ts` | Singleton state/revision; state read-modify-write; snapshots/undo/redo; queue summaries; publication status and retry | Anonymous `/api/state` uses Cloudflare when enabled, with no SQL fallback. Staff state and commands, bearer-authorized FEED summaries, Admin diagnostics and private queue retry remain authoritative SQL. |
| `brand-config/store-db.ts` | Active configuration; saved rows/templates; configuration CRUD | Public HTML, RSC/prefetch, metadata, manifest, CSP and email branding share cached active configuration. Admin list GET still reads SQL and seeds templates; no display consumer calls it. Writes invalidate the cache. |
| `translation/languages-store-db.ts` | Catalog/enabled rows; seeding and enablement | Visitor `?client` uses cached readiness catalog. Catalog/`?enabled` management reads still use SQL with existing access rules. Successful enablement invalidates public caches. |
| `translation/translations-store-db.ts` | Filtered translations, individual rows and mutations | Public packs cache completed translations, active-brand copy and announcement. Management/metrics GET still read SQL with existing access rules. Successful single/bulk edits invalidate public caches. |
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
- `vercel.json` contains only the private publication-queue trigger, no cron.
  That queue has an eight-delivery/one-hour budget and is enqueued by commits.
  No state change means no newly enqueued repair work.
- Importing the state manager constructs the HTTP SQL client but does not read
  the state. Brand template seeding happens in the Admin configuration GET,
  not in public page rendering.

## Attribution limits and next measurement

Configurable database-backed branding first appears in release commit
`1f093a3b422049fec18c3ee9fcd617882d8c65a8`, July 20, 2026 at 00:33:48 PDT.
The Vercel user-event API records deployment of that commit from `main` to
WTH production at 00:33:58 PDT (07:33:58.156 UTC). This event is not proof of the
exact build-ready time. July 18's v1.19.0 used compiled brand profiles. Branding
therefore cannot explain a late-June increase, although it introduced an
additional public SQL source from July 20 onward.

Observed half-hour `/api/state` groups correlated with compute starts before
the release. Branding SELECTs were confirmed on fresh page/prefetch requests.
That proves two independent public sources, not that branding caused the entire
invoice. The current Neon endpoint remains 0.25 CU with five-minute suspension.

Verify the live server source header, warm configuration cache behavior and
staff access. Then stop SQL-console/diagnostic reads and compare compute start/
suspend operations and hourly consumption against arriving HTTP paths. Keep
Hobby runtime-log retention (one hour) in mind. Remaining wakes must be attributed
to cold configuration reads, authenticated clients, FEED sync, direct clients,
or another measured source before proposing further changes.
