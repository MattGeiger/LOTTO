# Changelog

## [Unreleased]
### Added
- **Staff login + authenticated navigation (v2.0):** the `/staff` route is now a
  sign-in screen (the former marketing landing was retired); already-authenticated
  visitors are redirected to `/admin`. `/login` and `/staff` share one login
  experience (`src/components/login-experience.tsx`) with a version/About/Help
  footer. Signed-in staff get an enhanced bottom navigation variant —
  **Admin** (`/admin`), **Dashboard** (`/display`), **What's in stock**
  (`/inventory`), **Games** (`/arcade`) — using the same component, animation
  rules, and (for Admin) a new animated `LayoutPanelTop` icon. The variant is
  driven by a lightweight `StaffAuthContext` bridged from NextAuth via a new
  `AuthSessionProvider`; unauthenticated visitors keep the existing public nav.
  The bottom nav now also persists on `/admin`, and the arcade-styled bar gains a
  matching pixel Admin glyph.
- **Ticket-status revert (v2.0):** Returned and Unclaimed ticket numbers in the
  admin Live State lists are now tappable. Tapping one opens a confirm dialog
  ("Revert Returned/Unclaimed Ticket") that clears the status, returning the
  ticket to its normal state without rewinding the current "now serving"
  position. Adds a `revertTicketStatus` API action + state-manager support
  (file + Neon), optimistic UI, and tests.
- **Polished, promotion-ready README** with app screenshots
  (`docs/screenshots/`) — including **dark mode** and **localized** boards
  (Chinese, Russian, Arabic/RTL) — a feature/audience overview, quickstart, tech
  stack, and license summary, modeled on the FEED project. The previous
  operational runbook (env vars, Vercel + Neon production setup, standalone
  read-only board, persistence) moved to [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).
  GitHub repo description and topics were also set.
- **`npm run screenshots`** — a reproducible screenshot generator
  (`scripts/screenshots.mjs`) that drives the installed Chrome via `puppeteer-core`
  (dev dependency, no bundled browser) to capture each surface at a pinned theme
  and language.

### Changed
- **License: relicensed from MIT to AGPL-3.0-or-later**, matching the FEED
  project. The `LICENSE` file now contains the GNU AGPL v3 text, `package.json`
  declares `"license": "AGPL-3.0-or-later"`, and every `.ts`/`.tsx` source file
  carries an SPDX header. A new `TRADEMARKS.md` carves the William Temple House
  name, logos, visual identity, and production domain out of the code license
  (they are not open source), and the About modal now shows the AGPL license plus
  a short open-source/branding notice. Third-party and WTH-branding assets are
  unaffected by the code license.

### Added
- **Staff page: Release Notes modal, About modal, and searchable Help.** Adapted
  from the FEED project. The version number on `/staff` is now a button that
  opens a plain-language **release notes** modal (content in
  `docs/release-notes.md`); the old static credits line is replaced by an
  **About** modal (`src/components/about-dialog.tsx`) matching FEED's format —
  theme-aware Temple Consulting logo (`public/temple-logo-{light,dark}.svg`),
  a GitHub source link, a transparent dialog whose inner card is the surface, and
  an explicit close button (also added to the release-notes modal); and a new
  **Help** link
  opens a searchable, indexed help section at `/help` (index) and
  `/help/[slug]` (per-topic detail) with table of contents, scroll-spy,
  deep-linkable sections (`?q=…#section`), and search-term highlighting. Help
  content is authored as markdown in `docs/user-guides/NN-*.md`; the parser and
  section-level search index live in `src/lib/user-guides.ts` (pure, tested) with
  a server-only filesystem loader in `src/lib/user-guides.server.ts`. Markdown is
  rendered with `react-markdown` + `remark-gfm`. Help/release/about content is
  English-only, matching the Staff page. See `docs/HELP_SYSTEM.md`.
- **Ticket-called celebration on every public route:** the confetti + "Ticket
  Called!" overlay now fires wherever a client with a saved ticket happens to be
  — homepage, the `/display` board, and the inventory page — not just the
  homepage. It is extracted into a shared `TicketCalledCelebration` component
  (`src/components/ticket-called-celebration.tsx`): the homepage and display
  board feed it their already-polled state, while inventory self-polls
  `/api/state`. A wall-mounted board stays silent because it has no session
  ticket. The celebration dedups per call across navigation via `sessionStorage`
  (`src/lib/ticket-celebration.ts`), so a single call celebrates exactly once no
  matter how many pages the client visits while it is active. `ReadOnlyDisplay`
  no longer owns the overlay/confetti (it still renders the persistent
  "called at HH:MM" message); Arcade keeps its own separate celebration per the
  Arcade guardrails. The overlay copy is localized in all eight supported
  languages (`ticketCalledTitle` / `ticketCalledCheckIn`).
- **Dashboard bottom-nav tab:** added a new **Dashboard** destination between
  **Your ticket** and **What's in stock** in the public bottom navigation,
  linking to `/display`. The core bar uses a native imperative `grip` icon so
  nav hover/tap animations replay without remount stutter, the Arcade bar gets
  a matching pixel-art dashboard glyph, and `/display` now renders the bottom
  nav with scroll clearance.

### Changed
- **Homepage onboarding step selection:** the personalized homepage (`/`) no
  longer re-prompts for a language once one has been chosen this browser session.
  The onboarding modal now decides its initial step after language hydration: a
  saved ticket keeps it closed, an existing session language opens it directly at
  the ticket step, and only a first-time visitor sees the language gate.
- **Display nav auto-hide:** the bottom navigation on `/display` now hides after
  a period of inactivity and reappears on any pointer/keyboard/touch activity.
  The inactivity window matches the Admin display-language rotation interval when
  rotation is enabled, otherwise falls back to 5 minutes. Auto-hide is scoped to
  `/display` only — the homepage, inventory, and Arcade keep a persistent bar —
  and honors `prefers-reduced-motion` by toggling visibility without the slide
  transition.
- **Homepage RTL layout scope:** constrained Arabic/Farsi directionality so the
  homepage top chrome, public bottom-nav item order, and personalized display
  structural card grids remain in the same physical order while localized text
  containers still render RTL where appropriate.
- **Display RTL layout scope:** constrained the display ticket/drawing card
  chrome so the `DRAWING ORDER`/ticket heading and `Updated: HH:MM` badge keep
  their physical left-to-right layout, and ticket number cells keep stable grid
  order with a matching left-to-right status key while the card body can still
  localize.
- **Bottom nav dock offset:** standardized the desktop/tablet bottom-nav offset
  across home, Dashboard, inventory, and Arcade so the dock no longer jumps
  vertically between public routes.
- **Admin "Rotate display languages" interval:** replaced the freeform minutes
  input with a dropdown from 1 to 10 minutes per language, with the interval
  label folded into each option.
- **Display language switcher during rotation:** the `/display` language
  switcher now stays visible while Admin rotation is enabled. A manual language
  choice pauses automatic rotation for that browser session without changing the
  saved Admin setting.
- **Session language continuity:** manual language choices now persist for the
  browser session when navigating between public routes. If a client chooses a
  language on the homepage and then opens Dashboard (`/display`), that choice
  takes precedence over Admin language rotation; explicitly choosing English also
  counts as a session override.
- **Display language rotation validation:** direct API writes now reject
  duplicate languages and intervals outside 1-10 minutes, and normalize language
  order before persistence.

### Fixed
- **Display language rotation disable behavior:** an already-open `/display`
  board now returns to English when rotation is disabled or cleared.

## [1.17.2] - 2026-06-04
### Changed
- **Admin "Rotate display languages" card:** bottom-left aligned the "Save
  language rotation" button so it lines up with the "Save operating hours" button
  in the adjacent card.

## [1.17.1] - 2026-06-04
### Fixed
- **Display QR default target:** the QR code on the `/display` board now falls
  back to the site homepage (`/`, the personalized onboarding) instead of the
  board's own URL, so scanning sends clients somewhere useful rather than back to
  the screen they are already looking at. A custom Admin display URL still
  overrides the default.

### Changed
- **Admin "Rotate display languages" card** now follows the established admin UX
  patterns: the enable toggle reuses the bordered control treatment from "Order
  mode" with a non-redundant label (no longer repeating the card title and
  description), the language picker uses plain checkboxes (not bordered chips),
  and the card sits in the settings grid beside "Set operating hours" instead of
  a standalone full-width row.

## [1.17.0] - 2026-06-04
### Added
- **Rotating language mode for the Display board:** the Admin page gains a
  "Rotate display languages" control (enable toggle, language multi-select, and a
  minutes-per-language interval). When enabled, the large-format `/display` board
  automatically cycles its UI through the selected languages on the configured
  timer so non-English-speaking clients can read it without interacting — an
  inclusive, equity-minded default. Languages rotate in canonical order; each
  switch reuses the board's existing scramble transition and flips RTL for
  Arabic/Farsi.
  - **State:** new nullable `displayLanguageRotation` (`{ enabled, languages,
    intervalSeconds }`) on `RaffleState` with a `setDisplayLanguageRotation`
    action (Zod-validated language enum + bounded interval), persisted by both
    state managers and preserved across draw reset/generate. Back-compatible via
    the existing `{ ...defaultState, ...payload }` merge (no migration).
  - **Display scope:** `/display` is now wrapped in a non-persisting
    `LanguageProvider` (`persist={false}`) so rotation drives the board language
    without writing the shared `display-language` preference or affecting the `/`
    homepage. New `useDisplayLanguageRotation` hook (mounted only by
    `PublicDisplayPage`) runs the timer; the manual language switcher is hidden
    while rotation is active.
  - **Shared list:** added `src/lib/languages.ts` (`LANGUAGE_CODES` /
    `LANGUAGE_OPTIONS`), reused by the onboarding modal, the Admin editor, and the
    rotation Zod schema.
- **Docs/tests:** added `docs/DISPLAY_LANGUAGE_ROTATION.md`; coverage for the
  rotation hook (timer cycling), the Admin editor, the API action validation, and
  state-manager persistence/preservation.

## [1.16.0] - 2026-06-03
### Changed
- **Personalized homepage promoted to `/`:** the language + ticket onboarding
  experience (formerly the `/new` preview) is now the default homepage,
  fulfilling the long-planned promotion tracked in
  `docs/V2.0_PLANNED_FEATURES.md`. The searchable public board now lives solely
  at `/display`, and the **Your ticket** bottom-nav tab (core and arcade bars)
  points to `/`. The view moved into a reusable
  `src/components/personalized-home-page.tsx` (`PersonalizedHomePage`) wrapped by
  the server route `src/app/page.tsx`, mirroring how `/display` wraps
  `PublicDisplayPage`.
- **Friendlier "just looking" escape hatch:** the onboarding modal's dismiss
  action is now the concise **"I'm just looking"** rendered as a prominent
  secondary button (was a long, muted ghost link), shortened across all eight
  languages. The ticket step now adds a close (X) and supports Escape /
  tap-outside dismissal, while the language step stays a focused gate (no
  dismissal until a language is chosen).
- **Tests:** repointed the homepage suites to
  `@/components/personalized-home-page` and added coverage for the ticket-step
  close/Escape dismissal and the language-step gate.

### Removed
- **`/new` route:** retired now that its experience is the homepage —
  `src/app/new/page.tsx` and `src/app/new/layout.tsx` are deleted and `/new` no
  longer resolves. Operators should confirm the board's configured display/QR
  URL no longer targets `/new`, and repoint any kiosk that showed the board at
  `/` to `/display`.

## [1.15.4] - 2026-06-01
### Added
- **Pride-month leaderboard seed:** `seed.arcade-high-scores.sql` preloads the
  arcade Top 10 with a tribute roster of civil rights icons and LGBTQ+, queer,
  trans, Two-Spirit, and nonbinary activists across every game and difficulty.
  Idempotent: it clears and re-seeds only its own marked rows and never touches
  live player scores.

### Changed
- **Brick Mayhem cabinet polish:** the on-board Top 10 now shows only on the
  pristine first serve and at game over. Between lives and levels (which also
  return to READY) the playfield stays clear so players can aim the next serve.
- **CSS cleanup:** removed the now-unused per-game `.arcade-{snake,brick,zombie}-overlay`
  game-over overlay styles, superseded by the shared cabinet screen.

## [1.15.3] - 2026-06-01
### Changed
- **Arcade cabinet leaderboard:** the Top 10 now renders directly on the play
  area as an arcade-cabinet screen — an attract-mode high-score table at READY
  and a unified GAME OVER screen (score + initials entry + Top 10 + replay) at
  game over — instead of a separate panel beneath the board. Applied
  consistently to Snake, Brick Mayhem, and Day of the Dead.
- **Restart safety / a11y:** replaced tap-anywhere-to-restart with an explicit
  "TAP HERE TO PLAY AGAIN" button so the initials input is usable without
  accidentally restarting the run (keyboard restart unchanged), and removed
  `role="img"` from the boards so the entry field stays reachable to assistive
  tech.

## [1.15.2] - 2026-06-01
### Changed
- **Arcade leaderboard prominence:** enlarged the shared Top 10 Scores panel,
  featured the #1 score as a cabinet-style champion row, and highlighted newly
  saved scores at game over so high scores read as bragging rights rather than
  small status text.
