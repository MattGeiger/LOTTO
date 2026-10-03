# St. Johns Food Share RC.6 and realtime cutover

## Authorized scope and sequence

October 3, 2026: the owner approved updating St. Johns directly in production
because the deployment is not yet used by the organization. A data backup and
preview rehearsal were explicitly waived. Preserve saved settings, branding,
staff access policy and other agencies. WTH already runs RC.6 and its current
deployment is retained. No dependency upgrade or stable-v2 claim is included.

This follows the existing per-agency deployment and staged realtime pattern:

1. Verify the St. Johns Neon schema and apply only missing additive requirements.
2. Deploy the existing RC.6 application with realtime and public snapshots off;
   verify the live version, release notes, branding, public state and staff access.
3. Provision `lotto-realtime-stjohns-production` with its own Durable Object
   namespace, fresh publish/control tokens, and only
   `https://stjohnsfoodshare.app` allowed as a browser origin. Keep the control
   token out of Vercel. Verify the protocol against the synthetic E2E object.
4. Configure only St. Johns' Vercel Production environment with agency
   `stjohns-food-share`. Enable staff publication first, leaving public source
   and snapshot flags off. Establish a valid published revision through the
   normal staff workflow and compare it with the authoritative state.
5. Enable source and snapshot flags together only after publication succeeds.
   Verify live WebSocket delivery, heartbeat, bounded Cloudflare recovery,
   anonymous legacy state reads, and background publication recovery.

## Baseline and rollback

- Vercel team: `team_qomI17X2JbmFUIvPdo19u2gJ`.
- St. Johns project: `prj_l9AVyDAMFCc2U9cKy9jr1WGNpZH6`.
- Domain: `https://stjohnsfoodshare.app`.
- Original RC.3 deployment: `dpl_BBiBDph1ggtkrj5qYjgtPEpqvZXP`.
- Original source: `6134c0aa0ea73649e0ff379e86ec0ef2f0139cd5`.
- RC.6 application source: `7ea12d346fb4c7a8e10f9fcf81ece40731e04178`;
  local documentation baseline: `f806aa595d87777f7e1cdfe4f33842c0a2be793c`.
- WTH reference retained: `dpl_Hn4BnjvZSA1V2HBtxVpDCZoF66bp`.
- St. Johns Neon project: `late-violet-21570715`.

Retain each staged app deployment. If a rollback is requested, promote the
appropriate retained deployment in this St. Johns project; additive database
changes can remain. Realtime controls must target only the St. Johns Worker and
agency. A snapshot-enabled deployment must not silently fall back to queue SQL.

Both projects still track shared `main`, whose current source is RC.3. Direct
production deployments synchronize the live application version; shared-branch
reconciliation is a separate release action and must not accidentally replace
WTH with older code.

## Active St. Johns production configuration

`LOTTO_DEPLOYMENT_ENVIRONMENT=production` and agency
`LOTTO_REALTIME_AGENCY_ID=stjohns-food-share`. Hub URL and expected host target
`lotto-realtime-stjohns-production.et2-geiger.workers.dev`.
`LOTTO_REALTIME_APPLICATION_ENABLED`, `LOTTO_REALTIME_SOURCE_CANARY`,
`LOTTO_REALTIME_SHADOW_PUBLISH`, `LOTTO_PUBLIC_STATE_SNAPSHOT_ENABLED` and
`LOTTO_REALTIME_REPAIR_QUEUE_ENABLED` are all `true` in St. Johns Production.
The fresh publish token is a sensitive Vercel variable; the separate control
token is only in the Worker and the owner's Keychain. No WTH token is reused.

## Verification boundaries

### Schema and Worker verification — October 3

- Baseline RC.6 deployment: `dpl_5UweSqM6psjzHNgXXv1s6SypwbP3`.
  Publication-only deployment: `dpl_7xEWG7eUg3w25Yym3DhRZvZoNoq8`.
- An existing authorized Safari session reached Admin **Persistence confirmed**.
  A display-URL save committed revision 1 and produced a valid snapshot, with
  its checksum independently verified and no `queueSession` field. The test
  exposed a difference between the displayed default URL and the saved blank
  value. Restored the original blank value through Admin at revision 2; a
  baseline comparison then found no changed settings apart from the normal save
  timestamp. A further save retained the blank value at revision 3. App-managed
  history follows the existing workflow; no separate data backup was created.
