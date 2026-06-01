/* ── Zombie Attack! – Canvas renderer (v3, image-based fence siege) ──
 *
 * Blits preloaded NES-era PNG sprites with `drawImage` (nearest-neighbour). The
 * ground + helipad come from a theme-aware background image; the chain-link fence
 * is a row of sprite tiles that tear open from the centre as it weakens. The
 * helicopter draws over the fence (it's flying above it). On a successful
 * extraction a fixed victory image fills the board. HUD is React-rendered.
 */

import {
  AMBULANCE_H,
  AMBULANCE_W,
  BOARD_H,
  BOARD_W,
  BUB_SHOT_SIZE,
  BUB_SIZE,
  DEATH_FRAMES,
  FENCE_TILE,
  FENCE_Y,
  GRENADE_SIZE,
  HELI_CENTER_X,
  HELI_INBOUND_RISE,
  HELI_LIFT_START,
  HELI_REST_Y,
  HELI_SIZE,
  HELI_TAKEOFF_RISE,
  HERO_SIZE,
  HERO_Y,
  REVIVE_FRAMES,
  SHOT_H,
  SHOT_W,
  ZOMBIE_SIZE,
} from "./constants";
import type { LoadedAssets } from "./assets";
import type { World, Zombie } from "./types";

const SHOT_COLOR = "#ffe24a";
const BUB_SHOT_COLOR = "#ff5a3c";

function rotor<T>(a: T, b: T): T {
  return Math.floor(Date.now() / 130) % 2 === 0 ? a : b;
}

function drawImg(ctx: CanvasRenderingContext2D, img: HTMLImageElement | undefined, cx: number, cy: number, size: number): void {
  if (!img || !img.width) return;
  ctx.drawImage(img, Math.round(cx - size / 2), Math.round(cy - size / 2), size, size);
}

/** Chain-link fence: end posts + middle tiles; the centre tears open as HP drops. */
function drawFence(ctx: CanvasRenderingContext2D, world: World, assets: LoadedAssets): void {
  if (world.fenceMaxHp <= 0) return; // no fence this game (Nightmare)
  const f = assets.fence;
  const tiles = Math.round(BOARD_W / FENCE_TILE);
  const mid = tiles - 2;
  const frac = world.fenceMaxHp > 0 ? world.fenceHp / world.fenceMaxHp : 0;
  const breached = Math.round((1 - frac) * mid);
  const breachStart = Math.floor((mid - breached) / 2);
  const breachEnd = breachStart + breached - 1;
  const y = FENCE_Y - 16;
  for (let i = 0; i < tiles; i += 1) {
    const x = i * FENCE_TILE;
    let img: HTMLImageElement;
    if (i === 0) img = f.left;
    else if (i === tiles - 1) img = f.right;
    else {
      const mi = i - 1;
      if (breached > 0 && mi >= breachStart && mi <= breachEnd) {
        img = mi === breachStart ? f.breachLeft : mi === breachEnd ? f.breachRight : f.breachMiddle;
      } else {
        img = f.middle;
      }
    }
    if (img && img.width) ctx.drawImage(img, x, y, FENCE_TILE, 32);
  }
}

function heliVisual(world: World, assets: LoadedAssets): { img: HTMLImageElement; cy: number } {
  const tk = assets.helo.takeoff;
  const inFlight = () => rotor(tk[0]!, tk[1]!);
  const total = world.roundTotalMs || 1;
  const f = Math.max(0, Math.min(1, (total - world.roundMsLeft) / total));

  if (world.celebrationMs > 0) return { img: inFlight(), cy: HELI_REST_Y - HELI_TAKEOFF_RISE - 40 };
  if (world.round === 1) {
    if (f < 0.7) return { img: inFlight(), cy: HELI_REST_Y - HELI_INBOUND_RISE * (1 - f / 0.7) };
    const seq = [tk[4]!, tk[3]!, tk[2]!, assets.helo.spinup, assets.helo.idle];
    return { img: seq[Math.min(seq.length - 1, Math.floor(((f - 0.7) / 0.3) * seq.length))]!, cy: HELI_REST_Y };
  }
  if (world.round === 2) return { img: assets.helo.refuel, cy: HELI_REST_Y };
  if (world.round === 3) return { img: rotor(assets.helo.spinup, tk[1]!), cy: HELI_REST_Y };
  const cy = HELI_REST_Y - world.heliRise;
  if (f < HELI_LIFT_START) return { img: inFlight(), cy };
  if (f < 0.5) return { img: f < 0.425 ? tk[2]! : tk[3]!, cy };
  if (f < 0.65) return { img: f < 0.575 ? tk[5]! : tk[4]!, cy };
  return { img: inFlight(), cy };
}

