# Icon Animation Standards

Standards, patterns, and requirements for animated icons in LOTTO. All animated
icons must follow these conventions. (Adapted from the FEED project's motion
standards, reflecting LOTTO's components.)

---

## Design Intent

Icons animate to signify interaction — motion is a signal, not decoration.

### Rules

**1. Animation signals interactivity.** An icon animates only when it is part of
an interactive element (button, link, nav item, linked card). Animation is the
visual confirmation that something is clickable or actionable.

**2. Interactive parents trigger animation on hover and on tap.** If an icon's
parent is clickable, the icon animates on both hover and click/tap of that
parent — not just when the pointer is over the icon's bounding box. Attach the
handlers to the parent and drive the icon (via context or ref).

**3. Icons also animate on initial render, with one exception.** Interactive
icons outside the persistent bottom nav should animate on first appearance — on
page load, or when a dialog/menu first opens — to draw attention to actionable
areas. The animated "Help" button (`src/components/help-nav-button.tsx`) is the
canonical example: it animates on mount, hover, and tap.

   **Exception — the persistent bottom navigation.** The bottom tab bar
   (`src/components/navigation/bottom-tab-bar.tsx`) is on screen across pages.
   Animating every tab icon on every load would be repetitive, so it animates
   **only the active tab's icon, once per full page load** (guarded by a
   module-level flag), plus per-item hover/tap. This is by design.

**4. Non-interactive elements use static icons.** If a parent is not clickable,
its icon must be a static (non-animated) icon. Animated icons on static elements
create false affordance.

**5. The Arcade uses static pixel-art icons.** Per the Arcade guardrails in
`AGENTS.md`, the arcade keeps its own retro pixel-art glyphs
(`src/arcade/components/icons/*`); they are static by design and must not adopt
the animated icon systems.

**6. Respect `prefers-reduced-motion`.** Every trigger site must no-op when the
user prefers reduced motion (see `prefersReducedMotion()` in the bottom nav and
Help button).

---

## Two Icon Systems

### 1. animate-ui icons (`@/components/animate-ui/icons/*`)

Motion/React icons driven by an `AnimateIcon` context wrapper or by trigger
props (`animateOnHover`, `animateOnTap`, `animateOnView`). Examples in LOTTO:
`ArrowRight`, `Lock`, `Search`, `Plus`, `SquarePen`, `Trash2`, `RefreshCw`,
`RotateCcw`, `MoreHorizontal`, `ClipboardCheck`, `Bot`, and `Languages`. Trigger by
wrapping the **interactive parent**:

```tsx
// CORRECT — handlers attach to the Button; the icon reads AnimateIcon context
<AnimateIcon asChild animateOnHover animateOnTap>
  <Button onClick={save}>
    <SaveIcon size={16} />
    Save
  </Button>
</AnimateIcon>
```

Do **not** pass trigger props directly to a bare icon function component — it
triggers a "Function components cannot be given refs" warning.

### Action menus and table rows

`TableActionMenu` (`src/components/ui/table-action-menu.tsx`) is the canonical
pattern for compact per-row table actions. It uses three triggers:

- `animate` when the dropdown opens, so menu items animate as they appear.
- `animateOnHover` on the full menu row, not just the glyph.
- `animateOnTap` for pointer/click feedback.

All icons passed to `TableActionMenu` must be native animate-ui icons from
`src/components/animate-ui/icons/*`. Do not use imperative-ref icons or static
Lucide icons inside row action menus; they cannot reliably consume the parent
`AnimateIcon` context and only animate when hovering the glyph itself.

### The mount/view stuck-state bug

FEED documents a subtle first-hover failure mode that also applies to LOTTO:
when an animate-ui icon is already active because of `animate` or
`animateOnView`, a later hover may call `setLocalAnimate(true)` while the value
is already `true`. React skips the unchanged state update, so the first hover is
a no-op. The icon only starts animating on the second hover because the first
mouse leave finally flips the internal state back to `false`.

LOTTO fixes this in `src/components/animate-ui/icons/icon.tsx`: every new
zero-delay trigger replays an already-active icon through a short
`false -> true` state transition. That keeps first-appearance animation,
hover, and tap compatible without requiring every caller to manually reset mount
animation state.

Do not work around this bug locally by hand-rolling hover state in feature
components. Use `AnimateIcon` for native animate-ui icons, and only use the
timed open-state reset pattern below when a component intentionally wants menu
items to animate once each time a dropdown opens.

