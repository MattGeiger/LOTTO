// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ArcadeHighScoreUnavailableError, createArcadeHighScoreStore } from "@/arcade/lib/high-score-store";

let mockQueryResults: unknown[];

const mockSql = vi.fn(async () => {
  return mockQueryResults.shift() ?? [];
}) as unknown as ReturnType<typeof import("@neondatabase/serverless").neon>;

vi.mock("@neondatabase/serverless", () => ({
  neon: vi.fn(() => mockSql),
}));

const row = (score: number, index: number) => ({
  id: `row-${index}`,
  game_slug: "snake",
  difficulty: "normal",
  initials: "AAA",
  score,
  created_at: new Date(2026, 0, index + 1).toISOString(),
});

describe("createArcadeHighScoreStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryResults = [];
  });

  it("lists the top scores for one game and difficulty", async () => {
    mockQueryResults.push([row(300, 0), row(200, 1)]);
    const store = createArcadeHighScoreStore("postgresql://arcade:test@localhost/db");

    const scores = await store.listTopScores({ game: "snake", difficulty: "normal" });

    expect(scores.map((score) => score.score)).toEqual([300, 200]);
    expect(mockSql).toHaveBeenCalledWith(expect.any(Array), "snake", "normal", 10);
  });

  it("scopes rankings by game and difficulty with deterministic tie ordering", async () => {
    mockQueryResults.push([{
      id: "brick-hard-tie",
      game_slug: "brick-mayhem",
      difficulty: "hard",
      initials: "TIE",
      score: 400,
      created_at: new Date(2026, 0, 1).toISOString(),
    }]);
    const store = createArcadeHighScoreStore("postgresql://arcade:test@localhost/db");

    const scores = await store.listTopScores({ game: "brick-mayhem", difficulty: "hard" });

    expect(scores[0]).toMatchObject({
      game: "brick-mayhem",
      difficulty: "hard",
      score: 400,
    });
    expect(mockSql).toHaveBeenCalledWith(expect.any(Array), "brick-mayhem", "hard", 10);
    expect(String(mockSql.mock.calls[0]?.[0])).toContain("order by score desc, created_at asc, id asc");
  });

  it("inserts only when the score qualifies", async () => {
    mockQueryResults.push(
      [row(300, 0), row(200, 1)],
      [{
        id: "new-score",
        game_slug: "snake",
        difficulty: "normal",
        initials: "MNG",
        score: 250,
        created_at: new Date(2026, 0, 3).toISOString(),
      }],
      [row(300, 0), row(250, 2), row(200, 1)],
    );
    const store = createArcadeHighScoreStore("postgresql://arcade:test@localhost/db");

    const result = await store.submitScore({
      game: "snake",
      difficulty: "normal",
      initials: "mng",
      score: 250,
    });

    expect(result.accepted).toBe(true);
    expect(result.entry?.initials).toBe("MNG");
    expect(result.scores.map((score) => score.score)).toEqual([300, 250, 200]);
    expect(mockSql).toHaveBeenCalledTimes(3);
  });

  it("does not insert when the score misses a full top ten", async () => {
    mockQueryResults.push(Array.from({ length: 10 }, (_, index) => row(100 - index, index)));
    const store = createArcadeHighScoreStore("postgresql://arcade:test@localhost/db");

    const result = await store.submitScore({
      game: "snake",
      difficulty: "normal",
      initials: "AAA",
      score: 91,
    });

    expect(result.accepted).toBe(false);
    expect(mockSql).toHaveBeenCalledTimes(1);
  });

  it("throws an unavailable error when the arcade database is missing or failing", async () => {
    const missing = createArcadeHighScoreStore("");
    await expect(missing.listTopScores({ game: "snake", difficulty: "normal" }))
      .rejects.toThrow(ArcadeHighScoreUnavailableError);

    vi.mocked(mockSql).mockRejectedValueOnce(new Error("connection failed"));
    const failing = createArcadeHighScoreStore("postgresql://arcade:test@localhost/db");
    await expect(failing.listTopScores({ game: "snake", difficulty: "normal" }))
      .rejects.toThrow(ArcadeHighScoreUnavailableError);
  });
});
