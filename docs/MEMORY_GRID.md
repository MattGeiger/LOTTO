# Memory Grid — implementation plan and game contract

Approved October 8, 2026. Implemented on `dev` and subsequently deployed to WTH
under the owner's live-hardware-testing authorization. The owner selected Henry Software's Free Pixel
Food! artwork and requested credits in GitHub documentation and About.

## Product and presentation

### Approved scoring extension — October 8, 2026

The owner approved untimed completion-and-efficiency scoring and the existing
shared leaderboard after testing RC.9. Implementation stays within Arcade's
current engine, high-score component/API and isolated datastore patterns.

- A completed board earns `1000 + round(1000 * pairs / turns)` points. Minimum
  valid turns equal the pair count; a perfect board earns 2,000. No score is
  awarded before completion, and elapsed time never enters the formula.
- Keep the device-local fewest-turns record and storage keys. Add the final
  score, completion points and memory bonus to the celebration. During play,
  show turn/pair progress without point deductions or speed pressure.
- Register `memory-grid` in the shared leaderboard with Easy/Normal/Hard scopes.
  Use its existing three-letter initials, ranking, rate limits and submission
  workflow. Memory Grid's initials entry is untimed; other games retain their
  existing 30-second entry behavior.
- Read the leaderboard on Ready/completion/difficulty transitions only. Card
  selections, pause/resume, idle time and language/theme switches create no
  leaderboard reads. Submit only after the player's explicit Save action.
  Failure/offline play retains the final score and local best.
- Extend the canonical Arcade schema's game constraint and prepare an atomic,
  repeatable migration for the isolated Arcade database only. No core schema,
  queue/configuration publication or production migration is part of local
  implementation. A hosted rollout must apply that Arcade migration first.
- Localize new copy in all eight built-in languages, update Help/release docs,
  and test score bounds, unfinished boards, request counts, untimed entry,
  unavailable service and unchanged timed entry for other games.
- Par remains deferred until playtesting supplies difficulty-specific targets.
  No timer, multiplier or time-based tie breaker is introduced.

- A calm, single-player matching game. Reveal two cards; matching foods stay
  visible and different foods turn back over after 1.2 seconds. No timer or
  time-based score. Count completed two-card turns; fewer turns is better.
- Easy starts with six pairs / twelve cards. Normal has eight pairs and Hard
  twelve. Difficulty changes and Restart prepare a fresh ready screen;
  starting again reshuffles.
- Match Snake and Brick Mayhem: existing Arcade font, pixel-framed cards and
  buttons, token-based chrome, fixed-pixel food sprites, cabinet play area,
  metric readout and thumb-reachable control dock. No core theme changes.
- Preserve the shared language/theme controls and ticket-call overlay. A ticket
  call or hidden browser pauses play; returning requires explicit resume.
  A pending mismatch freezes while paused. Never auto-resume after a ticket call.
- Keep a best completed turn count per difficulty in local browser storage.
  Shared scores use the existing Arcade endpoint/table, with no polling,
  email or staff workflow.
  Gameplay works without a network after the page and its assets load; the
  existing queue banner remains a separate network-dependent feature.

## Implementation boundaries

- Route: `src/app/(arcade)/arcade/memory-grid/page.tsx`.
- Pure immutable engine: `src/arcade/game/memory-grid/` with types, constants,
  shuffle, selection, mismatch resolution, pause/resume and completion.
- Use an injectable random source for deterministic engine tests. Build the
  shuffled deck only after a user action, avoiding SSR hydration randomness.
- A single canvas draws the board; native buttons over each card provide
  touch/keyboard input and accessible card position, revealed food and match
  state. Hidden card labels never disclose their food.
- Arrow keys move board focus; Enter/Space reveal via native buttons. Keep
  keyboard handling local to the board so menus and text inputs retain theirs.
- The live turn-result announcement retains both already-revealed food names
  until the next card selection, including after a mismatch closes visually.
  Screen-reader users are not limited to the 1.2-second visual reveal window.
