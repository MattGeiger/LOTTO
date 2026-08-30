# AGENTS.md

## Purpose
This file captures repo-specific guidance for coding agents so changes stay
consistent with existing patterns and workflows.

## Project Snapshot
- Next.js 16 App Router, TypeScript/TSX only.
- UI uses shadcn/ui (style: new-york) with Tailwind CSS variables.
- Global design tokens live in `src/app/globals.css`.
- Auth: NextAuth magic link + OTP, emails via Resend.
- Data: Neon Postgres in production; local `data/state.json` for dev fallback.
- Toasts: `sonner` with UI wrapper in `src/components/ui/sonner`.

## Repo Map
- `src/` app code (App Router, components, hooks, lib).
- `public/` static assets.
- `data/` local dev data (gitignored except `.gitkeep`).
- `tests/` Vitest + Testing Library.
- `docs/` documentation and runbooks.
- `scripts/` helper scripts.

## Commands
- `npm run dev` start Next.js dev server.
- `npm run build` production build.
- `npm start` run built app.
- `npm run readonly` optional standalone display on port 4000.
- `npm test` Vitest suite.
- `npm run lint` ESLint.
- `docker compose up --build` full local stack (app + Postgres + MailDev).

## Conventions
- Use shadcn/ui components in `src/components/ui` where possible.
- Prefer Tailwind tokens from `src/app/globals.css`; avoid hard-coded colors.
- Keep UI logic in TS/TSX; no JSX files.
- User-facing notifications should use `sonner` toasts unless an existing
  pattern dictates otherwise.

## White-label Color Guardrails
- Agency brand selectors may override identity/presentation tokens, but must
  not override LOTTO's universal operational status vocabulary.
- Returned and danger remain red; Unclaimed and warning remain gold; success
  and neutral status meanings also remain consistent across every agency.
- Do not place `--status-success-*`, `--status-warning-*`,
  `--status-danger-*`, `--status-neutral-*`, `--gradient-status-*`,
  `--ticket-unclaimed-text`, `--ticket-returned-text`, or `--operational-*`
  action tokens inside a
  `[data-brand]` selector. These shared tokens feed Admin controls, display
  cells, legends, badges, and alerts, so a brand-local override has broad and
  potentially inaccessible effects.
- Any deliberate change to operational status semiotics requires explicit user
  approval, corresponding updates to `docs/UI_DESIGN.md`, and regression tests
  covering every shared consumer.
- Runtime-configurable branding (`src/lib/brand-theme/`, `src/lib/brand-config/`,
  the Admin Appearance wizard) enforces the same boundary structurally: the
  derivable token vocabulary in `src/lib/brand-theme/tokens.ts` excludes every
  protected family, the generator/override pipeline is tested to never emit
  them, and validation runs on the final merged token set. Do not add protected
  token names to that vocabulary or weaken `PROTECTED_TOKEN_PATTERNS`. The
  derivation rules in `src/lib/brand-theme/derive.ts` are reverse-engineered
  from the hand-authored St. Johns CSS — changing a rule changes every custom
  brand, so treat rule edits like shared-theme edits (tests + docs + approval).
  See `docs/CONFIGURABLE_BRANDING_PLAN.md`.
- **Runtime-generated CSS must be legacy-safe at emit time.** Authored
  stylesheets are downleveled by the build; CSS generated per request and
  injected inline is not. `oklch()` needs Safari 16.4 and the floor is
  iPadOS 15, so `serializeBrandThemeCss` writes an sRGB baseline first and
  restores OKLCH inside `@supports (color: oklch(0 0 0))`. Do not "simplify"
  this to a single OKLCH layer, and do not replace it with two consecutive
  custom-property declarations — custom properties are not validated at parse
  time, so the later one always wins. See `docs/BROWSER_SUPPORT.md`.
- **Do not derive brand-shadow alpha with `color-mix()` at the point of use.**
  A mix whose source is `var(--base-shadow-color)` cannot be safely folded for
  the iPadOS 15 floor and may fall back to an opaque color. Theme scopes must
  emit the pre-alpha `--base-shadow-soft-color`, `--base-shadow-color`, and
  `--base-shadow-strong-color` values; shared recipes consume them directly.
  See `docs/BROWSER_SUPPORT.md` Issue 45 guidance.

## Translation AI / FEED Parity
- The Translation card's AI surfaces are a FEED-first parity area. For
  Language Settings, AI Configuration, System Prompts, and Translation
  Management, treat FEED production components as the source of truth.
- Do not simplify, consolidate, rename, or visually substitute FEED UI/UX
  patterns unless the user explicitly approves the deviation or LOTTO has a
  documented design-intent difference.
