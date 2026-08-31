# LOTTO realtime public-state hub

This Worker is the isolated Phase 1/2 proof for LOTTO's provisional v2.0
architecture. It uses one SQLite-backed Durable Object per agency to retain the
latest allowlisted public state and push revisioned updates to subscribed
browsers through the WebSocket Hibernation API.

It is not yet the production read path. Neon remains authoritative and the
existing `/api/state` polling path remains unchanged.

## Local development

1. Copy `.dev.vars.example` to `.dev.vars` and replace the placeholder token.
2. Run `npm run realtime:dev` from the repository root.
3. Verify `http://localhost:8787/health`.
4. In another terminal, run
   `REALTIME_TEST_PUBLISH_TOKEN=<local-token> npm run realtime:verify`.

Public routes use the agency id `william-temple-house` during the beta proof:

- `GET /v1/agencies/william-temple-house/state`
- `GET /v1/agencies/william-temple-house/events` with a WebSocket upgrade
- `POST /v1/agencies/william-temple-house/publish` with
  `Authorization: Bearer <PUBLISH_TOKEN>`

The publish route accepts only protocol-valid, checksummed envelopes and
rejects stale revisions or same-revision checksum conflicts. Subscribers cannot
write data.

## Deployment safety

Deploy only to the isolated Cloudflare beta account and Worker named
`lotto-realtime-beta`. Set `PUBLISH_TOKEN` with `wrangler secret put`; never add
it to `wrangler.jsonc`, Git, screenshots, logs, or documentation.

Production publication and client feature flags must remain disabled until the
beta exit gates in `docs/V2.0_REALTIME_ARCHITECTURE_PLAN.md` pass.

The verification script writes only to the dedicated
`william-temple-house-e2e` object. Remote beta verification additionally
requires `REALTIME_TEST_ALLOW_REMOTE=beta`, the beta Worker URL in
`REALTIME_TEST_BASE_URL`, and `https://beta.williamtemple.app` in
`REALTIME_TEST_ORIGIN`.
