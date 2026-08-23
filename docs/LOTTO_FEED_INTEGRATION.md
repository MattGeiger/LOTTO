# LOTTO → FEED Queue Timing

**Contract:** v1
**LOTTO release:** v1.21.0
**FEED release:** v1.6.0

## Responsibility boundary

LOTTO owns observed queue facts. FEED owns quality classification and Analytics.
Reset never asks staff whether a session was service or testing; it writes an
immutable closeout and clears the live queue. FEED synchronizes every closeout,
advances its cursor, and withholds anomalous sessions until staff review them.

Queue tickets are operational timing observations. They are never interpreted
as visits, households, clients, or people served.

## Captured evidence

The first transition that adds a ticket to `generatedOrder` records its
`issuedAt`. The first call records a separate, write-once `firstCalledAt`;
recalls may still update the client-facing call timestamp without changing the
wait observation. LOTTO also retains batch sequence and mechanism (`full`,
`batch`, or `append`), the mode used for that batch, whether the session ever
changed from Random to Sequential, and the operating window effective when the
session began.

The integration payload replaces physical ticket numbers with anonymous
one-based observation sequences. It contains no client or staff identity.

## Durable closeout

**Reset for New Day** is the closeout boundary. Empty state creates no summary.
For meaningful state:

- Neon inserts the immutable summary, writes the reset snapshot, and replaces
  the singleton state in one transaction;
- file storage writes `data/queue-summaries/<summaryId>.json` before clearing
  state; and
- snapshot cleanup never touches queue summaries.

Each closeout has a stable `sessionId`, increasing revision, predecessor id,
and deterministic content hash. Re-closing unchanged restored state is a no-op;
changing it produces a new immutable revision.

## Read-only API

```text
GET /api/integrations/feed/v1/daily-summaries
Authorization: Bearer <LOTTO_FEED_INTEGRATION_TOKEN>
```

Optional parameters are `from`, `to`, `cursor`, and `limit` (default 100,
maximum 500). Delivery order is `(recordedAt, summaryId)`, not service date, so
a late revision for an old day cannot be skipped. A non-empty page returns a
new opaque `nextCursor`; `hasMore` tells FEED whether another page is already
available. An empty page returns `nextCursor: null`, and FEED retains its last
stored cursor.

Responses use `Cache-Control: no-store`. Missing server configuration fails
closed with 503; missing or invalid credentials return 401.

## Deployment

1. Apply `schema.sql` to Neon.
2. A deployment administrator generates a dedicated token with
   `openssl rand -base64 48`.
3. The deployment administrator stores it as `LOTTO_FEED_INTEGRATION_TOKEN` in
   LOTTO's Vercel environment and redeploys LOTTO.
4. The same administrator, or another administrator receiving the secret
   through the organization's password manager, enters the LOTTO base URL and
   token once in FEED's connection dialog.
5. Have a staff user choose **Sync now** and confirm the run is idempotent.

Changing FEED's configured connection resets its local cursor deliberately so
the source can be reconciled from the beginning. Source ids and content hashes
make the replay safe.

Ordinary staff never obtain or handle this token. After the one-time
administrator pairing, FEED stores it encrypted and staff only use **Sync
now**. Rotate the credential by replacing the Vercel value, redeploying LOTTO,
and saving the new value in FEED; never send it through email or chat.

## Local full-stack validation

The integration token is a machine credential, so LOTTO deliberately has no UI
for creating or displaying it. It must remain server-side and must never be
exposed through `NEXT_PUBLIC_*` configuration or a browser response.

With LOTTO on port 3000 and FEED on ports 5173/3001:

1. Generate a local token with `openssl rand -base64 48`, add it to LOTTO's
   `.env.local` as `LOTTO_FEED_INTEGRATION_TOKEN`, and restart LOTTO.
2. From `packages/backend` in FEED, run `npx prisma migrate deploy`, then start
   or restart the FEED backend.
3. Verify LOTTO's endpoint without credentials. It should now return 401, not
   the 503 used when server configuration is missing.
4. Sign into FEED as an administrator. In **Information → Data → LOTTO Queue
   Data**, choose **Configure**, enter `http://localhost:3000`, paste the same
   token, and save the connection.
5. Create and reset a LOTTO queue if no closeout exists yet. The API exposes
   immutable resets, not the current live queue.
6. In FEED, choose **Sync now**. The new session should appear as either
   **Include as service** or **Needs review**. Run **Sync now** again to confirm
   the replay is a no-op.

An authenticated command-line check can use the same local environment without
printing the token:

```bash
set -a
source .env.local
set +a
curl -i \
  -H "Authorization: Bearer $LOTTO_FEED_INTEGRATION_TOKEN" \
  http://localhost:3000/api/integrations/feed/v1/daily-summaries
```
