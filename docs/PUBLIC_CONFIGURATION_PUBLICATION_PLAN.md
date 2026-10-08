# Public configuration publication — RC.7

## Scope and authorization

The owner approved implementation on October 7, 2026. Keep Neon as the
authoritative staff datastore. Expand the existing Cloudflare public-read
boundary to appearance, enabled/ready languages and translation-pack inputs.
The operational rollout is WTH-only; preserve St. Johns, personal source
ownership, FEED's public access, saved operating settings and the 120-second
queue reconnect grace. Existing local documentation edits remain intact.

## Contract

- Add an independently gated `LOTTO_PUBLIC_CONFIGURATION_SNAPSHOT_ENABLED`
  server setting. With the gate off, retain the existing shared-cache path.
- Publish a validated, release-scoped, checksummed public document into the
  agency's existing Durable Object. It contains only the active appearance,
  enabled language names, completed public translation text and the current
  enabled announcement. Omit drafts, AI metadata, costs, credentials, historical
  announcements and staff records. Derive packs/catalogs in the app using its
  compiled strings, without a database connection.
- Existing page/layout/metadata/manifest consumers and public language/pack
  endpoints read that document. Invalid, missing or unavailable documents never
  cause SQL fallback. Branding retains its existing compiled fallback; language
  endpoints report temporary unavailability.
- Reserve a monotonic generation before reading authoritative data. Reject
  superseded publications; atomically replace the document. Chunk storage
  values below Durable Object value limits. Keep release activation explicit so
  an old deployment cannot republish its compiled configuration over a new one.
- Existing successful-write wrappers publish after branding, language,
  translation and announcement/restore/undo/redo changes. Publication failure
  must not turn an already committed staff write into an apparent failure.
  Enqueue bounded recovery only on failure; successful or superseded work has
  no recurring job. Recovery checks publication progress before reading SQL.
  Group translation preparation/retry writes into one publication per staff
  operation rather than multiplying publications per staged row. Staff content
  discovery must use committed branding even if public publication is delayed.
- Provide an authenticated maintenance endpoint to seed/republish explicitly.
  Seed and verify the WTH document before enabling its read gate. Publication
  follows the rollout gate; maintenance can seed while the gate remains off.
- Remove language initialization from reads. Merge compiled catalog defaults
  with persisted choices without writes. Staff language updates seed missing
  rows in one bulk insert while preserving existing enablement.

## Verification

Test cold/missing/failed snapshot reads with database mocks that fail on access;
exercise branding, catalogs, packs, active announcements, legacy routes,
cross-agency/release/checksum rejection, write failures, subsequent staff
updates, superseded generations and bounded repair. Verify pure language reads
perform one SELECT and no INSERT, and explicit seeding remains idempotent.
Run relevant tests, full suite, lint, Worker type/dry-run checks, app build and
legacy bundle/smoke gates. Compare client chunk hashes where feasible; no
client dependency changes are in scope.

Release metadata must agree across package/root lockfile, changelog and in-app
notes. Update the read audit, operational runbook and relevant staff guide.
Record deployment/bootstrap/live verification separately from local tests.
Do not claim dollar savings from warm-cache tests: compare matching daily and
overnight Neon windows for 48–72 hours after WTH activation, excluding deliberate
staff and diagnostic traffic. Vercel's selective cache-miss mechanism remains
under investigation in support case CSE_01zfXCRUacYJiBxZ.
