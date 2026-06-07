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
`RotateCcw`, `MoreHorizontal`, `Bot`, and `Languages`. Trigger by wrapping the
**interactive parent**:

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

### 2. Imperative-ref icons (`@/components/lucide-animated/*`)

Lucide-animated-style icons that expose `startAnimation()` / `stopAnimation()`
via `forwardRef` and manage their own Motion controls. Examples in LOTTO:
`GripIcon`, `TicketIcon`, `CartIcon`, `Gamepad2Icon`, `LayoutPanelTopIcon`,
`CircleHelpIcon`, `EyeIcon`, `ArchiveIcon`, `HistoryIcon`, `LanguagesIcon`,
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
