/* ── Zombie Attack! – Canvas renderer (v2, image-based) ──
 *
 * Blits preloaded NES-era PNG sprites with `drawImage` (nearest-neighbour). The
 * dirt lot, helipad, fence, and bunker line are drawn procedurally (and adapt to
 * light / dark mode). The HUD is rendered by React outside the canvas.
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
  HELI_INBOUND_RISE,
  HELI_LIFT_START,
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

type Palette = {
  dirtBase: string;
  pebble: string;
  clod: string;
  grass: string;
  sandbag: string;
  sandbagDark: string;
  rubble: string;
};

const DARK_PAL: Palette = {
  dirtBase: "#1c160d",
  pebble: "#5a4631",
  clod: "#2e2317",
  grass: "#6b7a2e",
  sandbag: "#c2a35a",
  sandbagDark: "#7c5a2e",
  rubble: "#4a4036",
};
const LIGHT_PAL: Palette = {
  dirtBase: "#cbb98e",
  pebble: "#a98f63",
  clod: "#8a734a",
  grass: "#7c8a3a",
  sandbag: "#9c7e3e",
  sandbagDark: "#6f4f24",
  rubble: "#8a7d6a",
};

const PAD_ASPHALT = "#2b2b30";
const PAD_RING = "#d8c24a";
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

/** Two-frame rotor alternation, time-based so it spins independent of game state. */
function rotor<T>(a: T, b: T): T {
  return Math.floor(Date.now() / 130) % 2 === 0 ? a : b;
}

function drawImg(ctx: CanvasRenderingContext2D, img: HTMLImageElement | undefined, cx: number, cy: number, size: number): void {
  if (!img || !img.width) return;
  ctx.drawImage(img, Math.round(cx - size / 2), Math.round(cy - size / 2), size, size);
}

function drawDirt(ctx: CanvasRenderingContext2D, pal: Palette): void {
  ctx.fillStyle = pal.dirtBase;
  ctx.fillRect(0, 0, BOARD_W, BOARD_H);
  for (const t of TERRAIN) {
    if (t.kind <= 4) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = pal.pebble;
      ctx.fillRect(t.x, t.y, 1, 1);
    } else if (t.kind <= 7) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = pal.clod;
      ctx.fillRect(t.x, t.y, 2, 1);
    } else {
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = pal.grass;
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
  ctx.fillStyle = PAD_RING;
  ctx.fillRect(HELIPAD_X - 14, HELIPAD_Y - 16, 5, 32);
  ctx.fillRect(HELIPAD_X + 9, HELIPAD_Y - 16, 5, 32);
  ctx.fillRect(HELIPAD_X - 14, HELIPAD_Y - 3, 28, 6);
}

/**
 * Helicopter sprite + Y by round/phase:
 *  - R1 inbound: in-flight (takeoff-1/2) descending, then a touchdown sequence
 *    (takeoff-5,4,3 → spinup → idle).
 *  - R2 refuel: refuel pose. R3 spin-up: alternate spinup/takeoff-2.
 *  - R4 takeoff: in-flight on pad, lift-off (3,4), ascent (6,5), then in-flight
 *    climbing away. Celebration: in-flight, gone.
 */
function heliVisual(world: World, assets: LoadedAssets): { img: HTMLImageElement; cy: number } {
  const tk = assets.helo.takeoff; // [0..5] = takeoff-1..6
  const inFlight = () => rotor(tk[0]!, tk[1]!);
  const total = world.roundTotalMs || 1;
  const f = Math.max(0, Math.min(1, (total - world.roundMsLeft) / total));

  if (world.celebrationMs > 0) {
    return { img: inFlight(), cy: HELI_REST_Y - HELI_TAKEOFF_RISE - 40 };
  }

  if (world.round === 1) {
    if (f < 0.7) {
      const cy = HELI_REST_Y - HELI_INBOUND_RISE * (1 - f / 0.7);
      return { img: inFlight(), cy };
    }
    const seq = [tk[4]!, tk[3]!, tk[2]!, assets.helo.spinup, assets.helo.idle];
    const idx = Math.min(seq.length - 1, Math.floor(((f - 0.7) / 0.3) * seq.length));
    return { img: seq[idx]!, cy: HELI_REST_Y };
  }

  if (world.round === 2) return { img: assets.helo.refuel, cy: HELI_REST_Y };
  if (world.round === 3) return { img: rotor(assets.helo.spinup, tk[1]!), cy: HELI_REST_Y };

  // Round 4 — takeoff.
  const cy = HELI_REST_Y - world.heliRise;
  if (f < HELI_LIFT_START) return { img: inFlight(), cy };
  if (f < 0.5) return { img: f < 0.425 ? tk[2]! : tk[3]!, cy }; // lift-off: 3, 4
  if (f < 0.65) return { img: f < 0.575 ? tk[5]! : tk[4]!, cy }; // ascent: 6, 5
  return { img: inFlight(), cy };
}

function drawDefenseLine(ctx: CanvasRenderingContext2D, world: World, pal: Palette): void {
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
  const segs = 10;
  const intactSegs = Math.ceil((world.bunkerIntegrity / world.bunkerMaxIntegrity) * segs);
  const segW = BOARD_W / segs;
  for (let i = 0; i < segs; i += 1) {
    const x = i * segW;
    const intact = i < intactSegs;
    ctx.fillStyle = intact ? pal.sandbag : pal.rubble;
    ctx.fillRect(x + 1, BUNKER_Y - 4, segW - 2, 8);
    ctx.fillStyle = intact ? pal.sandbagDark : pal.rubble;
    ctx.fillRect(x + 1, BUNKER_Y + 2, segW - 2, 2);
  }
}

function zombieSprite(z: Zombie, assets: LoadedAssets): HTMLImageElement {
  if (z.kind === "bub") {
    if (z.hp <= 0) return assets.bubDeath[z.dying > DEATH_FRAMES / 2 ? 0 : 1]!;
    if (z.attackFrames > 0) {
      const set = z.aim === "down-left" ? assets.bubAttack.left : z.aim === "down-right" ? assets.bubAttack.right : assets.bubAttack.straight;
      return set[z.frame]!;
    }
    return assets.bubWalk[z.frame]!;
  }
  if (z.hp <= 0) return assets.zombieDeath[z.type]![z.dying > DEATH_FRAMES / 2 ? 0 : 1]!;
  return assets.zombieWalk[z.type]![z.frame]!;
}

export function drawBoard(ctx: CanvasRenderingContext2D, world: World, assets: LoadedAssets): void {
  // Skip in jsdom test environments.
  if (typeof navigator !== "undefined" && /\bjsdom\b/i.test(navigator.userAgent)) return;

  ctx.imageSmoothingEnabled = false;
  const light = typeof document !== "undefined" && document.documentElement.classList.contains("light");
  const pal = light ? LIGHT_PAL : DARK_PAL;

  drawDirt(ctx, pal);
  drawHelipad(ctx);

  const heli = heliVisual(world, assets);
  drawImg(ctx, heli.img, HELI_CENTER_X, heli.cy, HELI_SIZE);

  drawDefenseLine(ctx, world, pal);

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