```tsx
const [animateMount, setAnimateMount] = React.useState(false);

// Correct for dropdown-open animation: true while opening, reset after the
// mount animation duration so later hover/tap triggers start cleanly.
<AnimateIcon asChild animate={animateMount} animateOnHover animateOnTap>
  <DropdownMenuItem>...</DropdownMenuItem>
</AnimateIcon>
```

When adding a new row-menu action, first add or port the needed native
animate-ui icon, then pass it through the action descriptor:

```tsx
<TableActionMenu
  actions={[
    { label: "Edit", icon: SquarePenIcon, onClick: edit },
    { label: "Delete", icon: Trash2Icon, onClick: remove, variant: "destructive" },
  ]}
/>
```

### Translation tabs

The Translation card uses the FEED-style radix tabs wrapper at
`src/components/animate-ui/components/radix/tabs.tsx`. Its section icons should
match FEED's imperative-ref page/section icon pattern:

- `Language Settings`: `src/components/ui/globe.tsx`
- `AI Configuration`: `src/components/ui/bot.tsx`
- `Translation Management`: `src/components/ui/languages.tsx`

These icons expose `startAnimation()` / `stopAnimation()` via `forwardRef`.
Animate them on first render and drive hover/tap from the interactive tab or
section parent, matching FEED's Language Management, AI Configuration, and
Translation Management surfaces.

### 2. Imperative-ref icons (`@/components/ui/*` and `@/components/lucide-animated/*`)

Lucide-animated-style icons that expose `startAnimation()` / `stopAnimation()`
via `forwardRef` and manage their own Motion controls. Examples in LOTTO:
`GlobeIcon`, `BotIcon`, `LanguagesIcon`, `SearchIcon`, `GripIcon`,
`TicketIcon`, `CartIcon`, `Gamepad2Icon`, `LayoutPanelTopIcon`,
`CircleHelpIcon`, `EyeIcon`, `ArchiveIcon`, `HistoryIcon`, and
`MonitorCheckIcon`.

Drive them via a ref — the correct pattern when the trigger zone is larger than
the icon (a whole button, card, or nav item):

```tsx
const iconRef = React.useRef<CircleHelpIconHandle>(null);

// animate on mount (skip for the persistent bottom nav — see Rule 3)
React.useEffect(() => {
  if (prefersReducedMotion()) return;
  iconRef.current?.startAnimation();
}, []);

<Link
  href="/help"
  onMouseEnter={() => iconRef.current?.startAnimation()}
  onMouseLeave={() => iconRef.current?.stopAnimation()}
  onPointerDown={() => iconRef.current?.startAnimation()}
>
  <CircleHelpIcon ref={iconRef} size={16} />
  Help
</Link>
```

Every imperative-ref icon exposes the same handle shape:

```ts
export interface XIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}
```

The nav `NavIconHandle` type (`src/components/navigation/nav-items.ts`) matches
this shape, so any imperative-ref icon can be a nav icon.

---

## Adding a new imperative-ref icon

1. Create `src/components/lucide-animated/<name>.tsx` with `"use client"`, the
   SPDX header, a `forwardRef<XIconHandle, XIconProps>`, `useAnimation()` Motion
   controls, an `isControlledRef` that flips when a ref is attached, and
   `useImperativeHandle` exposing `startAnimation`/`stopAnimation`.
2. Take the Lucide geometry verbatim; animate only the parts that should move via
   `<motion.*>` + `variants` with `normal` and `animate` states.
3. When uncontrolled, the icon animates on its own div's hover; when a ref is
   attached (`isControlledRef`), it defers to the parent's handlers.

`circle-help.tsx` and `layout-panel-top.tsx` are minimal, current references.

---

## Canonical examples in the codebase

| Pattern | Where |
| --- | --- |
| Hover + tap + active-tab-on-mount, reduced-motion guarded | `src/components/navigation/bottom-tab-bar.tsx` |
| Mount + hover + tap (imperative ref) | `src/components/help-nav-button.tsx` |
| animate-ui props on an interactive parent | `src/components/staff-cta-buttons.tsx` |
| Dropdown-open + row hover/tap action menu icons | `src/components/ui/table-action-menu.tsx` |
| Static pixel-art (Arcade, no animation) | `src/arcade/components/icons/*` |
