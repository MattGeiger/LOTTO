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
