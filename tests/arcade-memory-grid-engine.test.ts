import { afterEach, describe, expect, it, vi } from "vitest";
import { advanceGame, bestStorageKey, completedScore, isRevealed, MISMATCH_MS, PAIR_COUNTS, pauseGame, readBest, readyGame, resumeGame, revealCard, saveBest, startGame } from "@/arcade/game/memory-grid/engine";
import { MEMORY_GRID_STRINGS_EN, MEMORY_GRID_TRANSLATIONS } from "@/arcade/game/memory-grid/strings";
import { UI_STRINGS_EN } from "@/lib/ui-strings";

describe("Memory Grid engine", () => {
  afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });
  it.each(PAIR_COUNTS)("builds exactly two copies of each food for %i pairs", (pairs) => {
    const game = startGame(pairs, () => .5);
    expect(game.cards).toHaveLength(pairs * 2);
    expect(new Set(game.cards.map((card) => card.food)).size).toBe(pairs);
    for (let food = 0; food < pairs; food++) expect(game.cards.filter((card) => card.food === food)).toHaveLength(2);
    expect(readyGame(pairs).cards.every((card) => card.food === -1)).toBe(true);
  });

  it("shuffles reproducibly and rejects invalid random sources", () => {
    expect(startGame(6, () => 0).cards.map((card) => card.food)).toEqual([1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0]);
    for (const value of [-1, 1, NaN, Infinity]) expect(() => startGame(6, () => value)).toThrow(RangeError);
  });

  it("counts a two-card turn, locks a third selection and freezes mismatch time on pause", () => {
    const initial = startGame(6, () => .999);
    const one = revealCard(initial, 0);
    expect(one.turns).toBe(0);
    expect(revealCard(one, 0)).toBe(one);
    expect(revealCard(one, -1)).toBe(one);
    expect(revealCard(one, 1.5)).toBe(one);
    const two = revealCard(one, 1);
    expect(two.turns).toBe(1);
    expect(two.remainingMs).toBe(MISMATCH_MS);
    expect(revealCard(two, 2)).toBe(two);
    const halfway = advanceGame(two, 500);
    const paused = pauseGame(halfway);
    expect(advanceGame(paused, 9999)).toBe(paused);
    expect(revealCard(paused, 2)).toBe(paused);
    expect(isRevealed(paused, 0)).toBe(false);
    const resumed = resumeGame(paused);
    expect(isRevealed(resumed, 0)).toBe(true);
    expect(advanceGame(resumed, 699).selected).toHaveLength(2);
    expect(advanceGame(resumed, 700).selected).toEqual([]);
    expect(advanceGame(resumed, Infinity)).toBe(resumed);
    expect(initial.cards.every((card) => !card.matched)).toBe(true);
    expect(initial.selected).toEqual([]);
  });

  it.each(PAIR_COUNTS)("completes %i pairs in the minimum turns and rejects further play", (pairs) => {
    let game = startGame(pairs, () => .999);
    for (let index = 0; index < pairs; index++) {
      game = revealCard(revealCard(game, index), index + pairs);
      expect(game.matches).toBe(index + 1);
      expect(revealCard(game, index)).toBe(game);
    }
    expect(game.status).toBe("WON");
    expect(game.turns).toBe(pairs);
    expect(game.cards.every((card) => card.matched)).toBe(true);
    expect(revealCard(game, 0)).toBe(game);
    expect(pauseGame(game)).toBe(game);
  });

  it("covers eight locales and includes every English key in dynamic translation sources", () => {
    expect(Object.keys(MEMORY_GRID_TRANSLATIONS).sort()).toEqual(["ar", "en", "es", "fa", "ru", "uk", "vi", "zh"]);
    for (const locale of Object.values(MEMORY_GRID_TRANSLATIONS)) {
      expect(Object.keys(locale)).toEqual(Object.keys(MEMORY_GRID_STRINGS_EN));
      expect(Object.values(locale).every((value) => value.trim().length > 0)).toBe(true);
    }
    for (const [key, value] of Object.entries(MEMORY_GRID_STRINGS_EN)) expect(UI_STRINGS_EN[key]).toBe(value);
  });

  it.each(PAIR_COUNTS)("scores completed %i-pair boards independently of thinking or pause time", (pairs) => {
    let game = startGame(pairs, () => .999);
    expect(completedScore(readyGame(pairs))).toBe(0);
    expect(completedScore(game)).toBe(0);
    for (let index = 0; index < pairs; index++) {
      game = revealCard(game, index);
      game = resumeGame(pauseGame(advanceGame(game, 3600_000)));
      game = revealCard(game, index + pairs);
      if (index < pairs - 1) expect(completedScore(game)).toBe(0);
    }
    expect(completedScore(game)).toBe(2000);
    expect(completedScore(advanceGame(game, 24 * 3600_000))).toBe(2000);
    expect(completedScore({ ...game, turns: pairs * 2 })).toBe(1500);
    expect(completedScore({ ...game, turns: 10_000 })).toBeGreaterThanOrEqual(1000);
    expect(completedScore({ ...game, turns: pairs - 1 })).toBe(0);
    expect(completedScore({ ...game, turns: Infinity })).toBe(0);
    expect(completedScore({ ...game, turns: pairs + .5 })).toBe(0);
    expect(completedScore({ ...game, matches: pairs - 1 })).toBe(0);
  });

  it("awards the agreed rounded efficiency bonus without penalizing completion", () => {
    const finished = { ...readyGame(6), status: "WON" as const, matches: 6, turns: 9 };
    expect(completedScore(finished)).toBe(1667);
    for (let turns = 6; turns < 100; turns++) {
      expect(completedScore({ ...finished, turns })).toBeLessThanOrEqual(2000);
      expect(completedScore({ ...finished, turns })).toBeGreaterThanOrEqual(
        completedScore({ ...finished, turns: turns + 1 }),
      );
    }
  });

  it("ignores corrupt local best values and keeps the fewest completed turns per difficulty", () => {
    for (const invalid of ["", "NaN", "-1", "5", "6.5", "9007199254740992"]) {
      localStorage.setItem(bestStorageKey(6), invalid);
      expect(readBest(6)).toBeNull();
    }
    expect(saveBest(6, 10)).toBe(10);
    expect(saveBest(6, 12)).toBe(10);
    expect(saveBest(6, 8)).toBe(8);
    expect(readBest(8)).toBeNull();
  });

  it("keeps completion usable when browser storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(readBest(6)).toBeNull();
    expect(saveBest(6, 9)).toBe(9);
  });
});
