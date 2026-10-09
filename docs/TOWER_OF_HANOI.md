# Tower of Hanoi — game and scoring plan

Selected by the owner October 8, 2026, after Memory Grid RC.10. This is an
implementation plan. The owner subsequently authorized implementation,
testing/iteration and WTH production release, together with restoring Day of
the Dead behind a localized cartoon-violence warning. St. Johns is outside
this release scope. Preserve existing RC.10 work and dependency versions.

## Experience

A calm, single-player puzzle in LOTTO's existing pixel-art cabinet style.
Move the full tower from the left peg to the right peg, using the middle peg
as temporary storage. Move one top disk at a time; a larger disk may never
rest on a smaller disk. All three pegs begin in the same standard arrangement
for a chosen difficulty; do not introduce random starts or alternate goals.

Use original pixel-style disks, pegs and cabinet decoration drawn in code.
Match Memory Grid, Snake and Brick Mayhem's typography, framed controls,
light/dark appearance and spacing. There is no timer, time bonus or countdown,
including during high-score initials entry.

### Initial difficulties

| Setting | Disks | Minimum legal moves | Leaderboard scope |
| --- | --- | --- | --- |
| Easy | 3 | 7 | `tower-of-hanoi` / `easy` |
| Normal | 4 | 15 | `tower-of-hanoi` / `normal` |
| Hard | 5 | 31 | `tower-of-hanoi` / `hard` |

