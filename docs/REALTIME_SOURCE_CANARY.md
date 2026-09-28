# Realtime source canary

## Status

The current source implementation uses Cloudflare for bootstrap, WebSocket
updates, and snapshot recovery. Source mode never automatically requests
`/api/state`. Neon remains authoritative for staff writes. See
[Idle recovery implementation](REALTIME_IDLE_RECOVERY_PLAN.md) for release gates.
Historical dated observations below describe earlier releases.

## Independent gates

All deployment gates are required:

1. `LOTTO_REALTIME_SOURCE_CANARY=true` in a deployment explicitly marked
   `LOTTO_DEPLOYMENT_ENVIRONMENT=beta` or `production`.
2. `LOTTO_REALTIME_APPLICATION_ENABLED=true`.
3. A valid exact Worker origin and agency configuration.

The server-only master gate `LOTTO_REALTIME_APPLICATION_ENABLED=false`
overrides the source flag for newly loaded pages. It is backward-compatible
with the already-deployed beta when absent, but production-scoped v2
deployments must set it explicitly. Changing the Vercel value requires a
redeployment; it is not a client-visible runtime variable.

An ordinary URL now selects the source controller automatically. The explicit
query modes are:

- `?realtime=poll` — polling only; no observer or source socket is opened;
- `?realtime=observe` — the Phase 4 diagnostic observer while rendered state
  remains poll-authoritative; and
- `?realtime=source` — a compatibility alias for the new ordinary default.

An unknown `realtime` value fails closed to polling. The source flag is
independent from shadow publication and the Phase 4 observer flag, so rollback
does not require changing either system.

## Authority state machine

One transport controller owns the socket, HTTP snapshot requests, and timers.
It immediately reads the Cloudflare snapshot and opens the socket. Valid agency,
protocol, and checksum are required; full newer snapshots may bridge revision
gaps. Equal-revision checksum conflicts and stale responses cannot replace state.

On failure, retain state and reconnect with exponential backoff and jitter.
After 120 seconds of continuous failure, start Cloudflare HTTP fallback. A
socket opening alone does not reset the grace period; a valid snapshot handshake
does. HTTP reads run at 15 seconds during service/pre-open, backing off toward
300 seconds when closed or failing. Positive jitter spreads requests. The
rolling hourly caps are 240 snapshot starts and 120 socket starts per controller.
Requests time out after 10 seconds, with at most one HTTP request in flight.

Every 25 seconds a live socket sends an application heartbeat; no reply within
10 seconds starts recovery. The Worker replies automatically without waking a
hibernating object. A heartbeat is transport evidence, not publication evidence.
After two minutes, unavailable HTTP and socket delivery show the translated
`errorLoadingState` notice while retaining the last queue. The age of an unchanged
queue revision is not an outage signal. Debug telemetry records last contact,
failure start, HTTP requests, close code, persistent failure, and revision.

Hidden and offline documents pause network work. Foreground/online resumes with
a Cloudflare snapshot and socket. Startup intentionally ignores stale
`navigator.onLine` hints on iOS 15; actual offline events still pause transport.
Callbacks can change with language without restarting the controller.

## Consumer boundary

Home and Display apply the full allowlisted public projection to their existing
`ReadOnlyDisplay` state. Inventory applies it through the ticket-celebration
state owner. Arcade applies it through the existing Now Serving banner state
owner. No page opens a second poll loop or a second socket.

The realtime projection intentionally omits internal `queueSession` evidence.
Public consumers never use that field; conversion back to the public rendering
shape preserves the previously polled value when present.

## Test gates

Deterministic coverage must prove zero automatic `/api/state` requests through
bootstrap, disconnect, language changes, foregrounding, missed heartbeat,
invalid state, long outages, and recovery. It must also cover full revision gaps,
conflicts, late-response races, request budgets, timer cleanup, all consumers,
and retained explicit polling/observer controls. A failed publication must
recover without another staff edit; see the publication outbox contract.

Before a live beta run, run the focused tests, complete suite, production build,
legacy bundle scan, production hydration smoke, and iOS 15.4 simulator check.
The real iPad mini 4 remains a release gate.

## Live validation and exit gate

The default-source beta URLs are:

```text
https://beta.williamtemple.app/
https://beta.williamtemple.app/display
https://beta.williamtemple.app/inventory
https://beta.williamtemple.app/arcade
```

Append `?realtime=poll` for the side-by-side polling control. The older
`?realtime=source` test URLs remain valid during RC.2.

Live validation must record source delivery latency, request counts during a
healthy window, recovery time for each deliberate failure, revision/checksum
agreement after recovery, and any stale-state incident. Phase 5 exits only
after at least ten representative service days, all fault drills recover, no
staff write depends on Cloudflare, and healthy source clients generate no
scheduled `/api/state` polling.

## RC.2 default-source beta validation

On September 3, 2026, Vercel deployment
`48MNHWZZ2Qg9yjdCBesNASrp3nPx` served commit `df180f0` at the stable beta
origin with the application gate enabled.

