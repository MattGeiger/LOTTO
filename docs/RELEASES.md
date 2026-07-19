# LOTTO v1.19.0

**Release Date:** July 18, 2026

LOTTO now supports deployment-selected branding from one repository. William
Temple House remains the no-configuration production default, while the new
St. Johns Food Share queue-only profile supplies its own visual identity,
metadata, install assets, public URL, and optional-integration policy.

This release also separates shared operational status semantics from agency
identity colors, adds additive exact-address and managed-domain staff
authorization for organizations using public email providers, and restructures
core and Arcade palettes around an OKLCH-only CSS authoring standard. Full
details are in `CHANGELOG.md`, `docs/WHITE_LABEL_BRANDING_PLAN.md`, and
`docs/CSS_THEME_ARCHITECTURE.md`.

---

# William Temple House Digital Raffle System v1.17.3

**Release Date:** June 4, 2026

The public navigation now gives the live board a first-class entry point:
**Dashboard** links directly to `/display`, placed between **Your ticket** and
**What's in stock**.

## Dashboard tab in public navigation

- **New destination:** the bottom nav now reads **Your ticket**, **Dashboard**,
  **What's in stock**, and **Games**.
- **Direct board access:** **Dashboard** links to `/display`, the large public
  raffle board.
- **Core icon:** the Dashboard tab uses a native imperative `grip` icon with a
  staggered dot-fade animation.
- **Consistent chrome:** `/display` now renders the same fixed bottom nav as the
  other core public pages, and the core and Arcade bars share the same desktop
  dock offset to avoid jumps between routes.
- **Arcade separation preserved:** the Arcade index mirrors the same four public
  destinations with its own pixel-art dashboard icon and arcade-styled bar.

Design and implementation notes live in `docs/NAVIGATION.md`.

---

# William Temple House Digital Raffle System v1.17.1

**Release Date:** June 4, 2026

A small follow-up to the language-rotation release: the QR code on the public
board now sends people to the app's home screen — where they can choose a
language and find their ticket — instead of back to the board itself. The new
"Rotate display languages" control in Admin was also tidied to match the rest of
the dashboard.

---

# William Temple House Digital Raffle System v1.17.0

**Release Date:** June 4, 2026

The public **Display** board can now greet everyone in their own language. Staff
can turn on **language rotation** and pick which languages the board cycles
through — a polite, inclusive touch for clients who don't read English and can't
tap a passive screen to change it.

## Rotating language mode

- **Set it in Admin.** A new "Rotate display languages" control lets you flip
  rotation on, choose any of the eight supported languages, and set how many
  minutes each one shows.
- **Hands-free on the big screen.** The `/display` board automatically cycles
  through the chosen languages on your timer, smoothly transitioning each change
  and flipping to right-to-left for Arabic and Farsi.
- **Stays out of the way.** Rotation only affects the large-format board — the
  personalized homepage still lets each client pick their own language.

Design and implementation notes live in `docs/DISPLAY_LANGUAGE_ROTATION.md`.

---

# William Temple House Digital Raffle System v1.16.0

**Release Date:** June 3, 2026

The personalized homepage graduates from preview to the **front door**. Opening
the app now greets each guest with the language picker and ticket lookup, while
the live "who's being served" board moves to its own dedicated address.

## Personalized homepage is now the home screen

- **One welcoming entry point.** The language + ticket onboarding (previously the
  `/new` preview) is now what you see at the site root. Returning guests with a
  saved ticket skip straight to their personalized status.
- **The public board lives at `/display`.** The full searchable board is
  unchanged — it just has its own address now. Point lobby and TV displays at
  `/display`.
- **"Your ticket"** in the bottom navigation now takes you to the home screen.

## Easier "just looking"

- The no-ticket option is now a clear, prominent **"I'm just looking"** button,
  and once you've chosen a language you can close the welcome dialog with an
  **X**, the **Escape** key, or by tapping outside it.

