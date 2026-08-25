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
