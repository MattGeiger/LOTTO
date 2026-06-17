# FEED Public Inventory Data Source

## Summary

LOTTO can consume FEED's public inventory endpoint to show pantry clients which
items are currently available. FEED is the source of truth for inventory
availability, categories, limits, dietary flags, and translated item/category
names.

This document captures the data contract and the LOTTO integration shape.
Runtime integration is implemented as a standalone public inventory lookup at
`/inventory`, linked from the personalized homepage at `/`.

## Pattern Alignment

- **Within existing patterns:** LOTTO already renders public client-facing data
  from read-only fetches and uses a shared language context for multilingual UI.
- **Within existing patterns:** A client-side read-only inventory surface can use
  existing shadcn/ui components, `LanguageSwitcher`, `ThemeSwitcher`, and RTL
  helpers without changing admin, raffle state, or Arcade boundaries.
- **Against current scope if added:** FEED-specific persistence, database tables,
  write routes, or long-lived cached copies in LOTTO. The FEED endpoint is live
  and intended to be fetched as current public data.

## Source System

FEED is William Temple House's food pantry management system. It exposes a
public read-only JSON endpoint for current inventory availability.

Production endpoint:

```text
https://feed.williamtemple.app/api/public/inventory.json
```

Local FEED endpoint:

```text
http://localhost:3001/api/public/inventory.json
```

Current deployed FEED version verified during planning:

```text
1.2.2
```

Relevant FEED source/docs:

- `/Users/russbook/williamtemple-feed/docs/PUBLIC_INVENTORY.md`
- `/Users/russbook/williamtemple-feed/packages/backend/src/routes/public-inventory.ts`
- `/Users/russbook/williamtemple-feed/packages/backend/__tests__/routes/public-inventory.test.ts`
- `/Users/russbook/williamtemple-feed/packages/backend/src/server.ts`
- `/Users/russbook/williamtemple-feed/packages/backend/prisma/schema.prisma`

## Access Contract

- Public and unauthenticated.
- Read-only.
- Browser-fetchable from LOTTO.
- `Access-Control-Allow-Origin: *`.
- `Cache-Control: no-store`.
- LOTTO should fetch without credentials.
- LOTTO must not write back to FEED from this endpoint.

The endpoint is mounted in FEED before credentialed CORS and authentication
middleware. This is intentional so public browser clients can read it without a
FEED session.

### CORS preflight constraint (important)

