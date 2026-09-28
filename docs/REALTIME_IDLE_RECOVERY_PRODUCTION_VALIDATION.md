# Idle realtime recovery — WTH production validation

Date: September 28, 2026. WTH had no service; the owner explicitly authorized
live production testing. This extends the local evidence in
[the implementation plan](REALTIME_IDLE_RECOVERY_PLAN.md).

## Deployed scope

- Implementation commit: `c623b90` on local `dev`.
- Vercel project: `wthlotto` (`prj_zNP9ZGxuCuG6OhXgtyCwth1KTzdm`).
- Production application: `dpl_BD6FVTyqx5nFmtYwLVhgdUX3jgyF`,
  `https://wthlotto-ixofyv76o-matthew-geigers-projects-73851078.vercel.app`.
  Built with production environment using `--prod --skip-domain`, then promoted
  to `https://williamtemple.app`. Inspection of that domain resolves to this
  Ready deployment. Package version remains `2.0.0-rc.4`.
- Production Worker: `lotto-realtime-production`, version
  `91e631db-de91-43f9-af1f-262ad36af44f`, deployed before the application.
- Previous app retained as recovery target: `dpl_AspuS8amVR2R9U2Bg5w4gjFyoE15`,
  `https://wthlotto-3r19lh7w8-matthew-geigers-projects-73851078.vercel.app`.
- No St. Johns deployment, environment secret, dependency upgrade, or Git push.

## Production browser test

The test ran against the real production domain in the Mac's Codex in-app
Chromium browser. This is separate from the earlier Chrome Guest/local-build
test. Browser resource timing and a page-local fetch/socket instrument recorded
requests; instrumentation affected only the test tab. No agency connection was
drained and no global network rule was installed.

| Check | Observed result |
| --- | --- |
| New Display bootstrap | Revision 988 from Cloudflare; one snapshot; zero `/api/state` requests. |
| Explicit offline/online lifecycle | One additional Cloudflare snapshot and reconnect; zero `/api/state` requests. |
| Sustained socket outage | Closed the captured test socket and blocked new socket construction in that tab. Failure started 19:41:37.791 UTC. No fallback HTTP request through 115.9 seconds. |
| Two-minute fallback | Cloudflare HTTP request started 19:43:37.794 UTC, **120.003 seconds** after failure. Applied revision 989 at 19:43:37.949 UTC. Zero `/api/state` requests. |
| Automatic recovery | Removed the page-local constructor fault; normal retry restored WebSocket authority at 19:43:53.040 UTC without a reload. Failure state cleared. |
| Staff update after recovery | Same-value staff save started 19:44:22.129 UTC; revision 990 reached the socket at 19:44:22.852 UTC (**723 ms**, before the mutation response completed). |
| Heartbeat | `lotto:pong:v1` received from the production Worker; live authority retained. |
| Repeated brief disconnects | Two additional forced closes recovered through normal reconnects. Snapshot count stayed at three and `/api/state` count stayed at zero. |
| Other public consumers | Home, Inventory and Arcade each reached revision 990 with one Cloudflare bootstrap and zero `/api/state` requests. |
| Ordinary Display URL | `/display` without a query parameter loaded the current queue and closed-day schedule with one Cloudflare snapshot and zero `/api/state` requests. |

The three snapshot requests are initial bootstrap, explicit online recovery,
and the sustained-outage fallback. Neither brief disconnect added an HTTP read.
The display retained its queue and visibly showed the closed-day schedule during
the outage. The opt-in source diagnostic reported Cloudflare snapshots and then
WebSocket authority.
The instrumented Display observation lasted just over six minutes, with six
recorded heartbeat replies and zero `/api/state` requests. All test tabs were
closed afterward, removing the temporary instrumentation and constructor fault.

## Staff writes and durable queue delivery

The existing authorized staff session made two `setDisplayUrl` saves with the
already-stored value (`null`). Neither changed ticket contents, operating hours,
announcements, branding, or URL settings. As expected for staff saves, timestamp,
state revision, publication evidence, and backup history advanced.

- Baseline revision: 988. Final test revision: 990.
- Before/after public snapshot comparison: **only `timestamp` changed**.
- Revision 989 publication `8810898d-0d66-41e1-88f4-a3a04fe87fdb` was committed
  at 19:42:38.802 UTC and accepted at 19:42:39.879 UTC.
- The production queue invoked `/api/queues/realtime-publication` at
  19:43:09.772 UTC, about 31 seconds after commit. Runtime logs recorded the
  expected accepted-publication no-op: `attempted: false`, `accepted: null`.
  This confirms the actual deployed producer, topic, delayed delivery, consumer,
  database lookup and acknowledgement path.
- Revision 990's watchdog also completed the expected no-op at 19:44:52.794 UTC
  (`777c0661-b282-4687-9837-9a2981935aaf`), confirming delivery after the second save.
- An unauthenticated public POST to the consumer path returned the app's
  not-found HTML (HTTP 200 from the framework fallback), not the queue callback
  response. Its log had no publication handler output. Do not assert HTTP 404
  as the private-route acceptance condition on this deployment.

Staff tests, inspection requests, authentication and initial page/configuration
loads can themselves read Neon. They are operator/test traffic and are separate
from the zero display `/api/state` count. The staff page was closed after testing.

## Verification and remaining limits

- Full suite: 137 files, 989 tests passed, one skipped. Queue tests and lint
  passed again after adding consumer result logging.
- Production deployment built successfully. The earlier local production build
  passed the 47-chunk legacy regex scan and production hydration smoke.
- Audit: unchanged 31 production advisories (25 moderate, five high, one
  critical); no unrelated package upgrades.
- This live queue check exercised delayed delivery and the accepted no-op.
  Actual failed-publication redelivery is covered by deterministic tests; a
  production publication failure was not injected.
- This bounded live test is not an overnight observation or proof of reduced
  monthly billing. The physical iPad/iOS 15 engine remains unverified.
- **Reload all three agency displays once to load this deployment.** Their
  already-open tabs do not automatically acquire the new client bundle. This
  rollout requirement is separate from the original implementation defect.
- After those reloads, compare an unattended closed-hours interval against
  the earlier approximately 30-minute wake pattern, using Vercel request logs
  and Neon compute activity. Exclude staff and deliberate diagnostic requests.

Raw deployment/runtime evidence is retained locally under
`/tmp/lotto-production-idle-test/`. The temporary environment export was removed
after testing; operational logs should still be reviewed before sharing.
