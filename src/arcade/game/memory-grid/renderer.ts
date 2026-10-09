// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.
import { FOODS, isRevealed, type MemoryGame } from "./engine";

export const CELL = 80;
export const COLUMNS = 4;
export const BOARD_WIDTH = CELL * COLUMNS;
const QUESTION = ["01110", "11011", "00011", "00110", "00100", "00000", "00100"];
const CHECK = ["000001", "000011", "100110", "111100", "011000"];

type Palette = { background: string; back: string; border: string; accent: string; face: string; matched: string };

function glyph(ctx: CanvasRenderingContext2D, rows: string[], x: number, y: number, scale: number, color: string) {
  ctx.fillStyle = color;
  rows.forEach((row, j) => [...row].forEach((pixel, i) => {
    if (pixel === "1") ctx.fillRect(x + i * scale, y + j * scale, scale, scale);
  }));
}

export function drawMemoryBoard(canvas: HTMLCanvasElement, game: MemoryGame, images: ReadonlyMap<string, HTMLImageElement>) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const style = getComputedStyle(canvas);
  const color = (name: string) => style.getPropertyValue(name).trim();
  const palette: Palette = {
    background: color("--arcade-bg"), back: color("--arcade-bg-alt"), border: color("--arcade-wall"),
    accent: color("--arcade-dot"), face: color("--arcade-memory-face"), matched: color("--arcade-pellet"),
  };
  canvas.width = BOARD_WIDTH;
  canvas.height = CELL * game.cards.length / COLUMNS;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  game.cards.forEach((card, index) => {
    const x = index % COLUMNS * CELL + 4;
    const y = Math.floor(index / COLUMNS) * CELL + 4;
    const face = isRevealed(game, index);
    // Stepped corners and inset rails echo the existing pixel cabinet chrome.
    ctx.fillStyle = card.matched && game.status !== "PAUSED" ? palette.matched : palette.border;
    ctx.fillRect(x + 3, y, 66, 72);
    ctx.fillRect(x, y + 3, 72, 66);
    ctx.fillStyle = face ? palette.face : palette.back;
    ctx.fillRect(x + 3, y + 3, 66, 66);
    if (face) {
      const image = images.get(FOODS[card.food]!.file);
      if (image) ctx.drawImage(image, x + 12, y + 9, 48, 48);
      if (card.matched) glyph(ctx, CHECK, x + 30, y + 58, 2, palette.matched);
    } else {
      glyph(ctx, QUESTION, x + 26, y + 20, 4, palette.accent);
      ctx.fillStyle = palette.border;
      ctx.fillRect(x + 10, y + 9, 8, 2);
      ctx.fillRect(x + 54, y + 61, 8, 2);
    }
  });
}
