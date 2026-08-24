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
Authorization: Bearer <synchronization token>
```

Optional parameters are `from`, `to`, `cursor`, and `limit` (default 100,
maximum 500). Delivery order is `(recordedAt, summaryId)`, not service date, so
a late revision for an old day cannot be skipped. A non-empty page returns a
new opaque `nextCursor`; `hasMore` tells FEED whether another page is already
available. An empty page returns `nextCursor: null`, and FEED retains its last
stored cursor.

Responses use `Cache-Control: no-store`. Missing server configuration fails
closed with 503; missing or invalid credentials return 401 with a stable error
code and no credential details.

## Deployment

1. Apply the current `schema.sql` to Neon. It creates the singleton
   `feed_integration_credentials` row shape.
2. Sign in to LOTTO and open **Admin → History → Sync With FEED → Setup**.
3. Select **Generate token**. LOTTO creates a URL-safe 384-bit value, displays
   it once, and stores only its SHA-256 hash.
4. Copy the displayed LOTTO URL and token into FEED's administrator-only LOTTO
   connection dialog.
5. Have a staff user choose **Sync now** and confirm the run is idempotent.

Only one token exists at a time. **Generate new token** atomically replaces the
stored hash and immediately invalidates FEED's previous value. FEED then shows
an actionable rejection without displaying any token details. Saving the new
token against the same LOTTO URL preserves FEED's cursor; changing the LOTTO
URL resets the source-specific cursor and replays that source's available
window.

`LOTTO_FEED_INTEGRATION_TOKEN` remains a migration fallback only when the
database contains no token. The first in-app generation takes precedence and
becomes the sole valid credential; remove the legacy Vercel value afterwards.
The old manual command remains useful only for that fallback:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

## Local full-stack validation

The integration token is a machine credential. LOTTO returns its plaintext only
once, in response to the authenticated administrator generation action. It must
never enter `NEXT_PUBLIC_*` configuration, logs, documentation, or ordinary
chat. Later verification uses only the stored hash.

With LOTTO on port 3000 and FEED on ports 5173/3001:

1. Open LOTTO's History card, select **Setup** under **Sync With FEED**, and
   generate a local token. The local file fallback writes only its hash under
   `data/`.
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

Use FEED's **Sync now** for the authenticated check so the one-time plaintext
does not have to be copied into a shell or environment file.
