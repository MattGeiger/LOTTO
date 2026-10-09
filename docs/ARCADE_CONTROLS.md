# Arcade control layout standard

Owner-directed October 9, 2026. Applies to every current and future Arcade game.
This standard shipped to WTH in RC.12 on October 9, 2026.

## Required order

1. Put movement controls nearest the board: sliders, directional pads or other
   continuous controls go above the action row.
2. Put **Start / Pause / Resume** in the bottom action row of the control dock.
   Its position stays stable as its label and game state change. Never put a
   slider beneath it or put Pause in the center of a directional pad.
3. When the bottom row has another action, put Pause on the **left**. Additional
   actions go to its right. This physical arrangement stays left-to-right in
   every language, including Arabic and Farsi.

Day of the Dead specifically uses a full-width movement slider above a shared
bottom row: **Pause on the left, A (Fire) on the right**. Retain press-and-hold
fire, including pointer-up/leave/cancel release behavior. Reordering controls
must not alter the game engine or input meaning.

## Current game mapping

| Game | Above bottom action row | Bottom action row, left to right |
| --- | --- | --- |
| Snake | Four-way D-pad, with an empty center | Start / Pause / Resume |
| Brick Mayhem | Paddle-position slider | Start / Pause / Resume |
| Day of the Dead | Hero-position slider | Start / Pause / Resume; A |
| Memory Grid | Card board; difficulty setting above play | Start / Pause / Resume; Restart |
| Tower of Hanoi | Peg board; difficulty setting above play; Undo help | Start / Pause / Resume; Undo; Restart |

Games without movement sliders do not acquire one to satisfy this standard.
Difficulty sliders remain in their existing settings panels above play.
On-board Start/replay and the optional top Play Now shortcut may remain; the
primary control dock still follows the order above.

## Fit and accessibility

- Use the existing pixel-art Arcade buttons, type, frames and theme tokens.
  Do not change shared core/operator theme styles for game controls.
- Make action targets at least 48 CSS pixels high. Keep labels readable and
  allow longer translations to wrap inside the available width.
- Keep the dock sticky at the bottom and preserve the existing 32-pixel extra
  home-indicator lane in installed-app mode, in addition to safe-area padding.
  Budget the board size for the complete dock height so controls do not cover
  the bottom of the play area; Day of the Dead uses this revised height budget.
- Keep DOM order consistent with visual order for keyboard and screen readers;
  do not reorder just with CSS `order`. Retain descriptive accessible names.
- Preserve Pause/Resume state, ticket-call interruption, supported keyboard
  inputs, silent continuous sliders and existing deliberate-action haptics.
  Layout alone must not add API calls, timers or polling.

## Acceptance checks for new or changed games

Check phone portrait widths of 320 and 375 pixels and a tablet viewport, in
light and dark modes. Verify actual element positions: every dock slider or
directional control ends above the bottom action row; paired actions share
the row; Pause is on the left even in RTL. Exercise the controls through Start,
Pause and Resume, plus continuous movement and Fire when present. Confirm that
labels fit, the board remains usable and installed-app safe-area space is kept.
Use the approved iOS 17 Arcade floor; core/operator support retains iOS 15.
Report physical-device checks separately from browser geometry tests.

## October 9 validation

The five current games passed 40 browser geometry cases across Chromium/WebKit,
320/375/768-pixel viewports, light/dark modes and Arabic. All primary action
targets meet the 48-pixel height requirement. Start/Pause/Resume passed for
each game in both engines; Day of the Dead's slider and held/released A button
were exercised in a phone-sized Chromium run. Revised screenshots were inspected.
The focused suite passes 25 tests; TypeScript and lint pass. Full production
build/release and physical-device acceptance were not performed at that local
checkpoint. RC.12 subsequently passed build/legacy checks and deployed to WTH;
physical-device acceptance remains separate. WebKit recorded local fetch
access-control errors during navigation;
these layout checks do not establish hosted auth or backend acceptance.
