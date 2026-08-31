# UI Design Standards: Shadcn/UI Reference Guide
**Last Updated:** November 2025 (updated with generator palette + Shadcn refresh)  
**Versions:** Shadcn/UI v2.5+, Tailwind CSS v4, React 19, Next.js 16+

The physical CSS source boundaries, cascade order, OKLCH-only authoring rule,
and deployment-aware Arcade theme contract are documented in
`docs/CSS_THEME_ARCHITECTURE.md`.

## Philosophy & Core Principles

Shadcn/UI is not a traditional component library - it's a code distribution platform where you own the component code directly. Components are copied into your project, giving you full control to customize without library constraints.

### Key Principles:
1. **Open Code**: Full access to component source for modification
2. **Composition**: Shared, predictable interfaces across all components
3. **Accessibility**: WCAG-compliant, built-in accessibility
4. **Beautiful Defaults**: Production-ready styling out of the box
5. **AI-Ready**: Consistent patterns for LLM integration

---

## Project Structure

Organize components by purpose to maintain clarity and scalability:

```
/components
  /ui              # Shadcn components (Card, Button, Badge, etc.)
  /layout          # Navbar, footer, sidebar
  /forms           # Reusable form components
  /shared          # General reusable components
```

**Critical Rule**: Keep business logic separate from UI components. No API calls or state management inside UI components.

---

## Theming: CSS Variables

Shadcn uses CSS variables for theming, allowing color changes without updating class names. Variables must be defined without color space functions.

### Color Tokens & @theme (Tailwind v4)

We use the generator OKLCH palette and map it with `@theme inline` so Tailwind utilities resolve the variables. No `tailwind.config.js` needed.

```css
@import "tailwindcss";
@custom-variant dark (&:is(.dark *));

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.5078 0.1369 257.6669);
  --primary: oklch(0.5078 0.1369 257.6669);
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.7221 0.0815 206.8111);
  --secondary-foreground: oklch(1 0 0);
  --muted: oklch(0.9751 0.0127 244.2507);
  --muted-foreground: oklch(0.551 0.0234 264.364);
  --accent: oklch(0.8828 0.1811 94.4604);
  --accent-foreground: oklch(0.5078 0.1369 257.6669);
  --destructive: oklch(0.5771 0.2152 27.3250);
  --destructive-foreground: oklch(1 0 0);
  --border: oklch(0.9276 0.0058 264.5313);
  --input: oklch(0.9670 0.0029 264.5419);
  --ring: oklch(0.5078 0.1369 257.6669);
  --radius: 0.5rem;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}
```

Custom WTH tokens (status, ticket gradients, display/admin gradients) live alongside these core tokens.

### Shadows (Refined November 2025)
- Shadow tokens were refactored to use `--base-shadow-*` variables (OKLCH color-mix) for both light/dark themes; Tailwind utilities map to `--shadow-*` aliases.
- **Dark-mode shadows glow, they do not darken.** `--base-shadow-color` is black
  in light mode (`oklch(0 0 0)`) but a saturated **blue-teal** in dark mode
  (`oklch(0.746 0.16 232.661)`, and a brighter cyan in dark `hi-viz`). On a dark
  background a black shadow is invisible, so the convention is to treat the
  shadow as *emitted light* — a soft colored glow that lifts a surface by
  illuminating around it. Any new shadowed/elevated surface (including glass
  materials) must follow this: dark mode = soft blue-teal glow, not a black drop.
- Transparency levels were tuned (lighter 2xs/xs, stronger sm–xl) for more consistent depth across surfaces.
- Buttons: default and secondary variants now include `shadow-sm` for clearer elevation; outline/ghost retain existing shadow treatments.

### Display/QR Styling
- Display background and serving text gradients are exposed as utilities (`bg-gradient-display`, `bg-gradient-serving-text`) instead of inline styles.
- The public display's utility/search toolbar is absolutely positioned. Its
  shared board container reserves `pt-20` on mobile and returns to `pt-14` at
  `sm` and above, keeping both transparent and surfaced agency logos clear of
  the toolbar without adding logo-specific padding.
- `BrandLogo` may protect a light-theme logo with the profile's dark surface.
  When that profile supplies a dedicated dark-outline asset, dark mode swaps
  images and removes the wrapper fill and shadow so the outline sits directly
  against the page background. Profiles marked `transparent` (including WTH)
  never receive the protective wrapper treatment.
