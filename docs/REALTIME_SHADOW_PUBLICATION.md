# Realtime shadow-publication contract

## Status

This document defines the first Phase 3 implementation slice for LOTTO's
provisional v2.0 realtime architecture. It is additive, beta-only, and
disabled by default. Neon remains authoritative and every public surface keeps
using the existing `/api/state` polling path.

Shadow publication copies a committed, allowlisted public projection into the
isolated Cloudflare Durable Object. No browser trusts or renders that copy yet.

The additive schema was applied to the isolated `neon-copper-queen` beta
database on September 1, 2026. A metadata query confirmed the revision column,
outbox table, and four expected table indexes; the outbox contained zero rows.
The integrating code is deployed to the isolated beta Vercel project. Its
rotated publish credential exists only in the beta Cloudflare and Vercel secret
stores, and shadow publication is enabled only in the beta Production
environment. Production LOTTO and `main` remain unchanged.

## Transaction boundary

Every database-backed queue mutation already converges on the database state
manager's `persist()` transaction. That transaction will atomically:

1. write the ordinary snapshot and any immutable queue closeout;
2. write the complete authoritative `raffle_state.payload`;
3. increment `raffle_state.revision` exactly once;
4. mark an older undelivered public-state intent as superseded; and
5. insert the new checksummed public projection as a pending outbox row.

The new revision is allocated by Postgres inside the same upsert that writes
state. It is never calculated from a separate application read. Concurrent
writes therefore serialize through the singleton state row and cannot allocate
the same revision.

Cloudflare publication happens only after that transaction returns. There is
no distributed transaction and no claim of exactly-once delivery.

## Additive schema

`raffle_state` gains:

| Column | Contract |
| --- | --- |
| `revision BIGINT NOT NULL DEFAULT 0` | Authoritative monotonic public-state revision; existing rows begin at zero and the first subsequent persist allocates one |

`raffle_public_state_publications` stores bounded publication evidence:

| Column | Contract |
| --- | --- |
| `publication_id TEXT PRIMARY KEY` | Application-generated UUID and idempotency identity |
| `revision BIGINT UNIQUE NOT NULL` | Authoritative state revision |
| `protocol_version INTEGER NOT NULL` | Public protocol version used to serialize the row |
| `checksum TEXT NOT NULL` | SHA-256 of the canonical public projection |
| `payload JSONB NOT NULL` | Allowlisted `PublicRaffleState`, never complete internal state |
| `status TEXT NOT NULL` | `pending`, `accepted`, `failed`, or `superseded` |
| `attempt_count INTEGER NOT NULL` | Number of bounded post-commit attempts |
| `committed_at TIMESTAMPTZ NOT NULL` | Database commit timestamp associated with the revision |
| `last_attempt_at TIMESTAMPTZ` | Most recent publication attempt |
| `accepted_at TIMESTAMPTZ` | Hub acceptance timestamp |
| `last_error TEXT` | Bounded, non-sensitive failure summary |
| `created_at`, `updated_at` | Operational evidence timestamps |

Indexes support newest-revision and pending-status diagnostics. The table does
not contain staff identity, authentication data, ticket searches, queue-session
evidence, secrets, or complete snapshots.

## Runtime controls

All settings are server-only and must never use a `NEXT_PUBLIC_` prefix.

| Variable | Default | Requirement |
| --- | --- | --- |
| `LOTTO_REALTIME_SHADOW_PUBLISH` | `false` | Must be exactly `true` to activate; any other nonempty value is rejected |
| `LOTTO_REALTIME_HUB_URL` | unset | HTTPS origin of the isolated beta Worker |
| `LOTTO_REALTIME_EXPECTED_HUB_HOST` | `lotto-realtime-beta.et2-geiger.workers.dev` | Exact remote-host safety boundary |
| `LOTTO_REALTIME_AGENCY_ID` | unset | Protocol-valid opaque agency identifier |
| `LOTTO_REALTIME_PUBLISH_TOKEN` | unset | Cloudflare-stored bearer secret mirrored only into beta Vercel |
| `LOTTO_REALTIME_PUBLISH_TIMEOUT_MS` | `1500` | Per-attempt deadline, bounded from 100–5,000 ms |

Activation additionally requires
`LOTTO_DEPLOYMENT_ENVIRONMENT=beta`. Enabling shadow publication in another
environment fails closed. Localhost HTTP is permitted only for local Worker
development; remote targets require HTTPS and exact hostname agreement.

