# Realtime client canary

## Status

This document defines the first Phase 4 browser integration for LOTTO's
provisional v2.0 realtime architecture. The implementation is beta-only,
disabled by default, and observational. It is not the public-state source and
does not reduce Neon or Vercel usage yet.

The Home and Display surfaces can open one native WebSocket to the isolated
Cloudflare Durable Object, validate its public-state envelope, and compare that
state with the existing `/api/state` result. The ordinary adaptive polling path
continues to fetch and render all visible queue state.

## Safety boundary

Two independent gates are required:

1. The server-only `LOTTO_REALTIME_CLIENT_CANARY=true` flag must be present in a
   deployment explicitly marked `LOTTO_DEPLOYMENT_ENVIRONMENT=beta`.
2. The browser URL must contain exactly `?realtime=observe`.

The flag is rejected outside beta. The configured hub must be an HTTPS origin
whose hostname exactly matches `LOTTO_REALTIME_EXPECTED_HUB_HOST`; the browser
receives only the derived `wss://` subscription URL and opaque agency ID. The
publish token remains server-only. When the flag is off, the server emits no
canary configuration and the normal CSP does not include the Worker origin.

The initial cohort URLs are:

```text
https://beta.williamtemple.app/?realtime=observe
https://beta.williamtemple.app/display?realtime=observe
```

Removing the query parameter returns that browser to the ordinary polling-only
control path even while the beta deployment flag is enabled.

## Observer state machine

The observer uses the browser's native `WebSocket`; no client SDK or new
dependency is shipped.

1. Open exactly one subscribe-only socket for the configured agency.
2. Parse each text frame through the strict protocol-v1 envelope schema.
3. Require the configured agency ID and recompute the SHA-256 checksum over the
   allowlisted public projection.
4. Close permanently with policy code `1008` if the frame is malformed, belongs
   to another agency, or fails its checksum.
5. Hash the public projection of the already-polled `RaffleState` locally. This
   adds no fetch, Function invocation, or Neon read.
6. Report whether the pushed and polled checksums match. The pushed state is
   never passed to the rendering path.
7. On a transport close, reconnect after 1, 2, 4, 8, and 16 seconds, then stop.
   A valid message resets the consecutive-failure count.
8. When the document is hidden, clear any pending retry and close the socket.
   When it becomes visible, start one fresh connection. No fixed heartbeat,
   background timer, or overlapping socket is used.

The visible beta badge reports connection state, the latest hub revision, and
one comparison state:

| Comparison | Meaning |
| --- | --- |
| `Waiting for comparison` | One side has not supplied a valid checksum yet |
| `Neon match` | The pushed public payload and polled public payload are identical |
| `Hub ahead; polling unchanged` | The hub carries a newer state timestamp while the polling result has not caught up |
| `State mismatch` | Both sides are present but do not agree and the hub is not demonstrably newer |

The badge is test instrumentation, not a supported public status indicator.
It intentionally exposes no ticket search, session, email, token, payload, or
staff identity.

## Bounded browser telemetry

The latest summary is available to a tester at:

```js
window.__LOTTO_REALTIME_CANARY__
```

Every change also dispatches a `lotto:realtime-canary` `CustomEvent`. The value
contains only connection/comparison status, hub revision and checksums, message
and reconnect counts, delivery/convergence timings, and an update timestamp.
It is in-memory only and is not posted to Vercel, Neon, Cloudflare, or an
analytics provider by this slice.

## Beta configuration

Keep all values server-only; none uses a `NEXT_PUBLIC_` prefix:

```text
LOTTO_DEPLOYMENT_ENVIRONMENT=beta
LOTTO_REALTIME_CLIENT_CANARY=true
LOTTO_REALTIME_HUB_URL=https://lotto-realtime-beta.et2-geiger.workers.dev
LOTTO_REALTIME_EXPECTED_HUB_HOST=lotto-realtime-beta.et2-geiger.workers.dev
LOTTO_REALTIME_AGENCY_ID=william-temple-house
```

Enabling the browser observer does not require or expose
`LOTTO_REALTIME_PUBLISH_TOKEN`. Shadow publication must already be healthy so
the Durable Object has a current projection, but its switch remains independent.

## Validation runbook

