-- Arcade high-score schema for a separate Neon project/database.
--
-- This file is intentionally separate from schema.sql. Run it only against the
-- isolated Arcade Neon database, then set Vercel's ARCADE_DATABASE_URL to a
-- least-privilege runtime role for this database. Do not use the core LOTTO
-- DATABASE_URL for Arcade high scores.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS arcade_high_scores (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  game_slug TEXT NOT NULL CHECK (game_slug IN ('snake', 'brick-mayhem', 'zombie-attack')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('veryEasy', 'easy', 'normal', 'hard', 'veryHard', 'nightmare')),
  initials TEXT NOT NULL CHECK (char_length(initials) BETWEEN 1 AND 24),
  score BIGINT NOT NULL CHECK (score BETWEEN 1 AND 999999999),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS arcade_high_scores_rank_idx
  ON arcade_high_scores(game_slug, difficulty, score DESC, created_at ASC, id ASC);

-- Least-privilege runtime role setup.
-- Replace arcade_scores_runtime and the password with your preferred values.
-- If your Neon SQL editor is connected as the database owner, run:
--
-- CREATE ROLE arcade_scores_runtime LOGIN PASSWORD '<replace-with-strong-password>';
-- REVOKE ALL ON arcade_high_scores FROM PUBLIC;
-- GRANT USAGE ON SCHEMA public TO arcade_scores_runtime;
-- GRANT SELECT, INSERT ON arcade_high_scores TO arcade_scores_runtime;
--
-- Then build ARCADE_DATABASE_URL from that role's connection string.
