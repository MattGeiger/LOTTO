/* ── Zombie Attack! – Canvas renderer ──
 *
 * Single-pass draw. A deliberate thematic palette (dirt, undead green, fire,
 * weathered wood) is used inside the canvas; the surrounding board frame, cards,
 * and controls still adapt to the active arcade theme via CSS. The gun, player
 * shots, and burst color read CSS custom properties so they pop in every theme.
 * One board pixel per sprite cell; CSS scales the canvas up (pixelated).
 */

import {
  BOARD_H,
  BOARD_W,
  BOMB_H,
  BOMB_W,
  BUNKER_BLOCK,
  FENCE_H,
  FENCE_Y,
  GROUND_BOMB_H,
  GROUND_BOMB_W,
  INV_CELL_H,
  INV_CELL_W,
  SHIP_Y,
  SHOT_H,
  SHOT_W,
  VEHICLE_H,
  VEHICLE_W,
} from "./constants";
import { INV_OFF_X, INV_OFF_Y } from "./engine";
import { EXPLOSION_SPRITE, SHIP_SPRITE, type Sprite, ZOMBIE_SPRITES } from "./sprites";
import type { World } from "./types";

/* ── Thematic palette ── */
const DIRT_PEBBLE = "#5a4631";
const DIRT_CLOD = "#2e2317";
const DIRT_ROCK = "#6b5a44";
const DEAD_GRASS = "#6b7a2e";
const ZOMBIE_TIER = ["#9bd65a", "#c9d8a0", "#6f9e3a"]; // skinny / ribs / fat
const ZOMBIE_BOMB = "#ff4d4d";
const ZOMBIE_SPARK = "#ffd24a";
const FENCE_WOOD = "#a9712f";
const FENCE_WOOD_DARK = "#7c4f20";
const SANDBAG = "#c2a35a";
const SANDBAG_DARK = "#9c7e3e";
const BOMB_RED = "#ff5a5a";
const GROUND_BOMB_BODY = "#161616";
const VEHICLE_BODY = "#8d9298";
const VEHICLE_DARK = "#3a3d44";
const VEHICLE_GLASS = "#23303a";
const FLAME = ["#ff3b1a", "#ff7a1a", "#ffd24a"];
const BLAST_OUTER = "#ff7a1a";
const BLAST_INNER = "#ffd24a";

/** Deterministic dirt-lot scatter so the ground never flickers between frames. */
const TERRAIN: { x: number; y: number; kind: number }[] = (() => {
  let seed = 90125;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  return Array.from({ length: 96 }, () => ({
    x: Math.floor(rand() * BOARD_W),
    y: Math.floor(rand() * BOARD_H),
    kind: Math.floor(rand() * 10),
  }));
})();

function cssVar(styles: CSSStyleDeclaration, name: string, fallback: string): string {
  return styles.getPropertyValue(name).trim() || fallback;
}

/** Draw a string-bitmap sprite, one filled board-pixel per "X" cell. */
function drawSprite(ctx: CanvasRenderingContext2D, sprite: Sprite, originX: number, originY: number, color: string): void {
  ctx.fillStyle = color;
  const ox = Math.round(originX);
  const oy = Math.round(originY);
  for (let r = 0; r < sprite.length; r += 1) {
    const row = sprite[r]!;
    for (let c = 0; c < row.length; c += 1) {
      if (row[c] === "X") ctx.fillRect(ox + c, oy + r, 1, 1);
    }
  }
}

function drawDirt(ctx: CanvasRenderingContext2D): void {
  for (const t of TERRAIN) {
    if (t.kind <= 4) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = DIRT_PEBBLE;
      ctx.fillRect(t.x, t.y, 1, 1);
    } else if (t.kind <= 6) {
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = DIRT_CLOD;
      ctx.fillRect(t.x, t.y, 1, 1);
    } else if (t.kind <= 8) {
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = DEAD_GRASS;
      ctx.fillRect(t.x, t.y, 1, 1);
      ctx.fillRect(t.x, t.y - 1, 1, 1);
    } else {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = DIRT_ROCK;
      ctx.fillRect(t.x, t.y, 2, 2);
    }
  }
  ctx.globalAlpha = 1;
}

