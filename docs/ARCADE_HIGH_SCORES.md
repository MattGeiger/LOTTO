# Arcade High Scores

## Status
- Implemented for v1.15.0 as an Arcade-only feature.
- Supports Snake, Brick Mayhem, and Day of the Dead.
- Rankings are scoped by game and difficulty setting.
- Day of the Dead remains wired for high scores but is hidden from production
  Arcade navigation as of v1.15.1.

## Data Boundary
Arcade high scores must use a separate Neon project/database from the core LOTTO
queue database. The app reads the leaderboard connection from
`ARCADE_DATABASE_URL`; the existing `DATABASE_URL` remains reserved for queue
management, auth, raffle state, snapshots, and settings.

The public high-score API never imports or writes `/api/state` or raffle state
managers. If the Arcade database is missing or unavailable, the leaderboard UI
fails closed with an unavailable message while core LOTTO routes continue to
operate normally.

## Schema and Permissions
Run `schema.arcade.sql` against the isolated Arcade Neon database. It creates:

- `arcade_high_scores`
- A per-scope ranking index on game, difficulty, score, created time, and id
- Example SQL for a least-privilege runtime role

The runtime role used in `ARCADE_DATABASE_URL` should only have:

- `USAGE` on the `public` schema
- `SELECT` and `INSERT` on `arcade_high_scores`

Do not grant the Arcade runtime role access to the core LOTTO database or to
queue/auth tables.

## API
`GET /api/arcade/high-scores?game=<slug>&difficulty=<key>`

- Returns `{ scores }`.
- On missing/down Arcade DB, returns `{ scores: [], unavailable: true }`.

`POST /api/arcade/high-scores`

- Body: `{ game, difficulty, initials, score }`.
- Inserts only when the submitted score qualifies for that game + difficulty Top 10.
- Returns `{ accepted, entry?, scores }`.
- Public write route with server-side allowlists, initials validation, score bounds,
  and per-IP rate limiting.

Valid games: `snake`, `brick-mayhem`, `zombie-attack`.

Valid difficulties: `veryEasy`, `easy`, `normal`, `hard`, `veryHard`,
`nightmare`.

## Initials
Initials are exactly three user-visible letter graphemes. The client and server
normalize to NFC and uppercase where applicable. English, Spanish, Vietnamese,
Russian, Ukrainian, Chinese, Arabic, and Persian entries are supported. There is
no profanity denylist.

## UI Behavior
- `TOP 10 SCORES` appears before a game starts and at `GAME OVER`.
- Active gameplay keeps the board unobstructed.
- A qualifying final score opens a 30-second initials entry flow.
- Mixed-difficulty runs are allowed; a score is submitted under the difficulty
  setting active at `GAME OVER`.
