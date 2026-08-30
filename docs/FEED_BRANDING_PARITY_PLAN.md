# FEED Branding Parity Plan

## Objective

Bring FEED 1.7.5-beta.4's white-label color and image workflow to LOTTO while
preserving LOTTO's Next.js, localization, Vercel Blob, operational-status, and
iPadOS 15 contracts.

This is a controlled parity port. FEED is the interaction reference; LOTTO's
runtime boundaries remain authoritative where the applications differ.

## Non-negotiable boundaries

- Agency colors may style identity and presentation, but never LOTTO's shared
  Returned, Unclaimed, success, warning, danger, neutral, or operational action
  vocabulary.
- Runtime theme CSS emits an sRGB baseline and restores OKLCH only inside an
  `@supports` block. Request-time CSS does not receive Lightning CSS's legacy
  conversion.
- Visitors never start or poll translation jobs. Appearance activation is a
  finite staff action and new visitor-facing brand copy must be ready before it
  becomes active.
- Original logo bytes live in Vercel Blob in production (and the documented
  local fallback in development). Configuration JSON stores references and
  presentation metadata, not image payloads.
- Existing compiled William Temple House and St. Johns themes remain exact
  fallbacks. Existing schema-v1 custom configurations remain readable during
  migration.

## Target experience

LOTTO keeps its seven-step Appearance wizard, with FEED's established patterns
inside the relevant steps:

1. Choose a starting point.
2. Enter organization identity and localized service copy.
3. Upload light/dark logos and a square install mark. Preserve safe SVGs as
   vectors, preserve suitable raster formats, show quality guidance, detect
   likely dark-plate needs, and generate target-sized icon derivatives.
4. Assign a fixed color story: Primary, Accent, Ambient, Dark anchor, and Light
   anchor. Choose only from the installed Tailwind v4 palette. Empty optional
   roles never reorder later roles. Logo recommendations snap to that palette.
5. Enter staff sign-in copy.
6. Configure optional FEED inventory integration.
7. Review all four visual modes, preview the draft in the current browser
   session, save a draft, or activate it.

## Color architecture

### Palette source

- Pin `tailwindcss` and `@tailwindcss/postcss` to one exact release.
- Generate a committed TypeScript palette module from Tailwind's installed
  `theme.css`; do not maintain a second hand-copied color table.
- Include every chromatic and neutral family exposed by that release, including
  grayscale choices.
- A drift test compares the generated artifact with the installed package and
  fails when dependency and palette stop moving together.

### Persisted model

- Schema v2 adds a `tailwind-v4` color system with five fixed semantic roles.
  Each populated role stores a palette key such as `sky-700`, not arbitrary
  CSS or mutable row order.
- Schema-v1 payloads parse through a compatibility path. They continue using
  the legacy derivation engine until an operator deliberately adopts the new
  palette workflow.
- New configurations use v2. Editing a legacy configuration offers a
  deterministic nearest-palette migration without altering the active version
  merely by opening the wizard.

### Derivation

- A fixed stop map derives all four theme scopes from the selected families.
  Primary controls action hierarchy; accent controls emphasis; ambient controls
  backdrop atmosphere; surface anchors tune neutral surfaces.
- Accent never drives the page backdrop. Deep warm accents that cannot support
  accessible dark text invert their surface treatment instead of silently
  changing hue.
- Every selected role has an observable, documented consumer.
- The final merged token set passes the existing protected-token and contrast
  validation pipeline before save or activation.

## Asset architecture

- Detect actual bytes before trusting browser filename or MIME metadata.
- Sanitize SVG structurally. Remove disallowed elements and attributes, reject
  external references, and retain safe vector output.
- Measure raster dimensions without upscaling the stored original. Warn about
  undersized or unusually large files and preserve supported formats where the
  processing pipeline can do so safely.
- Require an approximately square install mark and rasterize SVG separately at
  each requested icon size so vector density is evaluated at the derivative's
  real target.