- Ticket states use utility classes mapped to tokens (`ticket-serving`, `ticket-served`, `ticket-upcoming`) with dedicated text/border/background tokens (including `--ticket-served-text`).
- Public display QR uses a canvas implementation (`qrcode` library) to avoid SVG viewBox scaling issues on long URLs; the QR points to the admin-configured `displayUrl` when set, falling back to the current origin.
- Serving headline uses `bg-gradient-serving-text`; blue gradient in light mode, gold gradient in dark mode for readability and brand fit.
- Public display "Now Serving" value transitions use the local Animate UI `MorphingText` primitive with bottom-up insert/sweep motion and per-character stagger.
- Translated display copy uses `LanguageMorphText` (wrapper over `MorphingText`) so language switches animate consistently while still wrapping by **word** boundaries (`wordWrap="word"`), not per character.
- Motion timing standard after v1.4 calibration:
  - "Now Serving" spring: `stiffness: 80`, `damping: 16`, `mass: 0.45` (roughly ~0.66s settle).
  - `LanguageMorphText` spring: `stiffness: 90`, `damping: 16`, `mass: 0.4` (roughly ~0.59s settle).
  - A slower follow-up pass (`36/11/0.45` and `40/11/0.4`) was intentionally rolled back as too sluggish for live board readability.
- Polling status copy (`refreshing`, `last checked`, transient error line) should remain static to avoid constant re-animation during periodic fetches.

### Adding Custom Colors (Tailwind v4)

**Modern approach:** Use `@theme inline` directive (CSS-first configuration):

```css
:root {
  --warning: oklch(0.84 0.16 84);
  --warning-foreground: oklch(0.28 0.07 46);
}

.dark {
  --warning: oklch(0.41 0.11 46);
  --warning-foreground: oklch(0.99 0.02 95);
}

@theme inline {
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
}
```

---

## Universal Operational Status Colors

Returned/danger, Unclaimed/warning, success, and neutral are a shared LOTTO
semiotics system—not agency branding. Their colors must remain stable across
white-label profiles wherever they communicate those operational meanings.
The Admin **Live State** values and **Next up** card are queue-progress/identity
emphasis rather than generic success feedback, so they use the active Primary
color instead of borrowing `--status-success-*`.

Agency `[data-brand]` selectors must not override:

- `--status-success-*`, `--status-warning-*`, `--status-danger-*`, or
  `--status-neutral-*`;
- `--gradient-status-success`, `--gradient-status-warning`, or
  `--gradient-status-danger`;
- `--ticket-unclaimed-text` or `--ticket-returned-text`;
- `--operational-danger-action-*`, `--operational-warning-action-*`, or
  `--operational-action-disabled-*`.

The light/dark and high-visibility theme blocks own these tokens. This cascade
boundary is important: a light brand selector also matches in dark mode and is
more specific than `.dark`, so putting status tokens in a brand block can
silently defeat the standard dark values and create inaccessible combinations.
Brand profiles may configure identity colors and the explicitly approved queue
progression treatments **Now Serving** and **Served**. **Returned** remains red
and **Unclaimed** remains gold; neither may be derived from Primary or Accent.

Arcade consumes those identity roles through an Arcade-scoped bridge: its page,
panels, borders, controls, text, and Now Serving presentation follow the active
appearance. Gameplay art colors remain fixed under `--arcade-*`, and the bridge
must never expose protected operational tokens. The active bottom-navigation
surface uses the pre-alpha `--nav-active-background` token instead of a slash
opacity utility, so iOS 15 receives the intended translucent highlight rather
than an opaque fallback.

Admin actions that directly assign these statuses use the corresponding
`operational-danger` and `operational-warning` button variants. Their enabled
fills reinforce the red Returned and gold Unclaimed contexts. Their disabled
state uses explicit neutral fill, text, and border tokens with full opacity;
it must not blend a brand primary color into the surrounding status card. The
same variant is carried into each confirmation dialog so the action retains
its meaning through the complete workflow.

Hi-viz remains flat and contrast-first, but it may have a profile-specific
identity layer after the shared Hi-viz blocks. That layer may override neutral
surfaces, primary/accent/focus colors, and approved Now Serving/Served/pending
tokens. It remains subject to the protected-status list above: brand-aware
Hi-viz selectors must never redefine universal status tokens.

---

## Surface Gradient Orientation

**All surface fill gradients orient bottom → top: the deeper (lower-lightness,
more-saturated) shade sits at the base, the lighter shade at the top.** Use
`linear-gradient(to top, <deeper>, <lighter>)`. This reads as ambient light
falling on a physical surface and keeps every gradient in the app visually
consistent.

