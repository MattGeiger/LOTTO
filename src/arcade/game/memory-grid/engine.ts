// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

export const PAIR_COUNTS = [6, 8, 12] as const;
export type PairCount = (typeof PAIR_COUNTS)[number];
export const MISMATCH_MS = 1200;
export const FOODS = [
  { file: "Apple", key: "memoryApple" },
  { file: "Bread", key: "memoryBread" },
  { file: "Cheese", key: "memoryCheese" },
  { file: "Strawberry", key: "memoryStrawberry" },
  { file: "MelonWater", key: "memoryWatermelon" },
  { file: "Lemon", key: "memoryLemon" },
  { file: "Eggplant", key: "memoryEggplant" },
  { file: "Pineapple", key: "memoryPineapple" },
  { file: "Fish", key: "memoryFish" },
  { file: "Potato", key: "memoryPotato" },
  { file: "Eggs", key: "memoryEggs" },
  { file: "Cherry", key: "memoryCherry" },
] as const;

export type MemoryCard = Readonly<{ food: number; matched: boolean }>;
export type MemoryGame = Readonly<{
  status: "READY" | "RUNNING" | "PAUSED" | "WON";
  pairCount: PairCount;
  cards: readonly MemoryCard[];
  selected: readonly number[];
  turns: number;
  matches: number;
  remainingMs: number;
}>;

export function readyGame(pairCount: PairCount): MemoryGame {
  return {
    status: "READY", pairCount,
    cards: Array.from({ length: pairCount * 2 }, () => ({ food: -1, matched: false })),
    selected: [], turns: 0, matches: 0, remainingMs: 0,
  };
}

export function startGame(pairCount: PairCount, random: () => number = Math.random): MemoryGame {
  const cards = Array.from({ length: pairCount * 2 }, (_, index) => ({ food: index % pairCount, matched: false }));
  for (let index = cards.length - 1; index > 0; index--) {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError("Random source must return a number in [0, 1).");
    const other = Math.floor(value * (index + 1));
    [cards[index], cards[other]] = [cards[other]!, cards[index]!];
  }
  return { ...readyGame(pairCount), status: "RUNNING", cards };
}

export function revealCard(game: MemoryGame, index: number): MemoryGame {
  if (game.status !== "RUNNING" || game.remainingMs > 0 || !Number.isInteger(index)
    || !game.cards[index] || game.cards[index].matched || game.selected.includes(index)) return game;
  const selected = [...game.selected, index];
  if (selected.length === 1) return { ...game, selected };
  const turns = game.turns + 1;
  if (game.cards[selected[0]!]!.food !== game.cards[index]!.food) {
    return { ...game, selected, turns, remainingMs: MISMATCH_MS };
  }
  const matches = game.matches + 1;
  return {
    ...game, turns, matches, selected: [],
    cards: game.cards.map((card, position) => selected.includes(position) ? { ...card, matched: true } : card),
    status: matches === game.pairCount ? "WON" : "RUNNING",
  };
}

export function advanceGame(game: MemoryGame, ms: number): MemoryGame {
  if (game.status !== "RUNNING" || game.remainingMs === 0 || !Number.isFinite(ms) || ms <= 0) return game;
  const remainingMs = Math.max(0, game.remainingMs - ms);
  return { ...game, remainingMs, selected: remainingMs === 0 ? [] : game.selected };
}

export function pauseGame(game: MemoryGame): MemoryGame {
  return game.status === "RUNNING" ? { ...game, status: "PAUSED" } : game;
}

export function resumeGame(game: MemoryGame): MemoryGame {
  return game.status === "PAUSED" ? { ...game, status: "RUNNING" } : game;
}

export function isRevealed(game: MemoryGame, index: number): boolean {
  return game.status !== "PAUSED" && (game.cards[index]?.matched || game.selected.includes(index));
}

// Only completed boards earn points. Thinking, pauses and interruptions are free.
export const COMPLETION_POINTS = 1000;
export function completedScore(game: MemoryGame): number {
  if (game.status !== "WON" || game.matches !== game.pairCount
    || !Number.isSafeInteger(game.turns) || game.turns < game.pairCount) return 0;
  return COMPLETION_POINTS + Math.round(COMPLETION_POINTS * game.pairCount / game.turns);
}

export const bestStorageKey = (pairs: PairCount) => `lotto.arcade.memory-grid.best.${pairs}`;

export function readBest(pairs: PairCount): number | null {
  try {
    const raw = window.localStorage.getItem(bestStorageKey(pairs));
    const value = raw === null ? NaN : Number(raw);
    return Number.isSafeInteger(value) && value >= pairs ? value : null;
  } catch { return null; }
}

export function saveBest(pairs: PairCount, turns: number): number {
  const best = Math.min(readBest(pairs) ?? Infinity, turns);
  try { window.localStorage.setItem(bestStorageKey(pairs), String(best)); } catch { /* A blocked store must not stop play. */ }
  return best;
}
