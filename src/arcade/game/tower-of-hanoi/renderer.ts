// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.
import type { HanoiGame } from "./engine";

export const BOARD_WIDTH = 360;
export const BOARD_HEIGHT = 240;

/** Original pixel geometry; repaints only on state/theme changes. */
export function drawHanoiBoard(canvas: HTMLCanvasElement, game: HanoiGame) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = BOARD_WIDTH;
  canvas.height = BOARD_HEIGHT;
  ctx.imageSmoothingEnabled = false;
  const style = getComputedStyle(canvas);
  const color = (name: string) => style.getPropertyValue(name).trim();
  const bg = color("--arcade-bg");
  const wall = color("--arcade-wall");
  const gold = color("--arcade-dot");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
  // Repeating stone courses and a distant stepped arch give a quiet cabinet scene.
  ctx.fillStyle = color("--arcade-bg-alt");
  for (let row = 0; row < 8; row++) for (let x = (row % 2) * 24 - 24; x < BOARD_WIDTH; x += 48) ctx.fillRect(x, row * 24, 46, 22);
  ctx.fillStyle = wall;
  ctx.fillRect(0, 204, BOARD_WIDTH, 4);
  ctx.fillRect(8, 210, 344, 3);
  game.pegs.forEach((stack, peg) => {
    const center = peg * 120 + 60;
    const selected = game.selected === peg;
    const topY = 190 - stack.length * 20;
    if (selected) {
      ctx.fillStyle = gold;
      ctx.fillRect(center - 50, topY - 6, 100, 3);
      ctx.fillRect(center - 50, topY - 6, 3, 27);
      ctx.fillRect(center + 47, topY - 6, 3, 27);
    }
    ctx.fillStyle = wall;
    ctx.fillRect(center - 4, 54, 8, 140);
    ctx.fillRect(center - 48, 192, 96, 8);
    ctx.fillStyle = gold;
    ctx.fillRect(center - 2, 54, 2, 138);
    ctx.fillRect(center - 46, 192, 92, 2);
    stack.forEach((disk, index) => {
      const width = 22 + disk * 14;
      const x = center - width / 2;
      const y = 174 - index * 20;
      ctx.fillStyle = color(`--hanoi-disk-${disk}`);
      ctx.fillRect(x + 3, y, width - 6, 18);
      ctx.fillRect(x, y + 3, width, 12);
      ctx.fillStyle = color("--hanoi-disk-shine");
      ctx.fillRect(x + 5, y + 2, width - 10, 2);
      ctx.fillStyle = color("--hanoi-disk-ink");
      ctx.fillRect(x + 3, y + 15, width - 6, 3);
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText(String(disk), center, y + 13);
    });
    ctx.fillStyle = gold;
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.fillText(["A", "B", "C"][peg]!, center, 231);
    if (peg === 2) {
      ctx.fillRect(center - 20, 32, 40, 3);
      ctx.fillRect(center - 12, 28, 24, 3);
      ctx.fillRect(center - 5, 24, 10, 3);
    }
  });
}