1. Confirm the beta Admin realtime diagnostic reports the newest outbox row as
   accepted and the hub snapshot has the same revision/checksum.
2. Open one ordinary control tab without a query parameter and one observer tab
   with `?realtime=observe`. Only the observer tab should show the badge and
   create a Worker WebSocket.
3. Open Home and Display observer tabs. Confirm each reaches `connected` and
   then `Neon match`; inspect the in-memory telemetry value.
4. Perform a reversible authenticated staff action. Record the time from the
   Neon commit to the WebSocket message and from that message to polling
   convergence. The badge may briefly show `Hub ahead`; it must settle at
   `Neon match` without the pushed copy changing visible queue state.
5. Repeat with serving next/previous, Returned/Unclaimed/revert, undo/redo,
   restore, reset, hours, rotation, display URL, and announcement changes.
6. Background and foreground each observer tab. Confirm the hidden socket
   closes and exactly one socket reconnects on visibility.
7. Interrupt and restore the network. Confirm delays are bounded, no sockets
   overlap, and polling continues to keep the display current throughout.
8. Send a malformed or bad-checksum frame in deterministic tests; the live
   public endpoint is subscribe-only and is not used to inject arbitrary test
   payloads.
9. Run the production build, legacy bundle scan, production hydration smoke,
   iOS 15.4 simulator check, and physical iPad mini 4 check before advancing
   beyond internal beta observation.

## Automated coverage

Run:

```bash
npx vitest run tests/realtime-client-canary-config.test.ts \
  tests/realtime-canary-observer.test.tsx \
  tests/public-display-page.test.tsx \
  tests/security-csp.test.ts
```

Coverage includes beta/host/CSP configuration boundaries, explicit URL cohort
selection, valid equality, tamper rejection, zero observer fetches, single
socket reuse, visibility pause/resume, the five-attempt retry ceiling, and
Display configuration forwarding.

## First live beta observation

The first production-shaped browser observation completed on the isolated beta
stack on September 1, 2026:

- the ordinary `/display` control did not create an observer, while
  `/display?realtime=observe` connected and matched the polled revision-15
  projection;
- the first stored snapshot correctly reported no delivery latency because it
  was not a live broadcast;
- saving the existing beta display URL to itself committed a harmless Neon
  revision `16`, which the open socket received as a live broadcast in `127 ms`;
- the observer first reported `Hub ahead; polling unchanged`, then matched the
  refreshed `/api/state` projection in `1,221 ms` without rendering the pushed
  copy;
- the first-match convergence value remained exactly `1,221 ms` through two
  later refreshes, proving it is a fixed measurement rather than a growing
  snapshot-age counter;
- the socket received two valid frames with zero reconnects; and
- `/admin/realtime` reported revision `16` as `accepted` on attempt `1`.

The convergence refresh was triggered through the same visible-document path
used when a tab returns to the foreground so the proof did not need to wait for
the adaptive poll ceiling. Temporary in-page event sampling was removed after
the run. This is one successful checkpoint, not a completed Phase 4 canary.

## Current limitations and Phase 4 gates

- Only Home and Display are connected. Inventory celebration and Arcade banner
  observation remain later Phase 4 work.
- `/api/state` returns the state payload but not the authoritative Neon revision.
  This slice therefore records the hub revision and proves payload equality by
  checksum; exact polled-revision comparison remains an exit gate.
- No pushed state is rendered, and polling is never stopped. This slice cannot
  reduce Neon compute or Vercel requests; it exists to establish correctness
  before Phase 5 changes either behavior.
- There is no application heartbeat. Silent half-open behavior, Durable Object
  hibernation evidence, sustained memory use, and physical legacy-device
  recovery still require production-shaped measurement.
- The kill switch is deployment configuration. The observer is also removable
  per browser immediately by dropping `?realtime=observe`; runtime capability
  negotiation remains a later hardening decision.

## Rollback

Set `LOTTO_REALTIME_CLIENT_CANARY=false` in the isolated beta project and
redeploy. The server stops issuing browser configuration and removes the Worker
origin from `connect-src`; every public surface continues on its unchanged
adaptive polling path. Shadow publication may remain enabled for server-side
comparison or be disabled independently. No schema, database state, or public
client migration must be reversed.
