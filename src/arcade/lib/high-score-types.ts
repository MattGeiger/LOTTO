export const ARCADE_GAME_SLUGS = ["snake", "brick-mayhem", "zombie-attack"] as const;
export const ARCADE_DIFFICULTY_KEYS = [
  "veryEasy",
  "easy",
  "normal",
  "hard",
  "veryHard",
  "nightmare",
] as const;

export const ARCADE_HIGH_SCORE_LIMIT = 10;
export const ARCADE_HIGH_SCORE_MAX_SCORE = 999_999_999;
export const ARCADE_HIGH_SCORE_INITIALS_LENGTH = 3;

export type ArcadeGameSlug = (typeof ARCADE_GAME_SLUGS)[number];
export type ArcadeDifficultyKey = (typeof ARCADE_DIFFICULTY_KEYS)[number];

export type ArcadeHighScoreEntry = {
  id: string;
  game: ArcadeGameSlug;
  difficulty: ArcadeDifficultyKey;
  initials: string;
  score: number;
  createdAt: string;
};

export type ArcadeHighScoreScope = {
  game: ArcadeGameSlug;
  difficulty: ArcadeDifficultyKey;
};

export type ArcadeHighScoreSubmission = ArcadeHighScoreScope & {
  initials: string;
  score: number;
};

export type ArcadeHighScoreSubmitResult = {
  accepted: boolean;
  entry?: ArcadeHighScoreEntry;
  scores: ArcadeHighScoreEntry[];
};

export function isArcadeGameSlug(value: unknown): value is ArcadeGameSlug {
  return typeof value === "string" && ARCADE_GAME_SLUGS.includes(value as ArcadeGameSlug);
}

export function isArcadeDifficultyKey(value: unknown): value is ArcadeDifficultyKey {
  return typeof value === "string" && ARCADE_DIFFICULTY_KEYS.includes(value as ArcadeDifficultyKey);
}

export function segmentInitials(value: string): string[] {
  const normalized = value.normalize("NFC").trim();
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(normalized), (segment) => segment.segment);
  }
  return Array.from(normalized);
}

export function normalizeInitials(value: string): string {
  return segmentInitials(value).join("").toLocaleUpperCase().normalize("NFC");
}

export function trimInitialsToLength(value: string): string {
  return segmentInitials(normalizeInitials(value))
    .slice(0, ARCADE_HIGH_SCORE_INITIALS_LENGTH)
    .join("");
}

export function isValidInitials(value: string): boolean {
  const normalized = normalizeInitials(value);
  const segments = segmentInitials(normalized);
  return (
    segments.length === ARCADE_HIGH_SCORE_INITIALS_LENGTH &&
    segments.every((segment) => /\p{L}/u.test(segment) && /^[\p{L}\p{M}]+$/u.test(segment))
  );
}

export function isValidScore(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value > 0 &&
    value <= ARCADE_HIGH_SCORE_MAX_SCORE
  );
}

export function scoreQualifies(score: number, scores: readonly ArcadeHighScoreEntry[]): boolean {
  if (!isValidScore(score)) return false;
  if (scores.length < ARCADE_HIGH_SCORE_LIMIT) return true;
  const cutoff = scores[ARCADE_HIGH_SCORE_LIMIT - 1];
  return cutoff ? score > cutoff.score : true;
}