- **Lint cleanup:** removed the remaining ESLint warnings by clearing stale
  imports/mock parameters and tightening admin/display hook dependencies.

## [1.15.1] - 2026-06-01
### Changed
- **Arcade production visibility:** Day of the Dead is preserved in the codebase
  but hidden from the Arcade menu and redirected from `/arcade/zombie-attack` in
  production. Snake and Brick Mayhem remain publicly linked.
- **Docs and tests:** updated Arcade current-state docs and added coverage for
  the hidden production route and public game menu.

## [1.15.0] - 2026-06-01
### Added
- **Arcade Top 10 Scores:** Snake, Brick Mayhem, and Day of the Dead now show per-game/per-difficulty leaderboards before start and at game over.
- **High-score entry:** qualifying game-over scores get a 30-second, 3-initial entry flow with multilingual letter support and no profanity denylist.
- **Isolated Arcade database:** added `schema.arcade.sql`, `ARCADE_DATABASE_URL`, an Arcade-only high-score store, and public `/api/arcade/high-scores` GET/POST routes. The leaderboard database is separate from the core LOTTO queue/auth `DATABASE_URL`.
- **Docs and tests:** added `docs/ARCADE_HIGH_SCORES.md`, deployment notes for the separate Neon project, and unit/API/component/page coverage for leaderboard validation and UI integration.

### Fixed
- Cleaned up the existing `tests/state-manager-db.test.ts` `prefer-const` lint blocker so full lint can pass.

## [1.14.5] - 2026-05-31
### Changed
- **Day of the Dead HUD color follow-up:** `ROUND`, `LIVES`, and `SCORE` now match the `SETTING: ...` / instruction-list text color instead of the green pellet color.
- **Docs:** updated the Day of the Dead design doc and Arcade current-state notes for the HUD color behavior.

## [1.14.4] - 2026-05-31
### Changed
- **Day of the Dead visual polish:** player bullets now render `#FFAA00`; the extraction victory overlay text (`EXTRACTION COMPLETE!`) now renders `#00FF00`; and the "DIFFICULTY SETTING" / `SETTING: ...` text now matches the instruction-list color.
- **Docs:** updated the Day of the Dead design doc and Arcade current-state notes to capture the bullet, victory-text, and settings-text color behavior.

## [1.14.3] - 2026-05-31
### Changed
- **Day of the Dead instructions** refreshed (all eight languages): "HOLD A TO FIRE", "STOP ZOMBIES AT THE FENCE" (was the stale "bunker line"), and "SHOOT ROGUE AMBULANCES AND BUB'S GRENADES FOR A BLAST".
- **Page metadata audit.** Unified the app brand to **"William Temple House App"** via a root title template (replacing the old `WTH Digital Raffle` / `LOTTO:` strings), and gave the main routes tailored, friendlier titles + descriptions: Home, **Arcade** ("Retro arcade games while you wait"), **Display**, **What's in Stock** (`/inventory`), **Your Ticket** (`/new`), and **Admin**. So tabs now read e.g. "Arcade | William Temple House App".

## [1.14.2] - 2026-05-31
### Changed
- Renamed the game's display title from *Zombie Attack!* to **"Day of the Dead"** — a tribute to George A. Romero's 1985 film (the namesake of the Bub soldier zombie). Updated the title across all eight languages (localized for Chinese / Persian / Arabic) and the play-area labels. The internal slug (route `/arcade/zombie-attack`, modules, CSS, and translation keys) is unchanged.

## [1.14.1] - 2026-05-31
### Added
- **Zombie Attack! evacuation reward:** completing an extraction now grants bonus lives, scaled by difficulty — Very Easy / Easy / Normal **+1**, Hard / Very Hard **+2**, Nightmare **+3**.

## [1.14.0] - 2026-05-31
### Changed
- **Zombie Attack! render order:** the living zombies now draw newest-first, so freshly-spawned zombies sit **behind** older ones (matching the top-down depth).

### Added
- **Per-difficulty parameters** (defined relative to the Normal baseline):
  - **Very Easy:** ½ spawn rate, civilians never revive, ×0.5 score.
  - **Easy:** ½ spawn rate, ×0.75 score.
  - **Normal:** the baseline.
  - **Hard:** 2× zombie speed (the walk animation now tracks speed, so they animate 2× faster too), ×2 score.
  - **Very Hard:** 2× speed, 4× Bub spawns, ×3 score.
  - **Nightmare:** 2× speed, 4× Bub spawns, Bub never drops a grenade, **no protective fence**, ×4 score.
  - The zombie walk/idle animation cadence is now derived from the actual move speed (per-difficulty and per-cycle), so faster zombies always animate faster.

## [1.13.1] - 2026-05-31
### Changed
- Slowed the zombie walk/idle animation cadence (220ms → 440ms) so their stride matches the halved movement speed from 1.13.0. The hero's animation cadence is unchanged.

## [1.13.0] - 2026-05-31
### Changed
- **Zombie Attack! — fence siege.** The fence is now a solid sprite barrier with
  **10 HP** instead of a sandbag count. Zombies that reach it go **idle and besiege
  it**, each with a `(zombies-at-the-fence × 10%)` chance per turn to land a hit —
  so the odds **stack with the crowd**. Once breached, the fence sprite tears open
  from the centre (`fence-breach-*` tiles) and zombies **pour through toward the
  helo**. The helicopter now correctly draws **over** the fence (layer fix), and
  the **hero is repositioned up by the fence** for a tighter last stand.
- **Probabilistic kills.** A civilian hit is now 50% kill / 50% wound (hurt
  animation), and a killed civilian has a **10% chance to get back up** (death
  animation in reverse). **Bub** takes his first two hits as wounds, then each
  further hit has a 50% kill chance, a **25% revive** chance, and a 25% grenade
  drop.
- **Baseline (Normal) tuning:** doubled the zombie spawn rate and halved their
  move speed across all difficulty presets (other settings scale from Normal;
  per-difficulty tuning comes next).

### Added
- **Melee siege threats:** breached zombies **maul the hero at close range** (a
  life per turn, with invulnerability between hits) and **wreck the helo** if they
  reach it (10%/turn → game over — the helo has no health). The ambulance now
  **explodes on impact with the fence** (clearing nearby zombies) and is an
  instant **game over if it reaches the helo** through a breach.
- Idle / attack / hurt zombie sprites and the six fence sprites wired in; engine
  test rewritten for the siege (`tests/arcade-zombie-attack-engine.test.ts`, 11
  deterministic cases via the RNG seam).

## [1.12.1] - 2026-05-31
### Changed
- **Zombie Attack! polish.** Gave the helicopter a full per-phase animation: an
  in-flight rotor (takeoff-1/2) on the inbound approach, a touchdown sequence
  (takeoff-5 → 4 → 3 → spin-up → idle) on landing, a spin-up alternation
  (spin-up / takeoff-2) while boarding, and a takeoff sequence (in-flight →
  lift-off 3/4 → ascent 6/5 → in-flight, climbing away) that the chopper flies
  out on. Lift-off now holds on the pad briefly before the climb.
- Made the play area **much larger on desktop** (board cap raised, bound by the
  vertical budget so the tall board fills the screen).
- **Light mode** now draws a **light dirt lot** (and lighter sandbags/terrain) so
  the action reads clearly; the board repaints on theme change.
- **Bub** now mostly **shambles like the other zombies** and only fires
  occasionally — and he's **provoked by line of sight**: standing directly below
  him draws a straight shot, standing at ~45° draws an angled shot, and he rarely
  fires when you're not lined up. He only shows the firing pose right after a shot.

## [1.12.0] - 2026-05-31
### Changed
- Overhauled **Zombie Attack!** from a side-to-side shooter into a **top-down survival** game on a taller 240×360 board (`aspect-ratio: 240/360`). The renderer now blits preloaded **NES-era PNG sprites** (`drawImage`, nearest-neighbour) instead of string-bitmaps; sprite assets live in `src/arcade/game/zombie-attack/assets/` and are statically imported + preloaded (`assets.ts`). The old `sprites.ts` was removed.
- Zombies now **spawn at the top and shamble downward**, each picking a **stochastic per-step direction** (50% straight down, 25% each 45° diagonal). Most zombies no longer shoot — the threat is sheer numbers reaching the bunker line.
- The player is now a **top-down hero with an Uzi** (rapid fire, up to 3 tracers on screen). Civilian zombies are four varied **street-clothes sprites** (NES-era, not Atari-flat).

### Added
- **Bub** — a zombie soldier (Day of the Dead homage) in fatigues + helmet: takes **2 shots**, fires a 1911 in a stochastic down/down-left/down-right spread (Bub bullets cost the hero a life), and has a **50% chance to drop a live grenade** on death. Shoot the dropped grenade to detonate an **AoE blast** that clears nearby zombies. Bub spawns occasionally (more often on Nightmare).
- **Helicopter + helipad** at bottom-centre, driving a **time-based 4-round cycle**: (1) clear the pad / chopper inbound, (2) refueling, (3) boarding, (4) takeoff. Survive each round's clock to advance; completing round 4 **extracts the chopper** (a rescue), clears the lot, and loops the cycle at higher difficulty. The helicopter animates per round (idle → refuel → spinup → takeoff frames, climbing away on lift-off).
- **Ambulance** hazard that drives down a lane; shoot it (3–6 hits by difficulty) to blow it up, clearing nearby zombies.
- A **bunker-integrity** buffer: each zombie that reaches the bunker line is absorbed; once the line is overrun the pad falls (game over). Integrity is repaired on each extraction. Lives are still lost to Bub's bullets; 0 lives also ends the run.
- HUD for the new loop: a **round-objective banner**, a 2×2 ROUND / TIME / LIVES / SCORE readout, and a slim **round-timer bar**. Difficulty presets now tune spawn rate, descent speed, Bub frequency, bunkers, and ambulance toughness (Nightmare keeps the bunker death-line but draws no sandbags). Localized across all eight languages; engine test rewritten as `tests/arcade-zombie-attack-engine.test.ts` (9 cases). Docs updated in `docs/ZOMBIE_ATTACK.md`.

## [1.11.0] - 2026-05-30
### Changed
- Re-themed the Arcade's third game from *Star Swarm* into **Zombie Attack!** — a last-stand against a shambling horde — and renamed its route, modules, CSS, and translation keys (`/arcade/star-swarm` → `/arcade/zombie-attack`, `src/arcade/game/star-swarm/*` → `zombie-attack/*`, `arcade-swarm-*` → `arcade-zombie-*`, `starSwarm*` → `zombieAttack*`). Design doc renamed `docs/STAR_SWARM.md` → `docs/ZOMBIE_ATTACK.md`.
- Replaced the alien sprites with three **zombie builds** (skinny, ribs-exposed, fat), each with a two-frame shamble, and swapped the starfield for a **dirt-lot** background (deterministic pebbles, clods, dead grass, and rocks). The gun, shots, and bursts still follow the theme via CSS custom properties; the dirt/undead/fire/wood/sandbag tones are intentional constants.
- Made the **play area 25% taller** (board `224 × 224` → `224 × 280`, `aspect-ratio: 224/280`) and re-tuned the responsive board sizing to fill the available height, reducing wasted space above the game on small phones.
- Simplified the fire control to a compact **"A"** button (hold to autofire), widening the movement slider; masked text selection (`user-select: none` + `touch-action: none`) on the Play/Fire/dock surfaces so a held or dragged press never highlights a label mid-game.

