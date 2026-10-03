# Public display idle recovery

Approved September 28, 2026 and deployed to WTH in RC.5. The October 2 RC.6
addition is documented in [public-read isolation](PUBLIC_READ_NEON_ISOLATION_PLAN.md)
and its [validation record](PUBLIC_READ_NEON_ISOLATION_VALIDATION.md).

## Contract

In configured source mode, Home, Display, Inventory's queue notification and
Arcade's Now Serving banner obtain public state only from the agency Cloudflare
hub. They must never automatically call `/api/state`, including initial mount,
language changes, foregrounding, invalid messages, missed revisions or outages.
The explicit polling/observer modes and deployments without source configuration
retain the existing browser poller as an operator-controlled comparison. When
`LOTTO_PUBLIC_STATE_SNAPSHOT_ENABLED=true`, anonymous server-side `/api/state`
reads also use Cloudflare, including requests from old clients. Disabling the
browser application gate alone therefore does not restore public Neon reads;
the independent server gate controls that boundary.

Cloudflare full snapshots are validated for agency, schema, protocol, checksum
and monotonic revision. A complete newer snapshot can bridge revision gaps.
Equal revision with different content is rejected. Late responses cannot replace
newer state. Database authority remains on authenticated staff commands.

## Timing and ownership

One shared transport controller owns HTTP requests, reconnects and heartbeats.
Bootstrap reads the Cloudflare snapshot immediately. A detected socket failure
starts a 120-second snapshot grace period and a 120-second persistent
failure timer. Socket open alone does not reset failure age. A valid handshake
restores live delivery and cancels fallback. Heartbeats every 25 seconds use a
10-second reply deadline and the Durable Object automatic response API.

HTTP fallback uses 15 seconds during service and adaptive 60-to-300-second
closed-hours intervals, with exponential failure backoff, jitter, request
timeouts, one request in flight, and a rolling hourly budget. Hidden/offline
documents pause work. Foreground/online recovery uses Cloudflare. Old unchanged
revisions are normal; freshness of transport is measured separately from state
commit time. Complete outage retains the last known state and reports unavailable
updates; a fresh page must not invent an empty queue.

## Publication prerequisite

The previous publication path attempted once after committing the Neon outbox. Remove the
display verification dependency only with bounded durable publication recovery.
Use Vercel's private push queue, isolated by project and deployment. After each
staff commit, register one watchdog before the direct publish attempt. Delivery
is delayed 30 seconds and reads only that publication's pending/failed row;
accepted or superseded work immediately ends. Pending work receives at most
eight deliveries, with 15-to-300-second backoff and one-hour retention. This
adds one watchdog database read per staff commit, including successful direct
publication; it creates no work during an unchanged idle period. Enqueue has a
three-second response deadline. There is no idle cron or visitor-driven repair.
Enqueue failure and exhausted
delivery remain visible through existing Admin publication diagnostics. Queue
delivery must survive the original request process. Document the unavoidable
commit/enqueue boundary and prove failure behavior rather than claiming atomic
delivery across services. This is a server-only dependency and requires hosted
beta verification before release.

## Work and validation

1. Shared controller, snapshot config/CSP, consumer gating, diagnostic UI.
2. Backward-compatible Worker heartbeat support; publication queue and tests.
3. Regression tests count actual requests across lifecycle, outages, races,
   invalid data, heartbeat failures, missed revisions, language rerenders and
   every consumer. Test delayed publication recovery without a second staff edit.
4. Update source/architecture/Worker docs, user guides and changelog.
5. Full tests, lint, build, legacy chunk scan and production smoke; clean build
   artifacts before returning to development. No dependency upgrades unrelated
   to this work.
6. Isolated beta Worker first, then beta client; real iPad and iOS 15.4 checks;
   multi-hour Chrome soak. WTH production requires these gates, then an overnight
   request/SQL/Neon observation. Do not infer agency root cause from this local fix.

