# Arcade High Scores

## Status
- Implemented for v1.15.0 as an Arcade-only feature.
- Supports Snake, Brick Mayhem, and Day of the Dead.
- Rankings are scoped by game and difficulty setting.
- Day of the Dead remains wired for high scores but is hidden from production
  Arcade navigation as of v1.15.1.
- As of v1.15.3 the leaderboard renders as an on-board arcade-cabinet screen
  (attract table + unified game-over screen) rather than a separate panel below
  the board.
- An optional Pride-month tribute seed (`seed.arcade-high-scores.sql`) was added
  in v1.15.4.

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

## Seeding (optional)
`seed.arcade-high-scores.sql` preloads each game/difficulty Top 10 with a
Pride-month tribute roster of civil rights icons and LGBTQ+, queer, trans,
Two-Spirit, and nonbinary activists (three-letter monograms), echoing the way
real arcade cabinets ship with preloaded scores.

- Run it only against the isolated Arcade database, e.g.
  `psql "$ARCADE_DATABASE_URL" -f seed.arcade-high-scores.sql`, or paste the
  `BEGIN … COMMIT` block into the Neon SQL editor (omit the `psql` line there).
- It is idempotent: it first deletes its own prior rows — identified by the
  historical `2025-06-01` marker timestamp, which no live submission can have —
  then re-inserts a clean set, so it never duplicates and never disturbs real
  player scores.
- Remove the tribute later with
  `DELETE FROM arcade_high_scores WHERE created_at = TIMESTAMPTZ '2025-06-01 00:00:00+00';`
- Real qualifying scores naturally push the seeded entries down and off each
  board over time.

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
The leaderboard renders on the play area itself as an arcade-cabinet screen
(shared `ArcadeHighScores` component, `variant="overlay"`), so the board reads
like a real cabinet rather than a detached status panel.

- **Attract (READY):** before the first serve, the board shows `TOP 10 SCORES`
  over the dimmed scene with a blinking `PLAY NOW` hint.
- **Game over:** a single unified screen shows `GAME OVER` + the final score,
  the Top 10, the initials-entry form (when qualifying), and an explicit
  `TAP HERE TO PLAY AGAIN` button.
- **Active gameplay keeps the board unobstructed** — the cabinet screen is
  hidden while running/paused.
- **Brick Mayhem** returns to `READY` between lives and levels; the attract
  leaderboard is shown only on the pristine first serve and at game over, so the
  playfield stays clear for the next serve.
- The leaderboard is intentionally prominent: the #1 score renders as a larger
  champion row, and a newly saved score is highlighted after game over.
- A qualifying final score opens a 30-second initials entry flow.
- Restart safety: only the explicit replay button (or the keyboard restart key)
  restarts a run — tapping elsewhere on the board does not — so the initials
  input stays usable. The boards are not `role="img"`, keeping the input
  reachable to assistive tech.
- Mixed-difficulty runs are allowed; a score is submitted under the difficulty
  setting active at `GAME OVER`.