### Added
- **Fence** — a wooden barrier in front of the bunkers that the horde presses on. Its health drains faster the more zombies are pressing (`alive × 2` per step); when it collapses the horde breaks through toward the bunkers. Reaching the bunker line is game over. The fence is rebuilt each wave.
- **Flaming vehicle** — a burning truck periodically barrels straight down toward the fence. It takes 3–5 shots to destroy (by difficulty, 250 pts); if it reaches the fence it crashes through and collapses it instantly.
- **Bomb-carrier zombies** — a few zombies each wave carry a bomb (red marker + fuse). Shooting a carrier drops its bomb in place; shooting the dropped bomb detonates a blast (~25% of the board area) that wipes out every zombie inside it.
- **Difficulty rules:** Nightmare now has **no bunkers** (the fence remains; the bunker location is still the game-over line); Very Easy makes bunkers **bomb-proof** (eroded only by the player's own shots, never by enemy bombs).
- Rewrote the engine unit test as `tests/arcade-zombie-attack-engine.test.ts` (11 cases): zombie scoring, carrier bomb-drop, blast AoE (with a distant zombie spared), vehicle HP, thrown-bomb life loss, horde-reaches-bunkers game over, wave-clear + fence rebuild, bomb-proof vs. eroding bunkers, no-bunker difficulty, and the shot cooldown/cap.

## [1.10.0] - 2026-05-29
### Added
- Added **Star Swarm**, the Arcade's third game — a fixed-shooter in the Space Invaders lineage. Pilot a ship along the bottom of a square pixel-art board, hold FIRE to shoot, and clear a descending formation of 40 invaders (five color-tiered rows) before they reach you. Includes destructible bunkers, invader bombs (which can be shot down mid-air), a periodic bonus saucer worth 50–300 points, post-hit invulnerability blink, escalating formation speed as the swarm thins, and endless waves that ramp difficulty. Six difficulty presets (Very Easy → Nightmare) tune the march cadence and bomb frequency.
  - Built on the same pure-engine + `requestAnimationFrame` fixed-timestep architecture as Brick Mayhem (`src/arcade/game/star-swarm/`: `constants`, `types`, `sprites`, `engine`, `renderer`), with the canvas palette driven by the active arcade theme's CSS custom properties so it follows light / dark / hi-viz automatically.
  - Mobile-first controls: a sticky bottom control dock with a thumb slider to move the ship and a large hold-to-autofire FIRE button (keyboard ←/→ + Space/↑ also supported). Pauses automatically when a raffle ticket is called, matching Snake and Brick Mayhem.
  - Localized across all eight languages (title, five instructions, difficulty labels, FIRE, and the WAVE readout). Added to the `/arcade` game menu and documented in `docs/STAR_SWARM.md`.
  - Covered by a deterministic engine unit test (`tests/arcade-star-swarm-engine.test.ts`): shot/invader scoring, wave-clear and next-wave progression, bomb-vs-ship life loss + invulnerability, game-over on last life and on formation breach, and the shot cooldown / on-screen shot cap.

## [1.9.0] - 2026-05-29
### Added
- Added a frosted-glass treatment to the ticket-detail modal (shown when tapping a ticket cell on `/` or `/display`), matching the `/new` onboarding dialog so all dialogs share one material.
- Split a dedicated **Current Time** card out of the service card on the display board, with a new `currentTime` translation key across all eight languages.
- Added a `--gradient-status-success` token and `.bg-gradient-status-success` utility, plus dedicated high-contrast cell-number text tokens (`--ticket-unclaimed-text` vibrant yellow `#ffffaa`, `--ticket-returned-text` soft pink `#ffeeee`) reused by both the display cells and the `/admin` Live State boxes.

### Changed
- Reoriented the display-board "Now Serving" (`--ticket-serving`) and "Called" (`--ticket-served`) ticket-cell gradients from diagonal to bottom→top, so the whole board (including returned/unclaimed) shares one gradient direction.
- Reworked the **dark-mode display board** color system: Now Serving is a deep→medium blue cell with white numerals; Called is green/teal with mint numerals; Unclaimed is gold with vibrant-yellow numerals; Returned is red with soft-pink numerals. The large "NOW SERVING" page numeral is light powder blue. The light-mode Called cell gained a deep-teal numeral and a more pronounced gradient.
- Made the `hi-viz` accessibility themes **fully flat** — every fill gradient (card, feature, status, ticket-cell, and serving-text) is overridden to a solid color for high-contrast legibility, in both the light and dark hi-viz variants.
- Reduced the title→content vertical spacing on the top display stat cards.
- `/admin` dark mode: the mark-ticket-as-returned/unclaimed number inputs now use a solid neutral fill matching the other admin inputs (no gradient bleed-through); the Returned/Unclaimed alert-box titles and ticket-number badges use the high-contrast cell colors; the **Next up** card gained its bottom→top gradient (both modes) and a mint-green title in dark.
- Inventory's top control bar no longer swaps the language/theme switcher placement in RTL — it now stays Language-left / Theme-right, consistent with `/`, `/display`, `/new`, and `/arcade`.
- Unified all surface fill gradients to a bottom→top orientation (deeper/lower-lightness shade at the base, lighter at the top), matching the card gradient. Reoriented the `/admin` colorful gradients (`--gradient-card-info`, `-accent`, `-warning`, `-danger`, `-blue`, `-emerald`) from `135deg` to `to top` across light, dark, and both hi-viz themes.
- Gave the previously-solid colorful status fills a matching bottom→top gradient that preserves their saturated intensity: added `--gradient-status-warning` / `--gradient-status-danger` tokens (theme-aware, deepened at the base with the status border color) and applied them to the `/admin` Live State returned/unclaimed alert boxes and the "Mark ticket as returned/unclaimed" sections. Via the shared `.ticket-returned` / `.ticket-unclaimed` classes this also gives the returned/unclaimed ticket cells and legend dots on `/` and `/display` the same gradient.
- Documented the surface-gradient-orientation preference and the flat-hi-viz rule in `docs/UI_DESIGN.md`.

### Fixed
- Fixed the hi-viz "NOW SERVING" numeral disappearing: the flattened `--serving-text-gradient` had been set to a solid color, which is invalid for the `background-clip: text` technique (it needs a `background-image`). It is now a degenerate two-stop gradient that renders flat correctly.
- Fixed the Current Time card's RTL alignment — the title and time now both right-align in Persian/Arabic, while the time digits stay left-to-right via an isolated inner span (which also carries the `service-time` test hook).

## [1.8.0] - 2026-05-28
### Added
- Applied a frosted-glass material treatment (translucent fill + backdrop blur) to floating/overlay surfaces — bottom nav bar, the inventory dietary-filter dropdown and icon popovers, the language and theme switcher menus, and the `/new` onboarding dialog (with a lit edge highlight and dark-mode blue-teal glow shadow). Interim hand-tuned values; tokenization deferred to v2.0. Documented in `docs/UI_DESIGN.md` and `docs/V2.0_PLANNED_FEATURES.md`.
- Added a universal, theme-aware "Prism" card gradient (FEED-aligned) on every `data-slot="card"` surface for cross-app brand consistency. Implemented as a translucent `--card-gradient` overlay (`color-mix` brand tint at the base lifting to a light/dark highlight at the top) so it augments each card's existing fill rather than replacing it — opaque and translucent (`bg-card/80`) cards both keep their fill. Disabled in the `hi-viz` themes to preserve high-contrast legibility; arcade cards are unaffected (separate component, no `data-slot="card"`).

### Changed
- Restyled the `/inventory` category tables to sit cleanly on the new card gradient: removed the alternating row-fill zebra striping and the `CardHeader` (`bg-muted/45`) and column-header (`bg-background/70`) band fills, so the card gradient flows uninterrupted with only hairline `border-b` dividers for structure.

### Fixed
- Fixed the `/` and `/display` ticket-detail modal: the top control bar (language switch, search, theme switch) was `z-50` — above the dialog's `z-40` blur overlay — so it stayed sharp in the foreground when a ticket was tapped. Lowered it to `z-30` (matching `/new` and `/inventory`) so those controls blur out with the rest of the background, keeping focus on the ticket info.

## [1.7.4] - 2026-05-28
### Changed
- Removed the "X categories" / "X items" totals pills from the `/inventory` page's upper section (title/freshness area). The per-category header "X items" badge is unchanged. Pruned the now-unused `inventoryCategoriesLabel` translation key from all eight languages.

## [1.7.3] - 2026-05-26
### Changed
- Migrated `readonly-display.tsx` (used by `/new` and `/display`) onto the shared `ScrambleOnLanguageChange` provider and `<T>` consumer, removing its duplicate local scramble-trigger logic (`PlainText`, `ScrambleText`, the local `T`, the trigger state, and the language-change effect). Behavior is unchanged — the `languageTextAnimation` prop still toggles the effect via the provider's `enabled` flag, with the same 0.35s/0.02 timing — but the scramble-on-language-change logic now lives in one place shared with `/inventory`.

## [1.7.2] - 2026-05-26
### Added
- Added a reusable `ScrambleOnLanguageChange` provider and `<T>` consumer (`src/components/core/scramble-text.tsx`) that play the TextScramble transition on an explicit language change (static on mount, rerenders, and no-op updates), generalizing the effect previously local to the personalized display.

### Changed
- The `/inventory` page now plays the TextScramble transition across the whole page when the language changes — page chrome (title, "Updated:", totals, dropdown, legend, column headers) as well as FEED-translated category/item names and limit strings — matching the motion language of `/new`.
- Renamed the `/inventory` "Limited" status label to **"Limited Supply"** (with equivalents across all eight languages) to distinguish a limited *amount of stock* from the per-household / per-person *request limit* that already lives in the Limit column. Affects both the legend chip and the icon-badge popup; the translation key (`inventoryStatusLimited`) is unchanged.
- Collapsed the dedicated **Status** column on the `/inventory` table: the Limited and Clearance status icons now render inline to the left of each item's name (desktop table cell and mobile list row), and the desktop column widths rebalance to Item 40% / Limit 20% / Dietary (remainder). The legend still explains what each icon means; the `inventoryColumnStatus` translation key is retained for potential reuse.

## [1.7.1] - 2026-05-26
### Changed
- Localized the remaining English strings on the `/inventory` page so they render in the selected language: the freshness "Updated:" prefix, the totals badges ("X categories" / "X items"), the per-category items badge, the table column headers (Item / Limit / Status / Dietary), and the per-item / per-category limit text ("Limit N per household" / "Limit N per person"). Adds nine translation keys across all eight supported languages; the page now uses a local localized formatter with the same null/non-finite/≤0/≥100 sentinel-hiding logic as the lib's `formatFeedLimit` (which stays unchanged for its unit tests).

## [1.7.0] - 2026-05-26
### Added
- Localized the `/new` onboarding modal: added `chooseLanguage`, `ticketFormatHint`, `drawingNotStartedHint`, and `justBrowsing` keys across all eight languages so the modal title, the ticket-format hint, the pre-drawing reassurance copy, and the "I don't have a ticket — just browsing" dismiss render in the selected language.
- Added the "Enter a new ticket number" action to the `/new` "Pantry Has Closed For The Day" personalized state, matching the generated-numbers state (personalized view only; the public display is unaffected).

### Changed
- Reworked the `secondary` color token into an adaptive neutral (light: near-white gray + near-black text; dark: dark gray + near-white text), fixing white-on-light-teal `secondary` badges and buttons that failed WCAG AA in both light and dark mode (most visibly the dark-mode `/inventory` count pills). Aligns with the FEED app's adaptive-neutral secondary; the `hi-viz` themes were left as-is.
- Switched the `/inventory` informational count pills (category/item totals and per-category counts) to the quieter `outline` badge treatment.
- Reworked the `/new` ticket onboarding so a client holding a physical ticket is never blocked before the operator starts the drawing: a valid-format number is always accepted and saved (the existing "not in the drawing yet — check back soon" holding state then shows), the red gate error became calm copy, and an "I don't have a ticket — just browsing" action dismisses the modal onto the page + nav bar.
- Simplified `home-ticket-storage.ts` to a flat 8-hour client-side TTL from entry time (dropping the operating-hours/pantry-day expiry), while keeping the drawing-range clearing that protects both `/new` and the Arcade now-serving banner from tracking stale tickets. The onboarding modal no longer auto-reopens on a stale/cleared ticket, removing the prior reset-loop path.
- Removed the obsolete `/arcade` Back button now that the persistent bottom navigation handles switching between Your ticket, What's in stock, and Games.
- Fixed bottom navigation label rendering in non-English languages — long translated labels (e.g. Russian "Что есть в наличии") now wrap centered with readable line spacing and keep tab icons aligned (top-aligned, matching the arcade variant) instead of rendering off-center.

### Fixed
- Fixed the display-page QR code continuing to show the default URL after an admin configured a custom display URL. The QR target now derives from the live polled state (`state.displayUrl`) instead of a one-time fetch on mount, so an admin change propagates to the QR on the next poll without a page reload (and a redundant network round-trip is removed).

## [1.6.99] - 2026-05-26
### Added
- Added an arcade-styled bottom navigation bar (`src/arcade/components/arcade-bottom-tab-bar.tsx`) for the `/arcade` index, reusing the same three destinations and `nav*` labels but rendered with pixel-art icons (`src/arcade/components/icons/{receipt,shopping-cart,gaming}-icon.tsx`) and arcade styling (arcade CSS variables, the control-dock border/neon-shadow pattern), inheriting the arcade font and theme from `.arcade-scope`. Kept separate from the core `BottomTabBar` per the Arcade guardrails.
- Added an animated `package-check` icon (`src/components/animate-ui/icons/package-check.tsx`) built on the native animate-ui `path` draw-on primitive — the box, seam, top, stem, and finally the check stroke draw themselves in — used as the `/inventory` dietary-filter dropdown trigger.
- Added `inventoryDietaryFilterLabel` and `inventoryClearFilters` translation keys across all eight supported languages.
- Added the persistent bottom tab navigation bar (`src/components/navigation/bottom-tab-bar.tsx`) with three destinations (Your ticket → `/new`, What's in stock → `/inventory`, Games → `/arcade`): a desktop floating capsule dock and a mobile full-width blurred bar, route-aware active state via `usePathname()`, localized labels with RTL support, and a `prefers-reduced-motion` guard. Per-page placement (Option 1) with a module-level guard so the active-tab mount animation plays once per page load, not on client-side navigation.
- Added three imperative-ref animated nav icons in `src/components/lucide-animated/` following the existing `archive.tsx` pattern: `ticket.tsx` (clipped halves rip apart and spring back), `cart.tsx` (scale pop + hop), and `gamepad-2.tsx` (controller wiggle while the d-pad and face buttons fade out and back), plus the `src/components/navigation/nav-items.ts` config (label key, route, icon, active matcher).
- Added `navTicket`, `navInventory`, `navGames`, and `navPrimaryLabel` translation keys across all eight supported languages, grounded in the existing reviewed vocabulary.
- Added `docs/NAVIGATION.md` documenting the approved persistent bottom-tab navigation direction: three destinations (`/new`, `/inventory`, `/arcade`), desktop floating-dock vs mobile tab-bar presentations, active/inactive states, the imperative-ref animated-icon plan (ticket-rip, cart-hop, gamepad wiggle), the active-tab-only-on-mount motion decision, arcade-boundary considerations, and an implementation checklist.
- Added `docs/FEED_PUBLIC_INVENTORY.md` documenting the FEED public inventory data contract, translation mapping, intended LOTTO usage, fetch rules, UI boundaries, and first-implementation acceptance criteria.
- Added `/inventory`, a client-facing FEED public inventory lookup that fetches the read-only endpoint without credentials and renders in-stock items as category tables with freshness, limits, status tags, dietary flags, and FEED-provided translations where available.
- Added a `See what's in stock` entry point from `/new` to `/inventory`.
- Added `src/lib/feed-public-inventory.ts` plus tests covering FEED fetch options, language fallback, limit formatting, category-table rendering, filtering, and the `/new` inventory link.
- Documented `/new` inventory rollout blockers in `docs/ISSUES.md`: aggressive text morph animation and ticket-selection reversal/pantry-day expiration semantics.
- Added a shared semantic haptics layer (`src/lib/haptics.ts`, `HapticsProvider`, `useAppHaptics()`) with app-owned intent names for browser-safe button-style interactions on `/new` and Arcade.
- Added regression coverage for the simplified provider, `/new` button haptics, Arcade direct button haptics, Arcade ticket-called visual-only behavior, and theme/language integration (`tests/haptics-provider.test.tsx`, `tests/new-page-haptics.test.tsx`, `tests/arcade-direct-input-haptics.test.tsx`, plus updated Arcade banner and theme tests).
- Added a raw-library `/haptics` diagnostic page that renders one shadcn button per `web-haptics` built-in preset and triggers each preset directly, so device/browser support can be validated without the app's semantic mapping layer.

### Changed
- Rendered the arcade-styled navigation bar on the `/arcade` index only (not on the game routes `/arcade/snake` and `/arcade/brick-mayhem`, which keep their own Back control) and increased the index's bottom padding so the fixed bar does not cover the game cards.
- Applied the bottom tab navigation bar to `/new` and removed the now-duplicate "See what's in stock" (→`/inventory`) and "PLAY GAMES" (→`/arcade`) buttons from the personalized ticket-card cluster, along with the orphaned arcade pixel-frame and arcade display font from `readonly-display.tsx`. The "Enter a new ticket number" action stays as a standalone button (page action, not navigation). Added bottom clearance on the personalized display so the fixed bar does not cover the ticket card; the public `/display` is unaffected.
- Updated the inventory test's `/new` entry-point cases to assert the bar's inventory/games links instead of the removed cluster buttons.
- Condensed the `/inventory` dietary filters from a wrapping row of toggle buttons into a single multi-select dropdown (shadcn `DropdownMenuCheckboxItem`), where each option shows its dietary icon and selecting one keeps the menu open for combining flags. The trigger uses the animated `package-check` icon, shows a selected-count badge, and a Clear action appears once any flag is active. The status legend (Limited / Clearance) is retained alongside it.
- Removed the `/inventory` BACK button now that the persistent bottom tab bar's "Your ticket" tab is the return path (the docs/NAVIGATION.md follow-up); the `next/link`, `ChevronLeft`, and `Check` imports it relied on were dropped.
- Rendered the bottom tab navigation bar on `/inventory` as the first integration (per the Option 1 per-page placement), and added bottom scroll-area clearance so the floating dock does not cover the last inventory rows. The `/new` + `/arcade` integrations remain tracked as follow-ups in `docs/NAVIGATION.md`.
- Updated `/new` and Arcade personalized-ticket persistence to validate stored tickets against pantry operating-hours timezone, next pantry-day opening, and active LOTTO range instead of only browser-local midnight.
- Replaced translated UI text morphing with TextScramble (`duration=3.0`, `speed=0.5`), kept `/new` language onboarding static, and removed morph/rolling animation from the large public-board serving value.
- Moved the `/new` inventory entry point into the existing personalized-card action stack between `Enter a new ticket number` and `PLAY GAMES`, and added production FEED fallback behavior when a configured inventory endpoint fails.
- Standardized `/inventory` top controls with `/new` by anchoring the language switcher top-left and theme switcher top-right, with Back navigation moved into the inventory content header.
- Localized the `/new` `See what's in stock` inventory CTA through the shared language map for all supported display languages.
- Localized `/inventory` title/search copy, removed the FEED-oriented explainer and `Pantry inventory` eyebrow, and restyled inventory search to match the public-board ticket search control treatment.
- Removed the visible `/inventory` Refresh button so the client page stays focused on browsing and searching available items.
- Constrained `/inventory` to a fixed-height shell with a shadcn/Radix `ScrollArea` for inventory results so the top controls and status/dietary legend remain visible while browsing item sections.
- Added inner padding to the `/inventory` results `ScrollArea` so inventory table card shadows are not clipped by the scroll viewport.
- Changed the `/inventory` Back button to the primary button treatment and localized its label through the shared `back` translation key.
- Moved `/inventory` search into the centered top-control slot used by the homepage and center-aligned the inventory title, freshness timestamp, and totals.
- Simplified the `/inventory` legend by removing its card frame and section headings, enlarging the pills/icons/text, and showing `=` between each icon and term.
- Increased `/inventory` legend label text and icon sizes with explicit badge icon overrides so the enlarged pills read proportionally.
- Made `/inventory` dietary legend pills interactive filters with checkmark indicators, while leaving status tags as static legend entries.
- Reworked the `/inventory` legend so dietary filters occupy the primary pill row, status keys render below as plain `icon = label` entries, and dietary icons are larger inside item lists.
- Moved the `/inventory` Back control into the inventory title row and simplified it to an icon-only chevron button matching the language/theme trigger style, with the localized label preserved for assistive technology.
- Updated FEED inventory documentation, README, project overview, and env examples to reflect the runtime `/inventory` integration and optional FEED endpoint override.
- Extended optional client-device haptics from Arcade-only to `/new` and kept `/`, `/display`, admin, staff, and login haptic-free.
- Narrowed browser haptics to direct button-style interactions only: `/new` and Arcade buttons, menu selections, theme/language choices, explicit submit/back/change-ticket actions, and Snake D-pad button presses.
- Removed the dedicated haptics toggles and persisted `haptics-enabled` preference because browser haptics are intentionally scoped to narrow tactile feedback and the toggle consumed higher-value top-bar space.
- Removed Snake and Brick Mayhem difficulty slider haptics so non-button controls remain silent in line with the narrowed browser scope.
- Removed unreliable web haptics from async and game-loop-driven events: tracked ticket-called celebrations, Snake pellet/collision feedback, and Brick impact/contact/level-clear/life-loss feedback are now visual-only on the web path.

### Fixed
- Fixed a `/new` reset-edge loop where a tab left open across staff reset could accept a ticket while no active range existed, immediately invalidate the stored ticket, and reopen the ticket modal repeatedly; ticket submit now waits until today's ticket range is ready.
- Lowered the `/new` floating header stacking level so the William Temple House logo stays behind the shared language onboarding modal backdrop while “Choose your language” has focus.
- Fixed production inventory loading by allowing `https://feed.williamtemple.app` in the app Content Security Policy `connect-src` directive.
- Hid FEED inventory limit values of `100` or higher so no-limit categories/items no longer display misleading copy such as `Limit 100 per household`.
- Removed the `None listed` filler from empty inventory tag cells so items without status/dietary tags leave that field blank.
- Split FEED inventory status tags and dietary flags into separate table columns, using FEED-aligned icons for Limited, Clearance, and dietary flags.
- Added an inventory legend/key for status and dietary icons, and changed category-table status/dietary cells to icon-only values with accessible labels.
- Added tap/click popovers for inventory status and dietary icons with localized labels across LOTTO's supported languages.
- Changed inventory freshness to display the latest included item `updatedAt` timestamp instead of FEED response `generatedAt`.
- Aligned the haptics implementation with browser activation constraints by concluding the feature as tactile input feedback rather than broad event-driven vibration.

## [1.6.3] - 2026-04-16
### Fixed
- Replaced the one-word `Unauthorized` Sonner toast shown when a staff member's admin sign-in expires mid-session with an ASK-compliant message (`Your sign-in expired. Sign back in to keep working.`) and an inline `Sign in` action button that routes to `/login?callbackUrl=<current-path>` so staff return to the same admin surface after re-auth (Issue 18).
- Mapped 401 responses from `/api/state` and `/api/state/cleanup` to the new session-expired toast inside both the legacy and optimistic admin action dispatchers, so draw, mark, reset, and cleanup taps all surface the same ASK copy on auth expiry instead of echoing the raw HTTP token.

### Added
- Added `src/lib/session-expired.ts` with `SESSION_EXPIRED_MESSAGE`, `SessionExpiredError`, and `showSessionExpiredToast()` so future callers can classify 401s without re-implementing the toast + callback URL plumbing.
- Added `tests/admin-session-expired.test.tsx` verifying that `/admin` swallows the raw `Unauthorized` token on a 401 action response and surfaces the ASK copy + `Sign in` action instead.

### Changed
- Logged the error-message violation and fix in `docs/ISSUES.md` as Issue 18 with the ASK rubric breakdown and Option 5 implementation notes.

## [1.6.2] - 2026-03-05
### Added
- Added haptic feedback via `web-haptics` library across all arcade interactions. Scoped exclusively to arcade routes per project separation rules.
  - **Ticket called:** `buzz` pattern fires once when a tracked ticket is called (`NowServingBanner`), timed with the confetti burst for multi-modal confirmation.
  - **Brick Mayhem — brick destruction:** `error` pattern on brick hit, throttled to one trigger per 50ms to prevent buzz fatigue on multiball runs.
  - **Brick Mayhem — paddle bounce:** `light` pattern on ball-paddle collision, throttled to 50ms.
  - **Brick Mayhem — ball lost / game over:** `error` pattern on ball drop.
  - **Snake — pellet eaten:** `success` pattern on each pellet collection.
  - **Snake — game over:** `error` pattern on wall or self-collision.
  - **Arcade buttons:** `heavy` pattern on all arcade button presses via the shared `Button` component (`src/arcade/ui/8bit/button.tsx`); disabled buttons suppress haptics.
- Exposed `paddleBounced: boolean` in `TickResult` from the Brick Mayhem engine so page-level haptic hooks can detect paddle contact without modifying pure engine logic.
- Platform support: Android Chrome/Firefox and iOS26 Safari. Graceful no-op on unsupported platforms via `WebHaptics.isSupported`.

## [1.6.1] - 2026-03-01
### Fixed
- Resolved `/new` page-load animation issue (Issue 17) where morph text animated on initial render instead of appearing statically. Root cause: hydration-safe motion tiering starts as `"simple"`, then upgrades to `"full"` post-mount, causing a render-branch switch that Motion treats as new entering elements. Fixed by pinning the cycling language title to `motionMode="simple"`, which prevents the branch switch entirely. The title still animates smoothly between language cycles using whole-text transitions.
- Removed unnecessary `LanguageMorphText` from the `/new` ticket-entry modal step (step 2), replacing with plain `<span>` elements. This step only appears after language selection, so the text never changes while visible.
### Changed
- Updated `docs/ISSUES.md` Issue 17 with full root cause analysis covering the motion-tier branch-switch mechanism, why `AnimatePresence initial={false}` and `layoutId` interact to prevent suppression, and why previous approaches (fast-phase workaround, delay-mount pattern) failed.
- Updated `docs/V1.5_OPTIMIZATIONS.md` with a known limitation note on the motion-tier system's interaction with `AnimatePresence` on immediate-mount components.
- Updated `docs/V2.0_PLANNED_FEATURES.md` to reflect the `/new` cycling title compromise.

## [1.5.9] - 2026-02-28
### Added
- Added personalized-ticket called celebration to `/new` (via `ReadOnlyDisplay` personalized mode): when the tracked ticket is called, the page now shows a centered overlay (`Ticket Called!` / `Please Check-in`) and runs a timed confetti effect.
- Added regression coverage in `tests/readonly-display-personalized.test.tsx` to verify called-ticket overlay rendering and confetti trigger behavior.
### Changed
- Updated the `/new` called-ticket overlay backdrop to match shared modal treatment (`bg-black/40` + `backdrop-blur-sm`) for stronger text readability during the alert.

## [1.5.8] - 2026-02-28
### Fixed
- Stabilized hydration for top-bar dropdown controls by assigning deterministic trigger IDs to `LanguageSwitcher` and `ThemeSwitcher`, eliminating Radix auto-generated trigger-id drift between SSR and client hydration.
### Added
- Added regression coverage in `tests/language-switcher.test.tsx` and expanded `tests/theme-switcher.test.tsx` to enforce deterministic dropdown trigger IDs.

## [1.5.7] - 2026-02-28
### Fixed
- Fixed `/new` hydration mismatch tied to animated text tiering by making `useMotionTier` deterministic on first render (`simple`) across SSR and client hydration, then applying stored/runtime motion preferences after mount.
### Added
- Added hydration-regression coverage in `tests/morphing-hydration.test.tsx` to guard against server/client DOM-shape divergence when a stored motion tier (for example `full`) is present before hydration.

## [1.5.6] - 2026-02-28
### Changed
- Restored Brick Mayhem gameplay readout to the minimal 3-metric banner (`SCORE`, `LIVES`, `LEVEL`) by removing the additional active-effects HUD row.
- Removed Brick Mayhem effect-HUD specific styling from Arcade CSS while keeping all gameplay effects (speed, multiball, clone paddle, timed buffs) active in the engine.
- Updated `docs/GAME.md`, `docs/BRICK_MAYHEM.md`, and `docs/V2.0_PLANNED_FEATURES.md` to reflect the readout rollback.
- Updated Brick Mayhem ball color to a neutral theme-aware mapping: dark mode `#ffffff`, light mode `#000000`.

## [1.5.5] - 2026-02-28
### Added
- Added Brick Mayhem row-hit effect architecture in `src/arcade/game/brick-mayhem/`: shared row metadata (`effects.ts`), multiball-capable world state (`balls[]`), timed effect state (`pink` paddle width and `gold` points multiplier), and clone paddle state (`green`).
- Added Brick Mayhem engine safety/behavior rules: baseline-based non-compounding speed effects (`red`/`cyan`/`purple`), runtime ball-speed clamps (`0.6..4.0 px/tick`), orange split-ball spawn handling, timed effect extension with hard cap (`30s` add, `120s` max), and level-clear effect reset semantics.
- Added Brick Mayhem effect HUD in the game page (active balls count + active effect tags with timers) and localized the new Brick Mayhem HUD/effect labels across all 8 languages.
- Added `tests/arcade-brick-mayhem-engine.test.ts` covering non-compounding speed effects, multiball life-loss behavior, timed effect cap behavior, clone paddle behavior, and effect reset on next-level world creation.
### Fixed
- Fixed Brick Mayhem live score/readout synchronization so score updates immediately when bricks are destroyed during active play (not only on life loss/level transitions).
- Removed duplicated Brick Mayhem row palette definitions by centralizing row color/effect data and reusing it from renderer + particle systems.
### Changed
- Updated `docs/BRICK_MAYHEM.md`, `docs/GAME.md`, and `docs/V2.0_PLANNED_FEATURES.md` to reflect the shipped Brick Mayhem effect system, lifecycle rules, HUD changes, and new engine test coverage.

## [1.5.4] - 2026-02-27
### Changed
- Updated root app metadata (`title` and `description`) to the new LOTTO branding/copy so homepage search snippets align with current staff-facing product messaging.
- Updated `/staff` hero descriptive paragraph copy to exactly match the LOTTO branding description used in homepage metadata.
- Removed the duplicate short `/staff` hero subtitle so only the LOTTO title and full descriptive paragraph are shown.
- Added a `/staff` Arcade CTA button linking to `/arcade`, reusing the same pixel-style button appearance used on `/new`.
- Adjusted the `/staff` Arcade CTA so the 👾 icon renders after the button label instead of before it.
- Fixed `/staff` Arcade CTA hydration mismatch by forcing its animated label to render in deterministic `simple` motion mode across SSR and client hydration.
- Updated `/staff` CTA layout so `PLAY GAMES` is positioned directly underneath `View Public Board`.
- Added a second playable-style game card on `/arcade` with title `BRICK MAYHEM` and button label `PLAY`, while keeping the existing `More Games Coming Soon` card unchanged.
- Updated `/arcade` game-menu CTAs so the Snake card button now reads `PLAY`, and centered the `More Games Coming Soon` card in the two-column desktop layout.

## [1.5.3] - 2026-02-20
### Added
- Expanded automated test coverage from ~25-30% to ~60-65% with 226 new test cases across 13 new test files covering pure utilities (RTL, date, time, class merging), all 15 API route action handlers, the Postgres state manager (full CRUD + snapshots), admin page interactions and v1.5.1 memoized computations, and key UI components (public display page, confirmation dialog, operating hours editor, public board variant).
- Updated `docs/V2.0_PLANNED_FEATURES.md` with cross-cutting test coverage expansion section.
- Refreshed `docs/V1.5_OPTIMIZATIONS.md` with a source-backed compatibility baseline check for iPad mini 4 (best-effort support), updated unresolved `/admin` latency risks, and revised optimization priorities.
- Documented `docs/ISSUES.md` Issue 16 covering the reset-state admin regression where "Tickets issued" displays `1` with no active range, including proposed guard-based fix and validation checklist.
- Added optimistic-admin regression coverage (`tests/admin-optimistic-ui.test.tsx`) for immediate draw updates, queue-one tap behavior, and rollback on failed actions.
- Updated `docs/ISSUES.md` Issue 14 and `docs/V1.5_OPTIMIZATIONS.md` to log the post-input-optimization finding that button latency remains the primary iPad mini 4 pain point and to document optimistic-action rollout criteria.
- Updated `docs/ISSUES.md` and `docs/V1.5_OPTIMIZATIONS.md` to track the new draw-path pending/render isolation pass (split draw vs non-draw pending channels and memoized Draw Position controls).
- Updated `docs/ISSUES.md` and `docs/V1.5_OPTIMIZATIONS.md` to track the new history-cost optimization pass (deferred draw snapshot refresh and capped progressive snapshot option rendering).
- Added motion-tier classification test coverage (`tests/motion-tier.test.ts`) for automatic morph animation fallback behavior.
### Fixed
- Corrected `/admin` Live State `Tickets issued` so reset sentinel state (`startNumber=0`, `endNumber=0`) now renders `—` instead of `1`, and added a regression test in `tests/admin-page-actions.test.tsx`.
- Prevented unhandled promise rejections in `/admin` draw-navigation handlers (`next`, `prev`, and direct serving updates) by catching `sendAction` failures after toast reporting.
- Isolated `/admin` Start/End range inputs and reset phrase input into local-state memoized sections so keystrokes no longer trigger root-page re-renders, and optimized range preview undrawn math to an O(1) end-extension path.
- Decoupled `/admin` snapshot refresh from action completion and initial interactive load (`sendAction`, `fetchState`, undo/redo) so slow snapshot listing no longer blocks visible state updates.
- Added regression coverage for slow snapshot listing to verify load/action UI is not blocked (`tests/admin-page-actions.test.tsx`).
- Updated `docs/V1.5_OPTIMIZATIONS.md` and `docs/ISSUES.md` to reflect the shipped keystroke-isolation and range-preview optimizations.
- Updated docs to note on-device iPad mini 4 validation: responsiveness improved, but input lag remains a known issue.
- Implemented feature-flagged optimistic `/admin` action dispatch (`NEXT_PUBLIC_ADMIN_OPTIMISTIC_UI`) with deterministic local patches, queue-one draw navigation intents, rollback-safe failure handling, and background snapshot refresh reconciliation.
- Routed display URL writes through the unified `/admin` action dispatcher (`setDisplayUrl`) so optimistic and non-optimistic paths share consistent error handling and state reconciliation.
- Split `/admin` pending state into `pendingDrawAction` and `pendingNonDrawAction` so draw-position taps no longer mute unrelated controls like mode/settings/history sections.
- Isolated draw-position controls into memoized `DrawPositionControls`, reducing draw-path render fan-out on older devices.
- Deferred draw-triggered snapshot refresh (`DRAW_SNAPSHOT_REFRESH_DELAY_MS`) and capped History snapshot option rendering (`SNAPSHOT_RENDER_PAGE_SIZE`) with a clearer "Show older snapshots" checkbox affordance (including animated archive icon that now triggers on checkbox toggle) to reduce iPad layout/reflow pressure during draw taps.
- Added regression coverage for History option capping/progressive expansion and non-draw control availability during pending draw actions (`tests/admin-page-actions.test.tsx`, `tests/admin-optimistic-ui.test.tsx`).
- Added automatic morph-text motion tiering (`full/simple/off`) using reduced-motion preference + runtime frame probe + capability hints with local persistence, so older devices degrade animation without introducing manual controls.

## [1.5.1] - 2026-02-19
### Changed
- Memoized all admin page derived computations (`returnedTickets`, `unclaimedTickets`, `currentIndex`, `nextFive`, `nextServingIndex`, `prevServingIndex`, `ticketsCalled`, `peopleWaiting`, `drawnSet`, `serverUndrawnCount`, `previewUndrawnCount`) with `React.useMemo` to eliminate redundant recomputation on every keystroke.
- Removed duplicate snapshot fetch (`useEffect([state])` calling `listSnapshots`) from admin page; `canUndo` is now derived from the already-loaded `snapshots` array.
- Changed DB `listSnapshots` query to fetch metadata only (`id`, `created_at`), omitting full `payload` column; reduces snapshot listing response size by ~95%.
- Added `touch-action: manipulation` to all interactive elements (`a`, `button`, `input`, `select`, `textarea`, `[role="button"]`) in `globals.css` to eliminate ~300ms iOS Safari double-tap delay.
- Updated `docs/V1.5_OPTIMIZATIONS.md` with implementation status for Phases 1, 2, and 4a.
- Updated `docs/ISSUES.md` Issue 14 status to reflect partial resolution.

## [1.5.0] - 2026-02-18
### Changed
- Promoted the public board routes for production testing: `/` is now the default public display and `/display` remains a live alias with the same behavior.
- Added `/new` as the preview personalized homepage surface (language + ticket onboarding, personalized ticket card), intended for future promotion to the default homepage.
- Added a shared public-display page implementation used by both `/` and `/display` to keep behavior parity while maintaining separate URLs.
- Marked Arcade as a v1.5.0 preview feature with one playable game (`Snake`) available under `/arcade` and `/arcade/snake`.
- Updated the `FOOD PANTRY SERVICE FOR` card to show device-local, locale-aware service time once drawing starts, including clearer RTL clock rendering.
- Documented a new admin performance issue in `docs/ISSUES.md` capturing significant input/tap lag on slower devices (for example iPad mini 4), including root-cause references for render-time queue computations and repeated snapshot-history fetches.

## [1.4.4] - 2026-02-14
### Changed
- Added explicit Arcade guardrails to `AGENTS.md` requiring clean route/code/style separation from raffle features.
- Documented the Arcade architecture boundary (`src/app/(arcade)/arcade/*` and `src/arcade/*`) and clarified that Arcade must not be integrated into the public display page.
- Replaced `docs/GAME.md` strategy with a separation-first Snake plan using standalone Arcade routes and simple pixel-art UI direction instead of raffle UI element reuse.
- Added `docs/V2.0_PLANNED_FEATURES.md` with v2.0 scope: standalone Arcade page, persistent top "NOW SERVING" banner, game menu, and Snake as launch game.
- Added a dedicated Arcade route group with `/arcade` and `/arcade/snake`, including a persistent top `NOW SERVING` banner and an 8-bit launch menu focused on Snake.
- Added `/display` as a first-party alias of the public homepage display so `williamtemple.app/display` serves the same read-only board content as `/`.
- Updated `/staff` “View Public Board” CTA target to `/display` so staff navigation uses the stable display URL.
- Decoupled `/display` from `/` page re-export and removed the homepage (`/`) QR panel while keeping `/display` QR-enabled and operationally unchanged.
- Removed homepage (`/`) top-bar ticket search controls and replaced the center slot with WTH logo branding, keeping `/display` as the unchanged search-enabled board route.
- Removed the redundant board-row logo on homepage (`/`) so `NOW SERVING` is centered beneath the top-bar logo, while `/display` keeps its original board-row logo.
- Swapped public routes for production testing: `/` now serves the searchable public board, `/new` now serves the personalized homepage onboarding flow, and `/display` remains a live non-redirecting alias of the public board.
- Updated the `FOOD PANTRY SERVICE FOR` info card to also show device-local service time once drawing has started (batch or full), with locale-aware formatting based on the selected display language and LTR-isolated left justification for clearer RTL clock rendering.
- Added a homepage (`/`) load-time language-picker modal (“Choose your language”) with buttons for all supported languages, wired to the existing language context/localStorage selection flow.
- Updated the homepage language-picker modal title to auto-cycle through supported-language variants every 5 seconds using the same morph-text animation pattern used elsewhere for language transitions.
- Extended homepage (`/`) onboarding to a second modal step that prompts for a ticket number after language selection and submits directly into the existing display ticket lookup flow.
- Added homepage ticket-input normalization for deli-style formats (`C17`, `B07`, `X53`) and plain numeric input (`53`), collapsing all accepted formats to a shared numeric `00`-`99` lookup value.
- Refined homepage onboarding ticket-entry copy: title now reads “Enter your ticket number,” placeholder reads “ENTER TICKET #,” primary action reads “Submit,” and the extra helper sentence was removed.
- Added a top-left back-arrow control on the homepage ticket-entry modal step so users can return to language selection before submitting a ticket.
- Reordered ticket detail modal metrics to the new hierarchy (`Estimated Wait`, then `Tickets Ahead`, then `Queue Position`), while preserving existing returned/unclaimed/called status messaging behavior.
- Replaced homepage (`/`) `DRAWING ORDER` ticket grid card content with a personalized ticket card variant (`YOUR TICKET`) that shows inline ticket-specific rows, status notes, and an `Enter a new ticket number` action.
- Scoped personalized-card behavior to homepage (`/`) only: `/display` retains the existing searchable full-grid board with legend/key and ticket detail modal interactions.
- Added homepage inline fallback handling for tickets not yet present in draw order, showing a localized check-back message plus `CHECK BACK SOON` value placeholders.
- Added localized personalized-card labels/actions/messages across all supported display languages and introduced targeted tests for the modal order and homepage personalized card behavior.
- Corrected ticket-ahead and wait-time calculations so the currently serving shopper is counted as ahead for upcoming tickets (for example, next-in-queue now shows `1` ahead with an estimated `2 minutes` wait).
- Added homepage ticket-number persistence in browser `localStorage` (`homepage-ticket-selection-v1`) with auto-expiry at local midnight, so refreshes retain the client’s ticket while preventing carry-over into the next service day.
- Updated localized homepage `Enter a new ticket number` button text translations to the new intent-based phrasing (replacing legacy all-caps/change-ticket wording in non-English locales).
- Added a centered secondary CTA under homepage personalized ticket controls that links clients directly to `/arcade` (`👾 PLAY GAMES`), with localized copy across supported languages.
- Styled the homepage personalized-card Arcade CTA with an Arcade-like pixel treatment (retro frame + action colors) and applied the same Arcade display font to the CTA text (emoji excluded), while keeping implementation scoped to core display code.
- Added ticket-aware Arcade banner behavior that reads persisted homepage ticket selection: no ticket keeps animated `NOW SERVING`, while tracked tickets show `ESTIMATED WAIT` in `#h #m` format.
- Added called-ticket Arcade reaction flow using `react-canvas-confetti`: when the tracked ticket is called, Arcade dispatches a pause event and Snake auto-pauses active runs before confetti celebration.
- Updated Arcade tracked-ticket wait formatting to full units with a sub-hour exception (`# minutes` when under one hour; otherwise `# hours # minutes`), removed the tracked wait value border frame, and reduced `ESTIMATED WAIT` label sizing so longer localized strings fit within the banner.
- Fixed Arcade Snake settings card surface fill by applying panel background through the full card wrapper (removing the transparent top strip).
- Localized the Snake settings card title by replacing hardcoded `DIFFICULTY SETTING` with a new translated `snakeDifficultySettingTitle` key across all supported languages.
- Increased Arcade banner typography scale for Arabic, Persian, and Chinese locales (approximately 2x) to improve readability for `NOW SERVING` and `ESTIMATED WAIT` states.
- Increased Arabic/Persian/Chinese typography in Snake gameplay surfaces so the readout labels (`SCORE`, `LENGTH`), settings-row value line (`SETTING: ...`), and center control label (`START`/`PAUSE`/`PLAY`) render at a larger, easier-to-read size.
- Refactored Snake board rendering to a single canvas paint path (grid + snake + pellet) and removed CSS pseudo-grid layering to eliminate small-screen subpixel drift/misalignment between grid cells and gameplay pixels.
- Updated Arcade tracked-ticket called-state UX: when a ticket is called, the banner now replaces wait copy with `TICKET CALLED!` / `PLEASE CHECK-IN`, animates the alert into viewport center for 10 seconds with flashing emphasis, and repeats confetti bursts during that alert window.
- Moved the called-state Arcade check-in callout to a fixed center overlay with responsive max-width/clamp typography so translated callout text no longer crops on smaller screens during center-scale animation.
- Added runtime viewport-fit scaling for the called-state check-in overlay (client-side measured) so longer localized strings like Russian dynamically downscale to stay fully visible during center animation.
- Added a temporary called-state backdrop dimmer behind the centered check-in callout (matching `GAME OVER` darkening treatment) while the 10-second ticket-called alert animation runs.
- During active ticket-called overlays, the top banner now remains populated with live `NOW SERVING: #<ticket>` status instead of hiding banner content.
- Fixed called-state overlay persistence by limiting center callout rendering to the active alert window and dismissing it immediately when Arcade play resumes.
- Added Arcade-scoped 8bitcn-style shadcn wrappers under `src/arcade/ui/8bit/*` and isolated Arcade styling in `src/arcade/styles/arcade.css` to avoid collisions with shared raffle UI.
- Added `@8bitcn` registry metadata in `components.json` for future retro component pulls while keeping current imports separated in Arcade paths.
- Added self-hosted `Press Start 2P` font asset (`src/arcade/fonts/PressStart2P-Regular.ttf`) and applied it via `next/font/local` to Arcade-only layout typography.
- Pruned `src/arcade/lucid_icons` to runtime-useful assets (`SVG/Flat`, `PNG/Flat/16`, `PNG/Flat/32`, and `License`) and removed shadow/spritesheet/Aseprite/source-support extras.
- Enforced `Press Start 2P` as the default inherited typeface across the entire Arcade scope unless a component explicitly overrides it.
- Reduced `/arcade/snake` gameplay instruction copy by four Tailwind size steps total for a cleaner card fit on smaller screens.
- Added a centered `PLAY NOW` Arcade button beneath the `/arcade/snake` instructions card.
- Added a top-left `BACK` button on `/arcade/snake` linking to `/arcade`, using the `Chevron-Arrow-Left` Arcade icon.
- Fixed `/arcade/snake` `BACK` button content alignment so the icon and label render on the same horizontal line.
- Switched the `/arcade/snake` back icon to an inline SVG with `currentColor` fill so the chevron always matches button text color.
- Added the same top-left `BACK` button on `/arcade`, linking users back to the home page (`/`).
- Reordered `/arcade` header layout so `ARCADE GAMES` appears above the `BACK` button.
- Center-aligned Arcade titles (including shared Arcade `CardTitle` output and game-tile `h2` headings) so titles are no longer left-justified.
- Added a mobile-first `/arcade/snake` gameplay shell with a stable square board (`clamp(240px, 88vw, 420px)`) and a sticky bottom D-pad (`UP/LEFT/RIGHT/DOWN`) with safe-area padding.
- Replaced `/arcade/snake` D-pad text labels with the requested chevron icon assets (`Chevron-Arrow-Up/Down/Left/Right`) rendered as `currentColor` SVGs and explicitly styled to Arcade yellow.
- Wired `/arcade/snake` `PLAY NOW` to smooth-scroll and focus the gameplay board section automatically.
- Centered the `D-PAD` label in the middle control cell of the `/arcade/snake` on-screen D-pad.
- Switched Arcade `Now Serving` polling from a fixed interval to the same adaptive display strategy (visibility-aware timeout scheduling, burst mode on changes, operating-hours-aware cadence, and 30s error retry).
- Added explicit documentation-priority guardrails to `AGENTS.md`, requiring docs to stay current and implementation plans to be documented before major feature work.
- Expanded `docs/GAME.md` with a current-state snapshot and a detailed Snake logic implementation checklist (engine, loop, controls, collisions, scoring, lifecycle, testing, and MVP definition of done).
- Added a current implementation checkpoint to `docs/V2.0_PLANNED_FEATURES.md` so the v2.0 plan clearly distinguishes completed Arcade shell work from remaining Snake gameplay logic/tasks.
- Implemented the first Snake gameplay increment: a running movement loop with a fixed 3-segment snake body, controlled by keyboard arrows and the Arcade D-pad (no food/collision/scoring yet).
- Updated Snake page instructional copy and board HUD to reflect navigation-only behavior for this milestone.
- Implemented the next Snake increment: wall/self collision detection, game-over state, and restart/reset controls while keeping food/scoring deferred.
- Updated `docs/GAME.md` and `docs/V2.0_PLANNED_FEATURES.md` checkpoints to reflect that movement + collision milestones are now complete and food/scoring remain in progress.
- Increased `/arcade/snake` game-over overlay text sizing to large-display scale for improved restart readability.
- Removed the `RESTART RUN` button state, kept the `RESET` button, changed overlay copy to `TAP HERE TO PLAY AGAIN`, and made the Snake play area tap/click-restart the run while in `GAME OVER`.
- Added Snake food pellet gameplay with random spawn on unoccupied cells, score increment on pellet collection, and immediate pellet respawn while keeping body length fixed at 3 for this increment.
- Added dedicated `.arcade-snake-pellet` styling in Arcade-scoped CSS so food is visually distinct from snake segments.
- Removed a duplicate `/arcade/snake` restart callback and corrected game-over input-queue clearing to run on status transitions.
- Updated `docs/GAME.md` and `docs/V2.0_PLANNED_FEATURES.md` checkpoints to reflect that food+score is complete and growth-on-food is now the next pending gameplay milestone.
- Fixed `/arcade/snake` hydration mismatch by removing random pellet generation from initial render and using a deterministic first pellet position in interior grid cells (so the pellet is visible on first load) before client-side gameplay randomization begins.
- Enabled Snake growth on pellet consumption (`+1` segment each pellet) and updated movement/collision logic so growth ticks still enforce correct self-collision behavior.
- Updated `/arcade/snake` pellet visual from a circular glow to a solid green pixel that fills one grid cell.
- Replaced Snake `STOP` with a `PAUSE` -> `START` toggle that preserves active run state and resumes from the same board position.
- Removed in-board top/bottom Snake stat overlays and moved gameplay readouts above and below the board to keep food/snake cells unobscured.
- Enhanced Arcade `NOW SERVING` visibility with a retro-styled change alert pulse on the banner/value whenever the serving number updates.
- Stabilized the top Snake readout to a fixed two-row layout so direction/value text changes (for example `UP` vs `RIGHT`) no longer shift the board position during gameplay.
- Updated Snake head color from pink to orange for clearer player-avatar contrast within the Arcade board.
- Removed the bottom Snake `LAST INPUT` readout banner to reduce duplicate direction telemetry and keep the play area focused on board + D-pad interaction.
- Updated Snake scoring so each pellet awards `1000` points (score now advances in 1,000-point increments).
- Updated Snake readout labels from `DIR` to `DIRECTION` and from `LEN` to `LENGTH` for clearer status terminology.
- Simplified the Snake top readout to show only `SCORE` and `LENGTH`, removing `STATUS` and `DIRECTION` and collapsing the bar to a single-row metrics layout.
- Replaced the center `D-PAD` text with a functional `PAUSE`/`START` control button in the on-screen controls and removed the duplicate pause toggle from the upper action row.
- Updated the center Snake control to a three-state label flow: `START` on initial load, `PAUSE` while running, and `PLAY` while paused.
- Styled the center Snake `PAUSE`/`PLAY` control as the primary filled yellow button (instead of outline) to match Arcade action emphasis.
- Wired the center Snake `START` action to the same smooth scroll/focus behavior used by `PLAY NOW`, so start from the D-pad also jumps the user to the gameplay area.
- Added adaptive mobile viewport sizing for Snake gameplay by deriving board/readout width from both `vw` and `dvh`, plus short-screen control-density tuning (smaller D-pad spacing/button heights) to improve fit on smaller devices.
- Adjusted Snake scoring to award `10` points per pellet (score now advances in 10-point increments).
- Increased short-screen Snake board sizing slightly (within the adaptive `dvh`/`vw` clamp) so gameplay area is larger while preserving full-content fit on smaller devices.
- Updated the `/arcade` menu Snake CTA to use the primary filled Arcade button style and explicit `SNAKE` label, with a direct link target of `/arcade/snake`.
- Updated the `/arcade` Snake CTA label from `SNAKE` to `PLAY SNAKE`.
- Updated the `/arcade` `PLAY SNAKE` CTA rendering to support per-word wrapping for multi-word translations, preventing overflow and preserving readability across supported languages.
- Reworked Arcade `NOW SERVING` number-change animation to a three-phase sequence in-banner: zoom to `2x` with `+20px` drop, 10 back-and-forth `±10deg` shakes, then return to original scale/position without obstructing gameplay.
- Tuned Arcade `NOW SERVING` number-change animation by keeping the zoom/drop sequence and replacing the shake phase with the prior retro pulse/blink treatment for improved readability.
- Simplified `/arcade` menu game-card CTA rendering so any non-`comingSoon` game reliably renders its play button (ensuring `PLAY SNAKE` remains visible for the Snake card).
- Updated `/arcade/snake` instruction card copy to the concise five-line ruleset (`USE ARROWS TO MOVE`, `EAT PELLETS FOR POINTS`, `EATING MAKES YOU GROW`, `AVOID WALLS AND YOUR BODY`, `CRASHING ENDS THE GAME`).
- Increased Arcade typography scale across menu/gameplay/banner/controls/language-switcher surfaces to compensate for the newly standardized pixel font's smaller visual footprint.
- Increased Arcade typography by an additional step across the same section-wide surfaces for improved readability with the new pixel font.
- Added an Arcade-only same-color hard text shadow to retro/UI text styles to create a pseudo-bold pixel-font treatment while preserving existing glow accents.
- Refined Arcade pseudo-bold text shadow to use tighter offsets with fuller directional coverage, reducing double-print artifacts while keeping heavier glyph weight.
- Increased Arcade global character spacing again (`.arcade-retro` to `0.64em`, `.arcade-ui` to `0.32em`) so glyphs have stronger horizontal separation with the new standardized pixel font.
- Fixed Arcade RTL language switcher dropdown anchoring so Arabic/Farsi menus open inward (`left-0`) instead of off-screen when the control sits on the left edge.
- Added an Arcade-only retro light/dark mode toggle in the top bar (no system/hi-viz option), with homepage-style placement: language on upper-left and theme toggle on upper-right.
- Updated Arcade mode-switcher icon geometry to match 8bitcn `retro-mode-switcher` (full pixel maps), and aligned theme semantics to app consistency: light mode shows sun, dark mode shows moon.
- Added a WCAG-focused Arcade light-theme pass by remapping light-mode accent tokens and action/contrast tokens (`--arcade-action-*`, `--arcade-ghost-contrast`) so text + control states meet AA contrast targets.
- Fixed Arcade light-mode game-tile card contrast by replacing the hard-coded dark tile fill with a theme token (`--arcade-menu-card-bg`) and assigning an AA-compliant light tile surface for card text.
- Added Arcade Snake settings slider support using the `@8bitcn/slider` component in `/arcade/snake`.
- Consolidated Snake speed/difficulty into one six-step mode slider (`VERY EASY`, `EASY`, `NORMAL`, `HARD`, `VERY HARD`, `NIGHTMARE`).
- Mapped mode stops to integrated behavior profiles (tick speed + wall-distance spawn gating), including Nightmare pellet timeout respawn after 5 seconds when uneaten.
- Removed decorative border framing around slider controls after moving to the single-slider design.
- Improved Arcade Snake slider contrast tokens for WCAG non-text contrast in dark mode (with light-mode parity checks), increasing visibility of the track/range/thumb against card backgrounds.
- Removed hard text-shadow treatment from small Snake UI text (mode label and score/length readout) to improve readability while keeping heavier retro styling on larger headings/alerts.
- Added localized Snake mode-setting labels across all supported display languages in `src/contexts/language-context.tsx`.
- Updated `docs/GAME.md`, `docs/ISSUES.md`, and `docs/V2.0_PLANNED_FEATURES.md` to document the unified mode slider and Nightmare behavior.

## [1.4.3] - 2026-02-13
### Changed
- Added a local Animate UI-style theme transition primitive at `src/components/animate-ui/primitives/effects/theme-toggler.tsx` with directional View Transition `clip-path` animation for Light/Dark/System theme changes.
- Updated `ThemeSwitcher` to route base theme updates through the new transition primitive while preserving existing `Hi-viz` contrast behavior and menu UX.
- Added reduced-motion and no-View-Transition fallback handling so theme updates remain immediate when animation should not run.
- Added `ThemeSwitcher` test coverage for the `document.startViewTransition` path.
- Verified full suite + production build after integration (125 tests passing; build clean).

## [1.4.2] - 2026-02-13
### Changed
- Enforced concrete-bound batch validation messages so post-init `generateBatch` rejects now return actionable copy with the current locked value (start mismatch and end shrink cases).
- Locked batch expansion semantics to atomic persistence: when `endNumber` is increased during `generateBatch`, the expanded end is only persisted if the draw succeeds.
- Strengthened batch/append safety rules by rejecting append attempts while undrawn tickets remain in the active range.
- Updated admin range controls so Start is locked after first draw, End locks after pending reaches zero, and batch remaining counts preview pending tickets for a locally increased End value before submission.
- Added tests covering concrete-bound message contracts, atomic end-number persistence on successful/failed expanded batches, and route-level 400 handling for typed user-input errors.
- Documented the localhost-verified problem/solution flow in `docs/ISSUES.md` and published release notes in `docs/RELEASES.md` for v1.4.0.
- Fixed login tab hydration mismatch by using stable trigger/content IDs and ARIA pairings instead of runtime-generated IDs.
- Fixed login tab shadow-edge artifacts by removing inactive-panel blur filtering while preserving slide + height animation behavior in animated tabs.
- Removed animated blur filters from morph text transitions (display now-serving, language morph text, and shared morphing primitive defaults) to improve frame consistency on low-power Chromium clients.

## [1.4.1] - 2026-02-11
### Changed
- Increased base light/dark radius tokens to `1.25rem` in `globals.css` per updated design direction.
- Updated Admin “Generate full” UX so the action stays disabled until Start/End inputs are valid, with wrapped disabled-tap Sonner guidance (ASK style).
- Reduced the Admin header William Temple wordmark to match the display page logo footprint.
- Fixed destructive confirmation button styling so “Yes, Reset Lottery” remains destructive-filled and transitions to destructive-outline on hover (no mixed primary styles).
- Fixed Hi-viz “Pending” descender clipping in the Now Serving header by using a loaded weight and increased line-height.
- Added an Animate UI button primitive and wired `src/components/ui/button.tsx` to use hover/tap scale motion by default (`+5%/-5%`), with reduced-motion support and opt-out props.
- Updated `AlertDialogAction` and `AlertDialogCancel` wrappers to compose the shared animated `Button`, so modal footer buttons now inherit button motion.
- Restored theme switcher trigger icon sizing after animated icon migration and fixed `Button` `asChild` forwarding so icon+label button layouts remain aligned.
- Animated the login page OTP/Magic tabs with demo-style motion: spring sliding highlight, subtle blur/glass overlay, and smooth content transitions using local Animate UI-style tab primitives.
- Restored demo-parity motion for `Button` `asChild` usage by routing `src/components/animate-ui/primitives/buttons/button.tsx` through the motion-capable animate `Slot`.
- Upgraded local animate tabs primitive to demo-parity sequencing (horizontal panel track + auto-height animation + trigger tap-scale), and documented the full parity audit in `docs/V1.4_PLANNED_FEATURES.md`.
- Replaced static icons with animated variants wherever available from Animate UI and lucide-animated (admin/staff/theme/language/dialog/ui primitives), while keeping unsupported icons static.
- Fixed Hi-viz theme trigger icon sizing by forcing `EyeIcon` SVG size to match Sun/Moon in the mode switch control.
- Updated `/staff` CTA button icons to animate reliably on initial page load, hover, and tap/click by driving icon motion from button interaction events.
- Updated `/staff` footer attribution text to include individual links for Matt Geiger, Temple Consulting, Claude, and Codex.
- Updated admin page icon behavior so static Lucide icons now animate on initial page load, hover, and tap/click using a shared `AdminAnimatedIcon` wrapper; enhanced existing animated icons with tap and load triggers.
- Replaced the admin “Live State” title icon with animated `MonitorCheckIcon` (`lucide-animated`) for parity with the v1.4 motion direction.
- Updated admin “Draw position” card hierarchy so the large value is the ticket number, while draw position is shown as smaller text with position-of-total context.
- Replaced the display page “Now Serving” value transition with the Animate UI `MorphingText` primitive so updates morph between values (including `Pending` to first serving number).
- Tuned display “Now Serving” transition to a bottom-up insert/sweep profile (instead of default crossfade-like morph settings) using MorphingText `initial/animate/exit` overrides.
- Enabled one-character-at-a-time sequencing for display “Now Serving” transitions by adding per-character stagger support to `MorphingText`.
- Applied the same per-character bottom-up morph style to display-page translated labels/messages (including the ticket detail and not-found dialogs) so visible text animates on language switches.
- Added word-aware wrapping mode to `MorphingText` and made `LanguageMorphText` use it by default, preventing per-character line breaks (for example, Spanish display labels no longer orphan trailing letters).
- Reverted an over-slow text morph timing experiment and restored the approved v1.4 spring baseline for display readability (`Now Serving`: `80/16/0.45`, `LanguageMorphText`: `90/16/0.4`).
- Fixed Vietnamese waiting-state wrapping on the display page by forcing the large "Now Serving" morph text to wrap by word (`wordWrap="word"`), preventing orphan trailing characters (for example `ờ`) on a separate line.
- Updated the public display "Now Serving" value animation to use Animate UI `RollingText` for numeric ticket values while preserving `MorphingText` for word states (for example, localized waiting text).
- Increased per-character stagger timing on the public display numeric `Now Serving` rolling animation for a more pronounced sequential roll.
- Fixed numeric `Now Serving` rolling transitions to animate from the previous value to the next value (for example, `36 -> 43`) instead of rolling the new value against itself.
- Slowed the public display numeric `Now Serving` rolling animation by 50% (`duration: 0.75`, per-character stagger `delay: 0.15`) for improved readability.
- Updated the public display search icon trigger mapping to use `path` on initial view load, `find` on hover, and `default` on tap/click.
- Updated display search icon wiring to use `AnimateIcon` wrapper triggers with `completeOnStop`, ensuring tap/click runs visibly while preserving `path` (load) and `find` (hover) behavior.
- Set display search icon size parity to `1.8rem` to match language/theme switch button glyph sizing.
- Updated `/admin` icon behavior split: interactive control icons (`ArrowLeft`, `ChevronLeft/Right`, `Undo2`, `Redo2`) remain load/hover/tap animated, while visual/status card iconography is now static.
- Updated mode switcher icon behavior so Light (`Sun`), Dark (`Moon`), System (`SunMoon`), and Hi-viz (`Eye`) all animate on load/hover/tap using default animations, and retrigger default motion when switching between mode icons.
- Fixed ThemeSwitcher hydration mismatch by rendering a mount-safe SSR fallback icon state before resolving client theme/contrast mode.

## [1.4.0] - 2026-02-11
### Added
- Added a persisted high-contrast mode (`Hi-viz`) layered alongside existing light/dark/system color-scheme selection.
- Added `ThemeProvider` contrast context and root-class synchronization (`html.hi-viz`) for token-based accessibility theme overrides.
- Added integration tests for theme menu options, Hi-viz persistence, and switching back to standard themes.

### Changed
- Updated the theme switcher dropdown to show iconized menu items: Light, Dark, System, and Hi-viz.
- Added high-contrast token overrides in `globals.css` for both light and dark system contexts.
- Updated Hi-viz custom fonts to Open Sans, Bodoni Moda SC, and IBM Plex Mono (via `next/font/google`) and wired Hi-viz font tokens to the loaded font variables.
- Refined Hi-viz tokens from `docs/HC_UI.md`, and kept both “Now Serving” text and legend serving state on the existing light/dark gradient palette values.
- Fixed font token recursion in `@theme inline` by mapping Tailwind font tokens to separate app font variables, so local render now applies the configured fonts instead of falling back to default sans.
- Updated CSP allowlist for Vercel Speed Insights script/connect hosts to prevent local browser blocks from `va.vercel-scripts.com`.
- Updated NextAuth `trustHost` logic to honor explicit `AUTH_TRUST_HOST=true` (while still trusting Vercel automatically), preventing local `UntrustedHost` failures in development.
- Hardened email provider selection so Resend is only used when `RESEND_API_KEY` matches expected key format, and OTP requests now fall back to SMTP/MailDev in non-production when Resend delivery fails.
- Added a non-production OTP fallback path that still issues a code when email delivery is unavailable and surfaces the development code in the login UI for local testing.
- Enabled automatic auth bypass for localhost development (`NODE_ENV=development` and non-Vercel), so `/admin` and write APIs do not require OTP/login in local dev while production keeps strict auth requirements.
- Fixed Hi-viz font variable resolution by moving Next font variable classes to the root `<html>` element, so `:root.hi-viz` font tokens resolve correctly.
- Updated Admin “Mark ticket as returned/unclaimed” cards to reuse the same `ticket-returned` and `ticket-unclaimed` status styles used by the display legend/key.
- Updated Admin Live State “Next up” sub-card to use the same success/green status token styling used across themes.
- Mapped the latest `docs/HC_UI.md` updates into Hi-viz tokens in `globals.css`, including the updated light card surface value and the revised 3px/4px shadow model for both light and dark Hi-viz variants.

## [1.2.1] - 2026-02-03
### Changed
- Clamp open-window polling to a 5-minute maximum so the public display stays responsive during service hours even after long idle periods.

## [1.2.0] - 2026-01-20
### Changed
- Polished the public display header search cluster so the pill shares the same palette-based gradient, hover fill, and elevation as the language/theme toggles while keeping responsive text/icon scaling, extra horizontal padding, and digit-only input behavior.

### Notes
- 2026-01-22: Rolled back the experimental Blob snapshot caching and restored production to the polling + timezone warning revision.

## [1.1.3] - 2026-01-19
- Added multilingual, mobile-friendly header search that launches the ticket detail modal or a “ticket not found” dialog so clients can find their number fast.

## [1.1.2] - 2026-01-16
### Changed
- Public display polling now uses adaptive backoff with idle tiers and pauses when the tab is hidden.
- Polling honors operating-hours slack windows and caps closed-window intervals by time to next opening.

## [1.1.1] - 2026-01-13
### Changed
- Public display polling interval adjusted to 10 seconds (built-in + standalone).

### Fixed
- Advancing the draw position now skips tickets marked as returned.
- Confirmation modals now close after confirming, even if a follow-up error is surfaced.
- Display date now refreshes correctly after long idle periods.

## [1.1.0] - 2026-01-13
### Added
- Admin control to mark tickets as returned, stored in raffle state for queue adjustments.
- Sonner toast notifications for admin and login error states.
- Returned tickets list in the Live State card for quick verification.
- Admin control to mark tickets as unclaimed after a draw position has been called.
- Unclaimed tickets list in the Live State card for quick verification.
- Display legend for ticket status (not called, now serving, called, unclaimed, returned).
- Display ticket modal messaging for returned/unclaimed tickets and called-time context.

### Changed
- Returned-ticket input styling now matches default input backgrounds for clarity.
- Display URL validation errors now surface via toast notifications.
- Returned tickets are excluded from display wait time estimates, and returning the current ticket auto-advances to the next available draw position.
- Returned/unclaimed admin cards now use subtle status gradients for better readability.
- Live State card description copy updated for clearer staff-facing language.

## [1.0.4] - 2025-12-12
### Changed
- Login now defaults to OTP and places the OTP tab left of the Magic Link tab.
- Documented the recommended OTP-first auth approach and Microsoft Defender magic-link limitation in `docs/AUTHENTICATION.md`.
- Updated the staff landing page to display the app version from `package.json`.
- Cleaned up lint warnings (unused imports/variables, and Next.js `next/image` guidance).

## [1.0.3] - 2025-11-29
### Added
- Operating hours with timezone selection (default PST) persisted in state; display page now shows “Pantry Hours” and closed-day messaging with next open day.
- Admin UI for setting open days/hours with per-day toggles and time inputs; timezone selector added.
- Shadcn select/checkbox/popover primitives added to support the new editor.
- Localized day names and closed labels; clarified reset-state messaging (before opening, after closing, closed today).

### Changed
- Reset now preserves operating hours and timezone instead of wiping them.
- Translations updated with pantry hours/closed messaging.

## [1.0.2] - 2025-11-28
### Changed
- Refined global shadow tokens in `globals.css` (OKLCH base shadow mixes, adjusted transparency) and added `shadow-sm` to default/secondary buttons for clearer elevation.
- Forced Gregorian calendar for all locales in date/time formatting to avoid Solar Hijri display in Farsi/Arabic locales on the public board.

## [1.0.1] - 2025-11-28
### Added
- Added Vietnamese, Farsi, and Arabic translations (raffle-appropriate terminology) to the public display and language switcher.
- Introduced RTL awareness for Arabic/Farsi via `DocumentDirection` (dynamic `dir`/`lang` on `<html>`), reusable RTL utility, and logical text alignment on the display card.

### Changed
- Extended time/date locale formatting to cover all languages and documented RTL requirements in `docs/LANGUAGES.md`.
- Updated README and PROJECT_OVERVIEW feature summaries to list all supported languages and RTL coverage.
- Adjusted ticket detail dialog close button to use logical positioning (`end-4`) for RTL layouts.
- Localized display timestamps to the selected language (including RTL locales) on the public board.
- Scoped RTL handling to the public display so staff/admin pages remain LTR and unaffected by display language choices.

## [1.0.0] - 2025-11-27
### Added
- Production-ready deployment on Vercel at `williamtemple.app` using Neon Postgres, Resend magic links, and OTP fallback.
- Branded OTP email template (React Email, Lato) and shared Neon pool for auth/OTP to avoid connection exhaustion.
- Dual authentication paths (magic link + OTP) with @williamtemple.org domain restriction and rate limiting/lockouts.
- Phase-specific env templates and production env defaults set to `login@williamtemple.app`.
- Snapshot cleanup API and admin controls (keep last 7 or 30 days) with automatic 30-day cleanup on reset to stay within Neon 512MB free tier.
- Vercel Speed Insights integrated in root layout.

### Changed
- Default sender updated from `noreply@williamtemple.app` to `login@williamtemple.app` for better deliverability.
- Middleware migrated to `proxy` for Next.js 16; build-time `DATABASE_URL` enforcement and node runtime declarations retained.
- Login UX rebuilt with shadcn Tabs and InputOTP for clearer flows; admin “Clear” draw position requires confirmation.

### Security
- OTP/magic link tokens hashed, 10-minute expiry, 5-attempt lockout with cooldown, and 1/minute request throttling.
- Auth restricted to `@williamtemple.org`; file storage disabled in production; shared DB pool to prevent connection churn.

## [0.9.0] - 2025-11-26
### Added
- Production-ready deployment on Vercel using Neon Postgres and Resend magic links; custom domain `williamtemple.app` configured.
- Phase-specific env templates for Vercel (preview, custom domain no-auth, full auth).

### Changed
- NextAuth switched to the official Resend provider with email/SMPP fallback for local dev; login form now targets the Resend provider.
- Middleware migrated to `proxy` for Next.js 16, with explicit node runtime in API routes and build-time `DATABASE_URL` enforcement (Turbopack enabled).
- Admin “Clear” draw position now requires confirmation to avoid accidental taps.

## 2025-11-28
- Made display QR rendering robust: added API `getDisplayUrl`, persisted `displayUrl` in state, and switched the display page QR to canvas (`qrcode`) to avoid SVG cropping for long URLs; display now respects admin-configured URLs.
- Reinitialized Shadcn UI primitives (button, input, badge, card, label, separator, switch, dropdown, tooltip, alert-dialog) and aligned them to the generator OKLCH palette with proper `@theme inline` mapping.
- Standardized status styling by adding success/warning/danger badge variants; removed manual per-button color overrides on admin controls for consistent hover/active states.
- Refined admin UI: unified arrow and append buttons (outline + muted state), outline nav buttons, subtler gradient info boxes, theme-aware logos, and consistent “UPDATED” pills; shared display/admin logo sizing and badge styling.
- Updated staff/login/read-only surfaces to use semantic tokens (no slate/emerald/blue literals) and generator gradients; board grid now uses status tokens instead of hard-coded colors.
- Documented Shadcn/Tailwind v4 theme structure and current palette in `docs/UI_DESIGN.md`; cleaned globals to remove stray imports and ensure generator colors drive components.
- NOW SERVING headline gradient: blue in light mode, gold in dark mode via `--serving-text-gradient`.
- Added utilities for badge success styling and gradient cards; removed inline styles from login and staff pages.

## 2025-11-23
- Replaced `/display` with the high-contrast read-only UI from the standalone server, now polling `/api/state` every 4 seconds inside Next.js.
- Added `ReadOnlyDisplay` React component to render the wall-screen layout with served/upcoming styling and date/title updates.
- Documented the built-in display route and clarified the standalone `npm run readonly` server is optional/legacy.
- Made the public display the homepage (`/`) and moved the former landing page to `/staff`; updated internal links and docs accordingly.

## 2025-11-22
- Removed client-side polling timers from `/admin` and `/display` to keep form inputs stable while editing.
- Added a standalone read-only board server (`npm run readonly`) on its own port that polls the persisted JSON state.
- Updated documentation to cover the new read-only board and the non-polling behavior of the main UI.
- Restyled the read-only board with a high-contrast theme, clearer labels, and simplified header content.
- Updated the read-only board header to show the service date and removed the footer disclaimer text.
- Fixed date formatting in the read-only board script to avoid template literal parsing errors.
- Reformatted the read-only board title to show full weekday and ordinal date (e.g., “Saturday, 22nd November, 2025”).
- Adjusted read-only title to show the date without duplicate prefix and to format as “Saturday, November 22nd, 2025”.
- Expanded the read-only board layout to occupy more viewport width.
- Enlarged raffle number badges on the read-only board for better long-distance readability.
- Further increased raffle number badge size and weight for maximum visibility.
- Widened the top info cards and increased their number sizing to stay larger than the raffle badges.
- Changed the admin “Now Serving” control to step through draw positions with arrow buttons using Lucide icons and ordinal labels.
- Added a distinct style for already-called tickets on the read-only board.
- Updated read-only board styling to make served tickets pop and mute upcoming tickets instead.
- Loosened spacing and line-height for read-only number badges and summary numbers to avoid cropped digits.
- Added horizontal spacing for raffle badges and widened their padding for better legibility.
- Protected raffle order when switching modes: mode toggles now only affect future tickets, keep existing order intact, and require confirmation.
- Replaced the “William Temple House” pill on the landing page with the official horizontal logo asset for better branding.
- Removed the “Digital Raffle” pill and expanded the homepage logo to span the card responsively.
- Centralized UI styling around global design tokens in `globals.css` and refactored button, badge, card, input, switch, tooltip, and separator components to consume them.
- Increased contrast for primary buttons via the shared `Button` component rather than page-level overrides.
- Fixed anchor inheritance inside buttons so CTA text uses the button’s foreground color instead of the global link color.
- Increased contrast on the “Open Staff Dashboard” CTA to prevent text blending into the button background.
- Ensured all cards use the solid surface background to match the landing page styling.
- Aligned the read-only board shell to the top of the viewport.
- Removed the mode pill from public and admin headers to simplify the UI and avoid low-contrast badges.
- Added the William Temple House horizontal logo to the top of the read-only board.
- Served static assets (e.g., the read-only board logo) from `public/` so they render correctly.
- Tweaked the draw position arrows so the previous arrow stays muted/outlined and the next arrow remains emphasized.
- Swapped draw-position button styles: previous now uses the filled secondary style, next uses the outlined muted style.
- Fixed admin draw-position button typing by importing `ButtonProps`.
- Reduced and left-aligned the read-only board logo.
- Shrunk read-only number cards and badges for a more compact layout.
- Styled the “Append additional tickets” heading to match primary card titles.
- Kept append arrows inline with the input and placed the Append button beneath for consistent layout.
- Corrected append section markup after layout changes.
- Prevented append arrows from wrapping under the input by constraining widths and disabling wrap on larger screens.
- Made the append left arrow start as secondary and switch to outline once the value advances beyond the starting end.
- Applied a responsive grid layout to the read-only drawing order badges.
- Centered the read-only stat cards and badge content for improved alignment.
- Removed the read-only board shell background so content sits directly on the page.
- Added a welcoming empty state outside the grid when no tickets exist on the read-only board.
- Enlarged the read-only empty-state welcome message for long-distance readability.
- Broke the read-only empty-state message into centered, large multiline lines.
- Forced the read-only empty-state lines to block display to ensure visible line breaks.
- Moved the “Now Serving” card inline with the logo at the top of the read-only layout.
- Added spacing around the ticket range dash on the read-only “Tickets Issued” card for clarity.
- Realigned the read-only header row: logo left, “Now Serving” centered.
- Enlarged the “Now Serving” value on the read-only page to exceed the date line size.
- Further amplified the “Now Serving” value for top-of-page visual hierarchy.
- Doubled the “Now Serving” text size for maximum prominence.
- Doubled the “Now Serving” size again for extreme visibility.
- Refined header grid so the logo sits left with a spacer and the “Now Serving” card remains centered.
- Added mobile tweaks so the logo stacks above the “Now Serving” card on narrow viewports.
- Applied the gold gradient fill to the “Now Serving” value on the read-only page.
- Removed the border on the “Now Serving” card for a cleaner header look.
- Deepened the read-only background with stronger blue radial gradients.
- Added snapshot history support (list, restore, undo/redo) with admin UI controls.
- Matched the “System reset” heading style to other admin card titles.
- Placed Live State beside History (instead of above) for balanced admin layout.
- Ensured “Share the live board” sits alongside “System reset” on wide viewports.
- Reordered the admin dashboard rows: Ticket Range/Now Serving, Live State/History, then System reset/Share.
- Removed the “Upcoming preview” sub-card from Ticket Range & Order to streamline the admin card.
- Removed the unused divider at the bottom of the “Now Serving” admin card.
- Added the horizontal William Temple House logo to the admin header to match the landing page branding.
- Removed the Staff Dashboard and Auto-save badges from the admin header for a cleaner top bar.
- Relaxed the Now Serving line-height on the read-only board to avoid clipping descenders (e.g., the “g” in “Waiting”).
- Documented Vercel hobby/free deployment intent and the need to move persistence off local files to Neon-backed storage.
- Added a concrete Vercel/Neon deploy runbook covering Postgres schema, magic-link auth setup, env vars, snapshot retention, and migration notes.
- Documented routing plan for production domain `williamtemple.app` (root = read-only board, `/login` for magic links, `/admin` for staff).
- Added a Neon/Postgres-backed state manager option gated by `DATABASE_URL` (file storage remains for local dev/tests); documented selection rules without extra toggles.
- Added NextAuth email-based magic link auth (Resend + domain allowlist), protected `/admin` and write APIs via middleware, and introduced a `/login` page.
- Added `AUTH_BYPASS` flag so localhost dev can skip auth and Neon; noted local dev guidance in README.
- Fixed build issues by removing duplicate imports, adding nodemailer dependency, and making snapshot timestamps monotonic for stable undo/redo ordering.
- Added conditional NextAuth Postgres adapter support (Neon) for email magic links and recorded the deployment migration plan in `DEPLOYMENT_MIGRATION.md`.
