// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

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

  it("keeps Memory Grid initials entry open after an hour without timer or repeated reads", async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockImplementation(async () => new Response(JSON.stringify({ scores: [] })));
    renderPanel({ game: "memory-grid", difficulty: "easy", status: "GAME_OVER", score: 1667, entryTimeLimitSeconds: null });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(screen.getByLabelText("3 INITIALS")).toBeEnabled();
    expect(screen.queryByText(/LEFT|EXPIRED/)).not.toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(3600_000); });
    fireEvent.change(screen.getByLabelText("3 INITIALS"), { target: { value: "ABC" } });
    expect(screen.getByRole("button", { name: "SAVE" })).toBeEnabled();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("adds the overlay variant class only when requested", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ scores: [] }), { status: 200 }));

    const view = renderPanel();
    expect(await screen.findByTestId("arcade-high-scores")).not.toHaveClass("arcade-high-scores-overlay");

    view.rerender(
      <LanguageProvider>
        <ArcadeHighScores
          game="snake"
          difficulty="normal"
          score={120}
          status="READY"
          variant="overlay"
        />
      </LanguageProvider>,
    );
    expect(screen.getByTestId("arcade-high-scores")).toHaveClass("arcade-high-scores-overlay");
  });
  it("offers untimed entry for a Hanoi perfect-score tie on a full board", async () => {
    const scores = Array.from({ length: 10 }, (_, i) => ({ ...scoreRow, id: `perfect-${i}`, game: "tower-of-hanoi", score: 2000 }));
    vi.mocked(fetch).mockImplementation(async () => new Response(JSON.stringify({ scores })));
    renderPanel({ game: "tower-of-hanoi", difficulty: "easy", status: "GAME_OVER", score: 2000, entryTimeLimitSeconds: null });
    expect(await screen.findByLabelText("3 INITIALS")).toBeEnabled();
    expect(screen.queryByText(/LEFT|EXPIRED/)).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
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
