# Configurable Branding Plan (Self-Service Theming)

## Status

Shipped in LOTTO v1.20.0 and validated on localhost before production rollout.
**The capstone brand-swap test passed in both directions on 2026-07-19**: weak
form (template
activation displaces the compiled identity, `tests/brand-runtime.test.ts`)
and strong form (manual from-scratch recreation in the wizard only — a WTH
dev deployment made on-brand for St. Johns, and a St. Johns-profile
deployment made on-brand for WTH, each reviewed in light, dark, and Hi-viz
against the hand-authored references). The production rollout requires the
additive `brand_configurations` schema migration in every agency database.
Database-backed identity and built-in template assets are production-ready;
custom uploaded assets remain filesystem-backed and therefore are not durable
on Vercel until the Blob storage work noted below ships. Known refinements
deferred to Phase 3: the PWA theme color is
currently auto-set from the uploaded mark's dominant color (can pick a
background shade; an explicit override field is a wizard refinement), and
Arcade palettes do not yet derive. One calibration note from Phase 0: the emphasis-pair contrast
floor is 2.5:1 rather than 3:1 — measurement showed both shipped identities'
deliberate emphasis choices (St. Johns' Issue 33 fix ≈2.78:1, WTH's light
serving ramp ≈2.74:1) sit below WCAG's large-text line, while the *original*
Issue 33 bug measures ≈4.7:1; the structural Issue 33 protection is the
derivation's tint-preference ordering, not the numeric floor
(`src/lib/brand-theme/validate.ts`).

This document was originally the draft proposal below; the architecture
described is the one implemented. This document plans the
evolution of LOTTO's white-label branding from code-owned deployment profiles
(see `docs/WHITE_LABEL_BRANDING_PLAN.md`, shipped in v1.19.0) into a
database-persisted, admin-configurable appearance system that a non-technical
agency operator can complete without editing source code.

Nothing in this plan changes William Temple House production behavior. WTH
remains the compiled, no-configuration default, and `NEXT_PUBLIC_LOTTO_BRAND`
continues to work exactly as documented today. The configurable system layers
on top of — and, when a saved configuration exists, in front of — the existing
profile mechanism.

## Motivation

The v1.19.0 white-label release proved that LOTTO adapts cleanly to another
agency's identity, but the St. Johns Food Share launch also measured the cost
of the current approach per agency:

- ~95–190 lines of core brand CSS, a Hi-viz variant, and ~160 lines of Arcade
  palette CSS, all hand-authored and code-reviewed.
- Edits to the `BrandProfileId` union and `BRAND_PROFILES` record in
  `src/config/brand.ts`.
- A `public/brands/<id>/` icon set (browser SVG plus padded 32–512 px PNGs)
  produced manually and refreshed across three commits.
- Brand regression tests, documentation updates, and a source release for
  every brand-content fix. Five post-launch commits (logo aspect ratio,
  primary-button contrast, PWA short name, two icon refreshes) were brand
  content, not application behavior, yet each required a developer and a
  deploy.

At two agencies this is manageable. At ten it is thousands of lines of
per-agency CSS in the repository, a growing review obligation, and a
developer-in-the-loop requirement that is the single largest friction for
agency adoption. Moving brand content out of code and into per-deployment
configuration makes agency count irrelevant to repository size and removes the
developer from routine brand changes.

## Architecture Decision

Keep one repository, one shared application, and one agency per deployment
(separate Vercel project, Neon database, Resend, and domain — unchanged from
v1.19.0). Add a per-deployment **brand configuration** persisted in that
deployment's own database, edited through a multi-step Appearance wizard in
the Admin Advanced section.

This is deliberately **not** multi-tenant theming. Each database holds at most
one active configuration, so there is no brand-switching logic in the request
path beyond "load the active configuration." Agency data isolation continues
to come from deployment separation, not from conditional rows.

```text
Brand resolution order (first match wins)
1. Active brand configuration row in this deployment's database
2. Compiled profile selected by NEXT_PUBLIC_LOTTO_BRAND
3. William Temple House compiled default
```

### Why persisted configuration instead of more compiled profiles

- Repository size and review load become independent of agency count: adding
  an agency is a wizard session, not a branch, a CSS file, and a release.
- Brand-content fixes (a logo swap, a color tweak, a copy change) become
  admin edits with immediate effect instead of source releases.
