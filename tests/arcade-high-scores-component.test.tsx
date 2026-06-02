import type React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ArcadeHighScores } from "@/arcade/components/arcade-high-scores";
import type { ArcadeHighScoreEntry } from "@/arcade/lib/high-score-types";
import { LanguageProvider } from "@/contexts/language-context";

const scoreRow: ArcadeHighScoreEntry = {
  id: "score-1",
  game: "snake",
  difficulty: "normal",
  initials: "MNG",
  score: 120,
  createdAt: new Date(2026, 0, 1).toISOString(),
};

const renderPanel = (props?: Partial<React.ComponentProps<typeof ArcadeHighScores>>) =>
  render(
    <LanguageProvider>
      <ArcadeHighScores
        game="snake"
        difficulty="normal"
        score={120}
        status="READY"
        {...props}
      />
    </LanguageProvider>,
  );

describe("ArcadeHighScores", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders empty and populated leaderboard states", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ scores: [] }), { status: 200 }));
    renderPanel();

    expect(await screen.findByText("NO SCORES YET")).toBeInTheDocument();

    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ scores: [scoreRow] }), { status: 200 }));
    renderPanel({ difficulty: "hard" });

    expect(await screen.findByText("MNG")).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.getByText("MNG").closest("li")).toHaveClass("arcade-high-scores-row-champion");
  });

  it("opens a timed initials entry after a qualifying game-over score", async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ scores: [] }), { status: 200 }));
    renderPanel({ status: "GAME_OVER", score: 120 });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText("NEW TOP 10! ENTER INITIALS")).toBeInTheDocument();
    expect(screen.getByText("30s LEFT")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    expect(screen.getByText("ENTRY TIME EXPIRED")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "SAVE" })).toBeDisabled();
  });

  it("saves multilingual initials and refreshes the leaderboard", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ scores: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ accepted: true, entry: scoreRow, scores: [scoreRow] }), { status: 200 }));
    renderPanel({ status: "GAME_OVER", score: 120 });

    const input = await screen.findByLabelText("3 INITIALS");
    fireEvent.change(input, { target: { value: "王小明" } });
    fireEvent.click(screen.getByRole("button", { name: "SAVE" }));

    await waitFor(() => {
      expect(screen.getByText("SCORE SAVED")).toBeInTheDocument();
    });
    expect(screen.getByText("MNG").closest("li")).toHaveClass("arcade-high-scores-row-saved");
    expect(fetch).toHaveBeenLastCalledWith("/api/arcade/high-scores", expect.objectContaining({
      method: "POST",
    }));
  });
});
