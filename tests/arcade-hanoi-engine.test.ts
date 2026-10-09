import { beforeEach, describe, expect, it, vi } from "vitest";
import { bestStorageKey, cancelSelection, choosePeg, completedScore, DISK_COUNTS, minimumMoves, pauseGame, readBest, readyGame, resumeGame, saveBest, startGame, undoMove, type DiskCount, type HanoiGame } from "@/arcade/game/tower-of-hanoi/engine";
import { HANOI_STRINGS_EN, HANOI_TRANSLATIONS } from "@/arcade/game/tower-of-hanoi/strings";
import { UI_STRINGS_EN } from "@/lib/ui-strings";

export function solution(n: number, from = 0, to = 2, via = 1): [number, number][] {
  return n === 0 ? [] : [...solution(n - 1, from, via, to), [from, to], ...solution(n - 1, via, to, from)];
}
function solve(game: HanoiGame) {
  return solution(game.diskCount).reduce((current, [from, to]) => choosePeg(choosePeg(current, from), to), game);
}
describe("Tower of Hanoi engine", () => {
  beforeEach(() => localStorage.clear());
  it.each(DISK_COUNTS)("solves %i disks optimally with 2,000 points and immutable victory", (count) => {
    const game = startGame(count);
    const won = solve(game);
    expect(won.status).toBe("WON");
    expect(won.moves).toBe(minimumMoves(count));
    expect(won.pegs).toEqual([[], [], Array.from({ length: count }, (_, i) => count - i)]);
    expect(completedScore(won)).toBe(2000);
    expect(game.moves).toBe(0);
    expect(choosePeg(won, 2)).toBe(won);
    expect(undoMove(won)).toBe(won);
  });
  it.each(DISK_COUNTS)("preserves legal stacks throughout every reachable %i-disk position", (count) => {
    const queue = [startGame(count)];
    const seen = new Set([JSON.stringify(queue[0]!.pegs)]);
    for (let index = 0; index < queue.length; index++) {
      const game = queue[index]!;
      for (let from = 0; from < 3; from++) for (let to = 0; to < 3; to++) {
        if (from === to) continue;
        const next = choosePeg(choosePeg(game, from), to);
        if (next.moves === game.moves) continue;
        expect(next.pegs.flat().sort((a,b) => a-b)).toEqual(Array.from({ length: count }, (_, i) => i+1));
        for (const stack of next.pegs) expect(stack.every((disk, i) => i === 0 || stack[i-1]! > disk)).toBe(true);
        const key = JSON.stringify(next.pegs);
        if (!seen.has(key)) { seen.add(key); queue.push(next); }
      }
    }
    expect(seen.size).toBe(3 ** count);
    const firstWin = queue.find((game) => game.status === "WON")!;
    expect(firstWin.moves).toBe(minimumMoves(count));
  });
  it("does not count invalid, empty, cancelled or out-of-range selections", () => {
    const game = startGame(3);
    expect(choosePeg(game, 99)).toBe(game);
    expect(choosePeg(game, .5)).toBe(game);
    expect(choosePeg(game, 1).moves).toBe(0);
    const selected = choosePeg(game, 0);
    expect(choosePeg(selected, 0).selected).toBeNull();
    expect(cancelSelection(selected).moves).toBe(0);
    const moved = choosePeg(selected, 2);
    const invalid = choosePeg(choosePeg(moved, 0), 2);
    expect(invalid.notice.kind).toBe("invalid");
    expect(invalid.moves).toBe(1);
    expect(invalid.pegs).toBe(moved.pegs);
  });
  it("Undo reverses history, counts a transfer and cannot manufacture a perfect score", () => {
    const first = choosePeg(choosePeg(startGame(3), 0), 2);
    const undone = undoMove(first);
    expect(undone.pegs).toEqual(startGame(3).pegs);
    expect(undone.moves).toBe(2);
    expect(undone.history).toHaveLength(0);
    expect(undoMove(undone)).toBe(undone);
    const won = solve(undone);
    expect(won.moves).toBe(9);
    expect(completedScore(won)).toBe(1778);
    const twice = choosePeg(choosePeg(first, 0), 1);
    expect(undoMove(undoMove(twice)).pegs).toEqual(startGame(3).pegs);
    expect(undoMove(undoMove(twice)).moves).toBe(4);
  });
  it("pauses with cleared selection and requires explicit resume", () => {
    const selected = choosePeg(startGame(3), 0);
    const paused = pauseGame(selected);
    expect(paused.selected).toBeNull();
    expect(choosePeg(paused, 2)).toBe(paused);
    expect(undoMove(paused)).toBe(paused);
    expect(resumeGame(paused).moves).toBe(0);
    expect(pauseGame(readyGame(3)).status).toBe("READY");
  });
  it("scores only valid finishes and handles efficiency and rounding", () => {
    const won = solve(startGame(3));
    expect(completedScore({ ...won, moves: 10 })).toBe(1700);
    expect(completedScore({ ...won, moves: 14 })).toBe(1500);
    expect(completedScore(startGame(3))).toBe(0);
    expect(completedScore({ ...won, moves: 6 })).toBe(0);
    expect(completedScore({ ...won, moves: Infinity })).toBe(0);
    expect(completedScore({ ...won, pegs: [[], [], [1,2,3]] })).toBe(0);
    expect(() => readyGame(8 as DiskCount)).toThrow();
  });
  it("records completed best moves by difficulty and survives storage errors", () => {
    expect(saveBest(startGame(3))).toBeNull();
    expect(saveBest(solve(startGame(3)))).toBe(7);
    expect(readBest(4)).toBeNull();
    expect(saveBest({ ...solve(startGame(3)), moves: 14 })).toBe(7);
    localStorage.setItem(bestStorageKey(4), "-5");
    expect(readBest(4)).toBeNull();
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw Error("disabled"); });
    expect(saveBest(solve(startGame(5)))).toBe(31);
    spy.mockRestore();
  });
  it("provides complete localized keys and registers all canonical source strings", () => {
    for (const strings of Object.values(HANOI_TRANSLATIONS)) {
      expect(Object.keys(strings)).toEqual(Object.keys(HANOI_STRINGS_EN));
      for (const [key, value] of Object.entries(strings)) {
        expect(value.trim()).not.toBe("");
        expect(UI_STRINGS_EN[key]).toBe(HANOI_STRINGS_EN[key as keyof typeof HANOI_STRINGS_EN]);
        const tokens = HANOI_STRINGS_EN[key as keyof typeof HANOI_STRINGS_EN].match(/\{\w+\}/g) ?? [];
        for (const token of tokens) expect(value).toContain(token);
      }
    }
  });
});