- The guardrails learned from the St. Johns launch (contrast, logo aspect
  ratio, protected operational tokens) move from code review and manual
  checklists into automated validation the wizard enforces on every save.
- Compiled WTH and St. Johns profiles remain in the repo as the default and as
  seeded read-only **templates**, preserving the build-time safety net for the
  surfaces that ship without configuration.
- Saved/loadable configurations directly enable future scheduled appearance
  overlays (holiday and seasonal themes) with no additional architecture.

### What stays code-owned

- All queue, display, staff, translation, help, and Arcade behavior.
- The CSS source boundaries in `docs/CSS_THEME_ARCHITECTURE.md`: shared
  foundations, operational status semantics, Hi-viz behavior, and component
  rules. The configurable system generates *token values*; it never generates
  selectors, component rules, or layout.
- The protected operational status families (`--status-*`,
  `--gradient-status-*`, `--ticket-unclaimed-text`, `--ticket-returned-text`,
  `--operational-*`). These are simply absent from the configurable schema, so
  a saved configuration cannot express an override — a strictly stronger
  guarantee than the current code-review guardrail in `AGENTS.md`.
- The WTH and St. Johns compiled profiles and their CSS files, retained as the
  no-configuration default and as template sources.

## Configuration Schema

The persisted configuration mirrors the existing `BrandProfile` type in
`src/config/brand.ts`, with colors replaced by a deliberately compact set of
**brand inputs** from which the full token set is derived.

| Group | Configurable values | Notes |
| --- | --- | --- |
| Identity | organization name, app name, PWA short name, tagline, page descriptions | Same fields as `BrandProfile.metadata`; descriptions offered with sensible generated defaults from the organization name. |
| Links | organization website, public app URL | Same as today. |
| Logos | uploaded light/dark logo images, presentation mode (`transparent` / `dark-surface`) | Intrinsic dimensions measured server-side on upload, never typed by the user. Rendered through the existing height-capped `BrandLogo` slot. |
| Icons | one uploaded square mark | Full browser/Apple/manifest/install set (32–512 px, padded, rounded) generated server-side; no per-size uploads. |
| Colors | brand primary, page surface, text/dark surface, optional accent, optional Now Serving emphasis (defaults derived from primary) | OKLCH color inputs with a searchable picker; the full semantic token set for light, dark, and both Hi-viz themes is derived, not authored. |
| Staff | sign-in heading, authorized-email guidance, email placeholder | Same as `BrandProfile.staff`. |
| Capabilities | inventory enabled flag, FEED public inventory URL | Same contract as today: opt-in, validated URL, no cross-agency fallback, CSP built from the configured origin. |

Explicitly **not** configurable: operational status colors, Arcade game
mechanics, component geometry, fonts, queue workflow, and anything in the
shared CSS layers. Arcade `--arcade-*` palette derivation from the brand
inputs is a later phase; until then a custom configuration uses the WTH Arcade
palette.

### Color derivation

St. Johns' "deliberately compact color system" (brand teal, off-white,
charcoal; everything else derived tints/shades) is the model, now made
programmatic. A pure TypeScript derivation module maps the 3–5 brand inputs to
the complete semantic token set — surfaces, cards, borders, rings, hover and
disabled states, Called/Now Serving progression treatments, shadow color, and
the dark and Hi-viz variants — using OKLCH lightness/chroma manipulation. The
OKLCH-only authoring standard (`docs/CSS_THEME_ARCHITECTURE.md`) makes this
principled: derivations are arithmetic on L/C/H, and output serializes
directly to `oklch()` strings.

Every derived pairing that renders text on a fill (`--primary` /
`--primary-foreground` foremost — the exact St. Johns Issue 33 failure) is
contrast-checked at derivation time against WCAG 2.1 AA (4.5:1 normal text,
3:1 large text/UI). The derivation must either auto-correct the foreground to
pass or refuse the save with a specific, plain-language explanation. Manual
contrast checking, currently a documented reviewer obligation in
`docs/WHITE_LABEL_BRANDING_PLAN.md`, becomes impossible to skip.

### Forward compatibility: sparse overrides (planned Advanced tier)

The derivation pipeline is designed from Phase 0 to support a future Advanced
appearance tier — granular tweaks for operators with a keen design eye when
the automatic derivation misses the mark — without rearchitecting. The final
token resolution is:

```text
final tokens = derive(brand inputs) merged with sparse overrides
```

Three Phase 0 requirements make this composition safe and cheap later:

1. **Token-map intermediate representation.** The derivation module emits a
   flat, typed token map per theme scope (light, dark, Hi-viz light, Hi-viz
   dark), not CSS text. Overrides merge at the token-map level; CSS
   serialization is a separate final step.
2. **Overrides are sparse deltas.** The payload stores only tokens the user
   explicitly changed. Un-overridden tokens continue to re-derive live when a
   base input changes later; deliberate tweaks persist. A full materialized
   token set is never stored, so a theme never silently disconnects from its
   base inputs.
3. **Validation runs post-merge.** Contrast checks and the
   protected-token-name guarantee validate the *final merged* token set, and
   override keys validate against an allowlist of derivable tokens — the
   Advanced tier can never become a bypass for the contrast guard or a path
   to the operational status families.

The Advanced tier itself (Phase 3) exposes **semantic slots, not raw
tokens** — on the order of 15–20 designer-meaningful controls (page surface,
card surface, borders, primary + hover, accent, ring, Now Serving treatment,
Called treatment, shadow tint, and dark-mode counterparts). A slot may fan out
to several derived tokens internally so tweaks stay coherent; adjusting one
slot cannot strand its dependent tokens the way editing one raw token can.
Raw editing of the full token set is deliberately not on the roadmap.

Known inherent complexity to design for, not around: **stale overrides**. An
override saved against one base palette can clash after the base inputs
change. The Advanced UI must visibly mark customized slots, offer per-slot
"reset to derived," and re-run post-merge validation on every base-input
change so a newly-clashing override is flagged rather than silently shipped.
Until the Advanced tier ships, the overrides map is simply always empty —
Basic and Advanced are the same pipeline, not a migration.

## Persistence and Delivery

### Storage

Following the existing JSONB state-table pattern (`raffle_state`,
`ai_configurations`):

