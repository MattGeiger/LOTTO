/* ── Zombie Attack! – Canvas renderer (v2, image-based) ──
 *
 * Blits preloaded NES-era PNG sprites with `drawImage` (nearest-neighbour). The
 * dirt lot, helipad, fence, and bunker line are drawn procedurally. The HUD
 * (round / timer / lives / score) is rendered by React outside the canvas.
 */

import {
  AMBULANCE_H,
  AMBULANCE_W,
  BOARD_H,
  BOARD_W,
  BUB_SHOT_SIZE,
  BUB_SIZE,
  BUNKER_Y,
  DEATH_FRAMES,
  FENCE_Y,
  GRENADE_SIZE,
  HELIPAD_R,
  HELIPAD_X,
  HELIPAD_Y,
  HELI_CENTER_X,
  HELI_REST_Y,
  HELI_SIZE,
  HELI_TAKEOFF_RISE,
  HERO_SIZE,
  HERO_Y,
  SHOT_H,
  SHOT_W,
  ZOMBIE_SIZE,
} from "./constants";
import type { LoadedAssets } from "./assets";
import type { World, Zombie } from "./types";

const DIRT_BASE = "#1c160d";
const DIRT_PEBBLE = "#5a4631";
const DIRT_CLOD = "#2e2317";
const DEAD_GRASS = "#6b7a2e";
const PAD_ASPHALT = "#2b2b30";
const PAD_RING = "#d8c24a";
const SANDBAG = "#c2a35a";
const SANDBAG_DARK = "#7c5a2e";
const RUBBLE = "#4a4036";
const FENCE_WIRE = "#9aa0a8";
const SHOT_COLOR = "#ffe24a";
const BUB_SHOT_COLOR = "#ff5a3c";

/** Deterministic dirt-lot scatter so the ground never flickers between frames. */
const TERRAIN: { x: number; y: number; kind: number }[] = (() => {
  let seed = 1977;
  const r = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  return Array.from({ length: 120 }, () => ({
    x: Math.floor(r() * BOARD_W),
    y: Math.floor(r() * BOARD_H),
    kind: Math.floor(r() * 10),
  }));
})();

function drawImg(ctx: CanvasRenderingContext2D, img: HTMLImageElement | undefined, cx: number, cy: number, size: number): void {
  if (!img || !img.width) return;
  ctx.drawImage(img, Math.round(cx - size / 2), Math.round(cy - size / 2), size, size);
}

function drawDirt(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = DIRT_BASE;
  ctx.fillRect(0, 0, BOARD_W, BOARD_H);
  for (const t of TERRAIN) {
    if (t.kind <= 4) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = DIRT_PEBBLE;
      ctx.fillRect(t.x, t.y, 1, 1);
    } else if (t.kind <= 7) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = DIRT_CLOD;
      ctx.fillRect(t.x, t.y, 2, 1);
    } else {
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = DEAD_GRASS;
      ctx.fillRect(t.x, t.y, 1, 2);
    }
  }
  ctx.globalAlpha = 1;
}

