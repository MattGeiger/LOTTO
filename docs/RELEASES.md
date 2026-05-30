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