Rollback restores the prior app (including database polling), then optionally
the Worker. Never roll the heartbeat-capable Worker back beneath new clients.
Initial HTML branding/auth/config reads are separate from queue-state transport;
the acceptance claim is zero automatic public queue-state SQL and no recurring
idle display traffic reaching Neon, not zero database use by the whole product.

## Validation record — September 28, 2026

- Full Vitest run after all lifecycle/budget/language regression additions:
  137 files passed; 989 tests passed, one skipped. TypeScript and ESLint pass. ESLint excludes
  generated Wrangler output; Browserslist reports an existing stale-data notice.
- Production builds pass. The source-enabled build uses matching build/runtime
  flags so CSP includes both the HTTPS snapshot and WSS event origin. The first
  local run intentionally supplied no production database and exposed the
  missing build-time origin; it is not counted as a realtime validation pass.
- Legacy regex scan: 47 chunks pass. Production hydration smoke passes `/` and
  `/login`, with local auth/backend and Vercel analytics warnings. This is not
  proof of working authentication or legacy JavaScriptCore compatibility.
- Local Worker verifier passes authentication, snapshot, WebSocket, automatic
  heartbeat, idempotency, monotonic revision, CORS, drain and resume checks.
- Beta Worker `lotto-realtime-beta` deployed as version
  `e0da6625-2d77-4d87-97fa-7710cb8f36c0`. The subsequent owner-authorized
  production Worker and application test is recorded below.
- Real Chrome Guest window on this Mac loaded the built localhost Display from
  the beta hub at revision 111, with one bootstrap snapshot and zero `/api/state`
  requests. A page-local WebSocket constructor fault prevented reconnection
  after closing only that tab's socket. Failure started at 19:20:03.291 UTC;
  at 19:20:50 there was still only one snapshot request. Fallback received the
  unchanged snapshot at 19:22:03.512 UTC (120.221 seconds later), with persistent
  failure flagged and still zero `/api/state` requests. No agency display or
  production queue was used for the drill.
  After removal of the page-local fault, the scheduled reconnect restored live
  delivery at 19:23:26.634 UTC without reload. At 19:23:44 telemetry showed
  revision 111, two socket snapshots, seven total HTTP snapshot requests,
  cleared failure state, and zero `/api/state` requests across the entire drill.
  The temporary Chrome Guest window was closed afterward.
- Deterministic tests also cover over one simulated hour of heartbeat traffic,
  total outages, late HTTP results, hidden/offline transitions, request caps,
  source updates in all consumers, and publication retry without a second edit.
  Simulated time is not an overnight or multi-hour live soak.
- Audit remains 31 production advisories: 25 moderate, five high, one critical.
  The only new runtime dependency is server-only `@vercel/queue@0.7.0`.
  Lockfile comparison confirms no existing package versions were changed.

### Remaining release gates

**September 28 owner authorization:** WTH has no service today. The owner
explicitly authorized live production testing instead of waiting for beta access.
Proceed with a controlled WTH-only candidate, compatible production Worker first,
recorded previous deployment, queue/state comparison, page-local socket fault,
and bounded publication verification. This changes the test destination; it does
not turn unperformed physical-iPad or overnight checks into passes. The other
agency and its Vercel project remain outside this test.

The authenticated Vercel CLI account `mattgeiger` lists only `wthlotto`,
`stjohns-food-share`, and `nettie-spinner`; it cannot access the documented
`wth_apps/lotto-beta` target. The owner authorized WTH production as the test
destination. Hosted queue delivery and the private-route check have now passed;
deliberately failed publication/redelivery remains covered by automated tests,
not a live failure drill.

The installed iOS 15.4 simulator runtime is unavailable on this Mac's current
macOS (reported unsupported after macOS 26.99.99). A supported host or physical
iPad is needed; newer simulators cannot stand in for that engine. Physical iPad
validation, multi-hour live soak, and overnight Neon/request comparison remain
outstanding. WTH production now runs implementation commit `c623b90`, deployed
through the CLI without a Git push. See
[production validation](REALTIME_IDLE_RECOVERY_PRODUCTION_VALIDATION.md) for
deployment identities, measured browser behavior, and remaining limits.
