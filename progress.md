Original prompt: Align configurable queue colors so Primary owns Live State, Next Up, Served, and Now Serving while Returned and Unclaimed remain canonical; fix Arcade activated-language availability; add pull-to-refresh for installed app mode; and move Arcade controls 32 px above the home indicator.

## Progress

- Session audit: 4 high-severity production advisories in the known server-only Auth/Nodemailer chain; no fix available.
- Mapped the color boundary: Served/Now Serving are derivable identity tokens;
  Returned/Unclaimed remain structurally protected. Live State and Next up were
  the remaining consumers of canonical success green.
- Updated Live State values and the complete Next up treatment to Primary while
  retaining canonical Returned/Unclaimed tokens and action variants.
- Replaced Arcade's stale once-per-provider catalog dependency with one bounded
  refresh on explicit menu open; no visitor polling was added.
- Added standalone-only top-edge pull-to-refresh and a 32 px home-indicator lane
  under all three Arcade game docks.
- Added focused regression coverage; 47 relevant tests and lint pass.
- Exercised Snake with the required Playwright game client using short directional
  input bursts and inspected the rendered frame. The game shell, board, and
  control dock render; no application exception was reported. The dev capture
  records the existing local high-score 403 and HMR WebSocket handshake noise.
- Full suite passes: 117 files, 808 tests, and one intentionally skipped
  production-only legacy fixture. Production build and TypeScript pass; all 42
  chunks pass the legacy syntax scan; `/` and `/login` pass the production
  hydration/interactivity smoke.
- Confirmed the live Arcade menu performs one catalog request and offers all 11
  ready options (including Bosnian, Japanese, and Korean). Both iPad simulators
  render the Arcade shell; the modern Admin screen visibly keeps Primary Live
  State/Next up beside canonical red Returned and gold Unclaimed surfaces.
- Production standalone emulation computes 46.4 px below the Snake controls
  (14.4 px base/safe-area floor + the requested 32 px lane).
- TODO: Vercel preview plus real installed-device pull gesture remain the final
  pre-promotion checks.

## Follow-up prompt

Add a bottom-fifth blur cue to the Arcade language menu, fix the opaque iOS
15.4 iPhone navigation selection block, give Next Up the same gradient language
as the protected queue cards and order the stack Next Up / Unclaimed / Returned,
allow installed-app pull-to-refresh to begin anywhere on an unscrolled page,
extend configurable appearance roles into Arcade, port FEED's development-only
live Tailwind palette calibration and JSON export tool, then release as
1.26.0-beta.2 without pushing.

## Follow-up progress

- Replaced the nested Arcade language ScrollArea with a native iOS-scrollable
  region and a bottom-fifth blur/fade cue that disappears at the end of the list.
- Replaced the active navigation alpha utility with a four-scope,
  serialization-safe `--nav-active-background` brand token.
- Next Up now consumes the configurable `ticket-serving` gradient; Unclaimed
  precedes Returned and both retain their protected canonical semantics.
- Installed-app pull-to-refresh now starts anywhere while the document is at
  the top and yields to inputs, sliders, and explicitly marked nested scrollers.
- Mapped configurable core identity roles into Arcade chrome and Now Serving;
  gameplay art colors and protected raffle statuses remain outside the bridge.
- Ported FEED's dev-only side-sheet calibration experience with live Tailwind
  v4 token choices, filtering, drift sorting, session persistence, reset, and
  JSON export. Live CSS uses an sRGB baseline plus gated OKLCH enhancement.
- Focused tests and lint pass. Full device/build/release verification remains.
- Full suite passes: 120 files and 816 tests plus one intentionally skipped
  production-only fixture. TypeScript, lint, production build, all 42 legacy
  chunks, and the production hydration/interactivity smoke pass.
- The production calibration payload is absent from client chunks. Arcade was
  checked on iPadOS 15.4 and 26.5; the iOS 15.4 iPhone inventory page renders
  the selected tab as a translucent surface with icon and label visible.
- TODO: the Vercel preview, real iPad mini sign-in, and an installed-device pull
  gesture remain pre-promotion gates.
