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

## The second thing that breaks: the dev-server HMR WebSocket

`npm run dev` **cannot be used on iOS/iPadOS 15 without a shim.** This is a
Next.js dev-mode incompatibility with old WebKit, not an application bug, and it
does not affect production in any way.

iOS 15 Safari refuses the Next.js hot-reload WebSocket with a `SecurityError`:

```
The operation is insecure.
  WebSocket@[native code]
  init@ .../node_modules_next_dist_client_*.js:10147
  appBootstrap@ .../node_modules_next_dist_client_*.js:171
```

The socket is constructed at
[`get-socket-url.js`](../node_modules/next/dist/client/dev/hot-reloader/get-socket-url.js)
inside Next's **async `appBootstrap`**, so the synchronous throw becomes an
unhandled promise rejection that aborts bootstrap **before `hydrateRoot` runs**.
Nothing hydrates: the page server-renders correctly, no event handlers attach,
and no `useEffect` ever fires.

The symptom is therefore identical to the Issue 5 outage above — "renders but is
not interactive" — while having a completely different cause. On `/admin` it
presents as a permanent `Loading state from datastore…` spinner, because the
state fetch lives in a `useEffect`.

### What does not fix it

| Attempted | Result |
| --------- | ------ |
| `next dev --experimental-https` with an mkcert cert trusted in the simulator keychain | Page loads over HTTPS with a valid padlock; **same error**. The page's secure context is not the issue. |
| Safari → Advanced → Experimental Features → `NSURLSession WebSocket` = off | **No effect.** Investigated and ruled out. |
| Testing a newer simulator (iPadOS 17/18) | Works, but proves nothing — modern WebKit accepts the socket. |

### The shim

[`src/app/layout.tsx`](../src/app/layout.tsx) emits a development-only inline
script that wraps `window.WebSocket` so its constructor cannot throw, returning
an inert stub when the real one raises. Bootstrap then completes normally.

The cost is that **hot reload does not work on iOS 15** — edits require a manual
refresh. Everything else behaves normally, and the app becomes testable on the
declared support floor.

It is gated on `process.env.NODE_ENV === "development"`. A controlled comparison
(build at `HEAD`, build with the shim, diff the chunk hashes) confirmed **all 48
production client chunks byte-identical with and without it**, and the shim
string appears in zero shipped chunks.

> Note that this shim only makes the *dev server* usable on old WebKit. It does
> not change what the production bundle contains, so it is no substitute for
> `npm run build` + `npm run check:legacy-bundles` + a load of the built app on
> the 15.4 simulator. Run `rm -rf .next` afterwards, or the next `npm run dev`
> fails on a missing `.next/dev/routes-manifest.json`.

### Diagnosing this class of failure

Grepping bundles for "modern syntax" is unreliable — matches land inside
comments and CSS strings. Get the real exception instead: add a temporary inline
`<script>` to the layout `<head>` forwarding `error` and `unhandledrejection`
(message **and** stack) to a URL the dev server logs, then read the log. Make the
device under test the **only** client — a desktop browser left open on the same
port emits the exact requests you are looking for and will fool you into
declaring a fix that does not work. Confirm any fix **on the device screen**, not
from server-log traffic.

## The third thing that breaks: OKLCH in runtime-generated themes

> Recorded as Issue 42 in [ISSUES.md](./ISSUES.md); the dev-server WebSocket
> failure above is Issue 43.

`oklch()` requires **Safari 16.4**. The declared floor is iPadOS 15, where every
OKLCH value is invalid, so anything using one computes to `transparent`.

Hand-authored brand stylesheets are safe: they pass through the build, where
Lightning CSS downlevels `oklch()` to sRGB for the browserslist floor. The
compiled stylesheet contains **zero** `oklch()`.

Runtime brand themes are not. They are derived per request and injected as an
inline `<style>` in `<head>` (`src/lib/brand-config/resolve.ts`), so they never
touch that pipeline. Before v1.24.2 they shipped their OKLCH values verbatim,
and on iPadOS 15 every custom appearance rendered broken:

| Symptom | Mechanism |
| ------- | --------- |
| Card, popover, and modal surfaces transparent | `background-color: var(--card)` invalid at computed-value time |
| Dark outlines around every card | `--border` invalid, so `border-color` falls back to `currentColor` |
| Toggle switches invisible | track and thumb are theme tokens |
| Modals unreadable | surface *and* backdrop scrim both transparent, so page content shows through |

Measured directly on iPadOS 15.4 (`CSS.supports('color','oklch(0.7 0.15 145)')`
returns `false`; the same value computes to `rgba(0, 0, 0, 0)`). Note that
`color-mix()` **is** supported there, so it is not implicated.

### The fix

`serializeBrandThemeCss` emits each scope twice: an sRGB baseline first, then
the OKLCH values inside `@supports (color: oklch(0 0 0))`. Modern engines take
the second; iPadOS 15 keeps the first. Colours inside gradients and shadows are
converted in place, alpha preserved.

> The obvious shorthand does **not** work here. Writing `--card: #fff;` followed
> by `--card: oklch(...)` fails, because custom properties are not validated at
> parse time — both declarations are accepted and the later always wins, with
> the invalidity only surfacing at `var()` substitution, which then falls back to
> the *property's* initial value rather than to the earlier declaration.
> `@supports` is the only correct guard.

**Any new runtime-generated CSS must follow this rule.** The build protects
authored stylesheets; nothing protects CSS generated at request time.

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
