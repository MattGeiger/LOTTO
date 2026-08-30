# Color Semiotics: LOTTO's Systematic Approach to Color

This document is the design rationale for how LOTTO uses color to signify —
the mental model behind the configurable branding system
(`docs/CONFIGURABLE_BRANDING_PLAN.md`, `src/lib/brand-theme/`). It exists so
future developers understand the *semantic relationships* between colors, not
just the token plumbing. When a derivation rule and this document disagree,
one of them is a bug; figure out which before changing either.

## Why semiotics

When color signifies, consistency within the system is what makes the
signification legible. The founding case: early William Temple House themes
used **blue** for "Now Serving" in light mode and **gold** for it in dark
mode. Same meaning, two hues — and users had to re-learn the code every time
the theme changed. The fix, now doctrine: Now Serving is *blue* in both
modes; what shifts between modes is **value** (a rich darker blue on light
surfaces, a luminous light blue on dark surfaces). A color that carries
meaning must keep its hue everywhere that meaning appears.

## The three axioms

1. **Hue signifies role. Value signifies mode. Saturation signifies
   loudness.** *What* a color means comes from its hue and never changes
   with the theme. *Where* it renders — light, dark, Hi-viz — only shifts
   lightness (the value ladder, below). *How emphatic* it is shifts chroma
   (a whisper-chroma surface tint and a full-chroma button share a hue and
   therefore a family, at different volumes). The old blue/gold bug was a
   hue answering a value question.

2. **The signal ceiling: at most two hues carry meaning.** In every brand
   system, regardless of how many colors it contains, only two hues signal:
   the **state/identity hue** (Now Serving, Called, primary actions,
   selection, focus) and the **accent hue** (secondary emphasis, icons,
   highlights). Every additional brand color is **ambience** — surface
   tints, gradient stops, icon families, decorative texture — and must never
   be promoted into a state role. Humans reliably track a small number of
   simultaneous color codes; more hues as *signals* means less meaning per
   hue.

3. **Tiers expand outward from the semiotic center.** The center of the
   system is state; the periphery is ambience. A monochrome brand runs
   everything on one hue's ladder. Each additional color is assigned to
   progressively more *peripheral* roles. Adding colors adds richness, never
   new meanings.

## The layers (center → periphery)

| Layer | Tokens (examples) | Who controls it |
| --- | --- | --- |
| **L0 Universal operational** | `--status-danger-*` (Returned, red), `--status-warning-*` (Unclaimed, gold), success, neutral, `--operational-*` | Nobody. Identical across every agency and theme; excluded from the configurable vocabulary (`src/lib/brand-theme/tokens.ts`). |
| **L1 State** | `--ticket-serving*`, `--ticket-served*`, `--serving-text-gradient`, `--serving-label-color` | Brand-tunable **hue**; system-controlled value relationships. Serving is the loudest value of the state hue per mode; Called is a subordinate value of the *same* hue. |
| **L2 Identity** | `--primary`, `--ring`, selection, links | The brand's dominant hue — by default the same hue as L1 (state and identity share the center). |
| **L3 Accent** | `--accent`, `--icon-*`, secondary emphasis | The second signaling hue, if the brand has one. |
| **L4 Ambient** | `--card-gradient`, `--gradient-card-*`, `--gradient-display-bg`, decorative tints | Whisper-chroma page atmosphere and texture. The Ambient slot owns this layer and never signals. |
| **Anchors** | `--background`, `--foreground`, `--card`, borders, muted text | The neutral (or near-neutral) tonal foundation. Every tier has anchors; they are tones, not signals. |

## The value ladder

Each signaling hue is realized as a ladder of lightness rungs; roles pick
rungs per mode. The rungs (with the shipped St. Johns teal as the worked
example, hue ≈ 163):

| Rung | Approx. L | Used for |
| --- | --- | --- |
| Deep shade | ~0.27 | Text on luminous fills (dark mode), Called text (light) |
| Rich base | ~0.62 | Now Serving fill in **light** mode; Hi-viz light emphasis |
| Identity | ~0.64 | `--primary` in standard modes |
| Luminous | ~0.85 | Now Serving in **dark** mode (the "glow"); dark-mode ring |
| Pale tint | ~0.91–0.96 | Called fill (light mode), readable foregrounds on rich fills |

The derivation (`src/lib/brand-theme/derive.ts`) encodes these as offsets
from the brand inputs (glow = primary +0.209 L / +0.036 C, etc.), reverse-
engineered from the hand-authored St. Johns identity. Mode never changes the
rung's hue — only which rung a role sits on.

## Color-story tiers

Operators fill up to five fixed slots. Position is the job: the system does not
reclassify a charcoal Accent into a surface anchor or let clearing a row shift
later colors into different meanings. The classifier remains a recommendation
and warning tool, not a role-assignment mechanism. Each tier has a
differentiation strategy:

- **Monochrome (1):** one hue; significance is created entirely by varying
  value and saturation on the ladder. All of L1–L4 derive from the single
  hue; anchors are neutral.
- **Two-tone (2):** Main color plus Accent. A neutral in slot two deliberately
  becomes a neutral Accent; it is not silently promoted to an anchor. Operators
  who want charcoal as the Dark anchor add the preceding slots and place it in
  slot four. State and identity stay on the Main color.
- **Three-tone (3):** dominant → L1+L2, second → L3 accent, third →
  **ambient by default** (surface tints, gradients). A third hue may serve
  as highlight only when it is a tint of the dominant or accent family;
  it never signals state. *Example: Lift Up — deep purple, light green,
  dark green.*
