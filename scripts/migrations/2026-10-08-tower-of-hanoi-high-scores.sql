-- Only the named agency's isolated Arcade database; preserve scores and grants.
BEGIN;
ALTER TABLE arcade_high_scores DROP CONSTRAINT IF EXISTS arcade_high_scores_game_slug_check;
ALTER TABLE arcade_high_scores ADD CONSTRAINT arcade_high_scores_game_slug_check
  CHECK (game_slug IN ('snake', 'brick-mayhem', 'zombie-attack', 'memory-grid', 'tower-of-hanoi'));
COMMIT;