```sql
CREATE TABLE IF NOT EXISTS brand_configurations (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_template BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

- At most one row has `is_active = true` (enforced by a partial unique index).
- WTH and St. Johns are seeded as `is_template = true` rows generated from the
  compiled profiles, so the wizard's "start from a template" option always
  matches the code-owned source of truth. Templates are read-only; "Use this
  template" duplicates into an editable configuration.
- The payload is versioned (`schemaVersion`) and validated with a zod schema
  shared by the wizard client, the API route, and tests. Invalid payloads fail
  closed to the compiled profile and surface an Admin warning — a broken saved
  configuration must never take down public surfaces.
- Local development without a database follows the existing
  `data/state.json` fallback pattern via the state-manager layer.

### Asset storage

Uploaded logos and the generated icon set are stored in Vercel Blob (the
deployment already assumes Vercel + Neon), with a filesystem fallback under
`data/` for local development. Icon generation from the uploaded square mark
uses `sharp` server-side. The blob host is added to `img-src` in the CSP the
same way FEED origins are added to `connect-src` today. Asset records in the
payload store the blob URL plus measured intrinsic dimensions.

**Implemented in v1.22.1.** Hosted deployments select Blob when
`BLOB_READ_WRITE_TOKEN` is present, or when Vercel OIDC is paired with
`BLOB_STORE_ID`; local/self-hosted deployments continue to use
`BRAND_ASSETS_DIR`. A Vercel deployment without a connected store fails the
upload explicitly rather than attempting an ephemeral/read-only filesystem
write. Blob objects are public because the active logo must be readable by the
public app, installed-app metadata, browser palette extraction, and external
email clients. Random pathname suffixes prevent collisions.

Server uploads are capped at 4 MB so the multipart request remains below
Vercel Functions' 4.5 MB body limit. The server determines the real format from
the bytes; it does not reject a valid file only because the browser supplied a
missing or incorrect MIME type. SVGs remain vector and must pass the existing
self-contained/inert validation. Failures return structured ASK messages for
unsafe SVGs, unreadable images, size limits, storage configuration/outages, and
unexpected service failures.

### Runtime theme delivery (no FOUC)

The root layout (`src/app/layout.tsx`) is a server component. It loads the
active configuration and, when one exists:

- sets `data-brand="custom"` on `<html>`, and
- renders one inline `<style>` element containing the derived token blocks for
  `[data-brand="custom"]` light, `.dark`, and both Hi-viz scopes.

Because the tokens are inlined in the server-rendered document, first paint is
correct with no flash of default branding and no client fetch. The compiled
brand CSS files remain in the cascade untouched; the inline block simply wins
for the custom scope. The cascade contract in
`docs/CSS_THEME_ARCHITECTURE.md` gains one documented rule: the inline custom
block is injected after all compiled brand layers.

Metadata and PWA identity already have dynamic entry points —
`generateMetadata` and `src/app/manifest.ts` — which read the same resolved
configuration. Pages rendering brand identity read it through one shared
server-side resolver (`getResolvedBrand()`), which implements the resolution
order above and is the only place fallback logic lives.

A saved configuration change must invalidate cached pages (route-level
`revalidateTag`/`revalidatePath` on the brand tag) so edits appear without a
redeploy.

## Wizard UX

The Appearance wizard lives in the Admin **Advanced** accordion section
(`src/app/admin/admin-page-client.tsx`), consistent with its
low-frequency/high-consequence character. Per the FEED parity principle
(`AGENTS.md`, memory: FEED UX workflow parity), the multi-step modal reuses
the existing step-based wizard patterns from the Translation AI configuration
surfaces (`src/components/translation/ai-config/steps/*`) rather than
inventing a new stepper idiom.

Steps:

1. **Start** — begin from the WTH template, the St. Johns template, or from
   scratch (which pre-fills the neutral WTH-shaped defaults with placeholder
   graphics).
2. **Identity** — organization name, app name, PWA short name, tagline,
   descriptions (with generated defaults), links.
3. **Logos & icons** — upload light/dark logos, choose presentation mode,
   upload the square mark; server measures dimensions and generates the icon
   set; the step previews the header slot at its capped height and the
   home-screen icon at small sizes.
4. **Colors** — the compact color inputs with OKLCH picker; live preview of
   representative surfaces (Now Serving block, ticket cells, filled primary
   button, Admin status controls — which visibly do *not* change) in light,
   dark, and Hi-viz at mobile and desktop widths. Contrast results shown
   inline; failing choices are auto-corrected or blocked with an explanation.
5. **Staff copy** — sign-in heading, email guidance, placeholder.
6. **Capabilities** — inventory toggle and FEED URL, with the existing
   validation and no-fallback contract.
7. **Review & activate** — full-page preview, then save. Activation is
   explicit; a configuration can be saved inactive as a draft.

When an admin signs in and no configuration exists (and no
`NEXT_PUBLIC_LOTTO_BRAND` is set to a non-default profile), the Advanced
section surfaces a prominent "Set up your organization's appearance" call to
action. **Decision (2026-07-18):** the wizard does not auto-open on first
admin sign-in — an interruptive modal could block an operator mid-incident,
and the prominent call to action achieves discoverability without that risk.

The wizard is staff-authenticated Admin surface like everything else on
`/admin`; no new authorization model is required.

## Guardrails Carried Forward from the St. Johns Launch

Every brand-content defect from the launch maps to an automated protection in
this design:

| Launch lesson (docs/ISSUES.md) | Protection in this plan |
| --- | --- |
| Issue 32 — logo aspect ratio overlapped "NOW SERVING" on real phones | Height-capped `BrandLogo` slot already structural; wizard previews the slot at mobile width with measured dimensions. |
| Issue 33 — primary/foreground contrast shipped unreadable | Contrast validation on the final merged token set; cannot save a failing pair from Basic inputs or future Advanced overrides. |
| PWA short name shipped wrong | Dedicated short-name field with on-device-style preview label in step 3. |
| Icon set refreshed across three commits | Single square-mark upload with server-side generation of the full set. |
| Operational token overrides (v1.19.0 fixes) | Protected families absent from the schema; generator output tested to never emit protected token names. |

## Capstone Success Criterion: The Brand-Swap Test

The system is done when an operator can sign into the Admin page of either
existing deployment and configure it to look like the other agency — WTH made
to look on-brand for St. Johns, and St. Johns made to look on-brand for WTH —
using only the wizard. Both target identities exist as hand-tuned,
production-validated references, so success is not a matter of taste: it is a
side-by-side review against the real other deployment.

The test has two forms, and both are required:

- **Template swap (weak form, Phase 1).** Activate the seeded St. Johns
  template row on a WTH-profile deployment and vice versa. This proves the
  persistence, resolution-order, derivation, and runtime-delivery pipeline
  end to end — an active configuration must fully displace the compiled
  profile's identity — but it bypasses the wizard.
- **Manual recreation (strong form, Phase 2).** Starting from scratch in the
  wizard (not from the other agency's template), enter the other agency's
  brand colors, upload its logos and square mark, type its identity and staff
  copy, and set its inventory capability. This exercises every input path an
  end user touches: color pickers, uploads, icon generation, copy fields,
  and capability toggles.

**Auto-correction contract (added after first operator testing, 2026-07-19):**
every contrast pair whose two sides are both *derived* (never typed by the
operator — all Hi-viz emphasis fills, derived foregrounds, ticket-state
texts) must pass by construction: the derivation nudges lightness away from
the opposing color until the floor is met, flipping direction if lightness
clamps out first. Rationale: a failing derived pair produces a wizard error
with no visible input to act on (the original report: a from-scratch theme
blocked on "Hi-viz light … 2.28:1" with no Hi-viz controls anywhere). Pairs
built from operator-typed colors (background/foreground, card text, secondary
surfaces) are deliberately *not* auto-corrected — those errors are actionable
and silently overriding a typed color would be worse than reporting it.
Correction is a no-op for passing brands, which the St. Johns fidelity test
enforces.

Pass bar for the strong form: reviewed side by side with the real other
deployment on the standard surfaces (home, display, login, admin, help) at
mobile and desktop widths in light, dark, and both Hi-viz themes, the result
reads as on-brand for the other agency — "not EXACTLY like the other" is
acceptable; off-brand is not. Operational status colors must be identical in
both directions, contrast validation must pass throughout, and navigation
shape must follow the capability setting (WTH's four public tabs vs. St.
Johns' three).

Known exclusions until Phase 3: Arcade palettes do not derive yet, so the
swap test covers core surfaces only; and the capability swap is exercised as
a toggle plus URL validation without pointing at the other agency's live FEED
data.

If both directions pass, the configuration system is demonstrably robust
enough for white-label deployment and end-user configuration — any future
agency's identity is, by construction, reachable through the same inputs.

## Implementation Phases and Acceptance Criteria

### Phase 0 — Derivation and validation core (no UI)

1. Add the zod configuration schema with `schemaVersion`, including the
   (initially always-empty) sparse `overrides` map.
2. Add the pure OKLCH derivation module (brand inputs → complete token sets
   for light, dark, Hi-viz light, Hi-viz dark), emitting the typed token-map
   intermediate representation with CSS serialization as a separate step.
3. Add the contrast validator and wire it to run on the post-merge (derived +
   overrides) token set.
4. Generate WTH and St. Johns configurations from the compiled profiles and
   verify derived tokens against the hand-authored CSS values.

Measured acceptance:

- Unit tests cover schema validation, derivation determinism, and contrast
  enforcement (a knowingly-bad input, including the exact Issue 33 green, is
  rejected or corrected).
- Derived St. Johns tokens match the hand-authored
  `st-johns-food-share.css` values within documented tolerance, or every
  deviation is reviewed and accepted as a derivation-rule decision.
- The generator provably emits no protected operational token names
  (regression test over generator output, mirroring the existing
  selector-level brand-boundary test), and override keys outside the
  derivable-token allowlist are rejected by schema validation.
- A configuration with a non-empty overrides map round-trips correctly
  (merge, post-merge validation, serialization) even though no UI writes one
  yet — proving the Advanced tier needs no pipeline changes.

### Phase 1 — Persistence and runtime delivery

1. Add `brand_configurations` to `schema.sql`, the state-manager accessors
   (DB + `data/` fallback), and seeded WTH/St. Johns template rows.
2. Add `getResolvedBrand()` implementing the resolution order, and migrate
   metadata, manifest, `BrandLogo`, login/About copy, and CSP construction to
   read from it.
3. Inject the inline derived-token block from the root layout when a custom
   configuration is active; add cache revalidation on save.
4. Add asset upload/generation routes (Vercel Blob + `sharp`) with local
   filesystem fallback.

Measured acceptance:

- With no configuration row and no env variable, WTH output (metadata,
  manifest, tokens, CSP) is byte-for-byte unchanged — existing WTH tests pass
  unmodified.
- With `NEXT_PUBLIC_LOTTO_BRAND=st-johns-food-share` and no row, St. Johns
  behavior is unchanged — existing brand tests pass unmodified.
- With an active row, all identity surfaces reflect it, first paint carries
  the inline tokens (no FOUC), and an invalid payload falls back to the
  compiled profile with an Admin-visible warning.
- Inventory capability tests (opt-in, no fallback, CSP) pass against a
  configured row exactly as they do against a compiled profile.
- **Brand-swap test, weak form:** activating the seeded St. Johns template on
  a WTH-profile deployment (and vice versa) fully displaces the compiled
  identity — metadata, manifest, logos, tokens, copy, and navigation shape
  all present the other agency, verified in browser review.

### Phase 2 — Appearance wizard

1. Build the seven-step wizard in Admin Advanced, reusing the Translation AI
   step patterns and existing shadcn/ui components.
2. Implement template duplication, draft saves, live preview, and explicit
   activation.
3. Add the no-configuration call to action (no auto-open, per the 2026-07-18
   decision).
4. Ship the required documentation set: a new `docs/user-guides/NN-slug.md`
   Appearance guide for the in-app Help section, updates to
   `docs/ADMIN_PAGE.md`, `docs/UI_DESIGN.md`, `docs/DEPLOYMENT.md` (the
   new-agency runbook shrinks substantially), `docs/CSS_THEME_ARCHITECTURE.md`
   (inline-block cascade rule), and `CHANGELOG.md`.

Measured acceptance:

- An operator with no repo access can take a fresh deployment from WTH
  defaults to a complete custom brand — identity, logos, icons, colors, staff
  copy, capabilities — entirely in the wizard, verified end-to-end in browser
  review on desktop and mobile widths in light, dark, and both Hi-viz themes.
- Admin operational status controls (Returned red / Unclaimed gold) are
  visually identical before and after any wizard save.
- Wizard component and integration tests cover step validation, template
  duplication, contrast blocking, and draft-vs-active behavior.
- **Brand-swap test, strong form:** the manual recreation described in
  "Capstone Success Criterion" passes in both directions — WTH made
  on-brand for St. Johns and St. Johns made on-brand for WTH, from scratch,
  wizard only — against the pass bar defined there. This is the release
  gate for the wizard.
- Help guide ships in the same change as the wizard (AGENTS.md documentation
  rule).

### Phase 3 — Later extensions (separately planned)

- **Color-story configurator — implemented 2026-07-19.** The Colors step is
  built around the semiotic model in `docs/COLOR_SEMIOTICS.md`: an ordered
  1–5 color hierarchy with automatic classification and role assignment
  under the signal ceiling, reserved-hue-band warnings, logo palette
  extraction with click-to-pick and native EyeDropper support, plus the two
  model-violation fixes (serving-hue continuity with a tested ≤8°
  cross-mode drift invariant; ambient inputs as a backward-compatible
  schema-v1 extension). See that document's "Implementation status" section.
- **Advanced appearance tier**: semantic-slot overrides (15–20
  designer-meaningful controls, not raw tokens) layered on the Basic wizard
  via the sparse-overrides pipeline designed in Phase 0. Includes
  customized-slot indicators, per-slot "reset to derived," and re-validation
  on base-input changes to flag stale overrides. See "Forward compatibility:
  sparse overrides" above.
- Arcade `--arcade-*` palette derivation from brand inputs.
- Hi-viz derivation refinements based on operator feedback.
- Scheduled appearance overlays: additional saved configurations with
  activation date ranges for holidays and seasonal observances (Lunar New
  Year, Easter, Ramadan, etc.), resolving above the base active configuration
  during their window. The `brand_configurations` model already supports this;
  only the scheduler and resolution-order extension are new work.
- Retiring compiled profiles is **not** planned: WTH remains the compiled
  default, and templates remain generated from code.

## Risks and Open Questions

- **Derivation quality ceiling.** A derived theme will be good, not
  hand-tuned. Mitigation: templates as starting points, the compact input set,
  and the planned Advanced semantic-slot tier (Phase 3), whose pipeline
  compatibility is guaranteed by the Phase 0 sparse-overrides design.
- **Blob storage dependency.** Vercel Blob adds a paid-surface dependency and
  a new env variable per deployment; the runbook must cover it. Self-hosted
  (`docker compose`) deployments use the filesystem fallback.
- **Trademark posture.** `TRADEMARKS.md` states agency branding is not covered
  by the AGPL license. Uploaded assets are agency property stored in the
  agency's own deployment; the wizard should state this plainly at the upload
  step. Legal wording to be reviewed before Phase 2 ships.
- **Font configurability** is intentionally excluded (LOTTO retains its
  accessible font loading, per the St. Johns adaptation decision). Revisit
  only with a concrete accessibility-vetted proposal.