function zombieSprite(z: Zombie, assets: LoadedAssets, atFence: boolean): HTMLImageElement {
  if (z.kind === "bub") {
    if (z.dying > 0) return assets.bubDeath[z.dying > DEATH_FRAMES / 2 ? 0 : 1]!;
    if (z.reviving > 0) return assets.bubDeath[z.reviving > REVIVE_FRAMES / 2 ? 1 : 0]!;
    if (z.hurtFrames > 0) return assets.bubHurt;
    if (z.attackFrames > 0) {
      const set = z.aim === "down-left" ? assets.bubAttack.left : z.aim === "down-right" ? assets.bubAttack.right : assets.bubAttack.straight;
      return set[z.frame]!;
    }
    if (z.attacking > 0) return assets.bubAttack.straight[z.frame]!;
    if (atFence) return assets.bubIdle[z.frame]!;
    return assets.bubWalk[z.frame]!;
  }
  const t = z.type;
  if (z.dying > 0) return assets.zombieDeath[t]![z.dying > DEATH_FRAMES / 2 ? 0 : 1]!;
  if (z.reviving > 0) return assets.zombieDeath[t]![z.reviving > REVIVE_FRAMES / 2 ? 1 : 0]!;
  if (z.hurtFrames > 0) return assets.zombieHurt[t]!;
  if (z.attacking > 0) return assets.zombieAttack[t]![z.frame]!;
  if (atFence) return assets.zombieIdle[t]![z.frame]!;
  return assets.zombieWalk[t]![z.frame]!;
}

export function drawBoard(ctx: CanvasRenderingContext2D, world: World, assets: LoadedAssets): void {
  // Skip in jsdom test environments.
  if (typeof navigator !== "undefined" && /\bjsdom\b/i.test(navigator.userAgent)) return;

  ctx.imageSmoothingEnabled = false;

  // Victory cutscene: a clean fixed background so the celebration text reads
  // (no fence/horde to clutter it).
  if (world.celebrationMs > 0) {
    ctx.drawImage(assets.backgrounds.victory, 0, 0, BOARD_W, BOARD_H);
    return;
  }

  const light = typeof document !== "undefined" && document.documentElement.classList.contains("light");
  const fenceUp = world.fenceHp > 0;

  // Ground + helipad come from the background art (theme-aware).
  ctx.drawImage(light ? assets.backgrounds.light : assets.backgrounds.dark, 0, 0, BOARD_W, BOARD_H);
  drawFence(ctx, world, assets);

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

  // ── Zombies: downed/reviving first (behind), then the living. The living are
  // drawn newest-first so freshly-spawned zombies sit BEHIND the older ones. ──
  const sizeOf = (z: Zombie) => (z.kind === "bub" ? BUB_SIZE : ZOMBIE_SIZE);
  for (const z of world.zombies) {
    if (z.dying === 0 && z.reviving === 0) continue;
    drawImg(ctx, zombieSprite(z, assets, false), z.x, z.y, sizeOf(z));
  }
  for (let i = world.zombies.length - 1; i >= 0; i -= 1) {
    const z = world.zombies[i]!;
    if (z.dying !== 0 || z.reviving !== 0) continue;
    drawImg(ctx, zombieSprite(z, assets, fenceUp && z.y >= FENCE_Y - 1), z.x, z.y, sizeOf(z));
  }

  // ── Grenades ──
  for (const g of world.grenades) {
    if (g.armed) drawImg(ctx, assets.grenade, g.x, g.y, GRENADE_SIZE);
    else if (g.exploding > 0) {
      const fi = Math.min(3, Math.max(0, 3 - Math.floor((g.exploding / 18) * 4)));
      drawImg(ctx, assets.grenadeExplode[fi], g.x, g.y, GRENADE_SIZE * 2.4);
    }
  }

  // ── Helicopter (flies OVER the fence and the horde) ──
  const heli = heliVisual(world, assets);
  drawImg(ctx, heli.img, HELI_CENTER_X, heli.cy, HELI_SIZE);

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