- Port FEED component structure first, then adapt only boundary concerns:
  service calls become Next.js route fetches, FEED persistence maps to LOTTO
  stores/API routes, and FEED-only domain concepts may be omitted when noted in
  docs (for example, LOTTO omits FEED classification prompts and replaces FEED's
  prompt taxonomy with UI translations, Inventory, and Announcements).
- Keep FEED animated icon vocabulary and interaction rules for these surfaces.
  If an icon/utility is missing in LOTTO, port it from FEED before substituting.
- See `docs/TRANSLATION_AI_FEED_PARITY.md` before changing
  `src/components/translation/*` AI-related UI.

## Serverless Polling and Readiness
- LOTTO runs on Vercel and production reads usually reach Neon. A repeated
  client request can therefore multiply into an Edge Request, a Function
  invocation, and several database reads. Treat request frequency as a product
  and cost concern, not merely a frontend implementation detail.
- Never poll for a condition that cannot change without a separate staff action.
  In particular, visitors must not poll while waiting for translation work that
  has not been queued. Language enablement is an Admin workflow: enabling a
  dynamic language runs the missing-translation sweep and completes its queue;
  only ready languages enter the shared client catalog.
- Do not create fixed, unbounded `setInterval` API loops. When polling is truly
  necessary, reuse the shared adaptive strategy or implement equivalent bounded
  backoff, pause while `document.visibilityState === "hidden"`, stop after a
  defined terminal condition/timeout, and test request counts as well as UI
  state.
- Prefer action-driven refresh, short shared CDN caching, or existing server
  responses over per-tab `cache: "no-store"` polling. Any exception must explain
  why caching/event-driven refresh is insufficient and document its Vercel plus
  datastore cost envelope.
- Finite serverless job progression is not visitor polling: Translation Admin
  may advance a queued job through bounded chunks after an explicit staff
  action. Even then, enforce a hard request budget, stop if the queue does not
  shrink, surface recovery guidance, and cover both limits with tests.

## Translation Provider Batching
- A provider's advertised context/output ceiling is a capability, not LOTTO's
  normal request budget. Keep the two settings separate. Translation requests
  default to an adaptive 8,192-token output budget and must not exceed LOTTO's
  16,384-token application ceiling without a reviewed architecture change.
- Translate compatible rows in bounded structured batches (currently 100 rows
  with one target language and content type), preserving stable row ids. Reject
  the whole response before writing if any expected id is missing, duplicated,
  changed, or invented.
- Commit a validated provider response with one bulk store operation while
  preserving row-level token/cost metadata. Do not turn database writes back
  into one operation per string.
- A structured-response validation failure may split once to isolate a bad
  batch. Authentication, quota, HTTP, and network failures must not recursively
  retry. Test provider-call and store-write counts, not just final text.

## Documentation Priority
- Documentation is a first-class requirement for this repo.
- Any feature implementation or behavior change must update docs to reflect the current state.
- New features should have comprehensive implementation planning documented before major coding begins.
- `docs/GAME.md` and `docs/V2.0_PLANNED_FEATURES.md` should be kept aligned with live Arcade behavior and planned scope.
- `docs/TRANSLATION_AI_FEED_PARITY.md` should be kept aligned with the live
  Translation AI implementation and any approved FEED deviations.
- `CHANGELOG.md` must capture both implementation changes and significant documentation updates.
- **Any feature or change that alters a user-facing interaction or workflow
  (new screen, new control, changed flow, changed copy that changes meaning)
  must also update the relevant guide(s) in `docs/user-guides/`** — not just
  `CHANGELOG.md`/`docs/ISSUES.md`. Those two capture *what changed and why* for
  developers; `docs/user-guides/` is what staff actually read in the app's
  searchable Help section (`/help`), and it does not update itself. Add a new
  `NN-slug.md` guide for a new surface, or add/revise a section in an existing
  guide for a changed one, in the same change that ships the feature — do not
  defer it. See `docs/HELP_SYSTEM.md` for authoring conventions and
  `docs/V2.0_PLANNED_FEATURES.md` Feature 7 for the backlog this rule exists to
  prevent recurring.

## Arcade Guardrails
- Keep Arcade explicitly separated from raffle/display features in both code and UX.
- Do not integrate Arcade gameplay into `/` or `src/components/readonly-display.tsx`.
- Do not reuse raffle-specific UI/state concepts for Arcade (ticket cards, queue legends, raffle statuses).
- Arcade visuals should use simple pixel-art direction with Arcade-specific components.
- Place Arcade routes under `src/app/(arcade)/arcade/*`.
- Keep existing raffle/admin/login/staff routes under `src/app/(core)/*` as work progresses.
- Place Arcade feature code under `src/arcade/*` (`components`, `ui`, `game`, `hooks`, `lib`, `types`, `styles`).
- Scope Arcade styles to Arcade route/layout files; avoid broad global theme changes in `src/app/globals.css`.
- If using 8bitcn, install and consume it in an Arcade-only scope; do not overwrite global `theme-provider` or shared app theming.

