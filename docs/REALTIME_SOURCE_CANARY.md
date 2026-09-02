# Realtime source canary

## Status

Phase 5 is an isolated-beta experiment. It allows an explicitly selected
browser to render the Cloudflare Durable Object public projection while the
existing `/api/state` poller remains installed as the automatic safety path.
It does not change staff writes, Neon authority, production, or the ordinary
beta control cohort.

## Independent gates

Both gates are required:

1. `LOTTO_REALTIME_SOURCE_CANARY=true` in a deployment explicitly marked
   `LOTTO_DEPLOYMENT_ENVIRONMENT=beta`.
2. The exact browser query `?realtime=source`.

The existing `?realtime=observe` cohort remains observational and continues to
render polled state. A URL without either exact value remains polling-only.
The source flag is independent from shadow publication and the Phase 4 observer
flag, so rollback does not require changing either system.

## Authority state machine

The source controller uses one native WebSocket and starts in fallback mode.
The existing poller performs its ordinary initial `/api/state` read. A valid
hub envelope is eligible to become authoritative only when its agency,
protocol, checksum, revision, and public projection exactly match that polled
result. Only then does the page clear its scheduled poll timer and render later
valid hub revisions.

While realtime is authoritative:

- a duplicate revision with the same checksum is ignored;
- exactly the next revision is applied immediately;
- a skipped revision, conflicting duplicate, invalid envelope, socket close,
  connection/handshake timeout, or exhausted reconnect budget revokes realtime
  authority;
- revocation triggers one immediate visible-document `/api/state` read and
  restores the existing adaptive polling schedule;
- reconnect attempts use bounded exponential backoff with jitter and can regain
  authority only through another exact polled handshake; and
- hiding the document closes the socket and clears polling timers. Returning
  visible performs an immediate authoritative poll and begins a fresh handshake.

There is no application heartbeat. This preserves Durable Object hibernation
behavior; browser transport close/error, visibility, online/offline events, and
the handshake timeout are the failure signals. Staff transactions never wait
for or depend on the hub.

## Consumer boundary

Home and Display apply the full allowlisted public projection to their existing
`ReadOnlyDisplay` state. Inventory applies it through the ticket-celebration
state owner. Arcade applies it through the existing Now Serving banner state
owner. No page opens a second poll loop or a second socket.

The realtime projection intentionally omits internal `queueSession` evidence.
Public consumers never use that field; conversion back to the public rendering
shape preserves the previously polled value when present.

## Test gates

Deterministic coverage must prove:

- exact beta flag and URL cohort boundaries;
- no recurring `/api/state` requests while authority is healthy;
- immediate state application for the next valid revision;
- immediate polling fallback on close, timeout, invalid payload, checksum
  failure, revision gap, conflicting duplicate, offline, and foregrounding;
- bounded reconnects without overlapping sockets;
- polling remains paused while hidden;
- all four consumers render source updates; and
- the polling-only and Phase 4 observer paths are unchanged.

Before a live beta run, run the focused tests, complete suite, production build,
legacy bundle scan, production hydration smoke, and iOS 15.4 simulator check.
The real iPad mini 4 remains a release gate.

## Live validation and exit gate

The source cohort URLs are:

```text
https://beta.williamtemple.app/?realtime=source
https://beta.williamtemple.app/display?realtime=source
https://beta.williamtemple.app/inventory?realtime=source
https://beta.williamtemple.app/arcade?realtime=source
```

Live validation must record source delivery latency, request counts during a
healthy window, recovery time for each deliberate failure, revision/checksum
agreement after recovery, and any stale-state incident. Phase 5 exits only
after at least ten representative service days, all fault drills recover, no
staff write depends on Cloudflare, and healthy source clients generate no
scheduled `/api/state` polling.

## Rollback

Set `LOTTO_REALTIME_SOURCE_CANARY=false` and redeploy beta, or remove
`?realtime=source` from an individual browser. The page then uses its existing
adaptive polling path. No schema, stored state, staff workflow, publication
setting, or production deployment is reversed.