Design and implementation notes live in `docs/V2.0_PLANNED_FEATURES.md`.

---

# William Temple House Digital Raffle System v1.12.0

**Release Date:** May 31, 2026

**Zombie Attack!** gets a big gameplay overhaul — it's now a **top-down survival
game** with hand-drawn NES-era sprites, a helicopter rescue you have to defend
across timed rounds, and a special soldier zombie.

## Zombie Attack! — Top-Down Survival

- **New view & art.** The game is now played from above, with detailed,
  multi-colour sprites: four kinds of **civilian zombies** in street clothes, a
  **hero** wielding an Uzi, and a military **helicopter** on a marked helipad.
- **Shamble from above.** Zombies pour in from the top and weave downward toward
  your **bunker line**. Most don't shoot — the danger is the sheer crowd. Hold
  the line; if they overrun the bunkers, the pad falls.
- **Meet Bub.** A zombie **soldier** (a nod to *Day of the Dead*) shows up now and
  then — he takes two shots, fires back with his pistol, and may **drop a live
  grenade** when he falls. Shoot the grenade to blow a hole in the horde.
- **Defend the extraction.** Each game runs as a **timed rescue** in four rounds —
  the chopper flies in, **refuels**, **boards passengers**, and **takes off**.
  Outlast the clock each round to get them out, then a tougher cycle begins.
- **Watch for the ambulance.** A runaway ambulance occasionally barrels through —
  shoot it to set off a blast that clears the zombies around it.
- **Controls & difficulty.** Slide to move, hold **A** to fire your Uzi. Six
  difficulty settings tune the crowd size, speed, and how often Bub appears
  (Nightmare is relentless and removes the sandbag bunkers). Eight languages, and
  still tuned for the 2015 iPad Mini baseline.

Design and implementation notes live in `docs/ZOMBIE_ATTACK.md`.

---

# William Temple House Digital Raffle System v1.11.0

**Release Date:** May 30, 2026

The Arcade's third game gets a full re-theme — *Star Swarm* becomes
**Zombie Attack!**, a last-stand against a shambling horde — along with several
new mechanics, a taller play area, and a streamlined fire control.

## Zombie Attack!

- **New look.** The aliens are now three kinds of **shambling zombies** (skinny,
  ribs-exposed, and fat), crossing a **dirt lot** instead of a starfield. Your gun
  defends a **fence** and four **sandbag bunkers** at the bottom of the screen.
- **The fence.** A wooden fence stands in front of the bunkers. The horde presses
  on it, and the more zombies there are the faster it gives way. When it
  collapses, the horde breaks through — and reaching the bunkers is game over.
- **Carried bombs.** Some zombies carry bombs (marked in red). Shoot a carrier and
  it **drops its bomb**; shoot the dropped bomb to set off a **big blast** that
  clears every zombie nearby — a satisfying chain kill.
- **Flaming truck.** Every so often a **burning truck barrels down** toward the
  fence. It takes several shots to stop (more on harder settings); if it reaches
  the fence, it crashes through and takes the fence with it.
- **Bigger play area.** The board is **25% taller**, so the game fills much more of
  a phone screen with less wasted space up top.
- **Simpler controls.** Firing is now a compact **"A"** button (hold to keep
  shooting), leaving a wider slider for moving — and the on-screen buttons no
  longer accidentally highlight their text while you play.
- **Difficulty twists.** **Nightmare** removes the bunkers entirely (the fence
  still stands); **Very Easy** makes the bunkers bomb-proof so only your own shots
  wear them down. Still six settings, still eight languages, still tuned for the
  2015 iPad Mini baseline.

Design and implementation notes live in `docs/ZOMBIE_ATTACK.md`.

---

# William Temple House Digital Raffle System v1.10.0

**Release Date:** May 29, 2026

The Arcade gets its **third game: Star Swarm** — a fixed-shooter in the classic
Space Invaders lineage, thematically at home next to the Arcade's invader icon.
It joins Snake and Brick Mayhem with the same retro pixel-art look, the same
mobile-first control dock, and the same good-citizen behavior (it pauses the
instant a raffle ticket is called).

