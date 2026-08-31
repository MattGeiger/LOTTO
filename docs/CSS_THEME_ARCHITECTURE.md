# CSS Theme Architecture and OKLCH Migration

## Purpose

LOTTO keeps application behavior, operational color meaning, deployment
branding, accessibility themes, and Arcade presentation separate while still
shipping one compiled global cascade. Every authored color literal in a CSS
file uses `oklch()`; `transparent`, `currentColor`, `inherit`, CSS variables,
and non-color keywords remain valid.

This architecture supports one compiled William Temple House default plus
runtime agency appearances without allowing identity colors to replace
universal queue/status semantics.

## Source Boundaries

### Core application

- `src/app/globals.css` is only the ordered import manifest. It should not
  accumulate tokens, component rules, or deployment palettes.
- `src/app/styles/shared/foundations.css` defines shared geometry and the
  reusable shadow recipes that consume each brand's shadow-color token.
- `src/app/styles/shared/operational-status.css` defines Returned/danger,
  Unclaimed/warning, success, neutral, and operational-action semantics.
  Agency selectors must not override its protected token families. Queue
  progression colors, including the brand-specific presentation of Now
  Serving, remain in brand files while preserving their shared state meaning.
- `src/app/styles/shared/high-visibility.css` defines the shared flat,
  contrast-first Hi-viz behavior and protected status values.
- `src/app/styles/shared/components.css` contains shared component and utility
  selectors that consume semantic tokens rather than choosing agency colors.
- `src/app/styles/brands/william-temple-house.css` owns the single compiled WTH
  identity and remains the no-configuration production default.
- Activated appearances add a request-time custom-property layer after the
  compiled WTH layer; they do not add agency-specific stylesheets.

### Arcade

- `src/arcade/styles/arcade.css` remains the Arcade-only entry point and owns
  pixel-art components, layout, animation, and game presentation rules.
- `src/arcade/styles/themes/william-temple-house.css` owns the compiled WTH
  `--arcade-*` palette.
- The Appearance bridge at the top of `arcade.css` maps only identity/chrome
  roles (surfaces, panels, borders, actions, text, and Now Serving) from the
  active core theme into Arcade variables. Pixel-art/gameplay colors remain in
  the compiled Arcade palette.

Arcade is visually and technically isolated from core raffle styling, but it
is deployment-brand-aware. Arcade theme files may assign only `--arcade-*`
tokens; they must not redefine core raffle/status variables or game mechanics.

## Cascade Contract

Core imports preserve this exact order:

1. Tailwind
2. shared foundations and shadow recipes
3. WTH/default light and dark identity values
4. shared operational status semantics
5. shared Hi-viz themes
6. Tailwind token exposure and shared component/base utilities
7. request-time runtime appearance tokens, when configured

Arcade imports preserve this order:

1. WTH/default dark and light Arcade tokens
2. runtime-aware identity/chrome bridge
3. Arcade component and game rules

Selector specificity and order are part of the compatibility contract. A file
move must not change either one.

## OKLCH Authoring Contract

- Hex, `rgb()`/`rgba()`, `hsl()`/`hsla()`, and named `black`/`white` literals
  are not allowed in `src/**/*.css`.
- Alpha is written with OKLCH slash syntax, for example
  `oklch(0.5 0.1 200 / 0.25)`.
- Brand shadow opacity is carried by the token value, not calculated in the
  shared recipe. Every theme scope supplies `--base-shadow-soft-color`,
  `--base-shadow-color`, and `--base-shadow-strong-color`; shared foundations
  compose geometry from them without `color-mix()`. This keeps hue stable on
  modern engines and preserves alpha in the iPadOS 15 sRGB fallback.
- Neutral colors use zero chroma and a zero hue for consistency.
- Gradients preserve their original geometry and stop positions; only the
  color notation changes during migration.
- Brand source colors may be documented in Markdown as hex for coordination
  with external agencies, but CSS stores their converted OKLCH values.
- CSS color conversion must retain enough precision for an sRGB round trip to
  differ by no more than one 8-bit channel value.

## Implemented Migration and Validation Plan

### Phase 1: baselines and enforcement — complete

1. Record local WTH and the former secondary profile's computed tokens and visual references for
   `/`, `/display`, `/admin`, and `/arcade` in light, dark, and Hi-viz.
2. Sanity-check the live WTH production surfaces before local changes.
3. Add a regression test that rejects non-OKLCH authored color literals in all
   CSS files.

### Phase 2: notation-only conversion — complete

1. Convert colors in the existing `globals.css` and `arcade.css` in place.
2. Preserve selectors, declaration order, gradients, alpha, and token names.
3. Run focused CSS/brand/Arcade tests, lint, build, and local visual checks.

### Phase 3: source extraction — complete

1. Extract core declarations into the source boundaries above without changing
   their relative order.
2. Extract Arcade palette blocks while leaving component rules in the Arcade
   entry stylesheet.
3. Verify that production-default WTH and the then-scoped secondary profile's computed values are
   unchanged from Phase 2.

### Phase 4: final validation — complete

1. Run the full test suite, lint, production build, and `git diff --check`.
2. Test the compiled default and an active runtime appearance in standard
   light/dark and Hi-viz.
3. Check enabled and disabled operational controls to confirm brand profiles
   cannot affect protected semiotics.
4. Recheck `williamtemple.app`; do not commit or push changes that would alter
   the current production deployment without explicit approval.

## Measured Acceptance Criteria

- No forbidden color literals remain in `src/**/*.css`.
- WTH remains the single compiled default when no saved appearance is active.
- An activated saved appearance overrides identity tokens without changing
  shared operational status semantics.
- Computed core and Arcade tokens match the pre-refactor visual values within
  conversion precision.
- Operational status colors remain identical across brands for a given theme.
- Arcade remains absent from core raffle component/style dependencies.
- All automated checks and production builds pass.

## Runtime Custom Brand Layer (Configurable Branding)

When a saved brand configuration is active
(docs/CONFIGURABLE_BRANDING_PLAN.md), the root layout server-renders one
inline `<style data-brand-theme="runtime">` block containing the derived
token sets for `[data-brand="custom"]` light, dark, Hi-viz light, and Hi-viz
dark. Cascade rules for this layer:

1. The inline block is generated (`src/lib/brand-theme/serialize.ts`), never
   hand-authored. It emits an sRGB baseline for iOS 15 and restores Tailwind
   v4's OKLCH values only inside `@supports (color: oklch(0 0 0))`.
2. Its selectors double the `[data-brand="custom"]` attribute so they sit one
   specificity step above every compiled brand layer, making the runtime
   theme win regardless of stylesheet-link order.
3. It may assign only the derivable token vocabulary in
   `src/lib/brand-theme/tokens.ts`. Protected operational status families are
   excluded from that vocabulary, so the shared
   `operational-status.css` semantics always win for a custom brand exactly
   as they do for compiled brands.
4. Arcade chrome reads the same resolved identity tokens through its scoped
   bridge, while Arcade game-art variables remain untouched.
5. Compiled brand files are unchanged by this layer; with no active
   configuration the inline block is absent and the compiled cascade is
   byte-identical to the pre-runtime behavior.
