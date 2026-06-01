import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ArcadeHighScoreEntry } from "@/arcade/lib/high-score-types";

const mockStore = {
  listTopScores: vi.fn(),
  submitScore: vi.fn(),
};

class MockUnavailableError extends Error {
  constructor() {
    super("unavailable");
    this.name = "ArcadeHighScoreUnavailableError";
  }
}

vi.mock("@/arcade/lib/high-score-store", () => ({
  getArcadeHighScoreStore: () => mockStore,
  isArcadeHighScoreUnavailable: (error: unknown) =>
    error instanceof MockUnavailableError || (error as { name?: string })?.name === "ArcadeHighScoreUnavailableError",
}));

const scoreRow: ArcadeHighScoreEntry = {
  id: "score-1",
  game: "snake",
  difficulty: "normal",
  initials: "MNG",
  score: 120,
  createdAt: new Date(2026, 0, 1).toISOString(),
};

const getRequest = (url = "http://localhost:3000/api/arcade/high-scores?game=snake&difficulty=normal") =>
  new Request(url, { headers: { "x-forwarded-for": "203.0.113.10" } });

const postRequest = (body: Record<string, unknown>, ip = "203.0.113.11") =>
  new Request("http://localhost:3000/api/arcade/high-scores", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });

const rawPostRequest = (body: BodyInit, ip = "203.0.113.13") =>
  new Request("http://localhost:3000/api/arcade/high-scores", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body,
  });

describe("API /api/arcade/high-scores", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const route = await import("@/app/api/arcade/high-scores/route");
    route.__resetArcadeHighScoreRateLimitForTests();
  });

  it("returns top scores for a valid scope", async () => {
    mockStore.listTopScores.mockResolvedValueOnce([scoreRow]);
    const { GET } = await import("@/app/api/arcade/high-scores/route");

    const response = await GET(getRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ scores: [scoreRow] });
    expect(mockStore.listTopScores).toHaveBeenCalledWith({ game: "snake", difficulty: "normal" });
  });

  it("rejects unsupported scopes", async () => {
    const { GET } = await import("@/app/api/arcade/high-scores/route");

    const response = await GET(getRequest("http://localhost:3000/api/arcade/high-scores?game=raffle&difficulty=normal"));

    expect(response.status).toBe(400);

    const difficultyResponse = await GET(getRequest("http://localhost:3000/api/arcade/high-scores?game=snake&difficulty=extreme"));
    expect(difficultyResponse.status).toBe(400);
  });

  it("normalizes and submits a qualifying score", async () => {
    mockStore.submitScore.mockResolvedValueOnce({ accepted: true, entry: scoreRow, scores: [scoreRow] });
    const { POST } = await import("@/app/api/arcade/high-scores/route");

    const response = await POST(postRequest({
      game: "snake",
      difficulty: "normal",
      initials: "mng",
      score: 120,
    }));

    expect(response.status).toBe(200);
    expect(mockStore.submitScore).toHaveBeenCalledWith({
      game: "snake",
      difficulty: "normal",
      initials: "MNG",
      score: 120,
    });
    expect(await response.json()).toEqual({ accepted: true, entry: scoreRow, scores: [scoreRow] });
  });

  it("returns updated scores for a non-qualifying valid submission", async () => {
    mockStore.submitScore.mockResolvedValueOnce({ accepted: false, scores: [scoreRow] });
    const { POST } = await import("@/app/api/arcade/high-scores/route");

    const response = await POST(postRequest({
      game: "snake",
      difficulty: "normal",
      initials: "AAA",
      score: 10,
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ accepted: false, scores: [scoreRow] });
  });

  it("rejects invalid initials and malformed scores", async () => {
    const { POST } = await import("@/app/api/arcade/high-scores/route");

    expect((await POST(rawPostRequest("{"))).status).toBe(400);
    expect((await POST(postRequest({
      game: "snake",
      difficulty: "normal",
      initials: "A1B",
      score: 120,
    }))).status).toBe(400);
    expect((await POST(postRequest({
      game: "snake",
      difficulty: "normal",
      initials: "MNG",
      score: 0,
    }, "203.0.113.12"))).status).toBe(400);
  });

  it("fails gracefully when the arcade database is unavailable", async () => {
    mockStore.listTopScores.mockRejectedValueOnce(new MockUnavailableError());
    mockStore.submitScore.mockRejectedValueOnce(new MockUnavailableError());
    const { GET, POST } = await import("@/app/api/arcade/high-scores/route");

    const getResponse = await GET(getRequest());
    expect(getResponse.status).toBe(200);
    expect(await getResponse.json()).toEqual({ scores: [], unavailable: true });

    const postResponse = await POST(postRequest({
      game: "snake",
      difficulty: "normal",
      initials: "MNG",
      score: 120,
    }));
    expect(postResponse.status).toBe(503);
  });

  it("keeps generic database errors non-leaky", async () => {
    mockStore.listTopScores.mockRejectedValueOnce(new Error("drop table arcade_high_scores"));
    mockStore.submitScore.mockRejectedValueOnce(new Error("drop table arcade_high_scores"));
    const { GET, POST } = await import("@/app/api/arcade/high-scores/route");

    const getResponse = await GET(getRequest());
    expect(getResponse.status).toBe(200);
    expect(await getResponse.json()).toEqual({ scores: [], unavailable: true });

    const postResponse = await POST(postRequest({
      game: "snake",
      difficulty: "normal",
      initials: "MNG",
      score: 120,
    }));
    expect(postResponse.status).toBe(500);
    expect(await postResponse.json()).toEqual({ error: "Unable to save high score. Please try again later." });
  });

  it("rate-limits public score submissions", async () => {
    mockStore.submitScore.mockResolvedValue({ accepted: false, scores: [] });
    const { POST } = await import("@/app/api/arcade/high-scores/route");

    let response = new Response();
    for (let i = 0; i < 31; i += 1) {
      response = await POST(postRequest({
        game: "snake",
        difficulty: "normal",
        initials: "MNG",
        score: 120,
      }, "203.0.113.99"));
    }

    expect(response.status).toBe(429);
  });
});
