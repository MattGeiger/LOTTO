Original prompt: PLEASE IMPLEMENT THIS PLAN: Arcade Top 10 Scores With Isolated Neon DB (v1.15.0)

## Progress
- Started implementation on `main`; repo was clean except untracked `.claude/`.
- Using isolated Arcade persistence through `ARCADE_DATABASE_URL`, not core `DATABASE_URL`.
- Added shared high-score validation/types, isolated Neon store, public `/api/arcade/high-scores`, `schema.arcade.sql`, shared leaderboard UI, and initial tests.
- Added focused store, API, component, and page integration tests for ranking, validation, rate limiting, DB unavailable behavior, multilingual initials, and all three Arcade pages.
- Validation completed with `npm test`, `npm run lint`, `npm run build`, `git diff --check`, and browser spot-checks of the Arcade routes.

## Notes
- Keep `.claude/` untouched.
- Fixed the prior full-lint blocker in `tests/state-manager-db.test.ts`.
