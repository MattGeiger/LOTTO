# Display Language Rotation

**Status:** Shipped (v1.17.0)

## Why

The large-format **Display** board (`/display`) is passive — clients viewing it
on a wall screen cannot tap to choose a language. Rotating language mode lets the
agency cycle the board through a chosen set of languages on a timer so
non-English-speaking clients can read it without interacting. It reinforces the
equity stance that language should never be a barrier to receiving service.

## What the agency configures

In **Admin → "Rotate display languages"**:

- **Enable** toggle.
- **Languages** — any subset of the eight supported languages (English, 中文,
  Español, Русский, Українська, Tiếng Việt, فارسی, العربية).
- **Minutes per language** — a single shared interval (1–30) applied to each
  selected language. The board shows a "Full cycle" hint (selected × minutes).

The result is a cartesian split of **(X languages) × (Y minutes each)**, rotated
in canonical order.

## Data model

`RaffleState.displayLanguageRotation: DisplayLanguageRotation | null` where:

```ts
type DisplayLanguageRotation = {
  enabled: boolean;
  languages: Language[];     // canonical LANGUAGE_OPTIONS order
  intervalSeconds: number;   // Admin edits minutes; stored as seconds
};
```

- `null` (default) = off. Added as a nullable field, so it is back-compatible
  with existing persisted state via the `{ ...defaultState, ...payload }` merge
  in both state managers — no migration.
- Set through the `setDisplayLanguageRotation` action (`src/app/api/state/route.ts`),
  Zod-validated: `languages` is an enum of the 8 codes (1–8 items),
  `intervalSeconds` is an integer in `[5, 3600]`. The Admin UI sends `null` when
  no languages are selected.
- Persisted by `setDisplayLanguageRotation` in `src/lib/state-manager.ts` and
  `src/lib/state-manager-db.ts`, and **preserved across draw reset/generate**
  (like `operatingHours`).

## How the board consumes it

- The board reaches the display via the existing `/api/state` poll. The config
  arrives on `ReadOnlyDisplay`'s `onStateChange`, captured by
  `PublicDisplayPage`.
- `useDisplayLanguageRotation` (`src/hooks/use-display-language-rotation.ts`)
  cycles `setLanguage` over `config.languages` every `intervalSeconds`, starting
  at the first language. It keys its timer on a stable signature
  (`enabled|languages|intervalSeconds`) so polls that don't change the config do
  not restart the cycle. A single language is a static pick (no timer).
- Each `setLanguage` automatically triggers the board's existing
  `ScrambleOnLanguageChange` transition and the `isRTL` direction flip — so
  rotating into Arabic/Farsi flips the board to right-to-left for free.
- Rotation is intentionally **independent of `prefers-reduced-motion`** — showing
  a client their own language is content/accessibility, not decoration. Only the
  scramble transition is motion (governed by the board's existing settings).

## Scope: `/display` only, no preference bleed

The `LanguageProvider` is mounted at the root layout and persists the chosen
language to `localStorage["display-language"]`. To keep rotation from clobbering
that shared preference or affecting other routes:

- `src/app/display/page.tsx` wraps the board in a **non-persisting**
  `LanguageProvider` (`persist={false}`, a small prop added to the provider).
  Rotation changes the board language in memory only.
- The rotation hook is mounted **only by `PublicDisplayPage`**, so the
  personalized homepage (`/`) — where each client picks their own language in the
  onboarding modal — is unaffected.
- While rotation is active, the board's manual `LanguageSwitcher` is hidden
  (space preserved) since auto-rotation would override a manual pick.

## Operational note

This drives the board UI language; it is independent of the QR target / display
URL. Point dedicated wall displays at `/display`.

## Key files

| Concern | File |
| --- | --- |
| Shared language list | `src/lib/languages.ts` |
| Type + default | `src/lib/state-types.ts` |
| Action + Zod | `src/app/api/state/route.ts` |
| Persistence | `src/lib/state-manager.ts`, `src/lib/state-manager-db.ts` |
| Admin control | `src/components/display-language-rotation-editor.tsx`, `src/app/admin/page.tsx` |
| Scoped provider | `src/contexts/language-context.tsx`, `src/app/display/page.tsx` |
| Rotation timer | `src/hooks/use-display-language-rotation.ts` |
| Board wiring | `src/components/public-display-page.tsx` |
