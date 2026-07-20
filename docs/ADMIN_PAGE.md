# Admin Page

The admin page (`/admin`) is the staff control surface for operating the daily
raffle drawing. Daily-use operational controls stay visible by default, while
lower-frequency configuration tools are grouped behind progressive disclosure.

## Page Structure

The default admin view keeps these cards visible:

- Ticket Range & Order
- Now Serving
- Live State
- History
- System reset
- Share the live board

The following configuration cards live inside the collapsed **Advanced**
accordion:

- Appearance (configurable branding; see below)
- Set operating hours
- Rotate display languages
- Announcement
- Translation

### Performance constraint: inputs must own their own state

`src/app/admin/admin-page-client.tsx` is a single large client component
(~2,800 lines of JSX). **Any state that changes on every keystroke must live in
an isolated child component, not in `AdminPageClient`.** Lifting a
high-frequency input to the root re-renders the whole page per character, which
is imperceptible on modern hardware but produces multi-second input lag on the
iPad mini 4 class devices staff actually use.

This has now caused two separate production defects — `docs/ISSUES.md`
Issue 14 (range/reset fields) and Issue 35 (Announcement editor).

Existing isolated sections, to copy from when adding a new input:

| Section | Component |
|---------|-----------|
| Start/End range inputs | `RangeGenerationControls` (in `admin-page-client.tsx`) |
| Reset confirmation phrase | `ResetActionControls` (in `admin-page-client.tsx`) |
| Draw position controls | `DrawPositionControls` (in `admin-page-client.tsx`) |
| Announcement draft | `src/components/announcement-section.tsx` |

The pattern: a `React.memo` component owns the value in local state, renders
its own action button, and calls a stable `onSave`/`onCommit` callback with the
value only when the user commits. The root's callback must take the value as an
**argument** rather than closing over root state, so its `useCallback` identity
stays stable.

The cost is highest for inputs inside the **Advanced** accordion, because its
children are mounted while it is open — and `TranslationCard` is built on
`animate-ui`'s `TabsContents`, which renders *all* of its tabs, not just the
visible one.

When adding an input, add a test asserting that heavy siblings do not re-render
while typing (see `tests/announcement-input-isolation.test.tsx`). A timing
assertion will not catch this defect class on a development machine.

### Appearance card

The Appearance card (`src/components/appearance/appearance-card.tsx`) manages
runtime brand configurations (docs/CONFIGURABLE_BRANDING_PLAN.md). It shows
whether the built-in brand or a saved custom appearance is live, lists saved
configurations with Edit / Activate / Delete, offers **Use built-in
appearance** to revert instantly, and launches the seven-step Appearance
wizard (`src/components/appearance/appearance-wizard.tsx`, mirroring the
Translation AI wizard's step-dialog mechanics). When no configuration exists
the card is the prominent "Set up your organization's appearance" call to
action — deliberately not an auto-opening modal. Wizard saves go through
staff-gated `/api/brand-config`, which refuses any configuration failing
schema, override-allowlist, or contrast validation; activation applies
instantly (the brand resolves per request) and the wizard's Colors step
previews the protected Returned/Unclaimed status colors precisely because
branding cannot change them.

This keeps setup/localization tools available without cluttering the daily
workflow. The accordion uses the local animate-ui radix wrapper at
`src/components/animate-ui/components/radix/accordion.tsx` and loads collapsed by
default.

## Live State Card Layout

The card uses a responsive CSS Grid with three breakpoint tiers:

| Breakpoint | Grid | Behavior |
|------------|------|----------|
| Mobile (default) | 1 column | All subcards stack vertically |
| Small (`sm`) | 2 columns | Compact pairs; full-width rows span 2 |
| Large (`lg`) | 6 columns | Supports 3-wide (span-2), 2-wide (span-3), and full-width (span-6) rows |

**Container class:** `grid gap-4 sm:grid-cols-2 lg:grid-cols-6`

### Row layout (large screens)

```
Row 1 — 3 columns:   RANGE  |  TICKETS ISSUED  |  CURRENT MODE
Row 2 — 2 columns:   NOW SERVING  |  MAX WAIT TIME
Row 3 — 2 columns:   TICKETS CALLED  |  PEOPLE WAITING
Row 4 — full width:  NEXT UP
Row 5 — full width:  RETURNED TICKETS
Row 6 — full width:  UNCLAIMED TICKETS
```

### Column spans

| Subcard | `sm` | `lg` |
|---------|------|------|
| Range | 1 | `col-span-2` |
| Tickets Issued | 1 | `col-span-2` |
| Current Mode | `col-span-2` | `col-span-2` |
| Now Serving | 1 | `col-span-3` |
| Max Wait Time | 1 | `col-span-3` |
| Tickets Called | 1 | `col-span-3` |
| People Waiting | 1 | `col-span-3` |
| Next Up | `col-span-2` | `col-span-6` |
| Returned Tickets | `col-span-2` | `col-span-6` |
| Unclaimed Tickets | `col-span-2` | `col-span-6` |

## Subcards

### Existing subcards

| Subcard | Source | Display |
|---------|--------|---------|
| **Range** | `state.startNumber` – `state.endNumber` | e.g. "10530 – 10580" |
| **Tickets Issued** | `endNumber - startNumber + 1` | e.g. "51" |
| **Current Mode** | `state.mode` | "random" or "sequential" |
| **Now Serving** | `state.currentlyServing` | Ticket number or "—" |
| **Next Up** | Next 5 tickets after currently serving (skips returned) | Badge list |
| **Returned Tickets** | `ticketStatus` entries with value `"returned"` | Badge list (danger) |
| **Unclaimed Tickets** | `ticketStatus` entries with value `"unclaimed"` | Badge list (warning) |

### New subcards

#### Max Wait Time

**Purpose:** Estimated wait time for the last person in the queue. Staff use this to answer "How long is the wait?" when new arrivals ask.

**Computation:** `Math.round(peopleWaiting * 2.2)` minutes, where `2.2` is the average minutes per ticket (same constant used in the public display's ticket detail dialog at `readonly-display.tsx:307`).

**Display:** Formatted via `formatWaitTime(minutes, "en")` from `src/lib/time-format.ts`. Examples: "12 minutes", "1 hour, 6 minutes". Shows "—" when no one is waiting.

#### Tickets Called

**Purpose:** Number of tickets that have been called so far, including unclaimed tickets but excluding returned tickets.

**Computation:** Count tickets from index 0 through `currentIndex` in `generatedOrder`, excluding any with `ticketStatus === "returned"`. Unclaimed tickets are counted because they *were* called.

**Display:** Integer or "—" when no tickets have been generated.

#### People Waiting

**Purpose:** Number of tickets still waiting to be called, excluding returned tickets.

**Computation:** Count tickets from `currentIndex + 1` to end of `generatedOrder`, excluding any with `ticketStatus === "returned"`.

**Display:** Integer or "—" when no tickets have been generated.