The first beta configuration uses agency ID `william-temple-house`. Production
publication remains disabled and requires a later, explicit rollout decision.

## Post-commit attempt

After a successful Neon transaction, the server builds protocol v1 from the
outbox evidence and sends one bounded `POST` to:

```text
{LOTTO_REALTIME_HUB_URL}/v1/agencies/{LOTTO_REALTIME_AGENCY_ID}/publish
```

The request contains the bearer token only in the server-to-server
`Authorization` header. The token, full payload, and staff/session data are not
logged.

Hub responses `200` (idempotent duplicate) and `202` (new revision accepted)
mark the outbox row accepted. Authentication, validation, conflict, timeout,
network, and overload failures mark it failed with a bounded summary. Failure
to update the evidence row after a successful publish leaves it pending; a
later identical repair remains safe because the hub is idempotent.

## Staff-action guarantee

A Cloudflare failure must never turn a committed staff action into an error.
The API continues returning the committed Neon state when:

- DNS or network resolution fails;
- the attempt reaches its timeout;
- Cloudflare returns an error or limit response;
- the hub rejects the revision;
- the evidence-status update fails after the network attempt; or
- the shadow feature is disabled between deployments.

The failure is recorded and logged only as a bounded operational warning. No
automatic unbounded retry loop, visitor repair request, cron heartbeat, or
database subscriber is introduced.

## Supersession and repair

Full-state projection means a newer committed revision safely supersedes any
older pending or failed revision. The transaction marks those older rows
`superseded` before inserting the new pending row. This prevents a backlog from
requiring one network request per historical change.

If the newest row fails and no later staff action occurs, an explicit bounded
Admin repair operation will retry only that newest row with its original
publication ID, revision, checksum, and commit timestamp. The first
implementation may expose repair as an internal tested method before adding an
Admin diagnostic surface. No public client may initiate repair.

## Cost envelope

When disabled, the feature adds no Cloudflare request and no outbox row. The
authoritative revision still advances with a normal state write.

When enabled, each committed mutation adds at most:

- one outbox insert inside the existing Neon transaction;
- one bounded Vercel-to-Cloudflare request; and
- one best-effort outbox status update.

It adds no public-origin request and does not change current polling frequency.
Phase 4 comparison must prove revision/checksum agreement before any public
client applies realtime state.

## First production-shaped beta validation

The initial September 1, 2026 activation used two controlled deployments from
commit `d87d340`:

1. With `LOTTO_REALTIME_SHADOW_PUBLISH=false`, an authenticated same-value
   display-URL save advanced authoritative Neon revision `1` to `2` while the
   outbox remained empty. This confirmed that installing the other runtime
   settings does not activate publication or change the staff write path.
2. With the flag set to `true`, the same bounded action advanced Neon to
   revision `3`, created publication revision `3`, and recorded status
   `accepted` after one attempt with no error.
3. The Durable Object public snapshot returned revision `3` and the exact same
   checksum as Neon:
   `sha256:74c9beaa1b3ca3000be451ddf28f5c540f416f5ef9db16d8d19f01af9e516373`.
4. The ordinary beta `/api/state` endpoint and authenticated Admin persistence
   indicator remained healthy throughout both deployments.

This proves one complete Neon-to-Durable-Object shadow-publication path under
production-like beta hosting. It does not complete Phase 3: the full mutation
matrix, undo/redo/restore/reset cases, injected Cloudflare failures, explicit
repair, WebSocket observation from application clients, and legacy-device
validation remain open. Public clients still poll Neon through `/api/state`.

## Rollout sequence

1. Apply the idempotent additive schema to the isolated beta Neon database.
2. Deploy code with `LOTTO_REALTIME_SHADOW_PUBLISH=false`.
3. Verify ordinary authenticated mutations and polling are unchanged.
4. Rotate one publish token and place it only in the beta Cloudflare and Vercel
   secret stores.
5. Configure the beta Worker URL, exact expected hostname, and agency ID.
6. Enable shadow publication only in the beta environment.
7. Exercise every mutation, undo, redo, restore, and reset path.
8. Compare the newest Neon outbox revision/checksum with the Durable Object
   snapshot after every action and injected failure.
9. Disable the flag and confirm the existing application continues normally.

No schema or secret is applied to production as part of this beta rollout.