Three-peg minimum moves are `2 ** disks - 1`. This mathematical target is
known exactly, unlike Memory Grid's prospective par. Rules and minimum-move
reference: [Wolfram MathWorld](https://mathworld.wolfram.com/TowerofHanoi.html).
The scoring formula and product behavior below are LOTTO design choices.

## Scoring contract

### Progressive Continue — implemented locally October 9, 2026

After a completed three- or four-disk puzzle, offer **Continue** with the next
disk count beneath the high-score panel. It starts a fresh running puzzle with
one more disk (3 → 4 → 5), updates the difficulty slider and board together,
clears moves/history/selection and focuses the first peg. The current supported
ceiling remains five disks; replay and manual difficulty choices remain.
Save any desired shared score before continuing; Continue does not submit it.
Each completed level keeps its own local best and Easy/Normal/Hard score scope.
The next level's leaderboard is hidden during running play, so progression itself adds
no leaderboard request. Verify both transitions, the five-disk boundary,
offline use, repeated clicks, slider/restart synchronization and request counts.
Both transitions and the final-level boundary pass browser and component checks.
Chromium/WebKit complete each level at 2,000 points, keep local bests of
7/15/31 and add zero leaderboard reads when continuing. All eight built-in
Continue labels fit 320/375-pixel layouts; the longer labels wrap inside the
button. Component checks also cover offline continuation, repeated activation,
normal-difficulty score submission and restarting at the progressed difficulty.
This follow-up is local implementation; the live RC.11 receipt below describes
the preceding release, which does not yet include Continue.

On completion only:

```text
minimumMoves = 2 ** diskCount - 1
score = 1000 + round(1000 * minimumMoves / countedMoves)
```

- Award 1,000 completion points plus up to 1,000 efficiency bonus points.
  Any valid finish earns at least 1,000; an optimal solution earns 2,000.
- `countedMoves` is the cumulative number of executed disk transfers in that
  run, including transfers performed by Undo. It never decreases.
- Every ordinary legal transfer adds one. Undo reverses the most recent
  ordinary transfer, pops its history entry and adds one to the counter. Undo
  is not itself pushed onto that history. Consecutive Undo operations reverse
  preceding ordinary transfers; no redo control is included initially.
- Selection, cancellation, invalid destinations, empty-peg taps, unavailable
  Undo and control navigation add zero. Accidental taps do not reduce a score.
- Pause, time spent thinking, tab visibility, language/theme changes and
  elapsed time affect neither the counter nor the score.
- Reject scoring unless the engine is won, all disks are correctly stacked
  on the destination peg, the run's disk count is supported, and the cumulative
  counter is a safe integer at least equal to the minimum. Unfinished or invalid
  states return zero and cannot submit.
- Keep the chosen difficulty fixed for a run. A difficulty change discards
  that run, resets its history/counter and prepares a fresh Ready board. Restart
  does the same; neither action completes or submits the abandoned run.
- Completed runs are immutable: Undo and moves stop at victory. Replay starts
  a new run and a new score-entry session.

### Examples — Easy

| Counted moves at completion | Completion points | Efficiency bonus | Total |
| --- | --- | --- | --- |
| 7 | 1,000 | 1,000 | 2,000 |
| 10 | 1,000 | 700 | 1,700 |
| 14 | 1,000 | 500 | 1,500 |

Undo remains useful for learning and recovery, but cannot erase moves already
made to turn an exploratory run into a perfect-score run. Explain this near
the control: “Undo counts as a move.” Keep the tone neutral. During play show
disks and moves, rather than a shrinking score or a penalty animation. At
victory show the score breakdown, moves used and minimum possible moves.

Keep the best completed counted-move total locally for each disk count, using
an Arcade-specific versioned storage key. Storage failure must not prevent play.
Only completed runs update that record. Hints, auto-solve, alternate layouts,
larger towers and mid-run save/resume are deferred.

## Shared high-score board

Reuse `ArcadeHighScores`, the public `/api/arcade/high-scores` route and the
separate `ARCADE_DATABASE_URL` store. Use its panel below the board, three
visible letter initials and explicit Save; set `entryTimeLimitSeconds` to null.
Other games retain their existing behavior. No new login or player identity.

### Perfect-score ties — implemented Hanoi-specific behavior

The current shared board sorts by score descending, then creation time
ascending, then id ascending. A full board accepts only scores strictly greater
than tenth place. Ten perfect Hanoi runs would therefore close a difficulty's
board to every later perfect run.

For Hanoi only, accept a score equal to the cutoff and order equal
scores newest first (`created_at desc`, stable `id` ordering). This keeps a new
perfect finish eligible to appear; an older equally good entry can leave the
visible Top 10. Recency controls which equal entries are displayed, never the
points earned or the time taken to solve. Equal points remain visibly equal.
Other games' cutoff and order stay unchanged. Do not add a speed tie breaker.

Apply the same scoped policy to client qualification and server acceptance;
passing a different order to the UI alone would leave server rejection intact.
Review the current ranking index before adding any index: use existing indexing
for the small initial board unless evidence establishes a query problem.

### API and persistence boundaries

- Add the `tower-of-hanoi` game allowlist and Easy/Normal/Hard scope validation.
  Accept integer scores in the 1,000–2,000 range only, preserving rate limits
  and existing multilingual initials validation.
- Prepare a repeatable, transactional migration that expands only the isolated
  Arcade game constraint, preserving every previous allowed game, row and grant.
  Update `schema.arcade.sql` for new installations. Do not run either migration
  during planning or use the core schema applier as a shortcut.
- No new move-history fields are required by the existing score table. Like
  the current Arcade system, bounds checking does not prove a submitted run
  occurred; do not claim server-verified gameplay or anti-cheat protection.
- Read scores only on Ready/completion/difficulty transitions, using the
  existing component lifecycle. Peg taps, Undo, pause, theme/language changes
  and idle periods must add zero leaderboard reads. Save uses the existing
  bounded qualification/insert/readback path, not one SQL operation per move.
- Submit only on Save, disable duplicate clicks while pending and retain the
  earned score/initials when a request fails. No automatic submission retries
  or background queue. Preserve the current API's known retry limitations;
  it does not provide an exactly-once submission guarantee.
- Offline completion/local records remain usable after the page/assets load.
  An unavailable board must not interrupt the puzzle. Shared Save needs a
  connection; core queue/public-configuration snapshots remain independent.

## Controls and accessibility

- Tap a source peg, then a destination peg. Tap the selected source again to
  cancel. Highlight the selected disk and source without relying on color alone.
- Use three native peg buttons with large phone-friendly targets (at least
  44 CSS pixels); dragging is not required. Peg labels describe position,
  top disk size, disk count and selection. Provide a readable stack description.
- Arrow keys move peg focus; Enter/Space use the same source/destination flow.
  Escape cancels selection. Any shortcuts stay within board focus and never
  consume text entered into initials or menus. Undo has its own labeled button.
- Keep peg geometry left/middle/right stable in RTL; localize labels and text
  direction without reversing the puzzle's destination.
- Announce executed moves, invalid moves, Undo and completion in a persistent
  polite status region. Invalid moves change neither board nor score counter.
- Reuse the existing shell's ticket-call/hidden-tab pause and explicit Resume.
  Pause clears a pending selection so returning cannot perform a surprise move.
- Use event-driven board rendering and brief optional movement effects. No
  continuous simulation or animation loop; reduced motion preserves every cue.
- Preserve the installed-app home-indicator clearance and eight built-in
  locales; register new strings with the dynamic translation source catalog.

## Implementation sequence

1. Pure engine under `src/arcade/game/tower-of-hanoi/`: types, constants,
   legal transfers, undo history, pause/completion and score calculation.
2. Board/renderer and styles in Arcade scope; route at
   `src/app/(arcade)/arcade/tower-of-hanoi/page.tsx`. Reuse existing shell,
   controls, menu presentation and scoped tokens. Avoid shared global CSS edits.
3. Local bests, untimed leaderboard panel, scoped tie policy, API allowlists
   and prepared isolated Arcade migration. Keep current games regression-covered.
4. Localized instructions, Arcade Help, screenshots, read inventory,
   architecture/planning docs, changelog and in-app release notes together.
   Planned candidates must not appear as playable menu entries before they work.
5. Local build/test/browser/device validation. A later authorized release
   includes the next agreed RC, target verification, migration first, publication
   of the release's configuration and real hosted score Save/readback. Do not
   infer St. Johns deployment from a WTH release.

## Acceptance checks

- Solve each standard 3/4/5-disk puzzle in exactly 7/15/31 moves for 2,000 points.
  Check non-optimal finishes, rounding, unfinished/invalid states and immutability.
- Undo preserves legality/history, increases the cumulative counter, and cannot
  erase forward moves. Invalid taps/cancel add zero; victory locks the run.
- Restart/difficulty changes reset history, scope and entry session. Pause and
  visibility transitions preserve moves; Resume is explicit.
- Verify keyboard/touch, screen-reader descriptions and announcements, RTL,
  light/dark/reduced motion, narrow phones, tablets and installed-app clearance.
- Verify empty/unavailable/full leaderboards, untimed entry, explicit Save,
  equal-cutoff acceptance/newest equal entries for Hanoi, and unchanged policy
  for Snake, Brick Mayhem, Day of the Dead and Memory Grid.
- Count HTTP/store operations: no reads per move/Undo or while idle; no writes
  before Save; failure does not generate unbounded retries.
- Arcade device floor: the owner's iOS 17.5/26.3/27.0 tiers. Shared core and
  dependency changes retain the separate iOS 15 operator gate. No dependency
  upgrade is anticipated. Passing modern browser tests is not physical-device
  acceptance or proof about old WebKit.
- Before any authorized hosted migration, verify the named agency's separate
  Arcade project, compare existing records before/after, and validate live
  score persistence. Report remaining device and compute-observation limits.

## Planning checkpoint

Session audit: 36 production advisories (26 moderate, nine high, one critical),
unchanged. Existing RC.10 source/release work is preserved. No code, schema,
credentials, provider state or live game has been changed by this plan.

## RC.11 implementation and validation

Implemented within the existing Arcade engine/UI/store patterns. The immutable
engine exhaustively checks all legal arrangements for 3/4/5 disks (27/81/243),
with minimum 7/15/31-move victories, score validation, counted Undo and pause.
UI/store/API tests cover explicit Save, no per-move reads, offline completion,
untimed entry, Hanoi-only cutoff ties and unchanged other-game ordering.

Chromium touch/keyboard play completed each difficulty for 2,000 points.
Light/dark and all eight built-in locales fit a 375px phone without horizontal
overflow. The bundled web-game client captured a legal A→C transfer and board
state without application errors. Help images use the registered 375×812 / 2×
light/dark screenshot workflow; no new third-party artwork or dependencies.

Day of the Dead's menu warning, direct warning, Continue and reload reset pass;
game asset and score effects remain unmounted until Continue. Its existing
engine/scoring remain intact. A generic canvas count was discarded as a test
signal because shared shell canvases are unrelated to the game; the verified
selector is the game's `.arcade-zombie-canvas`.

The iOS 17.5 low-end simulator renders Hanoi through Safari. Device Hub's
coordinate input still fails with `noWindowsAvailable`, so no simulator touch
completion or physical hardware performance is claimed. Core build/legacy
checks and hosted persistence are separate release checks below.

Release gates pass: TypeScript, ESLint, production build, 49-chunk legacy scan,
and core `/` + `/login` hydration smoke. Local auth/backend warnings remain;
the smoke does not validate email sign-in. All 1,083 tests pass across 146 files.
An unrelated realtime-canary assertion failed in the preceding full run,
passed in isolation, then passed in the unchanged full rerun; its assertions
were not edited. The initial new-color/screenshot failures were corrected by
using the repo's OKLCH authoring format and generating the missing Help pairs.

The WTH Arcade migration was applied to `patient-cherry-31173304`, main branch
`br-fancy-bread-ar6aygeo`, `neondb` as `neondb_owner`. Before and after it,
all 187 existing scores retained checksum `6110d6ad1e14df7b6ffb309caa957959`.
The final constraint retains Snake, Brick Mayhem, Day of the Dead, Memory Grid
and adds Hanoi; no core queue migration, score deletion or grants change.
This diagnostic/migration traffic deliberately wakes Arcade compute and is
excluded from idle cost observations.

The final built app passed Chromium and WebKit 26 gameplay: optimal completion
of all three towers, tap controls, Undo/pause/resume, and 24 combinations of
eight locales × 320/390/768px per browser. No application exceptions occurred,
and moves/Undo/pause plus a bounded idle interval added zero leaderboard
requests. Production omits the development hooks. Day of the Dead loads only
after Continue, starts/pauses, and a reload restores its warning.

In the first automated layout pass, clicking before reload/font settling was
intercepted by shared sticky chrome. A fresh narrow-screen reproduction reached
Play normally; the final pass waits for the hydrated score panel and fonts,
then uses the visible control dock. This does not claim long-term physical
performance or eliminate the separate known shared Pending-banner layout issue.

## WTH production release — October 9, 2026

RC.11's rollout crossed midnight PDT after its October 8 implementation and
version entry. Target identity was verified as Technology `technology-3236`,
Vercel `wth-apps/wthlotto`, project `prj_zNP9ZGxuCuG6OhXgtyCwth1KTzdm`.
The isolated artifact `/tmp/lotto-rc11-wth-release` contains 1,178 source files,
excluding local secrets, Git metadata and build trees. Source-manifest SHA-256:
`b9c7a603fb0f9f54f86ca97b6c3bf9c54ff23367d3bcd17a799e4a8a6ee70720`.
The snapshot preceded the final documentation receipts; deployed gameplay and
release-note source match the tested release. No GitHub commit/push/tag was made.

- Gate-off build `dpl_AEpfkP3EYX6ksexTgZyDrKymqK3L` was promoted first.
- Existing authorized staff publication returned HTTP 200, accepted revision 5
  at `2026-10-09T07:00:29.615Z` (00:00:29 PDT). Independent Cloudflare validation
  confirms `william-temple-house`, RC.11, unchanged public data and valid checksum
  `sha256:e5ceba736e46b28184ff26690f00bfd19b5ffa9e9dc776a2c432a0177fa2be39`.
- Final gate-on build `dpl_3BzpskbJRajU4CpofTTSqvisrEFQ`,
  `wthlotto-d74nutu86-wth-apps.vercel.app`, reached Ready and was promoted at
  approximately 00:01 PDT. Both hosted builds passed. The live login footer and
  opened release-notes dialog show RC.11 and the new game/warning descriptions.
- A real Easy puzzle completed in seven moves for 2,000 points. Explicit Save
  of `TST` succeeded; an independent anonymous GET returned record
  `6a41ea95-c7fc-4166-9363-ba3f61e17a3d`, timestamp
  `2026-10-09T07:02:18.783Z`. This earned diagnostic score is retained.
- The live menu lists five playable games and Day of the Dead's notice. Its
  direct warning has zero game canvases before Continue; Continue loads the
  game, Start/Pause works, reload restores the warning and Back reaches the menu.
- Anonymous catalog, Chinese pack, compatible queue GET and manifest return
  HTTP 200; catalog/pack and queue identify Cloudflare. These are bounded routing
  checks, not SQL-counter experiments or new savings claims.

St. Johns, saved operating hours, announcements, queue and branding were not
changed. No Worker deployment, dependency upgrade or core migration was made.
RC.10 `dpl_5kuzLacPfYz1YosqVjuz91DGKR6J` remains a recovery reference;
rollback still requires owner authorization. The borrowed staff-cookie file
was emptied and temporary viewport/keyboard overrides reset. The verified
production build tree was archived outside the repo and local development
restarted on port 3000.

Exclude deliberate Arcade baseline/migration and play/Save, staff-session checks
and core configuration publication (roughly October 8 23:54 through October 9
00:04 PDT) from idle compute comparisons, including subsequent idle tails.
Physical hardware acceptance remains with the owner; no new 48–72-hour compute
observation was performed. Receipts/screenshots are in `/tmp/lotto-rc11-*` and
repository Help/screenshot assets.

## Approved release extension

Restore Day of the Dead to the Arcade menu with a visible cartoon-violence
notice. Its direct route must first show a localized warning, with explicit
Continue and Back to games choices, before mounting the game or loading its
artwork/leaderboard. Consent lasts for that page visit only; replay within the
visit does not repeatedly ask, but a fresh navigation/reload shows the notice.
No automatic November relock, saved agency setting, announcement or schedule
change is part of this instruction. Use the existing game and scoring rules.