This applies to:

- The universal card gradient (`--card-gradient`, the FEED-aligned "Prism"
  pattern) on every `data-slot="card"`.
- The semantic/feature card gradients (`--gradient-card-info`, `-accent`,
  `-warning`, `-danger`, `-blue`, `-emerald`).
- Colorful status field gradients (`--gradient-status-warning`,
  `--gradient-status-danger`) used for `/admin` alert boxes and the
  `.ticket-returned` / `.ticket-unclaimed` surfaces.
- Display-board ticket-cell gradients for every state — now-serving
  (`--ticket-serving`), called (`--ticket-served`), returned, and unclaimed —
  so the whole board reads consistently.

**Do not** use diagonal (`135deg`) or left→right (`90deg`) directions for
surface fills — those were the legacy style and have been migrated to `to top`.

**Per-theme color order matters.** Because dark-mode tokens often store their
two stops in the opposite lightness order from light mode, write each gradient
explicitly with the deeper stop first (`to top, <deeper>, <lighter>`) rather
than reusing a single direction keyword across themes — verify which stop is
lower-lightness per theme.

**Exceptions:** brand *text* gradients (`--serving-text-gradient`, the large
"now serving" numerals) remain diagonal by design — they are expressive type
accents, not surface fills. **The `hi-viz` themes are flat by design** — every
surface/fill gradient (the card gradient, the semantic/feature card gradients,
the status fills, and the ticket-cell and serving-text gradients) is overridden
to a solid color for high-contrast legibility for visually-impaired users.

---

## Translucent Surface Materials ("Glass")

**Design intent:** floating and overlay surfaces are treated as *frosted glass* —
translucent fills layered over a backdrop blur — so the UI reads as a stack of
light-bearing materials rather than flat opaque panels. This is applied
deliberately, surface by surface, and is converging toward a shared material
pattern (see v2.0 planned "Surface material tokens").

### Aesthetic north star

The target feel is **calm, soft, milky** — diffuse frosted panels that read as a
welcoming physical material, not cold 2D shapes and not flashy optical glass.
Concretely this means:

- **Milky, not vivid.** Favor diffusion (blur) and a soft light veil over
  saturation. Keep `backdrop-saturate` gentle (~1.1–1.2); high saturation reads
  "optical/wet," which is the wrong direction.
- **Soft, not harsh.** Low-contrast edges and soft shadows. Harsh
  high-contrast minimalism is intentionally *not* this system's job — the
  `hi-viz` themes exist to serve high-contrast / low-vision needs.
- **No simulated optics.** We deliberately do **not** pursue Apple "Liquid
  Glass"-style refraction, specular highlights, or shader/SVG-displacement
  tricks. Pure-CSS frosted glass (tint + blur + brightness + gentle saturate,
  plus an edge highlight and soft shadow) gets ~90% of the material feel at a
  fraction of the cost.

This is mission-aligned, not decoration: most users arrive at a food pantry,
often on modest devices. The polish says *this tool was made for you, with
care.* That intent is overridden the instant it costs legibility.

### Performance baseline (hard constraint)

The app is tuned to run acceptably on a **2015 iPad Mini** (known-budget SoC,
11+ years old). That device is the floor: if a material effect can't hold up
there, it doesn't ship. This is the concrete reason we stay in pure-CSS
frosted-glass territory and avoid per-frame optics — `backdrop-filter` is
GPU-costed, so the material taxonomy stays small and effects stay cheap.

### Currently glassed surfaces

| Surface | Component | Recipe |
| --- | --- | --- |
| Bottom navigation bar | `navigation/bottom-tab-bar.tsx` | `bg-card/[45%] backdrop-blur-[6px]` |
| Dietary-filter dropdown | `public-inventory-page.tsx` | `bg-popover/[45%] backdrop-blur-[6px]` |
| Inventory icon popovers (Limited Supply / Clearance / dietary) | `public-inventory-page.tsx` | `bg-popover/[45%] backdrop-blur-[6px]` |
| Language switcher menu | `language-switcher.tsx` | `bg-popover/[45%] backdrop-blur-[6px]` |
| Theme switcher menu | `theme-switcher.tsx` | `bg-popover/[45%] backdrop-blur-[6px]` |
| Homepage onboarding dialog | `components/personalized-home-page.tsx` | translucent `bg-popover/[…]` + `backdrop-blur-[…]` (being tuned) |