## Dependency Security (check at session start)
- **Run `npm audit --omit=dev` at the start of every agent session** and report
  the counts before proposing work. This repo has no CI audit and no Dependabot
  by deliberate choice; that check is a human/agent responsibility, not an
  automated one. `--omit=dev` matters: dev-only advisories are noise here.
- Triage advisories by **whether the fix changes the client bundle**, not by
  CVSS score alone. That is the axis that actually carries risk in this repo:
  - *Server-only* (`sharp`, `nodemailer`, `@auth/pg-adapter`, API/route code,
    `src/proxy.ts`): safe to patch and ship normally. A semver-major here is
    usually lower risk than a patch bump that reaches the browser.
  - *Client bundle* (`next`, `next-auth` via `next-auth/react`, `react`,
    `tiptap`, `motion`, any markdown/regex-adjacent library): treat as a
    legacy-compatibility change first and a security change second. See
    `docs/BROWSER_SUPPORT.md`.
- **Never bump a client-bundle dependency without real-device validation.** The
  declared floor is iPadOS/iOS 15 (staff run a 2015 iPad mini 4 stuck on
  iPadOS 15.8). `browserslist` does not protect against this: SWC downlevels
  syntax and core-js polyfills APIs, but a **regex literal ships verbatim** and
  parse-fails the whole chunk, aborting hydration — the page renders but is not
  interactive, with no error page and no 500. A dependency bump caused exactly
  this outage once (`remark-gfm` lookbehind; see `docs/ISSUES.md`).
  Required sequence: build → `npm run check:legacy-bundles` →
  `npm run smoke:legacy` → deploy to a **preview** off `dev` → open the preview
  on the real iPad and confirm sign-in works → only then promote.
  `check:legacy-bundles` only knows the patterns it already knows; a green scan
  is necessary, not sufficient. The device test is the real gate.
- When a change is expected to be server-only, **prove it**: diff the built
  `.next/static/chunks` filenames/hashes before and after. An unchanged bundle
  is evidence the iPad is unaffected; a changed one means device validation.
- **Clean up after any production build.** `check:legacy-bundles` and
  `smoke:legacy` both require `npm run build`, which leaves a production tree in
  `.next` that `npm run dev` cannot use — the dev server fails with `ENOENT` on
  `.next/dev/routes-manifest.json`. Run `rm -rf .next` before returning to dev.
  Likewise, `npm start` renames its process to `next-server`, so
  `pkill -f "next start"` does **not** stop it and it keeps holding port 3000;
  match on `next-server` or kill the PID from
  `lsof -nP -iTCP:3000 -sTCP:LISTEN`.
- Keep developer tooling out of `dependencies`. Shipping a dev-only CLI as a
  production dependency drags its whole tree into audit scope and the deploy
  (`react-email`, the preview CLI, once accounted for 7 of 16 advisories on its
  own; the runtime library is `@react-email/components`).
- `next-auth` must stay **pinned exactly** (no `^`/`~`) — enforced by
  `tests/security-nextauth-pin.test.ts`. It is on the `5.0.0-beta` channel and
  will keep producing advisories; bumping it is a client-bundle change that
  lands on `/login`.
- Authorization is enforced in `src/proxy.ts`. Gated API routes rely on it, so
  prefer `!session?.user` over `!session` (an errored auth object is truthy)
  and keep in-route checks as defense in depth rather than trusting one gate.

## Legacy Device Testing (iPadOS 15 floor)
- Staff run a 2015 iPad mini 4 capped at iPadOS 15.8, bought deliberately cheap
  because nonprofit budgets are tight. Treat the iOS 15 floor as a product
  requirement, not legacy debt — the replacement will be min-spec too.
- Simulate it with an **iPad mini 4 on the iOS 15.4 runtime**
  (`xcrun simctl create "LOTTO-iPadMini4-iOS15"
  com.apple.CoreSimulator.SimDeviceType.iPad-mini-4
  com.apple.CoreSimulator.SimRuntime.iOS-15-4`). Device *model* is cosmetic; the
  **runtime** is what matters, because a hydration failure is decided by
  JavaScriptCore's version. 15.4 is slightly older than the deployed 15.8, which
  errs in the safe direction.
- A newer simulator (iPadOS 17/18) is fine for layout, touch, and logic, but
  **proves nothing about the floor** — it has lookbehind, the regex `v` flag,
  `Object.groupBy`, and `Promise.withResolvers`. Never read a green modern-iPad
  run as "safe to ship".

### Three testing tiers
1. **Iterate** — `npm run dev`, loaded on the iOS 15.4 simulator. Works because
   of the dev-only WebSocket shim in `src/app/layout.tsx` (see below). Hot
   reload does *not* work on that engine; edits need a manual refresh.