function drawHelipad(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = PAD_ASPHALT;
  ctx.beginPath();
  ctx.arc(HELIPAD_X, HELIPAD_Y, HELIPAD_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PAD_RING;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(HELIPAD_X, HELIPAD_Y, HELIPAD_R - 4, 0, Math.PI * 2);
  ctx.stroke();
  // "H"
  ctx.fillStyle = PAD_RING;
  ctx.fillRect(HELIPAD_X - 14, HELIPAD_Y - 16, 5, 32);
  ctx.fillRect(HELIPAD_X + 9, HELIPAD_Y - 16, 5, 32);
  ctx.fillRect(HELIPAD_X - 14, HELIPAD_Y - 3, 28, 6);
}

function heliVisual(world: World, assets: LoadedAssets): { img: HTMLImageElement; cy: number } {
  const total = world.roundTotalMs || 1;
  const elapsed = total - world.roundMsLeft;
  if (world.celebrationMs > 0) {
    return { img: assets.helo.takeoff[5]!, cy: HELI_REST_Y - HELI_TAKEOFF_RISE - 40 };
  }
  if (world.round === 1) {
    return { img: assets.helo.idle, cy: HELI_REST_Y - 170 * (world.roundMsLeft / total) };
  }
  if (world.round === 2) return { img: assets.helo.refuel, cy: HELI_REST_Y };
  if (world.round === 3) return { img: assets.helo.spinup, cy: HELI_REST_Y };
  const fi = Math.min(5, Math.max(0, Math.floor((elapsed / total) * 6)));
  return { img: assets.helo.takeoff[fi]!, cy: HELI_REST_Y - world.heliRise };
}

function drawDefenseLine(ctx: CanvasRenderingContext2D, world: World): void {
  // Fence (chain-link-ish posts + wire).
  ctx.strokeStyle = FENCE_WIRE;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(0, FENCE_Y);
  ctx.lineTo(BOARD_W, FENCE_Y);
  ctx.stroke();
  for (let x = 4; x < BOARD_W; x += 12) {
    ctx.beginPath();
    ctx.moveTo(x, FENCE_Y - 4);
    ctx.lineTo(x, FENCE_Y + 4);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  if (!world.bunkers) return;
  // Sandbag bunker line; segments turn to rubble as integrity drops.
  const segs = 10;
  const intactSegs = Math.ceil((world.bunkerIntegrity / world.bunkerMaxIntegrity) * segs);
  const segW = BOARD_W / segs;
  for (let i = 0; i < segs; i += 1) {
    const x = i * segW;
    const intact = i < intactSegs;
    ctx.fillStyle = intact ? SANDBAG : RUBBLE;
    ctx.fillRect(x + 1, BUNKER_Y - 4, segW - 2, 8);
    ctx.fillStyle = intact ? SANDBAG_DARK : RUBBLE;
    ctx.fillRect(x + 1, BUNKER_Y + 2, segW - 2, 2);
  }
}

function zombieSprite(z: Zombie, assets: LoadedAssets): HTMLImageElement {
  if (z.kind === "bub") {
    if (z.hp <= 0) return assets.bubDeath[z.dying > DEATH_FRAMES / 2 ? 0 : 1]!;
    const set = z.aim === "down-left" ? assets.bubAttack.left : z.aim === "down-right" ? assets.bubAttack.right : assets.bubAttack.straight;
    return set[z.frame]!;
  }
  if (z.hp <= 0) return assets.zombieDeath[z.type]![z.dying > DEATH_FRAMES / 2 ? 0 : 1]!;
  return assets.zombieWalk[z.type]![z.frame]!;
}

export function drawBoard(ctx: CanvasRenderingContext2D, world: World, assets: LoadedAssets): void {
  // Skip in jsdom test environments.
  if (typeof navigator !== "undefined" && /\bjsdom\b/i.test(navigator.userAgent)) return;

  ctx.imageSmoothingEnabled = false;

  drawDirt(ctx);
  drawHelipad(ctx);

  // ── Helicopter ──
  const heli = heliVisual(world, assets);
  drawImg(ctx, heli.img, HELI_CENTER_X, heli.cy, HELI_SIZE);

  // ── Defense line ──
  drawDefenseLine(ctx, world);

  // ── Ambulance ──
  if (world.ambulance) {
    const a = world.ambulance;
    if (a.exploding > 0) {
      const fi = Math.min(3, Math.max(0, 3 - Math.floor((a.exploding / 24) * 4)));
      drawImg(ctx, assets.ambulanceExplode[fi], a.x + AMBULANCE_W / 2, a.y + AMBULANCE_H / 2, AMBULANCE_W * 1.6);
    } else {
      const frame = Math.floor(Date.now() / 140) % 2;
      drawImg(ctx, assets.ambulanceDrive[frame], a.x + AMBULANCE_W / 2, a.y + AMBULANCE_H / 2, AMBULANCE_W);
    }
  }

  // ── Zombies (corpses first so the living draw on top) ──
  for (const z of world.zombies) {
    if (z.hp > 0) continue;
    drawImg(ctx, zombieSprite(z, assets), z.x, z.y, z.kind === "bub" ? BUB_SIZE : ZOMBIE_SIZE);
  }
  for (const z of world.zombies) {
    if (z.hp <= 0) continue;
    drawImg(ctx, zombieSprite(z, assets), z.x, z.y, z.kind === "bub" ? BUB_SIZE : ZOMBIE_SIZE);
  }

  // ── Grenades ──
  for (const g of world.grenades) {
    if (g.armed) {
      drawImg(ctx, assets.grenade, g.x, g.y, GRENADE_SIZE);
    } else if (g.exploding > 0) {
      const fi = Math.min(3, Math.max(0, 3 - Math.floor((g.exploding / 18) * 4)));
      drawImg(ctx, assets.grenadeExplode[fi], g.x, g.y, GRENADE_SIZE * 2.4);
    }
  }

  // ── Bullets ──
  ctx.fillStyle = BUB_SHOT_COLOR;
  for (const b of world.bubShots) ctx.fillRect(Math.round(b.x - BUB_SHOT_SIZE / 2), Math.round(b.y - BUB_SHOT_SIZE / 2), BUB_SHOT_SIZE, BUB_SHOT_SIZE);
  ctx.fillStyle = SHOT_COLOR;
  for (const s of world.shots) ctx.fillRect(Math.round(s.x - SHOT_W / 2), Math.round(s.y - SHOT_H / 2), SHOT_W, SHOT_H);

  // ── Hero (blink while invulnerable) ──
  const heroVisible = world.hero.invuln <= 0 || Math.floor(world.hero.invuln / 6) % 2 === 0;
  if (heroVisible) {
    const img = world.hero.firing
      ? assets.heroStand[world.hero.frame]!
      : world.hero.moveDir !== 0
        ? assets.heroRun[world.hero.frame]!
        : assets.heroStand[0]!;
    ctx.drawImage(img, Math.round(world.hero.x), Math.round(HERO_Y), HERO_SIZE, HERO_SIZE);
  }
}