## Star Swarm

- **The game.** Pilot a ship along the bottom of the board and clear a
  descending formation of **40 invaders** — five color-tiered rows worth more
  points the higher they sit — before they march down to your level.
- **Hold to fire.** A big **FIRE** button auto-fires while held; a thumb
  **slider** moves the ship. (On a keyboard: ←/→ to move, Space/↑ to shoot.)
- **Shields & saucers.** Four **destructible bunkers** give you cover, a periodic
  **bonus saucer** streaks across the top for 50–300 points, and you can even
  **shoot incoming bombs out of the air**.
- **Endless waves.** Clear the swarm and the next wave drops in, a little lower
  and a little faster. The formation also speeds up as you thin it out — the last
  few invaders are the tense ones.
- **Six difficulty presets** (Very Easy → Nightmare) tune how fast the swarm
  marches and how hard it rains bombs. Lose a life and your ship blinks briefly
  invulnerable so you can recover.
- **Everywhere, in every language.** Fully localized across all eight supported
  languages, theme-aware (light / dark / high-contrast), and tuned to run on the
  2015 iPad Mini performance baseline like the rest of the Arcade.

Design and implementation notes live in `docs/STAR_SWARM.md`.

---

# William Temple House Digital Raffle System v1.9.0

**Release Date:** May 29, 2026

A large, cohesive **UX/UI pass** that makes the whole app feel like one designed
material system — building on the frosted-glass and card-gradient work introduced
in 1.8.0. The headline is a redesigned, color-coded display board for dark mode,
a fully flat high-contrast accessibility theme, and a long tail of polish across
the display, admin, and inventory surfaces.

## Color-Coded Display Board (Dark Mode)

The live board's ticket cells were reworked into a clear, high-contrast color
language so clients can read their status at a glance:

- **Now Serving** — a deep-to-medium **blue** cell with crisp **white** numerals.
- **Called** — **green/teal**, with bright mint numerals.
- **Unclaimed** — **gold**, with vibrant-yellow numerals.
- **Returned** — **red**, with soft-pink numerals.
- The large "NOW SERVING" number at the top of the page is a light **powder blue**.

Every ticket cell, in both light and dark mode, now uses the same bottom→top
gradient direction (deeper at the base, lighter at the top), matching the cards.

## Consistent "Material" Surfaces

- The **ticket-detail popup** (tapping a ticket number) is now frosted glass,
  matching the language-entry dialog — so every modal in the app feels the same.
- All colored fills across the app share one gradient orientation; the
  previously-flat alert fills (returned / unclaimed) gained matching gradients.

## High-Visibility Theme Is Now Fully Flat

The **HI-VIZ** accessibility themes (light and dark), designed for visually
impaired visitors, now render every surface as a **solid, flat color** with no
gradients — maximizing contrast and readability — while still honoring the new
color language.

## Display Board Layout

- The service card was split into two: **FOOD PANTRY SERVICE FOR** (the date) and
  a dedicated **CURRENT TIME** card, fully translated across all eight languages.
- Tightened the spacing on the top stat cards for a cleaner, denser header.
- Right-to-left languages (Persian, Arabic) now align the Current Time card
  correctly, with the clock digits kept in their natural left-to-right order.

## Admin & Inventory Polish

- **Admin (dark mode):** the "mark ticket as returned/unclaimed" inputs now match
  the other admin fields; the returned/unclaimed titles and number badges use the
  new high-contrast colors; and the **Next up** panel gained its gradient and a
  legible mint title.
- **Inventory:** the language and theme controls now stay in place (Language-left,
  Theme-right) in right-to-left languages, matching every other page.

## Versioning

- Bumped application version to **1.9.0**.

---

# William Temple House Digital Raffle System v1.7.0

**Release Date:** May 26, 2026