2. **Verify** — `npm run build` then `npm run check:legacy-bundles`, and load
   the built app on the 15.4 simulator. This is the tier that catches the
   Issue 5 class of bug, because tier 1 does not exercise the downleveled,
   minified bundle that actually ships. **Then `rm -rf .next`**, or the next
   `npm run dev` dies on a missing `.next/dev/routes-manifest.json`.
3. **Final** — a Vercel preview. Real environment and real auth, so it is the
   only tier where `/admin` is reachable; locally the proxy gate redirects to
   `/login` with no session.

### The dev-mode WebSocket shim — do not remove
- iOS/iPadOS 15 Safari refuses the Next.js HMR WebSocket with a `SecurityError`
  ("The operation is insecure"). Next constructs that socket inside its async
  `appBootstrap`, so the synchronous throw becomes an **unhandled rejection that
  aborts bootstrap before `hydrateRoot`**. The page server-renders, no handlers
  attach, and no client effect ever fires.
- The symptom is indistinguishable from the Issue 5 outage: the app paints, then
  sits forever on `Loading state from datastore…` with dead theme/language
  switches. Do not go hunting for an app bug or a missing polyfill — check
  whether the shim is present first.
- The shim wraps `window.WebSocket` so construction cannot throw, returning an
  inert stub instead. Bootstrap completes, the app hydrates, and the only loss
  is hot reload on that engine. It is gated on
  `process.env.NODE_ENV === "development"`, and a controlled build comparison
  confirmed **all 48 production chunks byte-identical with and without it**.
- Safari's `NSURLSession WebSocket` experimental toggle does **not** fix this;
  it was investigated and ruled out. Do not re-litigate it.

### Diagnosing hydration failures on old WebKit
- Static-grepping the bundle for "modern syntax" is a poor first move — matches
  land in comments and CSS strings and send you chasing ghosts. Get the real
  exception instead: add a temporary inline `<script>` in the layout `<head>`
  that forwards `error` and `unhandledrejection` (message **and** stack) to a
  URL the dev server logs, then read the server log.
- **Make the device under test the only client.** A desktop browser left open on
  the same port produces the very requests you are looking for, and will fool
  you into declaring a fix that does not work.
- Confirm a fix **on the device screen**, not from server-log traffic. The
  reliable tell on `/admin` is the `Loading state from datastore…` spinner being
  replaced by the green *Persistence confirmed* card, because that value only
  arrives through a `useEffect` that runs after hydration.

## Deploy and Branching
- Production is the Vercel project for `williamtemple.app`.
- Use `dev` for staging/testing unless directed otherwise.

## Agent Workflow (Adapted Commandments)
1. State whether changes are WITHIN existing patterns or AGAINST them. If
   against, discuss options and rationale before editing.
2. Explore the repo before editing: use `rg --files`, `rg`, `ls`, `sed -n`,
   and read relevant files. Do not assume paths or behavior.
3. Verify destination paths exist before editing. Create directories with
   `mkdir -p` before adding new files.
4. Read existing files fully before editing. For related files, open all of
   them before making changes.
5. Prefer line-based edits with `apply_patch` for existing files. Avoid full
   rewrites unless necessary.
6. Never use placeholders; write complete code and configs.
7. Update `CHANGELOG.md` and other docs with line-based edits; do not overwrite.
8. Discuss major architecture, dependency, or framework changes before acting.
9. If you need the user to run commands, provide the absolute path and exact
   command, then wait for their output before proceeding.
10. Avoid destructive git commands; do not revert unrelated changes. Check
    `git status` and work with the current state.
11. Prefer `rg` over `grep` for search.
12. Treat documentation updates as mandatory deliverables: keep current-state docs accurate and maintain detailed implementation plans before building major features.

## Testing
Run relevant tests when changing behavior. If tests are skipped, say why and
suggest how to validate.

**Known flake pattern — full-suite-only test failures.** If a test fails only
under the full `npm test` run but passes when run alone
(`npx vitest run <file>`), do not assume the test is broken, stale, or
asserting outdated behavior. Reproduce first: run the file in isolation, then
re-run the full suite once more with no changes. If it passes both times, it
is very likely Vitest worker-pool timing/resource contention, not a logic
bug — document it (see `docs/ISSUES.md` Issue 27 for a worked example) and
leave the test as-is. Only change a test's assertions, add `waitFor` guards,
or reduce worker parallelism if the failure **reproduces** or **recurs**, not
from a single occurrence. This matters especially for tests whose name/intent
overlaps with an abandoned design decision (e.g. Issue 27 concerned RTL grid
layout, which LOTTO used to reverse and later deliberately made static/LTR) —
a superficial read can make a correct regression test look stale when it is
actually guarding the current, intended behavior. Read the assertions before
concluding either way.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
