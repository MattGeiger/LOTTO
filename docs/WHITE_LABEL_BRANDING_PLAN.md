# White-Label Branding and Optional Integration Plan

## Status

Implemented and validated locally on 2026-07-17. This document defines the
measurable migration from a William Temple House-specific deployment to one
shared LOTTO codebase with deployment-selected brand profiles. William Temple
House remains the no-configuration default so the existing Vercel project does
not change when this work is merged or rebuilt.

The first additional profile is St. Johns Food Share. Its initial LOTTO
deployment is queue-only: FEED inventory is disabled until St. Johns has a FEED
deployment and explicitly configures its public inventory endpoint.

Validation completed against both profiles: the full 645-test Vitest suite,
ESLint, legacy-bundle guard, and production builds passed. Browser review
covered St. Johns light/dark/high-visibility themes, desktop/mobile layouts,
brand assets, metadata/manifest, queue-only navigation, `/inventory` 404, CSP,
login, Admin, Help, Display, and Arcade. The language grid's scroll viewport has
an internal shadow/focus gutter, preventing the clipping found during visual
review. Read-only before/after checks of `williamtemple.app` retained its title,
logos, four destinations, and existing visual identity.

On 2026-07-18 the Arcade visual boundary was extended with deployment-specific
`--arcade-*` profiles. St. Johns now receives a teal/mint, off-white, and
charcoal retro palette based on the approved light/dark Arcade mockups, while
William Temple House keeps the original blue, pink, cyan, and yellow defaults.

## Current Project State

LOTTO v1.19.0 packages the white-label release. The revised v2 scope is substantially shipped:

- Revised staff entry/navigation, Announcement builder, AI configuration and
  translation management, dynamic language settings, and ticket-status revert
  are implemented.
- Announcement and Translation remain visibly marked Beta while their workflows
  mature.
- The remaining v2 gate, Pantry Time, is still a concept and is not part of this
  migration.
- Admin optimistic actions remain an opt-in beta controlled by
  `NEXT_PUBLIC_ADMIN_OPTIMISTIC_UI`.
- Arcade remains isolated from core raffle/display code. Snake and Brick Mayhem
  are public; Day of the Dead remains hidden in production.
- William Temple House identity is currently embedded in metadata, manifests,
  logos, staff login copy, About copy, email defaults, CSP, and deployment docs.
- FEED inventory currently defaults to William Temple House's production feed,
  appears in both core and Arcade navigation, and falls back to the WTH feed if
  another configured feed fails. That fallback is unsafe for white-label use
  because it can expose the wrong agency's inventory.

## Architecture Decision

Use one repository and one shared application, with one immutable brand profile
selected at build/deployment time. Each agency receives a separate Vercel
project, database, authentication configuration, and domain.

The selected profile controls presentation and optional integrations; it does
not fork queue logic, database state, translation behavior, or Arcade gameplay.

```text
Shared LOTTO application
├── queue, display, staff, translation, help, and Arcade behavior
├── William Temple House profile (default; FEED enabled)
└── St. Johns Food Share profile (FEED disabled initially)
```

### Why profiles instead of branches

- A shared fix is implemented and tested once.
- Deployment differences are explicit and reviewable.
- Agency data remains isolated by Vercel/Neon project, not by conditional rows
  in a shared database.
- Adding an agency is a bounded profile/assets/configuration change rather than
  a long-lived merge obligation.
- The production WTH project can continue building without a new environment
  variable because the missing-profile default remains WTH.

## Brand Profile Schema

Each profile must provide:

| Group | Required values | Consumer |
| --- | --- | --- |
| Identity | profile id, organization name, app name, short name, tagline | metadata, manifest, visible copy |
| Links | organization website, public app URL | About copy and server request identity |
| Logos | light and dark paths, intrinsic dimensions, presentation mode | homepage, display, login |
| PWA | theme/background colors and icon paths | manifest and install metadata |
| Theme | semantic light/dark token overrides | shared shadcn/Tailwind UI |
| Staff | sign-in heading and authorized-email guidance | `/login`, `/staff` |
| Capabilities | inventory enabled flag and optional FEED public URL | routes, nav, fetches, translation audit |

Brand profiles are code-owned, typed, and fail validation during tests/builds.
Environment configuration selects the profile with
`NEXT_PUBLIC_LOTTO_BRAND`. Profile selection is public by design; credentials,
database URLs, Resend keys, and auth secrets remain separate server-only Vercel
variables.

## Inventory Capability Contract

Inventory is optional, and it is disabled for profiles that do not explicitly
declare a FEED endpoint.

When disabled:

1. Core and Arcade navigation omit the Inventory tab.
2. `/inventory` returns the standard not-found response.
3. Browser and server code make no FEED inventory request.
4. Translation auditing does not report a broken/empty FEED source merely
   because the integration is intentionally unavailable.
5. Queue, display, staff, help, translation, and Arcade behavior remain usable.

When enabled:

1. The profile must have a valid `http:` or `https:` FEED public inventory URL.
2. The FEED origin is added to CSP `connect-src`.
3. Inventory navigation and `/inventory` are available.
4. A failed configured feed reports an error; it never falls back to another
   agency's endpoint.

William Temple House explicitly declares its existing FEED URL in its profile,
so its live behavior remains enabled. St. Johns declares no endpoint and starts
with inventory disabled.

## St. Johns Food Share Visual Reference

References reviewed: `https://stjohnsfoodshare.org/` and the user-provided
light/dark LOTTO display mockups on 2026-07-17. The mockups are the source of
truth for how the three-color identity maps onto LOTTO's queue states.

### Observed visual language

- Brand teal: `#33A478`.
- Near-white page surface: `#F7F7F7`.
- Charcoal text and dark surface: `#2D2D2D`.
- Display headings use heavy Montserrat; supporting copy uses neutral sans-serif
  typography. LOTTO will retain its existing accessible font loading and use
  weight, color, and spacing to align rather than add a new runtime dependency.
- The official light-mode logo is a wide transparent white-and-green mark. Its
  white lettering and outline require a dark surface in light mode. The
  supplied dark-mode outline variant is designed to sit directly on the dark
  page background without a filled logo plate.
- The site combines clean neutral surfaces with selective teal emphasis rather
  than using ornamental or full-screen brand-color backgrounds.

### LOTTO adaptation

- Use `#33A478` for primary actions, selected navigation, and brand accents.
  Keep page and card foundations near-white or charcoal so teal is a deliberate
  point of emphasis rather than a full-screen wash.
- Derive quieter mint and forest values from the brand teal only where a
  component needs depth or a secondary state; do not introduce additional
  decorative brand hues.
- Keep queue-status semiotics independently configurable from the main teal:
  the active **Now Serving** label, numeral, and ticket use `#319A72` in light
  mode and a luminous mint in dark mode. Called tickets use pale mint in light
  mode and deep forest in dark mode, keeping them visibly subordinate to the
  active ticket.
- Keep neutral cards, neutral shadows, and high text contrast so queue status
  remains the visual priority.
- Place the full-color St. Johns logo on a compact forest/charcoal brand plate
  in light mode, preserving its white elements without recoloring. In dark mode,
  swap to the supplied white-outline variant and remove the plate fill and
  shadow so the mark rests directly on the page background.
- Preserve LOTTO component geometry and workflow. Rebranding changes semantic
  tokens, marks, metadata, and agency copy—not queue interaction patterns.
- Keep Arcade's pixel-art system isolated, but allow deployment profiles to
  override Arcade-owned `--arcade-*` tokens inside `src/arcade/styles/arcade.css`.
  St. Johns uses brighter teal/mint derivatives for retro visibility while its
  light and dark foundations remain off-white and deep green-charcoal. Do not
  route Arcade styling through core raffle/status tokens.

### Protected operational semiotics

Returned/danger (red), Unclaimed/warning (gold), success, and neutral are
universal LOTTO status meanings, not brand identity. Agency profile selectors
must not override the `--status-*`, `--gradient-status-*`,
`--ticket-unclaimed-text`, `--ticket-returned-text`, or `--operational-*`
action families. Those tokens are shared by Admin controls, public ticket
cells, legends, badges, and alerts. Returned and Unclaimed actions use locked
red/gold button variants with an explicit neutral disabled state rather than
inheriting a deployment's primary brand color.

This separation is enforced by a branding regression test that inspects every
St. Johns profile block, including Hi-viz light and dark. It specifically
prevents a high-specificity brand selector from defeating the standard theme
status values. Brand profiles may still configure identity surfaces and
explicitly approved queue progression treatments such as Now Serving and
Called.

### St. Johns Hi-viz adaptation

The user-provided Hi-viz display mockups are the source of truth. Both variants
remain flat and contrast-first while retaining St. Johns identity:

- Light uses off-white/white surfaces, charcoal text and borders, St. Johns
  teal for focus/selection, pale mint Called tickets, and neutral-gray pending
  tickets.
- Dark uses charcoal foundations, near-black cards, white borders, luminous
  mint focus/type accents, deep-forest Called tickets, and near-black pending
  tickets.
- Now Serving remains a dedicated high-emphasis teal/mint treatment in both
  modes.
- Returned, Unclaimed, success, and neutral continue to inherit the universal
  Hi-viz status system without any agency override.

## Implementation Steps and Acceptance Criteria

### Step 1 — Introduce typed profile configuration

1. Add a client-safe typed profile module with WTH and St. Johns profiles.
2. Select via `NEXT_PUBLIC_LOTTO_BRAND`, defaulting to WTH when omitted.
3. Reject unknown profile ids and invalid enabled-inventory profiles.

Measured acceptance:

- Unit tests prove omitted selection resolves to WTH.
- Unit tests prove St. Johns resolves to its identity and inventory is disabled.
- Unit tests prove every registered profile passes schema validation.

### Step 2 — Centralize reusable brand presentation

1. Add one `BrandLogo` component supporting the existing WTH light/dark pair
   and St. Johns' surfaced light logo plus transparent dark-outline treatment.
