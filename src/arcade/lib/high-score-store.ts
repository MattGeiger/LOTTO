import { neon } from "@neondatabase/serverless";

import {
  ARCADE_HIGH_SCORE_LIMIT,
  type ArcadeHighScoreEntry,
  type ArcadeHighScoreScope,
  type ArcadeHighScoreSubmission,
  type ArcadeHighScoreSubmitResult,
  normalizeInitials,
  scoreQualifies,
} from "./high-score-types";

type ArcadeHighScoreRow = {
  id: string;
  game_slug: string;
  difficulty: string;
  initials: string;
  score: string | number;
  created_at: string | Date;
};

export class ArcadeHighScoreUnavailableError extends Error {
  constructor(message = "Arcade high scores are unavailable.") {
    super(message);
    this.name = "ArcadeHighScoreUnavailableError";
  }
}

export function isArcadeHighScoreUnavailable(error: unknown): error is ArcadeHighScoreUnavailableError {
  return error instanceof ArcadeHighScoreUnavailableError;
}

export type ArcadeHighScoreStore = {
  listTopScores: (scope: ArcadeHighScoreScope) => Promise<ArcadeHighScoreEntry[]>;
  submitScore: (submission: ArcadeHighScoreSubmission) => Promise<ArcadeHighScoreSubmitResult>;
};

const rowToEntry = (row: ArcadeHighScoreRow): ArcadeHighScoreEntry => ({
  id: row.id,
  game: row.game_slug as ArcadeHighScoreEntry["game"],
  difficulty: row.difficulty as ArcadeHighScoreEntry["difficulty"],
  initials: row.initials,
  score: Number(row.score),
  createdAt:
    row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString(),
});

export function createArcadeHighScoreStore(
  databaseUrl = process.env.ARCADE_DATABASE_URL,
): ArcadeHighScoreStore {
  if (!databaseUrl) {
    const unavailable = async (): Promise<never> => {
      throw new ArcadeHighScoreUnavailableError("ARCADE_DATABASE_URL is not configured.");
    };
    return {
      listTopScores: unavailable,
      submitScore: unavailable,
    };
  }

  const sql = neon(databaseUrl);
  const withTimeout = async <T>(promise: Promise<T>) => {
    const timeoutMs = Number(process.env.ARCADE_DATABASE_TIMEOUT_MS ?? "5000");
    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new ArcadeHighScoreUnavailableError(`Arcade database request timed out after ${timeoutMs}ms.`)),
        timeoutMs,
      );
    });

    return Promise.race([promise, timeoutPromise])
      .catch((error) => {
        if (isArcadeHighScoreUnavailable(error)) throw error;
        throw new ArcadeHighScoreUnavailableError("Arcade database request failed.");
      })
      .finally(() => {
        if (timer) clearTimeout(timer);
      });
  };

  const listTopScores = async (scope: ArcadeHighScoreScope): Promise<ArcadeHighScoreEntry[]> => {
    const rows = await withTimeout(sql`
      select id, game_slug, difficulty, initials, score, created_at
      from arcade_high_scores
      where game_slug = ${scope.game}
        and difficulty = ${scope.difficulty}
      order by score desc, created_at asc, id asc
      limit ${ARCADE_HIGH_SCORE_LIMIT};
    `) as ArcadeHighScoreRow[];

    return rows.map(rowToEntry);
  };

  const submitScore = async (
    submission: ArcadeHighScoreSubmission,
  ): Promise<ArcadeHighScoreSubmitResult> => {
    const scores = await listTopScores(submission);
    if (!scoreQualifies(submission.score, scores)) {
      return { accepted: false, scores };
    }

    const normalizedInitials = normalizeInitials(submission.initials);
    const rows = await withTimeout(sql`
      insert into arcade_high_scores (game_slug, difficulty, initials, score)
      values (${submission.game}, ${submission.difficulty}, ${normalizedInitials}, ${submission.score})
      returning id, game_slug, difficulty, initials, score, created_at;
    `) as ArcadeHighScoreRow[];
    const entry = rows[0] ? rowToEntry(rows[0]) : undefined;
    const updatedScores = await listTopScores(submission);

    return {
      accepted: Boolean(entry),
      entry,
      scores: updatedScores,
    };
  };

  return { listTopScores, submitScore };
}

let cachedUrl: string | undefined;
let cachedStore: ArcadeHighScoreStore | null = null;

export function getArcadeHighScoreStore(): ArcadeHighScoreStore {
  const databaseUrl = process.env.ARCADE_DATABASE_URL;
  if (!cachedStore || cachedUrl !== databaseUrl) {
    cachedStore = createArcadeHighScoreStore(databaseUrl);
    cachedUrl = databaseUrl;
  }
  return cachedStore;
}
