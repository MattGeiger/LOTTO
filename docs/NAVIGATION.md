# Navigation System

**Status:** Shipped; current public navigation source of truth.
**Scope:** Persistent bottom tab bar across the four top-level public surfaces.
**Last updated:** 2026-06-04

---

## Purpose

Replace the ad-hoc button cluster with a single persistent navigation system
shared across all four top-level public destinations. One nav model, two
presentations (desktop dock + mobile tab bar).

> **Not in the tab bar:** the staff-facing **Help** section (`/help`,
> `/help/[slug]`) is reached from a link on the Staff page, not the public bottom
> tab bar. See `docs/HELP_SYSTEM.md`.

### Authenticated staff variant (v2.0)

Signed-in staff see a variant of the same bottom tab bar with staff
destinations, left→right: **Admin** (`/admin`), **Dashboard** (`/display`),
**What's in stock** (`/inventory`), **Games** (`/arcade`). It uses the same
component, styling, and icon-animation rules as the public bar — only the
destinations differ (`authNavItems` in `src/components/navigation/nav-items.ts`;
arcade equivalent in `arcade-bottom-tab-bar.tsx`). The Admin tab uses an animated
`LayoutPanelTop` icon (`src/components/lucide-animated/layout-panel-top.tsx`), and
the arcade bar uses a matching pixel `AdminIcon`.

The variant is selected by `useStaffAuthenticated()`
(`src/components/staff-auth-context.tsx`), a boolean context bridged from NextAuth
by `AuthSessionProvider` and defaulting to `false` (public nav) when absent. The
bar persists across staff pages, including `/admin`.

This document captures the agreed design direction so implementation stays
consistent. It is the source of truth for the nav bar; update it alongside any
behavior change (per `AGENTS.md` documentation priority).

---

## Design Provenance

Two inputs informed this direction:

1. **Design handoff** (`design_handoff_navigation_system/`) — directional
   concepts from Claude Design. Option B (bottom tab bar) was chosen over
   Option A (top nav). The HTML mocks are *inspiration, not specs* — adapt to
   LOTTO's existing tokens and components, do not rebuild to match pixels.