- Persist original filename, detected type, dimensions, and presentation
  metadata with configuration references.
- Provide a storage check that reports referenced and unreferenced managed
  objects. Deletion remains an explicit authenticated staff action and protects
  recently uploaded files from racing an unsaved wizard.

## Localization-safe activation

`serviceLabel` is LOTTO's visitor-facing `brand_string`. Saving a draft never
starts translation. Activating a configuration whose label differs from the
currently active label performs this finite sequence:

1. Save and validate the candidate without making it active.
2. Queue only the candidate `brand_string` gaps for enabled non-English
   languages.
3. Advance the existing bounded translation runner; stop on no progress,
   provider failure, or the hard request budget.
4. Activate only after every required row is complete. On failure, preserve the
   current appearance and direct staff to Translation Management.

The auditor accepts the candidate label explicitly; it does not temporarily
activate the draft to discover content. Visitors continue to consume only the
ready language catalog and make no extra polling requests.

## Delivery sequence

1. Add this plan and preserve the existing schema-v1/runtime behavior.
2. Pin and generate the Tailwind palette; add drift and protected-token tests.
3. Add schema v2, migration helpers, fixed-role derivation, and exhaustive
   contrast coverage.
4. Harden image processing and add asset metadata/storage inspection.
5. Port the fixed-role picker, recommendations, four-mode preview, and
   session-only app preview.
6. Add localization-safe activation using the existing bounded translation
   APIs.
7. Update current-state architecture docs, the Appearance user guide, and the
   changelog; run targeted tests, the full suite, lint, build, legacy bundle
   scan, legacy smoke test, and clean `.next`.

Because pinning Tailwind changes a client-bundle dependency, production
promotion additionally requires a Vercel preview and successful sign-in on the
real iPadOS 15.8 device. Automated checks are necessary but do not replace that
gate.

---

# Revised direction — decided 2026-08-29

## What changed

This plan was written as a *controlled parity port*: FEED as the interaction
reference, adapted freely to LOTTO's runtime. What shipped in
`v1.26.0-beta.1` followed the plan's **structure** but re-implemented its
**behaviour**. That is the origin of the defects found in beta validation, and
the reason for the change of approach recorded here.

The evidence before the parity port, from probing `deriveBrandTheme` directly:

| role        | light            | dark | hiVizLight | hiVizDark |
| ----------- | ---------------- | ---- | ---------- | --------- |
| **Accent**  | 3 tokens         | 0    | 0          | 0         |
| **Ambient** | 2 card gradients | 4 card gradients | 0 | 0     |

Setting `ambient` to a wildly different family produces a **byte-identical**
page backdrop; the backdrop is driven by `primary` regardless. Meanwhile the UI
label reads *"Ambient — Quiet page atmosphere and background texture"* and this
plan asserts, above, that "Every selected role has an observable, documented
consumer." Neither was true in v1.26.0-beta.1. The Unreleased parity work
closes both gaps and pins them with structural tests.

The wizard's own components tell the same story: LOTTO's colour field is 161
lines against FEED's 252. The shape crossed over; the behaviour did not.

FEED reached its current state through many rounds of exactly this — roles that
looked wired and were not, accents leaking into backdrops, neutral
harmonisation picking mauve for orange, muddy accents needing foreground
inversion rather than hue shifts. Re-deriving that from a screenshot re-earns
every one of those bugs.

## The new rule

**LOTTO adopts FEED's implementation, not FEED's appearance.** Staff move
between the two applications; the experience should be identical, because it is
the same experience. FEED's version is better in every dimension that has been
measured, and it is already built.

Port the real thing — component structure, interaction model, derivation rules,
role semantics, and the tests that pin them. Deviate only where LOTTO is
genuinely different, and write the reason down at the point of deviation.

### Legitimate exceptions

These are LOTTO-specific and must not be flattened into FEED's shape:

- **Localization of custom UI copy.** `serviceLabel` is a visitor-facing
  `brand_string`; activation runs the bounded translation sequence documented
  above. FEED has no equivalent and never will.