## Persistent Navigation Bar

Introduced a single, consistent navigation system across the three client-facing surfaces, replacing the previous ad-hoc button clusters.

- A persistent bottom tab bar with three destinations: **Your ticket** (`/new`), **What's in stock** (`/inventory`), and **Games** (`/arcade`).
- Two presentations from one model: a floating capsule dock on desktop and a full-width, blurred bar on mobile, with the active destination highlighted.
- Animated line-icons on the core bar (ticket "rip", cart hop, gamepad wiggle) with a `prefers-reduced-motion` guard; a separate **pixel-art arcade-styled variant** on the arcade index so the retro section keeps its own look.
- Removed the now-redundant controls: the `/inventory` and `/arcade` BACK buttons and the inventory/games links in the `/new` ticket-card cluster. Game pages keep their own Back control.

## Inventory Page Refinements

- Condensed the dietary filters into a single multi-select dropdown — each option shows its dietary icon, selections combine, and the trigger uses an animated `package-check` icon.
- Fixed poor contrast on the inventory count pills: the `secondary` palette token is now an adaptive neutral (light gray/dark text in light mode, dark gray/light text in dark mode), meeting WCAG AA in both themes.

## Friendlier Ticket Entry on `/new`

- Clients holding a physical ticket can now enter and save it **before the operator starts the drawing** — submission is no longer blocked; the personalized view shows a calm "not in the drawing yet — check back soon" holding state instead of an error.
- Added an explicit **"I don't have a ticket — just browsing"** option that opens the page directly.
- The **"Enter a new ticket number"** action now also appears in the "Pantry Has Closed For The Day" state, matching the active-drawing state.
- Simplified client-side ticket persistence to a flat 8-hour window from entry time, while still clearing tickets from a superseded drawing.

## Full Multilingual Support for the Ticket Modal

- The `/new` onboarding modal's title, ticket-format hint, pre-drawing reassurance, and "just browsing" action now render in the selected language across all eight supported languages.
- Fixed non-English navigation-bar labels (e.g. Russian "Что есть в наличии") rendering off-center — long labels now wrap centered with readable line spacing and keep their icons aligned.

## Display QR Code Fix

- The public display's QR code now follows the admin-configured display URL **live**: changing the URL in `/admin` updates the on-screen QR on the next refresh without a reload. Previously the display kept the default URL because it only read the URL once on load.

## Versioning

- Bumped application version to **1.7.0**.

---

# William Temple House Digital Raffle System v1.6.3

**Release Date:** April 16, 2026

## ASK-Compliant Session Expiry Toast

Replaced the cryptic one-word `Unauthorized` toast that appeared when a staff member's admin JWT expired mid-session with an Actionable, Specific, and Kind message that matches the error-copy standard documented in `docs/SECURITY.md`.

- Added `src/lib/session-expired.ts` exposing `SESSION_EXPIRED_MESSAGE`, `SessionExpiredError`, and `showSessionExpiredToast()`.
- New toast copy: **"Your sign-in expired. Sign back in to keep working."** with an inline `Sign in` action button that navigates to `/login?callbackUrl=<current-admin-path>` so staff land back on the same admin surface after re-auth.
- `/admin` action dispatchers (legacy + optimistic) and `/api/state/cleanup` handler now detect 401 responses and surface the new toast instead of echoing the raw HTTP status token.
- Added `tests/admin-session-expired.test.tsx` to guard the regression path.
- Documented the ASK violation and fix in `docs/ISSUES.md` as Issue 18; logged the change in `CHANGELOG.md`.

## Versioning

- Bumped application version to **1.6.3**.

---

# William Temple House Digital Raffle System v1.6.2

**Release Date:** March 5, 2026

## Haptic Feedback for Arcade

Added tactile haptic feedback via the `web-haptics` library across all arcade interactions. Haptics are scoped exclusively to arcade routes and do not affect any raffle or admin surfaces.

