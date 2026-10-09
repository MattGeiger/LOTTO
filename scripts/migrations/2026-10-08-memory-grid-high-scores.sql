-- Memory Grid registration; apply only to the isolated Arcade database.
-- Does not alter scores, roles, core LOTTO tables or connection settings.
-- Re-running retains the same allowed game set and all existing rows.
BEGIN;
ALTER TABLE arcade_high_scores DROP CONSTRAINT IF EXISTS arcade_high_scores_game_slug_check;
ALTER TABLE arcade_high_scores ADD CONSTRAINT arcade_high_scores_game_slug_check
  CHECK (game_slug IN ('snake', 'brick-mayhem', 'zombie-attack', 'memory-grid'));
COMMIT;