- Use a bounded animation-frame loop only during a pending mismatch. No
  continuous idle loop. Development-only state/time hooks support the existing
  web-game test client and omit concealed food identities.
- All new gameplay copy ships in the eight built-in languages; canonical English keys
  also enter the existing dynamic translation source catalog. Untranslated
  dynamic packs fall back to English through the existing provider.
- Original 16×16 PNGs live under `public/arcade/memory-grid/food/`. Preserve
  nearest-neighbor scaling, creator readme, source/license and file hashes.
  CC0 assets remain CC0 independently of the AGPL application code.
- Add Henry Software credit to README, an asset credits document, the core
  About modal and a compact link on the game page.

## Verification and release

- Engine: exact pairs, unbiased Fisher–Yates with controlled random input,
  repeated/invalid selections, locked third selection, matching, final win,
  immutable transitions, pause and pending mismatch resolution.
- UI: start, touch selection, keyboard navigation, restart, difficulty reset,
  ticket-call/visibility pause, explicit resume, local best and screen-reader
  labels/announcements. Check new strings across all eight built-in locales.
- Visually inspect gameplay, victory, light/dark, phone and tablet layouts;
  preserve reduced motion and the installed-app 32 px home-indicator lane.
- Use the owner's named simulators: iOS 17.5 low-end, 26.3 mid-tier and 27.0
  high-end. The owner approved iOS 17 as the Arcade testing floor. iOS 15
  remains the Admin/operator floor; shared dependencies/core components must
  retain that support. Simulator tests do not measure old physical hardware.
- Build, lint, relevant regression tests, legacy bundle scan and core hydration
  smoke protect shared surfaces. No dependency upgrades are part of this work.
- Prepare the next release candidate's package/lock versions, changelog,
  release notes, Arcade Help and current architecture docs. Record actual test
  results and remaining limits below; do not claim deployment from local work.

## Validation record

Local implementation is prepared as `2.0.0-rc.9` on `dev`. No dependency graph,
deployment, agency settings, queue state or source ownership change is included.

- **Automated:** 1,054 tests pass across 144 files, including 22 focused checks
  for the game, artwork, menu, standalone dock and authored color format;
  all six Help screenshot integrity checks also pass.
  TypeScript, ESLint and production build pass. The legacy scan finds no unsafe
  regex in 48 chunks. Core hydration smoke passes on `/` and `/login`; local
  backend/auth 500/404 warnings remain, and this is not a real sign-in test.
- **Browser gameplay:** The required web-game client exercised keyboard input
  and state capture. A separate browser run solved six pairs through observable
  reveals while offline, saved the local best, and verified hidden identities
  never appear in the development state hook. Pause/resume, Hard's 24 cards,
  light/dark, the 32 px installed dock offset and all eight locales pass.
- **Built app:** Touch, keyboard focus, pause/resume and 24 combinations of
  eight languages × 320/390/768 px game-page widths pass, with no uncaught application
  exceptions. Development state/time hooks are absent. Screenshots are saved
  in the repository and Help assets.
- **Help captures:** The registered screenshot workflow generates paired light/dark
  Memory Grid images at 375 × 812 CSS px / 2× resolution and their render manifest.
  A separate 320 px menu check exposes an existing shared queue-banner overflow
  when its value is `PENDING`; the new menu cards are within the viewport.
- **Apple simulators:** The owner's iOS 17.5 / 26.3 (Device Hub displays 26.3.1)
  / 27.0 devices booted and rendered the local game. Computer Use can inspect
  and invoke native toolbar accessibility actions, but coordinate input into
  the embedded simulator fails with Device Hub's `noWindowsAvailable` error.
  Owner-assisted Start/card/Pause/Resume/Restart confirmation is pending.
  This record does not claim touch acceptance or physical-device performance.
- **Existing reduced-motion warning:** With reduced motion enabled, the shared
  animated button can report an attributes-only SSR/client `tabindex` mismatch.
  It was reproduced on unchanged Snake as well as Memory Grid; the completed
  game and native card controls still work. No shared animation-library change
  or dependency update was made as an incidental game fix.
