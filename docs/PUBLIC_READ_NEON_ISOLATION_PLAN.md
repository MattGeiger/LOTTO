# Public reads and Neon isolation

## Authorization and findings — October 2, 2026

The owner authorized implementation and WTH production deployment after the
read-only compute investigation. Service must remain available. Other agency
deployments and provider billing plans remain outside this release.

Fresh RC.5 displays use Cloudflare correctly, but anonymous legacy clients still
reach a Neon-backed `GET /api/state`. Public rendering also queries branding,
and visitor language catalog/pack requests read configuration and translations.
The historical Vercel chart is disputed: Neon reports 80.04 CU-hours for June
and 68.05 for July. No late-June culprit or billing change has been established.

## Implementation contract

1. Add an independent `LOTTO_PUBLIC_STATE_SNAPSHOT_ENABLED` deployment gate.
   WTH sets it to `true`; local development and other deployments retain their
   existing behavior unless explicitly enabled. A malformed enabled
   configuration fails closed rather than silently selecting database reads.
2. Anonymous `GET /api/state` fetches the configured Cloudflare snapshot with a
   bounded timeout, strict envelope/agency/checksum validation and no redirects.
   Return the existing raffle-state JSON shape, with `queueSession: null`, the
   revision header and an observable state-source header. Unchanged old snapshots
   remain valid: elapsed time alone does not imply a missing staff update.
3. Authenticated staff GETs retain complete authoritative state. Session validity
   is determined by Auth.js, never by a query parameter or caller-supplied role.
   All responses remain private/no-store and vary on Cookie. Writes, snapshots,
   undo/redo and publication repair remain authoritative Neon operations.
4. Snapshot failure returns a generic 503 and Retry-After, with zero queue-state
   database fallback. Existing old clients may retry, but those retries remain
   isolated from Neon. Client WebSocket recovery and the 120-second grace period
   are unchanged.
5. Cache active branding and public catalog/translation packs in Next's shared
   Data Cache without a periodic expiry. Namespace entries and tags by datastore
   and deployment environment; include the release version in derived cache
   keys so compiled UI/catalog changes cannot reuse old packs. Bypass this cache
   in local/file development.
   Use the installed Next 16 documented `unstable_cache` API for this bounded
   change; enabling Cache Components is a separate architecture decision.
6. Invalidate configuration caches after successful brand, enabled-language and
   translation store writes, including bulk commits. Invalidate packs after
   announcement/state replacement actions. Failed reads must not cache fallback
   values, and failed writes must not invalidate valid cached values. A cold or
   evicted configuration entry may require a database read; ordinary warm public
   requests must not perform periodic SQL revalidation.

## Verification and release

- Test repeated anonymous legacy requests, forged/error sessions, malformed or
  unavailable snapshots, staff reads and disabled deployments. Assert database
  read counts, response compatibility and revision/checksum behavior.
- Test cache reuse and mutation invalidation for branding, catalogs, packs and
  announcements, including rejected reads/writes and namespace isolation.
- Audit all SQL owners and consumers. Leave authentication and FEED access
  unchanged as directed by the owner. See
  [the read inventory](NEON_READ_AUDIT.md).
- Compare production client chunks before/after the server fix. Run targeted
  tests, lint, build, legacy scan and built-app hydration smoke. Version/release
  metadata changes are tracked separately from runtime browser code changes.
- Update the cost runbook, realtime documentation, staff Help and release notes.
  Publish the next release candidate to the linked `wthlotto` project only;
  record the preceding RC.5 deployment as the available rollback reference.
- Verify production anonymous state-source headers, authenticated staff state,
  ordinary display loading and warm configuration requests.
  Do not run the Worker mutation verifier against the real agency state.
- Observe at least 60–90 minutes and an overnight interval after diagnostic
  activity stops. Correlate request groups with compute start/suspend operations
  and consumption metrics. Distinguish zero public queue SQL from all Neon usage.
  Vercel Hobby runtime logs retain one hour; collect evidence within that window.
- Reconcile the historical chart with provider support only if separately
  authorized to send a support message. The discrepancy remains documented.

## Operational limits

There is no outage, database migration, replica, dependency upgrade or change to
the operating schedule or five-minute suspension setting in this work. A frontend
reload cannot be relied on to silence unknown clients. Short CDN TTLs alone also cannot eliminate
half-hour wakeups. Direct external database clients and authenticated staff
activity remain possible sources of compute; the overnight observation must
measure those separately from this public-read boundary.