The arcade bottom bar is intentionally **not** part of this system — it uses its
own pixel-art material (`--arcade-menu-card-bg`, `backdrop-blur-sm`) to keep the
retro section visually separate per the Arcade guardrails.

Arcade deployment branding follows the same separation rule: agency-specific
color profiles live in `src/arcade/styles/arcade.css` and override only
`--arcade-*` tokens under the deployment's `[data-brand]` selector. They must
not consume or redefine raffle ticket/status variables. The unqualified
`.arcade-scope` declarations are the William Temple House defaults and are a
production compatibility contract.

### Rules

- **Interactive solids stay opaque on glass.** Buttons and inputs that sit on a
  glass surface must remain visually solid so they read as actionable. Note the
  shadcn `outline` button and `input` are **translucent in dark mode by
  default** (`dark:bg-input/30`) and `bg-transparent` (input, light) — on a
  glass parent these show the blurred backdrop through the control. Force them
  opaque with `bg-background dark:bg-background` (done for the `/new` language
  buttons and the ticket input).
- **Token, not hex.** Use the surface's own color token at an alpha
  (`bg-card/[45%]`, `bg-popover/[45%]`), never a hard-coded color, so the
  material stays theme-aware.
- **`tailwind-merge` overrides cleanly.** Adding `bg-popover/[45%]` to a
  component whose base class is `bg-popover` replaces the opaque fill; the
  `backdrop-blur-[…]` utility is additive.

### Edges & shadows on glass (the "material" finish)

Tint + blur + brightness + saturate are the *body* of the material; two more
cues make a translucent panel read as a physical pane catching light:

- **Edge highlight** — a 1px inset top-edge highlight (`inset 0 1px 0` in a
  near-white at low alpha; ~`white/0.5` light, ~`white/0.12` dark). This is the
  lit rim that sells "frosted pane" over "see-through rectangle."
- **Soft ambient shadow** — a large, diffuse, low-opacity drop shadow that lifts
  the panel off whatever's behind it.

Both are plain `box-shadow` (composed into a single declaration), so they cost
nothing per frame — safe within the performance baseline.

**The shadow obeys the dark-mode glow rule** (see Shadows, above): light mode
uses a soft dark ambient shadow; dark mode uses a soft **blue-teal glow**
(`rgb(0 150 255 / …)`-ish) that illuminates rather than darkens. The `/new`
dialog currently hardcodes that blue while the look is being tuned; when this is
tokenized (v2.0) the glow should reference the existing `--base-shadow-color`
convention rather than a one-off literal.

### The dialog contrast caveat (open problem)

The `/new` dialog is a special case. Unlike the dropdowns and nav bar — which
float over the **normal page** — a dialog renders over `DialogOverlay`, which is
`bg-black/40 backdrop-blur-sm`. So a translucent `DialogContent` reveals an
*already-darkened* layer beneath it: the see-through portion is both blurred
**and** darkened by the 40% black scrim. In light mode this drags the card away
from white, and the dark `popover-foreground` text loses contrast. Raising the
fill alpha restores contrast but kills the glass feel — the two goals fight.

**The fix direction is to stack a third effect — lighten — onto the material.**
`backdrop-filter` composes multiple functions, so a "light glass" can brighten
the backdrop it samples while staying translucent and blurred:

```
/* light-mode light material: translucent + blurred + lifted */
backdrop-filter: blur(2px) brightness(1.6) saturate(1.2);
/* Tailwind: backdrop-blur-[2px] backdrop-brightness-150 backdrop-saturate-150 */
```

`brightness(>1)` lightens the darkened overlay back toward the card color,
preserving text contrast *with* transparency. Dark mode wants the opposite bias
(keep it dark; light text already contrasts against the black scrim). This
"lighten + transparency + blur" recipe is the targeted answer to the dialog
problem and is the seed of the v2.0 material-token system below.

**Current values across glass surfaces are ad-hoc per element (interim).** They
are being tuned by eye before being promoted to shared, theme-aware tokens — do
not treat the literal `[45%]` / `[6px]` values as canonical.

---

## Tailwind CSS v4 Integration

### Key Changes from v3:
- **No tailwind.config.js** - configuration now in CSS using `@theme inline`
- **OKLCH colors** - more accessible, perceptually uniform
- **New sizing:** `size-10` replaces `w-10 h-10`
- **Imports:** `@import "tailwindcss"` replaces `@tailwind` directives

Keep styles minimal and utility-driven:

