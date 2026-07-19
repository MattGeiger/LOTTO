Original prompt: PLEASE IMPLEMENT THIS PLAN: Arcade Top 10 Scores With Isolated Neon DB (v1.15.0)

## Progress
- Started implementation on `main`; repo was clean except untracked `.claude/`.
- Using isolated Arcade persistence through `ARCADE_DATABASE_URL`, not core `DATABASE_URL`.
- Added shared high-score validation/types, isolated Neon store, public `/api/arcade/high-scores`, `schema.arcade.sql`, shared leaderboard UI, and initial tests.
- Added focused store, API, component, and page integration tests for ranking, validation, rate limiting, DB unavailable behavior, multilingual initials, and all three Arcade pages.
- Validation completed with `npm test`, `npm run lint`, `npm run build`, `git diff --check`, and browser spot-checks of the Arcade routes.
- Follow-up v1.15.1 change: Day of the Dead remains in the codebase, but it is
  hidden from the Arcade menu and production `/arcade/zombie-attack` requests
  redirect to `/arcade`.

## Notes
- Keep `.claude/` untouched.
- Fixed the prior full-lint blocker in `tests/state-manager-db.test.ts`.

## Follow-up task: St. Johns Arcade palette (2026-07-18)

Original prompt: "Next, let's enhance the color story of the Arcade to more
closely align with the St Johns Food Share branding. I've attached a pair of
mockups for what I have in mind."

- Kept the change within the isolated Arcade route/style boundary.
- Added St. Johns light/dark `--arcade-*` profile overrides while preserving
  the existing unqualified William Temple House palette.
- Tokenized previously embedded menu/banner/grid/game-chrome decorative colors
  so deployment profiles do not leak the default blue/pink/yellow treatment.
- Added brand-profile regression coverage and updated branding/design docs.
- Validation complete: focused branding tests, ESLint, the full 648-test suite,
  light/dark web-game client screenshots, computed-style checks, and in-app
  browser console review all passed. The first full-suite run reproduced the
  documented RTL worker-pool flake; its file passed alone and the unchanged
  full suite passed on the required rerun.