- Ordinary Home, Display, Inventory, and Arcade URLs connected without a
  query parameter and reported `Realtime source · live · r91`.
- `?realtime=poll` opened no source controller, while
  `?realtime=observe` connected at hub/poll revision `91` and reported an exact
  Neon match. `?realtime=source` remained a working alias.
- Cloudflare Worker version `5f9eb992-c0b3-43bb-a9a3-30db66dc1741` drained the
  William Temple House beta object and refused a fresh Display connection. The
  client showed `Polling fallback · connection closed` and continued the
  adaptive poll path. Resuming the object returned the same page automatically
  to `Realtime source · live · r91`.
- The parameter-free Display route hydrated and reached the same live revision
  in Safari on the iOS 15.4 iPad mini 4 simulator.

The separately deployed Vercel application gate is covered by configuration,
mount, full-suite, and production-build tests. It was not live-toggled during
this run because doing so requires a disable deployment and a second restore
deployment; the Cloudflare transport drain provided the live hosted failure
exercise. The physical iPad, provider-wide cost observation, and extended
service-day run remain deliberately deferred and are not represented by this
checkpoint.

## First live Phase 5 beta observation

The first production-shaped source observation ran on the isolated beta stack
on September 2, 2026. Deployment `BxpWgibZn6KM5rzotPXZvZWAAMQT` enabled the
independent source flag, and only exact `?realtime=source` URLs opted in.

- Home, Display, Inventory, and Arcade each completed the authoritative
  Neon/hub handshake at revision `83`.
- Saving the existing beta display URL to itself committed a harmless revision
  `84`; all four source clients advanced to `live · r84` without waiting for
  their scheduled poll.
- A 40-second healthy Display observation exceeded its 30-second burst-poll
  cadence and recorded zero network requests of any kind, including zero
  `/api/state` reads, while the source stayed live at revision `84`.
- Isolating that Display tab from the network changed the badge to
  `Polling fallback · offline` and initiated exactly one immediate
  `/api/state` read, which failed as expected while offline. Restoring the tab's
  network initiated exactly one recovery read and returned the source to
  `live · r84`. The emulated condition was removed after the drill.
- The iOS 15.4 iPad mini 4 simulator initially exposed a compatibility defect:
  the source remained at `starting` because WebKit reported a stale
  `navigator.onLine === false`, even though the same page polled successfully
  and the Phase 4 observer WebSocket connected at revision `84`. Commit
  `c447696` stopped treating that hint as initial authority; deployment
  `6NEuSQiJcXT3u7hcHsDQSioUcH9s` then reached `live · r84`, returned to that
  exact state after Safari was backgrounded behind Settings and foregrounded,
  and received the next harmless revision `85` while still live.

This checkpoint proves the rendered-source path, healthy polling suppression,
network-event fallback, and iOS 15.4 simulator compatibility. It does not close
Phase 5. Ten representative service days, physical iPad mini 4 validation,
provider-level Cloudflare/Vercel/Neon fault drills, and sustained platform
usage/cost measurements remain required.

The owner subsequently deferred the ten-service-day, provider-wide, and
physical-iPad exercises at the current single-pantry scale. They remain useful
stable-release evidence but are not prerequisites for the controlled
production test; see the scaled validation decision in the architecture plan.

## Rollback

For one browser, append `?realtime=poll`. For all newly loaded pages, set
`LOTTO_REALTIME_APPLICATION_ENABLED=false` (or the legacy source flag to
`false`) and redeploy. To move already-connected pages immediately, invoke the
separately authenticated Cloudflare `{ "mode": "drain" }` control with
`npm run realtime:control`. The Durable Object closes current sockets and
rejects new ones while continuing to accept publications. New source clients switch to Cloudflare HTTP fallback after the grace
period; draining alone does not re-enable database polling. To restore database
polling, reload with the explicit polling override or the disabled-source deployment. No schema, stored state, staff workflow, or publication setting is
reversed.

### Deployment environments eligible for realtime

`LOTTO_DEPLOYMENT_ENVIRONMENT` answers two independent questions, and they were
deliberately separated in v2.0.0-rc.3:

- **May this deployment use the realtime hub?** `beta` or `production`.
- **Is this the beta sandbox?** `beta` only. This alone drives the "Beta test
  environment" banner, the blocking `robots.txt`, and the `X-Robots-Tag` header.

Before rc.3 a single value answered both, so production could not enable
realtime without also de-indexing the live site and telling every client their
actions did not affect the real app.

The gate is still fail-closed, which was the point of the original beta-only
restriction. Only those two exact values qualify: unset, empty, or near-miss
values such as `prod`, `Production`, or `staging` refuse realtime rather than
assuming it is welcome. Being merely "not beta" is never sufficient. See
`src/lib/deployment-environment.ts` and `tests/beta-deployment-safety.test.tsx`.
