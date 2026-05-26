# Navigation System

**Status:** Design direction approved; implementation pending.
**Scope:** Persistent bottom tab bar across the three top-level public surfaces.
**Last updated:** 2026-05-25

---

## Purpose

Replace the ad-hoc button cluster (currently stacked at the bottom of the ticket
page) with a single persistent navigation system shared across all three
top-level destinations. One nav model, two presentations (desktop dock + mobile
tab bar).

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

Three destinations, in this fixed order:

| # | Label             | Route      | Icon            | Icon source                          |
|---|-------------------|------------|-----------------|--------------------------------------|
| 1 | Your ticket       | `/new`     | `ticket`        | New imperative-ref icon (ticket-rip) |
| 2 | What's in stock   | `/inventory` | `shopping-cart` | New imperative-ref icon (cart-hop)   |
| 3 | Games             | `/arcade`  | `gamepad-2`     | New imperative-ref icon (controller) |

**Labels are friendly, not formal.** Keep "Your ticket" / "What's in stock" /
"Games". Do **not** shorten "What's in stock" to "Inventory" in the visible
label.

### Route notes
- `/new` and `/inventory` are top-level App Router routes (`src/app/new/`,
  `src/app/inventory/`).
- `/arcade` lives in the `(arcade)` route group
  (`src/app/(arcade)/arcade/page.tsx`). Linking to it from the nav crosses the
  core↔arcade boundary — see [Arcade Guardrails](#arcade-guardrails).

---

## Layout & Presentation

### Desktop — floating capsule dock
- Centered horizontally, fixed ~36px from the bottom of the viewport.
- Sits *above* page content; always visible regardless of scroll.
- Full-pill shape, subtle vertical gradient, layered shadow, hairline lit edge.

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

All three nav icons are new files under `src/components/lucide-animated/`:
`ticket.tsx`, `cart.tsx` (or `shopping-cart.tsx`), `gamepad-2.tsx`.

> **Geometry rule:** copy the resting SVG geometry verbatim from
> `node_modules/lucide-react/dist/esm/icons/<name>.js` (`__iconNode`) so each
> icon is pixel-identical to its static Lucide sibling at rest. Do not redraw or
> eyeball paths. (See FEED ICON_ANIMATIONS.md "Hand-rolling an animated variant".)

### Animation design intent

Each icon's motion is a *signal of interactivity*, themed to the destination:

| Icon | Resting | Animated intent |
|------|---------|-----------------|
| **Ticket** (`/new`) | Standard Lucide ticket with perforation line | **Tears in two.** Split at the perforation; translate the two halves apart by a small delta (e.g. ±1.5–2px on X) with a slight opposing rotation, then spring back to `normal`. Borrow the spring tuning from `archive.tsx` (`type: "spring", stiffness: 200, damping: 25`). |
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
> The other two tabs stay at rest until hovered/tapped. Client-side tab
> navigation between the three pages does **not** replay the mount animation.

This honors the "animate on render" request (the active destination gets a
subtle entrance) while respecting FEED's anti-repetition principle (the bar
doesn't erupt into three simultaneous animations on every load, and route
changes don't re-trigger it).

**Implementation note:** the parent tab-bar component holds a ref to each icon.
On initial mount it calls `startAnimation()` on the active icon's ref only,
inside a `useEffect(..., [])`. Hover/tap use the standard container
`onMouseEnter`/`onMouseLeave` + tap handlers calling the same ref API. This is
the imperative-ref pattern, so it does **not** suffer the `localAnimate`
stuck-state pitfall that `animate`-prop native icons have.

---

## Component Architecture

### Proposed structure
```
src/components/
  navigation/
    bottom-tab-bar.tsx      # presentational: renders tabs, owns icon refs,
                            # active-on-mount effect, hover/tap → ref calls
    nav-items.ts            # the three-item config (label, href, icon, matcher)
  lucide-animated/
    ticket.tsx              # new imperative-ref icon (ticket-rip)
    cart.tsx                # new imperative-ref icon (cart-hop)
    gamepad-2.tsx           # new imperative-ref icon (controller)
```

### Placement — there is no shared `(core)` layout yet
LOTTO's three destinations do **not** currently share a layout wrapper:
- `src/app/layout.tsx` — root (global providers)
- `src/app/(arcade)/arcade/layout.tsx` — arcade-only
- `/new` and `/inventory` have no intermediate layout.

The README's open question ("does a shared Layout exist? the tab bar should
live there") therefore resolves to: **no — one must be introduced.**

**Key structural fact:** the three destinations do not share a route subtree.
`/new` and `/inventory` are top-level; `/arcade` lives in the `(arcade)` group
with its own layout (deliberately walled off per the guardrails). A Next.js
layout only persists across navigation *within its own segment*, so a
`(core)/layout.tsx` covering `/new` + `/inventory` would still **remount** the
bar when the user crosses into `/arcade`. A shared layout can wrap at most two
of the three destinations — never all three — unless arcade is merged into
core, which the guardrails forbid. This mutes the main architectural payoff of
introducing `(core)` now.

Options:

1. **Render the bar from each destination page** — import `<BottomTabBar />`
   into `/new`, `/inventory`, and the arcade *index* page (not the game pages).
   Lowest blast radius, respects the arcade boundary, satisfies
   hide-during-gameplay for free, leaves the fragile `/new` route untouched.
2. **Introduce a `(core)` route group + layout** for `/new` and `/inventory`
   (aligns with the `AGENTS.md` future direction of `src/app/(core)/*`), and
   add the bar to the arcade index separately. More structural; requires moving
   `/new` + `/inventory` directories; only buys persistence for the
   `/new`↔`/inventory` pair (see the structural fact above).

**Recommendation: Option 1 (per-page) for the `/inventory` build-out.** Because
the arcade boundary prevents true cross-destination persistence regardless,
`(core)` would be a routing refactor for a partial benefit — and it would touch
`/new`, the most fragile route, while blocking the near-term inventory work.
Extract to `(core)/layout.tsx` later, as a deliberate routing pass, once all
three destinations consume the bar identically and we're already moving core
routes into `(core)` per the roadmap.

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
- `/new` → tab 1
- `/inventory` → tab 2
- `/arcade` (and `/arcade/*` subroutes) → tab 3

Each `nav-items.ts` entry should carry a matcher (exact for `/new`,
`/inventory`; prefix for `/arcade`) so deep arcade routes still light the Games
tab.

---

## Arcade Guardrails

`AGENTS.md` requires Arcade to stay explicitly separated from raffle/display in
both code and UX. The nav bar is shared chrome that *links into* arcade — that
is acceptable (it's navigation, not gameplay integration), but observe:

- The bar must **not** pull arcade gameplay state/components into `/` or
  `src/components/readonly-display.tsx`.
- Keep nav components under `src/components/navigation/` (core), and the icons
  under the shared `src/components/lucide-animated/`. Do not place nav code
  under `src/arcade/*`.
- When the bar renders on an arcade page, it is a thin link surface only.

**Decided: the bar is hidden during active gameplay.** It renders on the arcade
index (`/arcade`) but **not** on the game routes (`/arcade/brick-mayhem`,
`/arcade/snake`). Under the per-page placement (below) this is automatic — the
game pages simply do not render `<BottomTabBar />`; only the arcade index does.

**Open finding (arcade visual language):** the arcade index (`/arcade`) is built
with a deliberately distinct **8-bit pixel-art** UI (`@/arcade/ui/8bit`,
`arcade-retro`, `arcade-pixel-grid`). The core-styled bar (shadcn card surface,
primary tints, Lucide line-icons with glass dock) would clash there and brush
against the guardrail ("separated in code *and UX*; don't reuse raffle UI for
Arcade"). So the `/arcade` integration is **deferred** pending a decision:
(a) author an arcade-styled pixel-art variant of the tab bar, (b) accept the
core bar on the arcade index, or (c) keep arcade on its own back-only nav and
let the Games tab simply link in. Not blocking the `/inventory` build-out.

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
| Icon system | Imperative-ref (`lucide-animated/`) | Trigger zone is the whole tab, larger than the icon; parent holds refs for mount animation |
| Render trigger | **Active tab only, on mount** | Honors "animate on render" while respecting FEED's anti-repetition rule for persistent nav |
| Gameplay visibility | **Hidden during active gameplay** | Renders on `/arcade` index, not on `/arcade/brick-mayhem` or `/arcade/snake`; automatic under per-page placement |
| Shared layout | **Per-page (Option 1)** now; `(core)` later | Arcade boundary prevents full cross-destination persistence anyway; avoids refactoring the fragile `/new` route and unblocks inventory work |

---

## Implementation Checklist

- [x] Create `ticket.tsx`, `cart.tsx`, `gamepad-2.tsx` in `lucide-animated/`
      (geometry verbatim from `lucide-react`; animations per design intent).
- [x] Build `nav-items.ts` (label, href, icon, route matcher).
- [x] Build `bottom-tab-bar.tsx`: desktop dock + mobile bar presentations,
      `usePathname()` active detection, icon refs, active-on-mount effect
      (module-level guard so it plays once per page load, not per navigation),
      hover/tap → ref calls.
- [x] Wire `prefers-reduced-motion` guard.
- [x] Render the bar on `/inventory` first (Option 1). Verified: SSR renders the
      nav landmark, active-tab marker, all three tab routes, and localized
      labels (HTTP 200, `tsc`/ESLint clean). **Animation motion still needs a
      human glance in-browser** — especially the ticket clip-path rip.
- [ ] Extend to `/new` (blocked on removing the old button cluster + relocating
      the "different ticket" action, else duplicate nav) and the `/arcade` index
      (blocked on the pixel-art visual-language decision above).
- [x] Removed the `/inventory` top-level BACK button (the "Your ticket" tab is
      the return path).
- [ ] Follow-up: relocate the "different ticket" link into the YOUR TICKET card
      when the bar reaches `/new`.
- [x] Update `CHANGELOG.md`.