### ✅ Good Practice
- Use Shadcn components as generated (`npx shadcn add ...`), with semantic variants (`primary`, `secondary`, `outline`, `destructive`, plus custom badge `success|warning|danger` mapped to status tokens).
- Keep sizing utilities modern (`size-*`), colors semantic (`bg-primary`, `text-muted-foreground`), and gradients via tokens.
- Prefer utility classes over inline styles:
  - Use `bg-gradient-display`, `bg-gradient-serving-text` for display gradients.
  - Use `bg-gradient-card-info` / `bg-gradient-card-accent` for gradient cards.
  - Use `badge-success` (and other status variants) instead of per-instance CSS variables.

### ❌ Avoid
- Custom CSS overrides for colors/hover where Shadcn variants exist
- Inline hard-coded colors; prefer semantic tokens/status variables
- Old sizing patterns (`w-10 h-10`) or legacy imports/config files

---

## Component Composition

Use slot-based composition for maximum reusability:

```tsx
// Card with composition slots
export function Card({ title, children }) {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-bold">{title}</h3>
      {children}
    </div>
  );
}
```

### Standard Shadcn Components

#### Card
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

#### Badge
```tsx
import { Badge } from "@/components/ui/badge";

<Badge variant="default">Label</Badge>
<Badge variant="secondary">Label</Badge>
<Badge variant="destructive">Label</Badge>
<Badge variant="outline">Label</Badge>
```

#### New Components (Added Oct 2025)
```tsx
// Spinner - loading indicator
import { Spinner } from "@/components/ui/spinner";
<Spinner />

// Kbd - keyboard shortcuts
import { Kbd } from "@/components/ui/kbd";
<Kbd>⌘K</Kbd>

// Field - complete form field wrapper
import { Field, FieldLabel, FieldInput } from "@/components/ui/field";
<Field>
  <FieldLabel>Email</FieldLabel>
  <FieldInput type="email" />
</Field>
```

#### Button
```tsx
import { Button } from "@/components/ui/button";

<Button variant="default">Click me</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost">Subtle</Button>
<Button variant="link">Link style</Button>
```

---

## Styling Patterns

### Spacing
Use Tailwind's spacing scale consistently:
- `gap-{n}` for flex/grid gaps
- `space-y-{n}` for vertical stack spacing
- `p-{n}` for padding
- `m-{n}` for margins

### Typography
```tsx
// Headings
className="text-3xl font-bold tracking-tight"
className="text-2xl font-semibold"
className="text-lg font-medium"

// Body text
className="text-sm text-muted-foreground"
className="text-base"

// Labels
className="text-xs uppercase tracking-wide text-muted-foreground"
```

### Layout
```tsx
// Flex containers
className="flex items-center justify-between gap-4"

// Grid layouts
className="grid grid-cols-3 gap-6"
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"

// Responsive containers
className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"

// Modern sizing (v4)
className="size-10"  // Replaces w-10 h-10
className="size-full" // Replaces w-full h-full
```

---

## Accessibility Requirements

All components must be built with accessibility in mind, ensuring usability by users with disabilities.

### Checklist:
- ✅ Semantic HTML elements
- ✅ Proper ARIA labels where needed
- ✅ Keyboard navigation support
- ✅ Focus indicators visible
- ✅ Color contrast meets WCAG AA standards (4.5:1 for text)
- ✅ Screen reader compatibility
- ✅ Localized text wraps by word (no orphan single-letter wraps from animation spans)

### Example:
```tsx
<button 
  aria-label="Close dialog"
  className="focus:ring-2 focus:ring-ring focus:ring-offset-2"
>
  <X className="h-4 w-4" />
</button>
```

---

## Dark Mode

Toggle dark mode by changing classes on root HTML element. All color variables should have both light and dark mode definitions.

```tsx
// Tailwind dark mode class
<div className="bg-background text-foreground">
  {/* Automatically switches based on .dark class on <html> */}
</div>
```

---

## Theme Switch Transition

- The app theme switcher uses an Animate UI-style local primitive: `src/components/animate-ui/primitives/effects/theme-toggler.tsx`.
- Base theme changes (`light`, `dark`, `system`) use the View Transition API with a directional `clip-path` reveal (`ltr` default).
- Fallback behavior is required:
  - If `document.startViewTransition` is unavailable, switch immediately.
  - If `prefers-reduced-motion: reduce` is enabled, switch immediately.
- `Hi-viz` remains a separate contrast mode layered through `ThemeProvider`; do not collapse it into the base theme enum.