- **Four/Five-tone (4–5):** explicit Main, Accent, Ambient, Dark anchor, and
  Light anchor jobs. The signal ceiling holds: two hues signal, Ambient is
  texture, and anchors set the tonal foundation.

## Constraints (good constraints yield creative results)

1. **Continuity invariant.** For every L1–L3 role, hue drift across light,
   dark, and Hi-viz variants must stay within a small tolerance (target:
   ≤ 8°, chromatic colors only). This is the anti-blue/gold rule and must be
   enforced by a regression test once implemented, not by review.
2. **Reserved hue bands.** L0 owns red (≈ hue 25, Returned/danger) and gold
   (≈ hue 85, Unclaimed/warning) at signal chroma. A brand color inside
   ~±20° of a reserved band at signal chroma must trigger a wizard warning
   and be steered toward ambient or anchor roles — a teal brand with a red
   accent would otherwise make ordinary UI read as errors. Whisper-chroma
   ambient use of nearby hues is fine; the collision is chroma-dependent.
3. **WCAG floors with auto-correction.** Text pairs ≥ 4.5:1; color-on-color
   emphasis pairs ≥ 2.5:1 (calibrated floor — see
   `src/lib/brand-theme/validate.ts` for why plain WCAG underrates
   white-on-mid-color). Every pair whose two sides are both *derived* is
   auto-corrected by nudging value only (hue and chroma are identity;
   value is negotiable — axiom 1 applied to accessibility). Pairs built
   from operator-typed colors surface as actionable errors instead.

## Automatic recommendation

The wizard is automation-first: when an operator reaches the color step with
an untouched palette and an uploaded logo, the system extracts the logo's
palette (median-cut over opaque pixels, population-ranked) and builds the
whole color story for them — they only correct what they dislike
(`recommendColorStory` in `src/lib/brand-theme/color-story.ts`;
`extractPaletteFromImage` in `src/components/appearance/palette-extract.ts`).

Ranking: chromatic colors score by pixel population weighted by chroma
salience, so a small saturated mark outranks a large pale wash. Neutrals
become anchors (darkest → dark surface, lightest → light surface).

**Reserved-band workaround ladder.** The recommender never auto-places a
reserved-band color (Returned red, Unclaimed gold) in a signaling role:

1. If safe chromatics exist, they take primary/accent; colliding colors
   become ambience, where the derivation only whispers their hue.
2. If every chromatic collides but the logo has a dark neutral, the
   recommendation builds a **tonal identity** — two value rungs of the
   neutral ladder occupy both signaling ranks (the monochrome tier's own
   strategy), and the brand color stays as ambient texture.
3. If there is nothing but colliding chromatics, the dominant hue is
   **demoted to a tone**: same hue family, chroma below the signal
   threshold, deepened value — identity stays in the brand family without
   impersonating a status color.

Each workaround emits a plain-language note in the wizard explaining what
happened and that the operator may override it manually (manual choices get
warnings, not vetoes — the recommender is conservative so that overrides are
always deliberate).

## Implementation status

The model above is implemented (2026-07-19). Where each piece lives:

1. **Serving-hue continuity** — every mode's serving variant (dark ramp,
   Hi-viz glows, Called family) derives from the `serving` input's hue via
   `servingGlow`/`hiVizServingGlow` in `src/lib/brand-theme/derive.ts`. The
   continuity invariant (per-role cross-mode hue drift ≤ 8°) is enforced by
   the "color semiotics" regression tests in `tests/brand-theme.test.ts`,
   including the adversarial case of a serving hue far from the primary hue —
   the exact configuration that produced the original blue/gold bug.
2. **Ambient hue** — schema v2's fixed Ambient role contributes hue to the page
   wash and card-tint families; loudness stays system-fixed at whisper chroma,
   and regression tests prove it never reaches signaling tokens. Primary is
   the atmosphere fallback only when Ambient is absent. Legacy schema-v1
   arrays remain readable during migration.
3. **The color-story configurator** — the wizard's Colors step
   (`src/components/appearance/steps/ColorsStep.tsx`) uses five fixed jobs:
   Primary, Accent, Ambient, Dark anchor, and Light anchor. Values are exact
   Tailwind v4 family/weight names from the generated palette; arbitrary hex
   and OKLCH entry is no longer part of the standard workflow. Optional roles
   appear through **Add color** and clear from the end without shifting any
   later meaning. **Extract from light logo** recommends a complete fixed-slot
   story and snaps deterministically to the nearest allowed stops. FEED's
   picker then exposes nearby logo families, search, a native family selector,
   and the 11 weights. `src/lib/brand-theme/color-story.ts` still classifies
   recommendations and protects LOTTO's signal ceiling/reserved bands before
   snapping. Surfaces and the textLight/serving specials remain available under
   "Fine-tune".

## How the shipped brands map

| Brand | Story | L1/L2 (state+identity) | L3 (accent) | L4 (ambient) | Anchors |
| --- | --- | --- | --- | --- | --- |
| William Temple House | 5-slot configured story | Blue (≈ 258) | Gold (≈ 94) | Teal | White / near-black |
| St. Johns Food Share | Compiled reference; configurable target | Emerald (≈ 163) | Operator-selected | Optional | Off-white / charcoal |
| Lift Up | 3-tone | Deep purple | Light green | Dark green | White / dark neutral |
