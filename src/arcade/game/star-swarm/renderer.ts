/* ── Star Swarm – Canvas renderer ──
 *
 * Single-pass draw. Reads CSS custom properties from the canvas element so the
 * palette follows the active arcade theme (light / dark / hi-viz). One board
 * pixel per sprite cell; the canvas is scaled up by CSS with pixelated rendering.
 */

import {
  BOARD_H,
  BOARD_W,
  BOMB_H,
  BOMB_W,
  BUNKER_BLOCK,
  INV_CELL_H,
  INV_CELL_W,
  SHIP_Y,
  SHOT_H,
  SHOT_W,
  UFO_Y,
} from "./constants";
import { INV_OFF_X, INV_OFF_Y } from "./engine";
import {
  EXPLOSION_SPRITE,
  INVADER_SPRITES,
  SHIP_SPRITE,
  type Sprite,
  UFO_SPRITE,
} from "./sprites";
import type { World } from "./types";

/** Deterministic starfield so the background never flickers between frames. */
const STARS: { x: number; y: number; bright: boolean }[] = (() => {
  let seed = 1337;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  return Array.from({ length: 42 }, () => ({
    x: Math.floor(rand() * BOARD_W),
    y: Math.floor(rand() * BOARD_H),
    bright: rand() > 0.7,
  }));
})();

function cssVar(styles: CSSStyleDeclaration, name: string, fallback: string): string {
  return styles.getPropertyValue(name).trim() || fallback;
}

/** Draw a string-bitmap sprite, one filled board-pixel per "X" cell. */
function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: Sprite,
  originX: number,
  originY: number,
  color: string,
): void {
  ctx.fillStyle = color;
  const ox = Math.round(originX);
  const oy = Math.round(originY);
  for (let r = 0; r < sprite.length; r += 1) {
    const row = sprite[r]!;
    for (let c = 0; c < row.length; c += 1) {
      const ch = row[c];
      if (ch === "X") ctx.fillRect(ox + c, oy + r, 1, 1);
    }
  }
}

export function drawBoard(
  ctx: CanvasRenderingContext2D,
  world: World,
  canvas: HTMLCanvasElement,
): void {
  // Skip in jsdom test environments.
  if (typeof navigator !== "undefined" && /\bjsdom\b/i.test(navigator.userAgent)) return;

  const styles = getComputedStyle(canvas);
  const rowColors = [
    cssVar(styles, "--arcade-neon", "#ff6de8"),
    cssVar(styles, "--arcade-ghost", "#86f0ff"),
    cssVar(styles, "--arcade-pellet", "#74f84a"),
    cssVar(styles, "--arcade-dot", "#ffd75c"),
    cssVar(styles, "--arcade-snake-head", "#ff9a3c"),
  ];
  const shipColor = cssVar(styles, "--arcade-ghost", "#86f0ff");
  const shotColor = cssVar(styles, "--arcade-dot", "#ffd75c");
  const bombColor = cssVar(styles, "--arcade-neon", "#ff6de8");
  const bunkerColor = cssVar(styles, "--arcade-pellet", "#74f84a");
  const ufoColor = cssVar(styles, "--arcade-dot", "#ffd75c");
  const burstColor = cssVar(styles, "--arcade-brick-ball", "#ffffff");
  const starColor = cssVar(styles, "--arcade-text", "#f3f7ff");

  ctx.clearRect(0, 0, BOARD_W, BOARD_H);

  // ── Starfield ──
  for (const star of STARS) {
    ctx.globalAlpha = star.bright ? 0.5 : 0.22;
    ctx.fillStyle = starColor;
    ctx.fillRect(star.x, star.y, 1, 1);
  }
  ctx.globalAlpha = 1;

  // ── Bunkers ──
  ctx.fillStyle = bunkerColor;
  for (const block of world.bunkers) {
    if (!block.alive) continue;
    ctx.fillRect(Math.round(block.x), Math.round(block.y), BUNKER_BLOCK, BUNKER_BLOCK);
  }

  // ── Invaders ──
  for (const inv of world.invaders) {
    if (!inv.alive) continue;
    const sprite = INVADER_SPRITES[inv.tier]![world.animFrame];
    const x = world.formX + inv.col * INV_CELL_W + INV_OFF_X;
    const y = world.formY + inv.row * INV_CELL_H + INV_OFF_Y;
    drawSprite(ctx, sprite, x, y, rowColors[inv.row] ?? rowColors[4]!);
  }

  // ── UFO ──
  if (world.ufo) {
    drawSprite(ctx, UFO_SPRITE, world.ufo.x, UFO_Y, ufoColor);
  }

  // ── Player shots / invader bombs ──
  ctx.fillStyle = shotColor;
  for (const s of world.shots) ctx.fillRect(Math.round(s.x), Math.round(s.y), SHOT_W, SHOT_H);
  ctx.fillStyle = bombColor;
  for (const b of world.bombs) ctx.fillRect(Math.round(b.x), Math.round(b.y), BOMB_W, BOMB_H);

  // ── Ship (blink while invulnerable after a hit) ──
  const shipVisible = world.shipInvuln <= 0 || Math.floor(world.shipInvuln / 6) % 2 === 0;
  if (shipVisible) {
    drawSprite(ctx, SHIP_SPRITE, world.shipX, SHIP_Y, shipColor);
  }

  // ── Explosions ──
  for (const e of world.explosions) {
    const w = EXPLOSION_SPRITE[0]!.length;
    const h = EXPLOSION_SPRITE.length;
    drawSprite(ctx, EXPLOSION_SPRITE, e.x - w / 2, e.y - h / 2, burstColor);
  }
}