- **Audit:** `npm audit --omit=dev` reports 36 advisories (26 moderate, nine high,
  one critical). Dependencies are unchanged; this feature does not resolve them.

## WTH production release — October 8, 2026

The owner authorized production deployment to test on real hardware after the
local network/firewall blocked phone access. WTH now serves `2.0.0-rc.9` at
`https://williamtemple.app/arcade/memory-grid`. St. Johns was observed for Neon
usage only and remains on RC.8. No dependency upgrades or operational-state
writes were performed.

Both hosted builds passed. The final deployment is
`dpl_Fphreh4KPtcfgxmeNcA4CJqmj5z5`; its matching Cloudflare configuration is
revision 3. Live browser checks verified Start, two-card selection and turn
counting, mismatch feedback, Pause/Resume, Restart and theme switching. Live
login displays RC.9, its release notes contain the game changes, and About
credits Henry Software/CC0. Public catalog/packs and compatible anonymous
queue reads identify Cloudflare; these routing checks do not replace SQL-counter
measurement. Deployment receipts and the earlier idle compute interval are in
`PUBLIC_CONFIGURATION_PUBLICATION.md`.

Owner-assisted physical-device acceptance and fresh email sign-in remain
unverified. No commit, GitHub push or tag was made by this deployment turn.

The owner subsequently reported live gameplay and localization working as
expected. That accepts the original RC.9 game on their hardware; it does not
validate the later local scoring/leaderboard extension.

## Leaderboard rollout checklist

### WTH RC.10 release authorization — October 8, 2026

The owner authorized deployment and one RC increment (`2.0.0-rc.10`). Target:
WTH `wth-apps/wthlotto` at `williamtemple.app`; St. Johns remains outside scope.
The isolated Arcade project is `patient-cherry-31173304`
(`wth-arcade-high-scores`), branch `br-fancy-bread-ar6aygeo`, database `neondb`,
compute `ep-curly-base-arzl7ca0`, in WTH's `org-hidden-sun-48830302` organization.
The scoped migration committed successfully. Before/after both contain 184
scores with checksum `85e7f68fb6ad511fdac2eb7fe952991a`; the constraint now allows
Memory Grid and retains all three prior games. No core database/schema or
runtime-role permissions were changed. The previous RC.9 deployment
`dpl_Fphreh4KPtcfgxmeNcA4CJqmj5z5` remains the recovery reference.

The preceding local-only scope is superseded for WTH by this release
authorization. St. Johns remains on RC.8; no GitHub commit, push or tag was made.

### WTH RC.10 activation and live verification

- Verified Technology's Vercel account (`technology-3236`), WTH team
  `team_wrtoOljQrNtcWuOGpv0oKF8V` and project
  `prj_zNP9ZGxuCuG6OhXgtyCwth1KTzdm`; the default personal CLI identity was not
  used. Isolated source artifact: `/tmp/lotto-rc10-wth-release`, based on
  `cfbc5f3a2161db6a9eb67ac59524897e309d99d2` plus approved working-tree changes.
  Manifest SHA-256:
  `f2ef6011c1513fc2bbd321b6a3c17f696ff2235eb5f7459d08a680b2c04371db`.
- Gate-off build `dpl_BaZcULtSgqKBJpctnpFx6ac3cc9b` passed and was promoted.
  Explicit staff publication accepted configuration revision 4 at 22:22 PDT;
  independent validation confirmed RC.10, agency, SHA-256 and public data
  byte-identical to RC.9. No queue or agency settings were saved.
- The same artifact's gate-on build `dpl_5kuzLacPfYz1YosqVjuz91DGKR6J`
  (`wthlotto-6phm6ys4b-wth-apps.vercel.app`) passed and was promoted to
  `williamtemple.app` at approximately 22:23 PDT. Package and lock roots are
  `2.0.0-rc.10`; dependencies are unchanged. Live login version and release-notes
  dialog show RC.10 and its untimed scoring/leaderboard notes.