2. Replace direct WTH logo references on homepage, public display, and login.
3. Replace agency-specific login/About copy with profile values while retaining
   WTH's current wording in the WTH profile.

Measured acceptance:

- Component tests find the correct logo alt/path for each selected profile.
- Existing WTH page tests continue to pass without setting a profile variable.
- St. Johns localhost pages contain no visible WTH organization name or logo.

### Step 3 — Make metadata and install identity profile-aware

1. Generate root, display, inventory, and admin descriptions from the profile.
2. Generate the web manifest name, colors, browser-tab icons, Apple touch icon,
   and install icons from the profile. St. Johns supplies PNG assets from 32 px
   through 512 px; WTH retains its existing favicon, Apple icon, and PWA set.
3. Keep WTH manifest output byte-for-byte equivalent in identity and colors
   where practical.

Measured acceptance:

- Tests assert WTH and St. Johns manifest/metadata values.
- Browser validation confirms title and manifest links match the selected brand.

### Step 4 — Apply semantic brand tokens

1. Add profile selectors to `globals.css` using existing semantic variables.
2. Define St. Johns light/dark primary, accent, ring, surface, and serving-text
   gradient tokens from the website palette.
3. Keep Arcade branding in its own scoped token layer. A deployment may
   override `--arcade-*` colors, but not game mechanics, shared interaction
   geometry, or protected raffle/status semantics.

Measured acceptance:

- Token tests/static checks verify profile selector coverage.
- Automated contrast checks cover primary/foreground pairs.
- Browser review covers light, dark, and high-visibility modes at mobile and
  desktop widths.

### Step 5 — Make inventory an opt-in capability

1. Gate core and Arcade nav items.
2. Gate `/inventory` at the server route.
3. Remove cross-agency fallback behavior from FEED fetches.
4. Skip FEED collection/diagnostics when disabled.
5. Build CSP from the selected profile's enabled FEED origin.

Measured acceptance:

- WTH tests still show `/inventory` and fetch the WTH endpoint.
- St. Johns tests show three public tabs, no inventory route content, and zero
  FEED calls.
- A custom endpoint failure never calls the WTH endpoint.
- CSP tests cover enabled and disabled profiles.

### Step 6 — Add St. Johns assets and profile

1. Add the official website logo under `public/brands/st-johns-food-share/`.
2. Add profile metadata, website link, tagline, palette, and queue-only
   capability settings.
3. Use a brand-safe install icon reference without retaining WTH icon identity.

Measured acceptance:

- Every configured asset path exists.
- Images have correct intrinsic dimensions and descriptive alt text.
- Browser network logs show no missing brand assets.

### Step 7 — Documentation and deployment guardrails

1. Update deployment docs with one-repo/multiple-Vercel-project instructions.
2. Update FEED docs to describe opt-in, no-fallback behavior.
3. Update relevant staff/client help guides and `CHANGELOG.md`.
4. Record the WTH-default production-safety decision.

Measured acceptance:

- A deployer can choose WTH or St. Johns from documented variables.
- A queue-only deploy path contains no FEED prerequisite.
- Existing WTH deployment variables remain valid without edits.

### Step 8 — Automated and visual validation

Run in order:

1. Focused profile, navigation, inventory, metadata, and CSP tests.
2. Full `npm test`, following the documented full-suite flake reproduction rule.
3. `npm run lint`.
4. `npm run build` using WTH/default configuration.
5. `npm run build` using the St. Johns profile with a safe local test database
   configuration where required by the production-build guard.
6. Start the full Next.js app locally with the St. Johns profile while retaining
   the existing `.env.local` database and Resend settings.
7. Browser-test `/`, `/display`, `/staff`, `/login`, `/admin`, `/help`,
   `/arcade`, and the disabled `/inventory` route.
8. Re-check `https://williamtemple.app/` against the pre-change baseline.

## Release Safety

- Publish through a review branch and draft pull request; do not push local
  work directly to `main`.
- Do not edit the live William Temple House Vercel project or its environment
  variables while validating another deployment.
- Default profile selection is William Temple House.
- Existing WTH FEED behavior is declared in the WTH profile.
- St. Johns is activated only in the localhost process with
  `NEXT_PUBLIC_LOTTO_BRAND=st-johns-food-share` and later in its own Vercel
  project.
- Production validation is read-only before and after implementation.

## St. Johns Launch Work

The implementation profile is complete. Launch coordination now covers:

- Pointing the purchased `stjohnsfoodshare.app` domain to its dedicated Vercel
  project.
- Resend sender-domain verification and `EMAIL_FROM`.
- `ADMIN_EMAIL_ALLOWLIST=stjohnsfoodshare@gmail.com` combined with the trusted
  `ADMIN_EMAIL_DOMAIN=templepdx.com` administrative path, followed later by an
  `ADMIN_EMAIL_DOMAIN=stjohnsfoodshare.org` migration.
- St. Johns Neon database provisioning and production secrets.
- FEED deployment and endpoint, if St. Johns adopts FEED later.