FEED returns `Access-Control-Allow-Origin: *` but its preflight response only
advertises `Access-Control-Allow-Headers: Content-Type`. Therefore the browser
fetch **must stay a CORS "simple request"** — it may only send
[CORS-safelisted request headers](https://developer.mozilla.org/en-US/docs/Glossary/CORS-safelisted_request_header)
(`Accept`, `Accept-Language`, `Content-Language`, `Content-Type`, `Range`).
Adding any non-safelisted header (e.g. **`User-Agent`**) promotes the GET to a
preflighted request whose `OPTIONS` FEED rejects, so the browser blocks the
fetch. This regressed both the visitor inventory page and the admin
inventory-name bridge — see `docs/ISSUES.md` Issue 23. `User-Agent` is attached
**server-side only** (Node/`undici` sends none by default and is never subject
to CORS).

## Update Behavior

The endpoint is live backend output, not a generated static file. Each request
reads current FEED inventory state and returns a fresh JSON response.

LOTTO should treat the response as current-at-request-time data:

- Use `generatedAt` to display freshness when useful.
- For the client-facing inventory page, show freshness from the latest included
  item `updatedAt` value. `generatedAt` is only the JSON response generation
  time and can be newer than the last real inventory change.
- Avoid persistent local storage of inventory responses.
- If a short in-memory cache is later introduced, keep it brief and never use it
  to display stale out-of-stock items for long periods.
- Prefer `cache: "no-store"` on fetch calls.

## Response Shape

Top-level response:

```ts
type FeedPublicInventory = {
  generatedAt: string;
  version: string;
  languages: string[];
  categories: FeedInventoryCategory[];
  totals: {
    categories: number;
    foodItems: number;
  };
};
```

Category:

```ts
type FeedInventoryCategory = {
  id: number;
  name: string;
  translations: Record<string, string>;
  icon: string | null;
  limit: number;
  limitType: string;
  itemCount: number;
  items: FeedInventoryItem[];
};
```

Food item:

```ts
type FeedInventoryItem = {
  id: number;
  name: string;
  translations: Record<string, string>;
  limit: number;
  limitType: string;
  statusTags: {
    inStock: true;
    limited: boolean;
    clearance: boolean;
  };
  dietaryFlags: {
    vegan: boolean;
    vegetarian: boolean;
    glutenFree: boolean;
    organic: boolean;
    halal: boolean;
    kosher: boolean;
    readyToEat: boolean;
  };
  updatedAt: string;
};
```

## Inclusion Rules

FEED applies these rules before LOTTO receives the response:

1. Only food items marked in stock are included.
2. Out-of-stock food items are omitted.
3. Categories with no in-stock items are omitted.
4. Category and item lists are currently sorted by English `name`.
5. `statusTags.inStock` is always `true` for included items.

LOTTO does not need to filter out-of-stock items. FEED has already removed them.

## Translation Behavior

English is the baseline value in each `name` field.

`translations` is keyed by enabled FEED language names, not by LOTTO's internal
language codes. Translation keys are present only when a translation exists.

Known FEED language names:

```text
English
Chinese
Spanish
Arabic
Russian
Vietnamese
Persian
Ukrainian
```

LOTTO language codes:

```ts
type Language = "en" | "zh" | "es" | "ru" | "uk" | "vi" | "fa" | "ar";
```

Proposed mapping:

```ts
const feedLanguageByLottoLanguage: Record<Language, string> = {
  en: "English",
  zh: "Chinese",
  es: "Spanish",
  ru: "Russian",
  uk: "Ukrainian",
  vi: "Vietnamese",
  fa: "Persian",
  ar: "Arabic",
};
```

Display rule:

```ts
const getFeedDisplayName = (
  entity: { name: string; translations: Record<string, string> },
  language: Language,
) => {
  const feedLanguage = feedLanguageByLottoLanguage[language];
  return entity.translations[feedLanguage] ?? entity.name;
};
```

Do not assume every enabled FEED language has a translation for every category
or item.

## Implemented LOTTO Integration

The first integration is a standalone public inventory surface, separate from
raffle display state and Arcade gameplay.

Route:

```text
/inventory
```

Files:

```text
src/app/inventory/page.tsx
src/components/public-inventory-page.tsx
src/lib/feed-public-inventory.ts
tests/feed-public-inventory.test.ts
tests/public-inventory-page.test.tsx
```

Proposed optional environment variable:

```text
NEXT_PUBLIC_FEED_PUBLIC_INVENTORY_URL=https://feed.williamtemple.app/api/public/inventory.json
```

Local development can point this at FEED on port 3001:

```text
NEXT_PUBLIC_FEED_PUBLIC_INVENTORY_URL=http://localhost:3001/api/public/inventory.json
```

Default behavior uses the production FEED URL when the environment variable is
absent.

If a configured endpoint fails, LOTTO retries once against the production FEED
URL. This protects production from stale local-development overrides such as
`http://localhost:3001/api/public/inventory.json`.

## Fetch Contract

The same helper (`fetchFeedPublicInventory`) runs both in the visitor's browser
and on the server (the translation auditor). Headers are split by runtime so the
browser request stays a CORS simple request (see the CORS preflight constraint
above):

```ts
const headers: Record<string, string> = { Accept: "application/json" }; // safelisted
if (typeof window === "undefined") {
  // Server-only: Node/undici sends no UA by default; never subject to CORS.
  headers["User-Agent"] = "LOTTO/1.0 (+https://williamtemple.app)";
}

const response = await fetch(feedPublicInventoryUrl, {
  cache: "no-store",
  credentials: "omit",
  headers,
});
```

Implementation expectations:

1. Throw or return a typed failure when the response is not `ok`.
2. Treat malformed responses as load failures.
3. Do not send cookies or credentials.
4. Do not proxy through `/api/state`.
5. Do not add FEED inventory to LOTTO's raffle state schema.
6. **Never send a non-CORS-safelisted request header (e.g. `User-Agent`) from
   the browser.** It triggers a preflight FEED rejects. `tests/feed-public-inventory.test.ts`
   guards this.

Production CSP must allow this public FEED origin in `connect-src`:

```text
https://feed.williamtemple.app
```

## UI Intent

The inventory view should be plain-language and client-friendly:

- Show available pantry items grouped by category.
- Show item names in the selected LOTTO language when FEED provides a matching
  translation; fall back to English otherwise.
- Show a freshness line from `generatedAt`, for example `Updated: 1:24 PM`.
- Show category and item counts from `totals`.
- Support client-side search/filtering by displayed category/item name.
- Treat FEED limit values of `100` or higher as no practical limit and do not
  display a limit string.
- Use status tags:
  - `limited` -> `Limited`
  - `clearance` -> `Clearance`
- Show dietary flags only when true:
  - Vegan
  - Vegetarian
  - Gluten-free
  - Organic
  - Halal
  - Kosher
  - Ready to eat
- Keep status tags and dietary flags in separate columns/sections.
- Show a legend/key explaining status and dietary icons before the category
  tables.
- Use icon-only values inside category table status/dietary cells after the
  legend establishes their meaning. Keep accessible labels for screen readers.
- Make icon values tappable/clickable and show the localized label in a popover
  so the meaning is available on both touch screens and mouse devices.
- Use the same visual meanings as FEED where possible:
  - `Limited` uses an alert-triangle icon with warning styling.
  - `Clearance` uses a tag icon with danger/clearance styling.
  - Dietary flags use FEED's dietary icon set: wheat-off, vegan, carrot,
    moon-star, star, sprout, and utensils-crossed.
- Leave status/dietary cells blank when no values apply.
- Use existing shadcn/ui surfaces (`Card`, `Badge`, `Input`, `Button`) and
  semantic token colors.
- Use `isRTL(language)` for Arabic and Persian layout direction.

## Route and Product Boundary

Inventory lookup should remain separate from raffle/display features:

- Do not embed inventory into `src/components/readonly-display.tsx`.
- Do not couple inventory fetches to `/api/state`.
- Do not add inventory data to `RaffleState`.
- Do not integrate inventory into Arcade routes.
- A link from the public board top bar to `/inventory` is acceptable if it uses
  existing public navigation patterns and does not disrupt queue lookup.
- The public bottom navigation now owns top-level client movement:
  **Your ticket** (`/`), **Dashboard** (`/display`), **What's in stock**
  (`/inventory`), and **Games** (`/arcade`). Do not reintroduce separate
  inventory/arcade action buttons inside the personalized ticket-card action
  stack.
- The earlier personalized-homepage blockers have been resolved:
  - Translated public text on `/` now uses TextScramble instead of the
    retired aggressive morph effect.
  - Ticket selection is pantry-day/range aware and can be changed through the
    personalized ticket card.

## Error and Empty States

Recommended states:

- Loading: show a simple loading message or skeleton in the inventory route.
- Error: show a plain-language message that current inventory could not be
  loaded, with a retry button.
- Empty: if FEED returns zero categories, show that no pantry inventory is
  currently listed as available.
- Partial translations: silently fall back to English item/category names.

Do not expose raw network errors or stack traces to clients.

## Testing Plan

Focused tests should cover:

1. FEED language-name mapping from LOTTO language codes.
2. Display-name fallback when a translation is missing.
3. Fetch uses `credentials: "omit"` and `cache: "no-store"`.
4. Categories and items render grouped by category.
5. Search filters by displayed translated names.
6. `Limited` and `Clearance` badges render only when true.
7. Dietary badges render only for true flags.
8. Empty response renders a client-friendly empty state.
9. Fetch failure renders a client-friendly error state and retry affordance.
10. Arabic/Persian selected languages apply RTL direction.

## Open Decisions

1. Whether `/inventory` should also be linked from `/display`, or only from the
   homepage (`/`) for the initial client-facing test.
2. Whether to poll inventory periodically while the page is visible or refresh
   only on page load plus manual retry/refresh.
3. Whether to include FEED category icons in LOTTO UI immediately or treat them
   as future polish.
4. Whether status and dietary badge labels should be added to LOTTO's language
   dictionary in the first implementation or initially shown in English.

## Acceptance Criteria for First Implementation

1. `/inventory` loads the FEED public endpoint without credentials.
2. Inventory is grouped by category and shows only FEED-included items.
3. Selected LOTTO language maps to FEED language names and falls back to English
   per category/item.
4. Freshness, totals, status tags, and dietary flags are visible in plain
   language.
5. No FEED data is persisted in LOTTO backend storage.
6. Tests cover the fetch helper, language fallback, and primary UI states.
7. `README.md`, `.env.example`, `PROJECT_OVERVIEW.md`, and `CHANGELOG.md` are
   updated when runtime integration is implemented.
