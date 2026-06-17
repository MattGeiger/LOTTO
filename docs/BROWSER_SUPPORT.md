# Browser Support Matrix

LOTTO is used on a wide range of hardware: staff sign in from older institutional
iPads, and the **public-facing visitor pages** are opened by clients on whatever
device they carry — frequently aging Android and Apple phones. Legacy
compatibility is therefore a first-class requirement, not best-effort.

## Declared support floor

| Engine / Browser            | Minimum version | Notes |
| --------------------------- | --------------- | ----- |
| iOS / iPadOS Safari         | **15**          | Covers the deployed iPadOS 15.8 staff devices. |
| iOS / iPadOS Chrome, etc.   | **15**          | On iOS *every* browser uses Apple WebKit, so the iOS floor is an engine floor. |
| macOS Safari                | **15**          | |
| Chrome (desktop & Android)  | **80**          | ~2020; covers aging Android visitor devices. |
| Samsung Internet            | ≈ Chrome 80     | Tracks the Chromium floor. |
| Firefox                     | **78**          | ESR-era floor. |
| Edge                        | **80**          | Chromium Edge. |

This floor is declared in [`package.json`](../package.json) under `browserslist`.
Next.js / SWC uses it to **downlevel syntax** and core-js uses it to **polyfill
runtime APIs** down to this baseline.

## The one thing browserslist cannot fix: regex literals

Transpilers downlevel *syntax* (class fields, optional chaining, `??=`, etc.) and
polyfill *APIs* (`Promise.withResolvers`, `Object.groupBy`, …). They **cannot
rewrite a regex *literal***. So a single unsupported regex feature in any bundled
dependency ships verbatim and throws a `SyntaxError` at script **parse** time on
engines that don't support it — which takes down the *entire chunk* before any
code runs and **aborts React hydration**. The page then "renders but is not
interactive": SSR HTML paints, but no event handlers attach.

Known offenders for our floor (must be kept out of the bundle):

| Feature | First supported | Breaks |
| ------- | --------------- | ------ |
| Regex lookbehind `(?<=…)` / `(?<!…)` | Safari **16.4** | iOS 15.x |
| Regex `v` (unicodeSets) flag | Safari **17** | iOS 15.x / 16.x |

> Named capture groups `(?<name>…)` are **fine** on iOS 15 — do not confuse them
> with lookbehind.

### Case study: the iPadOS 15.8 login/home outage (2026-06)

`remark-gfm` (via `micromark-extension-gfm-autolink-literal`) bundled an email
autolink regex using lookbehind:

```js
/(?<=^|\s|\p{P}|\p{S})([-.\w+]+)@([-\w]+…)/gi
```

Because `MarkdownGuideContent` is statically imported by both the login footer
(Release Notes) and the visitor home page (announcements), that chunk loaded
eagerly on `/login` and `/`, parse-failed on iPadOS 15.8 WebKit, and bricked
hydration on both — in Safari *and* Chrome (same engine). Resolved by replacing
`remark-gfm` with the legacy-safe [`remarkGfmSafe`](../src/lib/remark-gfm-safe.ts)
plugin (tables + strikethrough + task lists, **no autolink-literal**). See
[ISSUES.md](./ISSUES.md) Issue 5.

## Guardrails

- **Static guard:** `npm run check:legacy-bundles` scans the built chunks for the
  forbidden regex syntax above and fails the build if any reappears (e.g. via a
  dependency bump). Run after `next build`.
  Source: [`scripts/check-legacy-safe-bundles.mjs`](../scripts/check-legacy-safe-bundles.mjs).
- **Unit tests:** `tests/legacy-bundle-guard.test.ts` (detection rules + a scan of
  the real build when present) and `tests/markdown-guide-legacy-safe.test.tsx`
  (the markdown renderer's behavioral contract — GFM subset works, bare-URL
  autolinking stays off).
- **Smoke test:** `npm run smoke:legacy` loads `/` and `/login` against a running
  production build and asserts hydration completed (tabs switch, email field
  accepts input, no uncaught errors). For true floor coverage, point
  `SMOKE_BASE_URL` at a tunnel and run the same flow on a real iPadOS 15.8 /
  Android 8 device (BrowserStack / Sauce Labs).
  Source: [`scripts/smoke-legacy-compat.mjs`](../scripts/smoke-legacy-compat.mjs).

## Authoring implication

Bare-URL / bare-email **autolinking is intentionally disabled** in markdown
(announcements, Help, Release Notes). Authors must use explicit links:
`[text](https://example.org)` or `<https://example.org>`.