- **Protected operational semiotics.** Returned, Unclaimed, success, warning,
  danger, neutral, and the `--operational-*` actions are LOTTO's shared
  vocabulary and stay outside `[data-brand]`. See `AGENTS.md`.
- **The token vocabulary itself.** LOTTO derives `ticket-serving`,
  `ticket-upcoming`, `base-shadow-color` and four scopes including two
  high-visibility modes. FEED's token names do not map one-to-one, so what
  ports is the *rule* — which role drives which surface, and with what
  precedence — not the token list.
- **Runtime and storage boundaries.** Next.js route handlers, Vercel Blob,
  Neon. Unchanged.
- **Legacy emission.** `serializeBrandThemeCss`'s sRGB baseline plus
  `@supports` layer is *better* than FEED's approach and stays. FEED should
  arguably adopt it, not the reverse. Note that it covers the stylesheet only —
  see Issue 44 for the inline-style half.

### Not an exception

Anything justified only by "LOTTO's version is simpler" or "this was quicker to
write." Simplification is what produced the table above.

## Implementation status, ahead of promotion

1. **Role semantics — implemented.** With the required approval, Ambient now
   drives the page wash and mid-stop hue; Primary is the fallback only when the
   Ambient slot is absent. Accent reaches standard dark and both Hi-viz scopes.
   Structural tests require those consumers and also prove Accent never leaks
   into the page backdrop.
2. **Issue 45 — implemented.** FEED's `oklab` lesson uncovered a second,
   LOTTO-specific legacy failure: a `color-mix(var(...), transparent)` cannot be
   safely downlevelled for iPadOS 15. LOTTO now emits soft/base/strong shadow
   tokens with alpha already applied and the shared recipes perform no color
   interpolation. See `docs/ISSUES.md`.
3. **FEED color interaction — ported.** The Colors step uses FEED's fixed-slot
   add/clear flow, extraction action, nearby-family suggestions, search, native
   family selector, weight strip, and viewport-safe popover. The improvised
   canvas/EyeDropper surface has been removed.
4. **Deliberate adapter.** FEED exposes a separate Accent-family override
   because its hierarchy stores free OKLCH values and snaps at derivation time.
   LOTTO schema v2 stores the exact family and weight in the Accent slot, so a
   second family override would be two controls for one persisted decision.
   LOTTO's four-mode preview remains because Hi-viz is a product requirement.
5. **Verification.** Focused automated tests pass. iOS 15.4 and iPadOS 26.5
   simulators both hydrate to **Persistence confirmed** with the corrected
   shadows. At a 768×1024 tablet viewport the modal scrolls, all four previews
   differ, the picker remains within the viewport, and its suggestions, search,
   native family select, and 11 weights are reachable with no console errors.
   The production build passes; all 42 production chunks pass the legacy scan,
   and the `/` plus `/login` hydration/interactivity smoke passes. The generated
   `.next` tree is removed afterward. Only the final Vercel preview plus real
   iPad mini 4 sign-in remain promotion gates.

## Related decision: retiring the hard-coded St. Johns theme

The compiled St. Johns and William Temple House themes exist because the
branding tool did not. Once the tool is good enough — which is what the work
above is for — the hand-authored themes become a second source of truth for the
same thing, and `derive.ts` stops being reverse-engineered from CSS that no
longer needs to exist.

**Decision: St. Johns is expected to be dropped as a compiled theme**, once a
configuration produced by the wizard reproduces it to the operators'
satisfaction. Not scheduled, and not to be done piecemeal.

This has one immediate consequence. `tests/brand-assets.test.ts` asserts a
5120x5120 viewBox for the St. Johns browser icon while the committed asset is
512x512, and that test is **red as of v1.26.0-beta.1**. It is left red
deliberately: the asset is user-owned and current, the expectation is stale, and
the whole fixture is on a path to deletion. Do not "fix" it by editing the
asset back.