- Computer Use completed an Easy board by reading only revealed card labels:
  six pairs in eight turns, 1,000 completion points + 750 bonus = 1,750.
  Untimed initials entry accepted `TST`; explicit Save displayed SCORE SAVED.
  A separate public GET confirmed persisted entry
  `0f20db1e-0584-4176-b2b1-e1e494b7ebf5`, created
  `2026-10-09T05:27:01.227Z`, game `memory-grid`, difficulty `easy`.
  This earned release-check score remains on the live board.
- Anonymous catalog, Chinese pack, compatible `/api/state` and manifest all
  returned HTTP 200; catalog/pack/queue headers identify Cloudflare. These
  bounded checks do not measure SQL counts or establish new compute savings.
- Release-turn regression checks: 55 tests across eight files and ESLint pass;
  both hosted builds pass. The preceding implementation's full suite, local
  production build, 48-chunk scan and core smoke are recorded below. No new
  email sign-in or physical-device scoring acceptance is claimed. The owner
  can now validate the new finish/initials flow on live hardware.
- Screenshots: `/tmp/lotto-rc10-wth-live-release-notes.png` and
  `/tmp/lotto-rc10-wth-live-score.png`. Receipts are under
  `/tmp/lotto-rc10-wth-*`. The temporary staff-cookie file was emptied; the
  existing local dev server and unrelated source work were preserved.

### Local scoring validation — October 8, 2026

- All 49 focused engine/page/component/API/store checks pass. The final full
  suite passes 1,062 tests across 144 files. One initial run sampled the existing
  realtime-source canary at revision 1 instead of 3; its nine tests passed in
  isolation, then the unchanged full suite passed. No canary assertions or
  realtime implementation were changed.
- TypeScript, ESLint, production build and the 48-chunk legacy scan pass.
  The core hydration smoke verifies local interactivity, not real email sign-in
  or the old WebKit engine. No dependencies were upgraded.
- The web-game client exercised keyboard/card input. Computer Use completed
  six pairs in nine turns and verified 1,667 points (1,000 + 667). A temporary
  browser-only leaderboard fixture verified three-letter Save and the resulting
  rank; no hosted score was written. Unit tests also verify offline completion,
  explicit submission, zero per-card/idle reloads and untimed entry after an hour.
- English at 390 px and Chinese/Arabic completion panels at 320 px fit their
  board. Light/dark presentation and refreshed paired Help captures were inspected.
  The existing shared queue banner can overflow at 320 px; this scoring change
  does not modify that banner. Desktop viewport checks are not device acceptance.
- At this local checkpoint, Arcade persistence was unavailable because no
  Arcade connection was configured. Migration, hosted persistence and deployment
  were unverified then; the subsequent RC.10 activation above supplies those
  results. Physical-device acceptance of the new scoring flow remains separate.

### Hosted rollout

1. Confirm the intended agency release target and its **isolated Arcade**
   database. Never use the queue database's connection for this migration.
2. Apply `scripts/migrations/2026-10-08-memory-grid-high-scores.sql` using the
   existing Arcade database owner/migration connection. It replaces only the
   canonical game-slug constraint, retains prior allowed games and saved rows,
   and is safe to repeat. Existing runtime role permissions remain unchanged.
   The canonical `schema.arcade.sql` also includes the new game for fresh and
   existing setups; apply it atomically. Do not use the combined core/Arcade
   schema applier as a shortcut for this Arcade-only migration.
3. Verify the new game can read/write its scope, previous game rows survive,
   and unsupported game slugs remain rejected. Local tests simulate submission;
   hosted database persistence remains a separate gate until verified.
4. Run the relevant tests/build/legacy checks and validate the finish screen on
   the approved Arcade floor. Preserve the queue/public-configuration boundary.
5. Prepare version/lockfile/notes together for the next behavior release, publish
   the release-specific Cloudflare configuration before enabling its read gate,
   then verify live score submission with an explicitly identified test entry.
   Do not treat source implementation as proof of migration or deployment.