2. **FEED motion standards** (`williamtemple-feed/docs/motion/ICON_ANIMATIONS.md`)
   — the established two-system animated-icon architecture, which LOTTO already
   mirrors. Nav icons follow these conventions, with one deliberate divergence
   noted under [Motion Triggers](#motion-triggers).

---

## Information Architecture

Four destinations, in this fixed order:

| # | Label             | Route        | Icon               | Icon source |
|---|-------------------|--------------|--------------------|-------------|
| 1 | Your ticket       | `/`          | `ticket`           | Imperative-ref icon (ticket-rip) |
| 2 | Dashboard         | `/display`   | `grip`             | Imperative-ref icon (grip-dot fade wave) |
| 3 | What's in stock   | `/inventory` | `shopping-cart`    | Imperative-ref icon (cart-hop) |
| 4 | Games             | `/arcade`    | `gamepad-2`        | Imperative-ref icon (controller) |

**Labels are friendly, not formal.** Keep "Your ticket" / "Dashboard" /
"What's in stock" / "Games". Do **not** shorten "What's in stock" to
"Inventory" in the visible label.

### Route notes
- `/` is the personalized homepage (`src/app/page.tsx`).
- `/display` is the large public display board (`src/app/display/`).
- `/inventory` is the public stock browser (`src/app/inventory/`).
- `/arcade` lives in the `(arcade)` route group
  (`src/app/(arcade)/arcade/page.tsx`). Linking to it from the nav crosses the
  core↔arcade boundary — see [Arcade Guardrails](#arcade-guardrails).

---

## Layout & Presentation

### Desktop — floating capsule dock
- Centered horizontally, fixed consistently across public routes
  (`sm:bottom-6` in the core and arcade tab bars).
- Sits *above* page content; always visible regardless of scroll.
- Full-pill shape, subtle vertical gradient, layered shadow, hairline lit edge.

### Auto-hide (display board only)
- `BottomTabBar` accepts an optional `autoHideAfterSeconds` prop. When set and
  greater than zero, the bar hides after that many seconds of inactivity and
  reappears on any window-level `pointerdown`/`pointermove`/`keydown`/`touchstart`
  activity (which also restarts the timer).
- Only `/display` passes the prop (via `PublicDisplayPage`); every other route
  renders the bar without it, so the bar stays permanently visible there.
- The interval is the Admin display-language rotation `intervalSeconds` when
  rotation is enabled with a valid interval, otherwise a 5-minute fallback. See
  `docs/DISPLAY_LANGUAGE_ROTATION.md`.
- Hidden state is `pointer-events-none` and removed from the accessibility tree
  (`aria-hidden` + `inert`) so it never traps focus; window-level listeners are
  what restore it. The slide/fade transition is skipped under
  `prefers-reduced-motion` (visibility still toggles).

Directional tokens from the mock (map to LOTTO equivalents, do not hard-code hex):

| Mock value | LOTTO mapping |
|------------|---------------|
| `linear-gradient(180deg, #ffffff 0%, #f6f9fd 100%)` | `--card` → slightly lighter top (reuse the FEED card-gradient pattern) |
| `border-radius: 999px` | full pill |
| `1px solid rgba(255,255,255,.85)` | `--border` at reduced opacity for the lit edge |
| layered `--shadow-lg` (inset highlight + drop) | LOTTO shadow scale (`shadow-lg`) |
| `padding: 8px`, `gap: 4px` | keep |

### Mobile — native bottom tab bar
- Full-width, pinned to the bottom of the viewport.
- Translucent surface over a backdrop blur (~14px).
- 1px top border in the existing line/border color.
- Bottom padding for the iOS home indicator (~18px / `env(safe-area-inset-bottom)`).

### Active / inactive tab states
- **Active:** soft pale pill backdrop behind icon+label
  (mock: `linear-gradient(180deg, #eaf1fd 0%, #dde9fa 100%)`; map to a tinted
  `--primary`/`--accent` blend), 14px radius, inset from tab bounds. Icon +
  label in brand primary, label weight 600.
- **Inactive:** no backdrop, icon + label in muted foreground
  (`--muted-foreground`), label weight 500.

The active tab is derived from the current route (see
[Determining the active tab](#determining-the-active-tab)).

### Directionality
- The bottom-nav **item order is structural** and stays left-to-right in every
  language: Your ticket, Dashboard, What's in stock, Games.
- Arabic/Farsi labels still render with `dir="rtl"` inside their label span, but
  the nav container itself remains `dir="ltr"` so RTL does not mirror the tab
  order.
- Apply this same rule to top-level chrome: use RTL for localized text only when
  it improves reading, not for broad layout mirroring.

---

## Icon System

LOTTO already runs the same two animated-icon systems as FEED:

| System | Location | Driver |
|--------|----------|--------|
| Native animate-ui | `src/components/animate-ui/icons/` | `AnimateIconContext` (context-driven) |
| Imperative-ref | `src/components/lucide-animated/` | `forwardRef` + `startAnimation()`/`stopAnimation()` |

### Which system for the nav bar: **imperative-ref**

The nav bar needs to (a) animate the active icon on mount via a ref the parent
holds, and (b) trigger animation on hover/tap of the **whole tab** (icon +
label zone), which is larger than the icon. The imperative-ref pattern is the
correct fit for a larger-than-icon trigger zone, per the FEED decision matrix
("Icon animates when a larger container is hovered → imperative-ref icon +
`useRef` + container `onMouseEnter`/`onMouseLeave`").

**Template:** `src/components/lucide-animated/archive.tsx` is the canonical
imperative-ref icon already in LOTTO. New nav icons follow it exactly:
`forwardRef` exposing `{ startAnimation, stopAnimation }`, an `isControlledRef`
flag (suppresses self-hover when a parent holds the ref), `motion` elements
bound to a single `useAnimation()` control with `normal` / `animate` variants.

Core nav icons live under `src/components/lucide-animated/`: `ticket.tsx`,
`grip.tsx`, `cart.tsx`, and `gamepad-2.tsx`. The Dashboard nav icon uses the
same imperative-ref pattern as the other tab icons so hover/tap and
active-on-mount triggers can replay without remounting the SVG.

> **Geometry rule:** copy the resting SVG geometry verbatim from
> `node_modules/lucide-react/dist/esm/icons/<name>.js` (`__iconNode`) so each
> icon is pixel-identical to its static Lucide sibling at rest. Do not redraw or
> eyeball paths. (See FEED ICON_ANIMATIONS.md "Hand-rolling an animated variant".)

### Animation design intent

Each icon's motion is a *signal of interactivity*, themed to the destination:

| Icon | Resting | Animated intent |
|------|---------|-----------------|
| **Ticket** (`/`) | Standard Lucide ticket with perforation line | **Tears in two.** Split at the perforation; translate the two halves apart by a small delta (e.g. ±1.5–2px on X) with a slight opposing rotation, then spring back to `normal`. Borrow the spring tuning from `archive.tsx` (`type: "spring", stiffness: 200, damping: 25`). |
| **Dashboard** (`/display`) | Standard Lucide grip dot geometry | **Dots fade in sequence.** The nine grip dots fade down and back up with a short stagger, then settle back to the Lucide resting shape. |
| **Cart** (`/inventory`) | Standard Lucide shopping-cart | **Scale + hop.** `scale: 1 → 1.1` with a one-shot `y` bounce (`[0, -5, 0]`), `ease: "easeInOut"`, ~0.3–0.4s. (Matches the CartIcon reference in the brief.) |
| **Gamepad-2** (`/arcade`) | Standard Lucide gamepad-2 | **Controller wiggle + control fade.** The body gently translates back and forth (small X oscillation); the d-pad and face buttons fade out then fade back in (`opacity` + light spring), staggered. Compose a transform loop on a `motion.g` for the body with per-element `opacity` variants for the controls. |

These are design intents, not final keyframes — tune during implementation and
confirm visually in-browser before committing.

---

## Motion Triggers

The nav icons animate on **three** triggers:

1. **On mount (render)** — see the active-tab rule below.
2. **On hover** — hovering anywhere on the tab (icon + label) animates the icon.
3. **On click / tap** — tapping the tab animates the icon, then navigates.

### Active-tab-only on mount (the deliberate divergence)

FEED's sidebar convention **suppresses** on-load animation for persistent nav
to avoid repetitive distraction (ICON_ANIMATIONS.md Rule 3 exception). The nav
bar is likewise persistent, so we adopt a measured middle ground:

> **On first mount, only the icon for the currently-active route animates.**
> The other tabs stay at rest until hovered/tapped. Client-side tab navigation
> between the public pages does **not** replay the mount animation.

This honors the "animate on render" request (the active destination gets a
subtle entrance) while respecting FEED's anti-repetition principle (the bar
doesn't erupt into simultaneous animations on every load, and route changes
don't re-trigger it).

**Implementation note:** the parent tab-bar component holds a ref to each icon.
On initial mount it calls `startAnimation()` on the active icon's ref only,
inside a `useEffect(..., [])`. Hover/tap use the standard container
`onMouseEnter`/`onMouseLeave` + tap handlers calling the same ref API. This is
the imperative-ref pattern, so it does **not** suffer the `localAnimate`
stuck-state pitfall that `animate`-prop native icons have.

---

## Component Architecture

### Current structure
```
src/components/
  navigation/
    bottom-tab-bar.tsx      # presentational: renders tabs, owns icon refs,
                            # active-on-mount effect, hover/tap → ref calls
    nav-items.ts            # the four-item config (label, href, icon, matcher)
  lucide-animated/
    ticket.tsx              # new imperative-ref icon (ticket-rip)
    grip.tsx                # imperative-ref icon (grip-dot fade wave)
    cart.tsx                # new imperative-ref icon (cart-hop)
    gamepad-2.tsx           # new imperative-ref icon (controller)
src/arcade/
  components/
    arcade-bottom-tab-bar.tsx
    icons/
      dashboard-icon.tsx
```

### Placement — there is no shared `(core)` layout yet
LOTTO's public destinations do **not** currently share one layout wrapper:
- `src/app/layout.tsx` — root (global providers)
- `src/app/(arcade)/arcade/layout.tsx` — arcade-only
- `/`, `/display`, and `/inventory` have no intermediate layout.

The README's open question ("does a shared Layout exist? the tab bar should
live there") therefore resolves to: **no — one must be introduced before the
core pages can share a layout-level bar.**

**Key structural fact:** the public destinations do not share a route subtree.
`/`, `/display`, and `/inventory` are top-level; `/arcade` lives in the
`(arcade)` group with its own layout (deliberately walled off per the
guardrails). A Next.js layout only persists across navigation *within its own
segment*, so a `(core)/layout.tsx` covering the three core public pages would
still **remount** the bar when the user crosses into `/arcade`. A shared layout
can wrap the core public pages, but never Arcade, unless Arcade is merged into
core, which the guardrails forbid.

Options:

1. **Render the bar from each destination page** — import `<BottomTabBar />`
   into `/`, `/display`, and `/inventory`, and render the arcade-styled variant
   on the arcade *index* page (not the game pages). Lowest blast radius,
   respects the arcade boundary, and satisfies hide-during-gameplay for free.
2. **Introduce a `(core)` route group + layout** for `/`, `/display`, and
   `/inventory`
   (aligns with the `AGENTS.md` future direction of `src/app/(core)/*`), and
   add the bar to the arcade index separately. More structural; requires moving
   the core route directories; only buys persistence among core routes (see the
   structural fact above).

**Recommendation: Option 1 (per-page) for the `/inventory` build-out.** Because
the arcade boundary prevents true cross-destination persistence regardless,
`(core)` would be a routing refactor for a partial benefit and should be kept
for a deliberate route-organization pass.
Extract to `(core)/layout.tsx` later, as a deliberate routing pass, once the
core public routes are already moving into `(core)` per the roadmap.

**Per-page mount caveat (motion):** per-page rendering remounts the bar on every
navigation, so the active-tab-only mount animation would otherwise replay on
each arrival. Gate it with a session-scoped flag (module-level boolean or
`sessionStorage`) so the mount animation plays once per full page load — not on
client-side navigation. This honors the
[active-tab-only-on-mount rule](#active-tab-only-on-mount-the-deliberate-divergence).
(Note: `(core)` would not avoid this either — the arcade crossing still
remounts the bar, so the session guard is needed under both options.)

### Determining the active tab
The bar needs to know the current route to set the active state. In the App
Router, use `usePathname()` and match each item's `href`:
- `/` → tab 1
- `/display` → tab 2
- `/inventory` → tab 3
- `/arcade` (and `/arcade/*` subroutes) → tab 4

Each `nav-items.ts` entry should carry a matcher (exact for `/`,
`/display`, and `/inventory`; prefix for `/arcade`) so deep arcade routes still
light the Games tab.

---

## Arcade Guardrails

`AGENTS.md` requires Arcade to stay explicitly separated from raffle/display in
both code and UX. The nav bar is shared chrome that *links into* arcade — that
is acceptable (it's navigation, not gameplay integration), but observe:

- The bar must **not** pull arcade gameplay state/components into `/` or
  `src/components/readonly-display.tsx`.
- Keep the core nav model and core icons under `src/components/navigation/`
  and `src/components/lucide-animated/`.
- Keep the arcade-styled nav presentation and pixel icons under `src/arcade/*`
  so Arcade preserves its separate visual language.
- When the bar renders on an arcade page, it is a thin link surface only.

**Decided: the bar is hidden during active gameplay.** It renders on the arcade
index (`/arcade`) but **not** on the game routes (`/arcade/brick-mayhem`,
`/arcade/snake`, `/arcade/zombie-attack`). Under the per-page placement (below) this is automatic — the
game pages simply do not render `<BottomTabBar />`; only the arcade index does.

**Resolved (arcade visual language):** the arcade index (`/arcade`) uses a
deliberately distinct **8-bit pixel-art** UI (`@/arcade/ui/8bit`, `arcade-retro`,
`arcade-pixel-grid`), so the core glass bar would clash and brush the guardrail
("separated in code *and UX*; don't reuse raffle UI for Arcade"). Decision:
**option (a) — a separate arcade-styled variant.**
`src/arcade/components/arcade-bottom-tab-bar.tsx` reuses the same four
destinations and `nav*` labels but renders pixel-art icons
(`src/arcade/components/icons/{receipt,dashboard,shopping-cart,gaming}-icon.tsx`)
and arcade styling (arcade CSS variables, control-dock border/neon-shadow
pattern), inheriting the arcade font and vars from the enclosing
`.arcade-scope`. It is rendered only on the `/arcade` index (per-page), never on
the game routes — those keep their own Back control. The core `BottomTabBar` is
**not** reused on arcade, keeping the two sections visually and structurally
separate.

---

## Related Changes (from the handoff, sequenced after the bar)

These are *not* part of the nav bar itself but were bundled in the handoff and
should follow once the bar is live:

1. **Remove the BACK button** from top-level destinations (the inventory page's
   BACK becomes redundant — the Your-ticket tab is the return path). Keep
   contextual BACK only inside nested sub-views (e.g. category/item detail),
   since the tab returns users to a destination *root*, not the previous level.
2. **Relocate "Enter a new ticket number"** out of the old button cluster and
   into the YOUR TICKET card footer as a subtle right-aligned link
   ("Use a different ticket →"), separated by a dashed top border. This is a
   page-level action, not navigation — it belongs with ticket data.

---

## Accessibility

- Tap targets ≥ 44px (mobile tabs ~52px in the mock — keep).
- The bar is a landmark: render as `<nav aria-label="Primary">`.
- Active tab: `aria-current="page"`.
- Labels are always visible (not icon-only) — no extra `aria-label` needed on
  tabs, but ensure the rip/hop/wiggle motion respects
  `prefers-reduced-motion: reduce` (disable transforms; icons render static).
- Keyboard: tabs are real links (`next/link`), focusable in order, visible
  focus ring.

---

## Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Nav pattern | Bottom tab bar (Option B) | Works desktop + mobile from one model; keeps centered marquee header; always visible |
| Inventory icon | **Cart** (`shopping-cart`) | User selection (over the handoff's box suggestion) |
| Dashboard tab | **Route `/display` with `grip` icon** | Gives clients and staff a direct public-board entry point between ticket lookup and inventory |
| Icon system | Imperative-ref (`lucide-animated/`) | Trigger zone is the whole tab, larger than the icon; parent holds refs for mount animation |
| Render trigger | **Active tab only, on mount** | Honors "animate on render" while respecting FEED's anti-repetition rule for persistent nav |
| Gameplay visibility | **Hidden during active gameplay** | Renders on `/arcade` index, not on `/arcade/brick-mayhem`, `/arcade/snake`, or `/arcade/zombie-attack`; automatic under per-page placement |
| Shared layout | **Per-page (Option 1)** now; `(core)` later | Arcade boundary prevents full cross-destination persistence anyway; avoids route-group churn while the public surfaces are still evolving |

---

## Implementation Checklist

- [x] Create `ticket.tsx`, `cart.tsx`, `gamepad-2.tsx` in `lucide-animated/`
      (geometry verbatim from `lucide-react`; animations per design intent).
- [x] Add Dashboard (`/display`) using a native imperative-ref `grip` icon.
- [x] Build `nav-items.ts` (label, href, icon, route matcher).
- [x] Build `bottom-tab-bar.tsx`: desktop dock + mobile bar presentations,
      `usePathname()` active detection, icon refs, active-on-mount effect
      (module-level guard so it plays once per page load, not per navigation),
      hover/tap → ref calls.
- [x] Wire `prefers-reduced-motion` guard.
- [x] Render the bar on `/inventory` first (Option 1). Verified: SSR renders the
      nav landmark, active-tab marker, all four tab routes, and localized
      labels (HTTP 200, `tsc`/ESLint clean). **Animation motion still needs a
      human glance in-browser** — especially the ticket clip-path rip.
- [x] Extended the bar to `/`: removed the old "See what's in stock" and
      "PLAY GAMES" buttons from the personalized ticket-card cluster (now in the
      bar) plus the orphaned arcade frame/font helpers, kept "Enter a new ticket
      number" as a standalone button, and added bottom clearance on the
      personalized display.
- [x] Extended the bar to `/display` with bottom clearance so the fixed bar does
      not cover the public board.
- [x] Added an arcade-styled variant (`ArcadeBottomTabBar`) on the `/arcade`
      index only — pixel-art icons + arcade styling, absent on the game routes
      (verified by SSR: bar present on `/arcade`, absent on `/arcade/snake`,
      `/arcade/brick-mayhem`, and `/arcade/zombie-attack`).
- [x] Removed the `/inventory` top-level BACK button (the "Your ticket" tab is
      the return path).
- [x] Decided to keep "Enter a new ticket number" as a standalone button on
      `/` rather than relocating it into the YOUR TICKET card.
- [x] Update `CHANGELOG.md`.