- **Ticket called:** A `buzz` pattern fires when a tracked ticket is called, complementing the existing confetti and visual overlay.
- **Brick Mayhem gameplay:** `error` on brick destruction (throttled for multiball), `light` on paddle bounce, `error` on ball lost and game over.
- **Snake gameplay:** `success` on pellet eaten, `error` on collision/game over.
- **Arcade buttons:** `heavy` pattern on every arcade button press (suppressed when disabled).

Platform support: Android Chrome/Firefox and iOS26 Safari. Graceful no-op on unsupported platforms.

## Engine Enhancement

Added `paddleBounced: boolean` to the Brick Mayhem `TickResult` type so page-level haptic hooks can observe paddle contact without coupling haptics into the pure-function engine.

## Versioning

- Bumped application version to **1.6.2**.

---

# William Temple House Digital Raffle System v1.5.0

**Release Date:** February 18, 2026

## Homepage and Route Preview

- Public board is now served from `/`, with `/display` kept live as a non-redirecting alias for operational continuity.
- Added `/new` as the preview personalized homepage experience; this route is the candidate to be promoted as the default homepage in a future release.

## Arcade Preview Scope

- v1.5.0 includes an Arcade preview with one playable game: **Snake** (`/arcade/snake`).
- Arcade remains intentionally scoped as a preview surface while broader v2.0 personalization work continues.

## Versioning

- Bumped application version to **1.5.0**.

---

# William Temple House Digital Raffle System v1.4.3

**Release Date:** February 13, 2026

## Theme Transition Effect (Animate UI Parity)

- Added a local Animate UI-style `ThemeToggler` primitive (`src/components/animate-ui/primitives/effects/theme-toggler.tsx`) that applies directional View Transition `clip-path` reveals for base theme changes (`light`, `dark`, `system`).
- Wired the existing theme dropdown (`src/components/theme-switcher.tsx`) to route base theme updates through the new transition primitive while preserving the existing `Hi-viz` contrast mode behavior.
- Added reduced-motion and no-View-Transition fallback handling so theme changes remain immediate and reliable when animation is unavailable or disabled.

## Validation

- Added a `ThemeSwitcher` test that verifies `document.startViewTransition` usage when available.
- Full test suite passing: **125 tests**.
- Production build completed successfully.

## Versioning

- Bumped application version to **1.4.3**.

---

# William Temple House Digital Raffle System v1.4.2

**Release Date:** February 13, 2026

## Batch Range Integrity

- Locked `startNumber` after the first successful draw so staff cannot silently drift the starting bound mid-process.
- Allowed `endNumber` to move only forward during active batching; shrink attempts are rejected with concrete ASK messaging that includes the current bound.
- Enforced atomic `generateBatch` expansion: expanded `endNumber` persists only when the draw succeeds.
- Restricted Append while undrawn tickets remain in the active range to preserve first-in fairness for pending tickets.

## Reliability Fixes

- Added typed user-input error handling in `/api/state` so actionable business-rule errors return HTTP 400 (instead of generic 500).
- Fixed login tab hydration mismatches by using deterministic tab trigger/content IDs and ARIA pairings.
- Fixed login tab edge artifacts from adjacent pane effects in animated tabs.
- Removed animated blur from morph text paths to improve frame consistency on low-power Chromium clients.

## Versioning

- Bumped application version to **1.4.2**.

---

# William Temple House Digital Raffle System v1.4.1

**Release Date:** February 11, 2026

## Motion Expansion (Animate UI)

- Expanded motion behavior across key controls and indicators: animated buttons, icon triggers, pending/live-state feedback, and staggered display card/queue entrances.
- Reworked animated tabs to demo-parity behavior (horizontal track + auto-height + trigger tap scale), including login flow integration.
- Added parity hardening across icon motion triggers and admin icon behavior to keep interaction feedback consistent.

## Display Readability and Localization Motion