- Live `/login` displayed RC.6 and its release-notes dialog. Magic Link/OTP
  controls hydrated; manifest identity remained St. Johns. `/robots.txt` permits
  indexing, public language catalog and Spanish `?code=es` pack returned 200,
  and queue-only `/inventory` remained 404.

- Confirmed the St. Johns main branch `br-fancy-waterfall-aums9n9e`, database
  `neondb`, endpoint `ep-weathered-surf-aulagqr4` in the Neon console.
- Existing state lacked `revision`; the publication table was absent. Applied
  the canonical additive revision column, publication table and two explicit
  indexes in one transaction. Post-commit: revision 0, zero publication rows,
  four total indexes including primary/unique constraints.
- State payload MD5 before/after migration:
  `38aff3b4674862d2af47c39a34aa0866`. No payload or schedule edits occurred.
- Eight targeted regression files passed all 71 tests. ESLint passed with the
  existing Browserslist data-age notice. Production audit: 33 findings
  (26 moderate, six high, one critical); dependencies remain unchanged.
- Deployed Worker version `47535603-e135-4c57-8001-f56d60e82695`; installed
  independently generated publish/control secrets, producing active version
  `e94e1395-49c3-4028-9e95-bdd295106a6b`. The control secret is stored
  in macOS Keychain service `LOTTO realtime St Johns production control`, account
  `stjohns-food-share`; it is never installed in Vercel.
- Remote synthetic-object verification passed health, auth, snapshot, WebSocket,
  heartbeat, idempotency, monotonicity, CORS, drain and resume at revision 3.
  The verifier's `william-temple-house-e2e` name is confined to this new Worker;
  it does not access the WTH production namespace or live St. Johns object.

### Live source and recovery verification — October 3

- Source-enabled production deployment: `dpl_AS1awFSfQkakwn6qaktgMYtX1iXc`.
  WTH remained on its recorded deployment. St. Johns CSP permits its own hub.
- The ordinary `/display` page bootstrapped from St. Johns' Cloudflare snapshot
  and received revisions 1 and 2 over its own agency WebSocket. After navigation
  into the source-enabled build, the observed display made no `/api/state`
  requests. Twenty compatible anonymous polling requests independently returned
  HTTP 200 from Cloudflare at revision 2, with no internal `queueSession` data.
- The hosted watchdog for revision 3 ran at `2026-10-03T23:32:16.838Z`, about
  31 seconds after the staff save. It logged `attempted: false` because direct
  publication had already succeeded. Vercel Queues showed three messages queued,
  received and deleted, with zero redeliveries across the three staff saves.
- Revision 3 was accepted in one publication attempt; the final database
  comparison again found no changed saved values except the save timestamp.
- A live St. Johns-only drain closed one display socket. The page kept its last
  state through the 120-second reconnect grace, then read the Cloudflare snapshot
  and advanced to revision 3 without any `/api/state` request. The Worker was
  resumed after this bounded drill; the reconnecting display received a
  `lotto:pong:v1` heartbeat. The measured close-to-snapshot interval was
  120.002 seconds.
- Spanish rendered correctly after changing the display language; restored the
  test tab to English. The Worker returned 200 with the St. Johns CORS origin,
  rejected the WTH origin with 403, returned 404 for the WTH agency object, and
  rejected an invalid control token with 401.
- All three Vercel production builds passed build/type checks. The known build
  tracing warnings remain. A scan of 35 publicly discoverable served JavaScript
  chunks found no known legacy-unsafe patterns; this is not a full Admin bundle
  scan or physical-device proof. No client dependency was changed.

Modern Chromium smoke does not prove iPadOS 15 compatibility. No physical iPad
test, service-day acceptance or 48–72 hour compute-savings observation has yet
been performed for this cutover. Do not claim zero Neon use from zero display
state-API requests or snapshot headers alone.

Live UI evidence: [RC.6 release notes](screenshots/stjohns-rc6-release.png) and
[St. Johns display](screenshots/stjohns-rc6-display.png). These captures show the
production branding and existing closed-day schedule, not physical-device tests.