---

## TypeScript Support (React 19 Updates)

**forwardRef is deprecated** in React 19. Use direct props instead:

```tsx
// ❌ Old (React 18)
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ title, ...props }, ref) => <div ref={ref} {...props} />
);

// ✅ New (React 19)
interface CardProps extends React.ComponentProps<'div'> {
  title?: string;
  variant?: "default" | "outline";
}

export function Card({ title, variant = "default", ...props }: CardProps) {
  return <div data-slot="card" {...props} />;
}
```

**data-slot attribute:** All primitives now use `data-slot` for targeted styling.

---

## Performance Best Practices (2025)

**React Server Components (RSC)** are default in Next.js 15+. Only add `"use client"` when needed:

```tsx
// Server Component (default in Next.js App Router)
export default function Page() {
  return (
    <div>
      <Card>
        {/* No "use client" needed */}
      </Card>
    </div>
  );
}

// Client Component (only when needed)
'use client';

export function InteractiveCard() {
  const [count, setCount] = useState(0);
  return <Card onClick={() => setCount(c => c + 1)} />;
}
```

---

## Common Anti-Patterns to Avoid (2025 Update)

1. **❌ Using old Tailwind v3 patterns**
   ```tsx
   // Bad
   className="w-10 h-10"  // v3 style
   
   // Good
   className="size-10"    // v4 style
   ```

2. **❌ Using HSL colors**
   ```css
   /* Bad - HSL (deprecated) */
   --primary: 220 70% 50%;
   
   /* Good - OKLCH (current standard) */
   --primary: oklch(0.6 0.15 250);
   ```

3. **❌ Using forwardRef in new components**
   - React 19 removed forwardRef need

4. **❌ Mixing custom CSS with Tailwind**
   - Use Tailwind utilities consistently
   
2. **❌ Hard-coded colors**
   ```tsx
   // Bad
   className="bg-[#0b0b0b] text-[#fff]"
   
   // Good
   className="bg-card text-card-foreground"
   ```

3. **❌ Nested ternaries in className**
   ```tsx
   // Bad
   className={isActive ? isPrimary ? "bg-blue-500" : "bg-gray-500" : "bg-white"}
   
   // Good
   const bgColor = isActive 
     ? isPrimary ? "bg-primary" : "bg-secondary"
     : "bg-background";
   ```

4. **❌ Inline styles**
   ```tsx
   // Bad
   <div style={{ marginTop: 18, backgroundColor: '#0b0b0b' }}>
   
   // Good
   <div className="mt-[18px] bg-card">
   ```

---

## Migration Checklist (2025)

When converting existing components to current Shadcn standards:

### Code Updates
- [ ] Remove styled-jsx, emotion, CSS-in-JS
- [ ] Replace custom CSS with Tailwind utilities
- [ ] Use semantic color tokens (`bg-background`, `text-foreground`)
- [ ] Import Shadcn components (`Card`, `Badge`, `Button`, etc.)
- [ ] Remove `React.forwardRef` (React 19)
- [ ] Add `data-slot` attributes to primitives
- [ ] Update `w-* h-*` to `size-*`
- [ ] Add proper TypeScript types

### Color & Theming
- [ ] Convert HSL to OKLCH colors
- [ ] Update to `@theme inline` directive
- [ ] Remove `tailwind.config.js` (move to CSS)
- [ ] Test in both light and dark modes

### Accessibility & Testing
- [ ] Ensure ARIA attributes present
- [ ] Verify keyboard navigation
- [ ] Check contrast ratios (WCAG AA)
- [ ] Verify responsive behavior

---

## 2025 Updates Summary

**Major Changes:**
- **Tailwind v4** is now standard (CSS-first configuration)
- **OKLCH colors** replace HSL (March 2025)
- **React 19** - forwardRef removed
- **New style:** "new-york" is default ("default" deprecated)
- **New components:** Spinner, Kbd, Field, Button Group, Input Group, Item, Empty
- **Animation:** tw-animate-css replaces tailwindcss-animate
- **CLI improvements:** Cross-framework support, custom registries

## Resources

- Official Docs: https://ui.shadcn.com/docs
- Tailwind v4 Guide: https://ui.shadcn.com/docs/tailwind-v4
- v4 Demo: https://v4.shadcn.com
- Changelog: https://ui.shadcn.com/docs/changelog
- Components: https://ui.shadcn.com/docs/components
- Theming: https://ui.shadcn.com/docs/theming