- Migrated display "Now Serving" transitions to Animate UI primitives (`MorphingText` + numeric `RollingText`) with tuned timing/stagger for readability.
- Added `LanguageMorphText` across translated labels/messages and enabled word-aware wrapping to prevent orphan characters in localized strings.

## Versioning

- Bumped application version to **1.4.1**.

---

# William Temple House Digital Raffle System v1.4.0

**Release Date:** February 11, 2026

## High-Contrast Accessibility Theme

- Added persisted `Hi-viz` contrast mode alongside Light/Dark/System.
- Introduced contrast-aware theme architecture in `ThemeProvider` with root-class sync for token-based overrides.
- Added and refined high-contrast token sets in `globals.css` (including typography/token mapping updates).

## Motion Foundation

- Added motion primitives and animated icon integration foundation for the app UI.
- Added global `prefers-reduced-motion` support so motion is disabled/simplified when requested.
- Updated theme and header controls to use iconized, motion-capable interactions while preserving accessibility and clarity.

## Additional Core Improvements Included in v1.4.0

- Hardened local auth/dev reliability (trust-host handling, OTP fallback behavior, localhost bypass behavior in dev).
- Updated admin status card styling and token alignment for clearer returned/unclaimed/next-up state visibility.

## Versioning

- Bumped application version to **1.4.0**.

---

# William Temple House Digital Raffle System v1.2.1

**Release Date:** February 3, 2026

## Display Cadence

- Open-window polling now clamps to a 5-minute maximum to keep the public display responsive during service hours, even after long idle periods.

## Versioning

- Bumped application version to **1.2.1**.

---

# William Temple House Digital Raffle System v1.2.0

**Release Date:** January 20, 2026

## Ticket Lookup Experience

- Header search controls now share the same gradient/palette fill, hover treatment, and elevation as the language and light/dark toggles, while extra horizontal padding and responsive text/icon scaling keep the pill legible on desktop and tactile on mobile.
- The search pill sits inside its own padded cluster, so it feels visually cohesive yet distinct from other header buttons, and the digit-only input behavior plus the dedicated icon trigger deliver the same modal/“ticket number not found” experience.

## Versioning

- Bumped application version to **1.2.0**.

---

# William Temple House Digital Raffle System v1.1.3

**Release Date:** January 19, 2026

## Ticket Lookup Experience

- Added a multilingual header search so clients can type or tap a ticket number, with a dedicated light/dark-friendly icon button that triggers the same ticket detail modal or a “Ticket number not found” dialog when the lookup misses.

## Versioning

- Bumped application version to **1.1.3**.

---

# William Temple House Digital Raffle System v1.1.2

**Release Date:** January 16, 2026

## Fixes & Reliability

- Public display polling now backs off during idle periods and pauses when the tab is hidden.
- Operating-hours-aware polling uses a 15-minute slack window before opening and after closing.
- Closed-window polling caps at a maximum of 120 minutes or half the time to the next open window.

## Display Cadence

- Public display now uses adaptive polling with idle tiers, visibility pause, and operating-hours-aware backoff.
- Closed-window polling caps at a maximum of 120 minutes or half the time to the next open window.

## Included from v1.1.1 (Fixes & Reliability)

- Draw position advance now skips tickets marked as returned.
- Confirmation dialogs now close after confirming, even when follow-up errors occur.
- Display date now refreshes correctly after long idle periods (including the standalone display title).

## Included from v1.1.0 (Feature Highlights)

- Admin actions to mark tickets as returned or unclaimed with validation.
- Returned tickets excluded from wait-time estimates; returning the current ticket auto-advances.
- Unclaimed tickets can only be marked after their draw position has been called.
- Live State sections for Returned tickets and Unclaimed tickets.
- Display legend for ticket status and ticket detail messaging for returned/unclaimed/called-at.
- Read-only standalone display updated for parity with new legend/status behavior.
- Admin cards use subtle status gradients; Sonner toasts added for validation/error feedback.

## Versioning

- Bumped application version to **1.1.2**.
