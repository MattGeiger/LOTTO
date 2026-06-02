-- Pride-month tribute seed for the Arcade Top 10 leaderboards.
--
-- Like a real arcade cabinet ships with preloaded high scores, these initials
-- pay respects — here to civil rights icons and to LGBTQ+, queer, trans,
-- Two-Spirit, and nonbinary activists. 🏳️‍🌈🏳️‍⚧️
--
-- Run ONLY against the isolated Arcade database (ARCADE_DATABASE_URL), the same
-- one that schema.arcade.sql created — never the core LOTTO DATABASE_URL:
--
--   psql "$ARCADE_DATABASE_URL" -f seed.arcade-high-scores.sql
--
-- Or paste it into the Arcade Neon SQL editor. It is idempotent: every run first
-- clears the prior tribute rows (identified by the historical 2025-06-01 marker
-- timestamp, which no live player row can have) and re-inserts a clean set, so
-- it never duplicates and never touches real player scores.
--
-- Each honoree is seeded for all three games and all six difficulties, so the
-- tribute shows no matter which game or setting a player picks. Real qualifying
-- scores naturally push these down and off the board over time.
--
-- Honorees (initials → who):
--   MPJ Marsha P. Johnson · SYR Sylvia Rivera · SDL Stormé DeLarverie
--   HBM Harvey Milk · BYR Bayard Rustin · AUL Audre Lorde · PAM Pauli Murray
--   LEF Leslie Feinberg · GIB Gilbert Baker · MLK Martin Luther King Jr.
--   JAB James Baldwin · BAG Barbara Gittings · FRK Frank Kameny
--   EDW Edie Windsor · LGS Lou Sullivan · KAB Kate Bornstein
--   AVM Alok Vaid-Menon · RAP Rosa Parks · WEW We'wha (Zuni Two-Spirit)
--   JOS José Sarria · DEM Del Martin · PHL Phyllis Lyon · BEH Brenda Howard
--   ESH Essex Hemphill · LAK Larry Kramer · CLJ Cleve Jones · URV Urvashi Vaid

BEGIN;

-- Clear any prior tribute rows so re-running stays clean (seed-only marker date).
DELETE FROM arcade_high_scores
WHERE created_at = TIMESTAMPTZ '2025-06-01 00:00:00+00';

WITH difficulties(difficulty) AS (
  VALUES ('veryEasy'), ('easy'), ('normal'), ('hard'), ('veryHard'), ('nightmare')
),
seed(game_slug, initials, score) AS (
  VALUES
    -- Snake (champion: Marsha P. Johnson)
    ('snake', 'MPJ', 9999),
    ('snake', 'SYR', 8800),
    ('snake', 'SDL', 7700),
    ('snake', 'HBM', 6600),
    ('snake', 'BYR', 5500),
    ('snake', 'AUL', 4400),
    ('snake', 'PAM', 3300),
    ('snake', 'LEF', 2200),
    ('snake', 'GIB', 1100),
    ('snake', 'MLK', 1000),

    -- Brick Mayhem (champion: Sylvia Rivera)
    ('brick-mayhem', 'SYR', 9990),
    ('brick-mayhem', 'MPJ', 8880),
    ('brick-mayhem', 'JAB', 7770),
    ('brick-mayhem', 'BAG', 6660),
    ('brick-mayhem', 'FRK', 5550),
    ('brick-mayhem', 'EDW', 4440),
    ('brick-mayhem', 'LGS', 3330),
    ('brick-mayhem', 'KAB', 2220),
    ('brick-mayhem', 'AVM', 1110),
    ('brick-mayhem', 'RAP', 1000),

    -- Day of the Dead / zombie-attack (champion: Stormé DeLarverie)
    ('zombie-attack', 'SDL', 9909),
    ('zombie-attack', 'WEW', 8808),
    ('zombie-attack', 'JOS', 7707),
    ('zombie-attack', 'DEM', 6606),
    ('zombie-attack', 'PHL', 5505),
    ('zombie-attack', 'BEH', 4404),
    ('zombie-attack', 'ESH', 3303),
    ('zombie-attack', 'LAK', 2202),
    ('zombie-attack', 'CLJ', 1101),
    ('zombie-attack', 'URV', 1000)
)
INSERT INTO arcade_high_scores (game_slug, difficulty, initials, score, created_at)
SELECT s.game_slug, d.difficulty, s.initials, s.score, TIMESTAMPTZ '2025-06-01 00:00:00+00'
FROM seed s
CROSS JOIN difficulties d;

COMMIT;

-- To remove the tribute later (leaving real scores intact):
--   DELETE FROM arcade_high_scores WHERE created_at = TIMESTAMPTZ '2025-06-01 00:00:00+00';