function drawFence(ctx: CanvasRenderingContext2D, world: World): void {
  const fraction = world.fenceMaxHp > 0 ? world.fenceHp / world.fenceMaxHp : 0;
  const spacing = 8;
  const count = Math.floor(BOARD_W / spacing);
  if (fraction <= 0) {
    // Collapsed: a few broken stubs in the dirt.
    ctx.fillStyle = FENCE_WOOD_DARK;
    for (let i = 0; i < count; i += 3) {
      const x = i * spacing + 2;
      ctx.fillRect(x, FENCE_Y + FENCE_H - 2, 2, 2);
    }
    return;
  }
  // Top rail (drawn first, behind pickets), thinning as the fence weakens.
  ctx.fillStyle = FENCE_WOOD_DARK;
  ctx.fillRect(0, FENCE_Y, BOARD_W, 1);
  for (let i = 0; i < count; i += 1) {
    // Deterministic per-picket health threshold → random-looking erosion.
    const threshold = ((i * 73 + 17) % 100) / 100;
    if (threshold > fraction) continue;
    const x = i * spacing + 2;
    ctx.fillStyle = FENCE_WOOD;
    ctx.fillRect(x, FENCE_Y, 2, FENCE_H);
    ctx.fillStyle = FENCE_WOOD_DARK;
    ctx.fillRect(x, FENCE_Y + 2, 2, 1); // a cross-plank shadow
  }
}

function drawVehicle(ctx: CanvasRenderingContext2D, world: World): void {
  const v = world.vehicle;
  if (!v) return;
  const x = Math.round(v.x);
  const y = Math.round(v.y);

  // Flames trailing above the descending vehicle (flicker by position).
  const flick = Math.floor(v.y) % 3;
  for (let i = 0; i < VEHICLE_W; i += 2) {
    const h = 3 + ((i + flick) % 3);
    ctx.fillStyle = FLAME[(i + flick) % FLAME.length]!;
    ctx.fillRect(x + i, y - h, 2, h);
  }

  // Body (bus/truck).
  ctx.fillStyle = VEHICLE_BODY;
  ctx.fillRect(x + 1, y, VEHICLE_W - 2, VEHICLE_H);
  // Windshield + windows (dark).
  ctx.fillStyle = VEHICLE_GLASS;
  ctx.fillRect(x + 3, y + 2, VEHICLE_W - 6, 3);
  ctx.fillRect(x + 3, y + 7, VEHICLE_W - 6, 2);
  // Wheels.
  ctx.fillStyle = VEHICLE_DARK;
  ctx.fillRect(x, y + 3, 2, 4);
  ctx.fillRect(x + VEHICLE_W - 2, y + 3, 2, 4);
  ctx.fillRect(x, y + VEHICLE_H - 5, 2, 4);
  ctx.fillRect(x + VEHICLE_W - 2, y + VEHICLE_H - 5, 2, 4);
  // Headlights (front = bottom, the direction of travel).
  ctx.fillStyle = BLAST_INNER;
  ctx.fillRect(x + 3, y + VEHICLE_H - 1, 2, 1);
  ctx.fillRect(x + VEHICLE_W - 5, y + VEHICLE_H - 1, 2, 1);
}

function drawGroundBomb(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = GROUND_BOMB_BODY;
  ctx.fillRect(x, y + 1, GROUND_BOMB_W, GROUND_BOMB_H - 1);
  ctx.fillStyle = BOMB_RED;
  ctx.fillRect(x + 1, y + 2, GROUND_BOMB_W - 2, 1); // warning band
  ctx.fillStyle = ZOMBIE_SPARK;
  ctx.fillRect(x + Math.floor(GROUND_BOMB_W / 2), y, 1, 1); // fuse spark
}

