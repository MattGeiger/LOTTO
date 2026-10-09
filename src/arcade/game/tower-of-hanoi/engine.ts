// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

export const DISK_COUNTS = [3, 4, 5] as const;
export type DiskCount = (typeof DISK_COUNTS)[number];
export type Peg = 0 | 1 | 2;
type Transfer = Readonly<{ from: Peg; to: Peg; disk: number }>;
export type HanoiNotice = Readonly<{ kind: "choose" | "selected" | "cancelled" | "empty" | "invalid" | "moved" | "undone"; peg?: Peg; transfer?: Transfer }>;
export type HanoiGame = Readonly<{
  status: "READY" | "RUNNING" | "PAUSED" | "WON";
  diskCount: DiskCount;
  pegs: readonly [readonly number[], readonly number[], readonly number[]];
  selected: Peg | null;
  moves: number;
  history: readonly Transfer[];
  notice: HanoiNotice;
}>;
export const minimumMoves = (disks: DiskCount) => 2 ** disks - 1;

export function readyGame(diskCount: DiskCount): HanoiGame {
  if (!DISK_COUNTS.includes(diskCount)) throw new RangeError("Unsupported disk count");
  return { status: "READY", diskCount, pegs: [Array.from({ length: diskCount }, (_, i) => diskCount - i), [], []], selected: null, moves: 0, history: [], notice: { kind: "choose" } };
}
export const startGame = (count: DiskCount): HanoiGame => ({ ...readyGame(count), status: "RUNNING" });
const validPeg = (peg: number): peg is Peg => Number.isInteger(peg) && peg >= 0 && peg <= 2;

export function choosePeg(game: HanoiGame, peg: number): HanoiGame {
  if (game.status !== "RUNNING" || !validPeg(peg)) return game;
  if (game.selected === peg) return cancelSelection(game);
  if (game.selected === null) return game.pegs[peg].length
    ? { ...game, selected: peg, notice: { kind: "selected", peg } }
    : { ...game, notice: { kind: "empty", peg } };
  const from = game.selected;
  const disk = game.pegs[from].at(-1);
  const destination = game.pegs[peg].at(-1);
  if (disk === undefined || (destination !== undefined && destination < disk)) return { ...game, notice: { kind: "invalid", peg } };
  if (game.moves >= Number.MAX_SAFE_INTEGER) return game;
  const pegs = game.pegs.map((stack, index) => index === from ? stack.slice(0, -1) : index === peg ? [...stack, disk] : stack) as unknown as HanoiGame["pegs"];
  const transfer = { from, to: peg, disk };
  const won = pegs[2].length === game.diskCount;
  return { ...game, pegs, selected: null, moves: game.moves + 1, history: [...game.history, transfer], status: won ? "WON" : "RUNNING", notice: { kind: "moved", transfer } };
}
export function cancelSelection(game: HanoiGame): HanoiGame {
  return game.status === "RUNNING" && game.selected !== null ? { ...game, selected: null, notice: { kind: "cancelled" } } : game;
}
export function undoMove(game: HanoiGame): HanoiGame {
  const transfer = game.history.at(-1);
  if (game.status !== "RUNNING" || !transfer || game.moves >= Number.MAX_SAFE_INTEGER) return game;
  const { from, to, disk } = transfer;
  if (game.pegs[to].at(-1) !== disk) return game;
  const pegs = game.pegs.map((stack, index) => index === to ? stack.slice(0, -1) : index === from ? [...stack, disk] : stack) as unknown as HanoiGame["pegs"];
  return { ...game, pegs, selected: null, moves: game.moves + 1, history: game.history.slice(0, -1), notice: { kind: "undone", transfer: { from: to, to: from, disk } } };
}
export const pauseGame = (game: HanoiGame): HanoiGame => game.status === "RUNNING" ? { ...game, selected: null, status: "PAUSED", notice: { kind: "choose" } } : game;
export const resumeGame = (game: HanoiGame): HanoiGame => game.status === "PAUSED" ? { ...game, status: "RUNNING" } : game;

export function completedScore(game: HanoiGame): number {
  if (game.status !== "WON" || !DISK_COUNTS.includes(game.diskCount) || !Number.isSafeInteger(game.moves)
    || game.moves < minimumMoves(game.diskCount) || game.pegs[0].length || game.pegs[1].length
    || game.pegs[2].length !== game.diskCount || game.pegs[2].some((disk, index) => disk !== game.diskCount - index)) return 0;
  return 1000 + Math.round(1000 * minimumMoves(game.diskCount) / game.moves);
}
export const bestStorageKey = (count: DiskCount) => `arcade-hanoi-best-moves-v1:${count}`;
export function readBest(count: DiskCount): number | null {
  try {
    const raw = localStorage.getItem(bestStorageKey(count));
    const value = raw === null ? NaN : Number(raw);
    return Number.isSafeInteger(value) && value >= minimumMoves(count) ? value : null;
  } catch { return null; }
}
export function saveBest(game: HanoiGame): number | null {
  const previous = readBest(game.diskCount);
  if (!completedScore(game)) return previous;
  const best = Math.min(previous ?? Infinity, game.moves);
  try { localStorage.setItem(bestStorageKey(game.diskCount), String(best)); } catch { /* Play survives disabled storage. */ }
  return best;
}
