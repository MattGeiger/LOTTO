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