function drawBlast(ctx: CanvasRenderingContext2D, x: number, y: number, life: number, maxLife: number, radius: number): void {
  const t = 1 - life / maxLife; // 0 → 1 over the explosion's life
  const r = Math.max(1, radius * Math.min(1, 0.35 + t));
  ctx.globalAlpha = Math.max(0, 1 - t);
  ctx.lineWidth = 2;
  ctx.strokeStyle = BLAST_OUTER;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = BLAST_INNER;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function drawBoard(ctx: CanvasRenderingContext2D, world: World, canvas: HTMLCanvasElement): void {
  // Skip in jsdom test environments.
  if (typeof navigator !== "undefined" && /\bjsdom\b/i.test(navigator.userAgent)) return;

  const styles = getComputedStyle(canvas);
  const gunColor = cssVar(styles, "--arcade-ghost", "#86f0ff");
  const shotColor = cssVar(styles, "--arcade-dot", "#ffd75c");
  const burstColor = cssVar(styles, "--arcade-brick-ball", "#ffffff");

  ctx.clearRect(0, 0, BOARD_W, BOARD_H);

  // ── Dirt lot ──
  drawDirt(ctx);

  // ── Sandbag bunkers ──
  for (const block of world.bunkers) {
    if (!block.alive) continue;
    const bx = Math.round(block.x);
    const by = Math.round(block.y);
    ctx.fillStyle = SANDBAG;
    ctx.fillRect(bx, by, BUNKER_BLOCK, BUNKER_BLOCK);
    ctx.fillStyle = SANDBAG_DARK;
    ctx.fillRect(bx, by + BUNKER_BLOCK - 1, BUNKER_BLOCK, 1);
  }

  // ── Fence ──
  drawFence(ctx, world);

  // ── Zombies ──
  for (const z of world.zombies) {
    if (!z.alive) continue;
    const sprite = ZOMBIE_SPRITES[z.tier]![world.animFrame];
    const x = world.formX + z.col * INV_CELL_W + INV_OFF_X;
    const y = world.formY + z.row * INV_CELL_H + INV_OFF_Y;
    drawSprite(ctx, sprite, x, y, ZOMBIE_TIER[z.tier] ?? ZOMBIE_TIER[0]!);
    if (z.carriesBomb) {
      // A strapped-on bomb with a lit fuse marks a carrier.
      const cx = Math.round(x) + 4;
      const cy = Math.round(y) + 4;
      ctx.fillStyle = ZOMBIE_BOMB;
      ctx.fillRect(cx, cy, 3, 3);
      ctx.fillStyle = ZOMBIE_SPARK;
      ctx.fillRect(cx + 1, cy - 1, 1, 1);
    }
  }

  // ── Flaming vehicle ──
  drawVehicle(ctx, world);

  // ── Dropped bombs ──
  for (const g of world.groundBombs) drawGroundBomb(ctx, Math.round(g.x), Math.round(g.y));

  // ── Thrown bombs ──
  ctx.fillStyle = BOMB_RED;
  for (const b of world.bombs) ctx.fillRect(Math.round(b.x), Math.round(b.y), BOMB_W, BOMB_H);

  // ── Player shots ──
  ctx.fillStyle = shotColor;
  for (const s of world.shots) ctx.fillRect(Math.round(s.x), Math.round(s.y), SHOT_W, SHOT_H);

  // ── Gun (blink while invulnerable after a hit) ──
  const gunVisible = world.shipInvuln <= 0 || Math.floor(world.shipInvuln / 6) % 2 === 0;
  if (gunVisible) drawSprite(ctx, SHIP_SPRITE, world.shipX, SHIP_Y, gunColor);

  // ── Explosions / blasts ──
  for (const e of world.explosions) {
    if (e.radius > 0) {
      drawBlast(ctx, e.x, e.y, e.life, e.maxLife, e.radius);
    } else {
      const w = EXPLOSION_SPRITE[0]!.length;
      const h = EXPLOSION_SPRITE.length;
      drawSprite(ctx, EXPLOSION_SPRITE, e.x - w / 2, e.y - h / 2, burstColor);
    }
  }
}
