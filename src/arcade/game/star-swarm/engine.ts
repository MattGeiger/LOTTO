/* ── Star Swarm – Game engine (pure, fixed-timestep) ── */

import {
  BOARD_H,
  BOARD_W,
  BOMB_H,
  BOMB_SPEED,
  BOMB_W,
  BUNKER_BLOCK,
  BUNKER_COLS,
  BUNKER_COUNT,
  BUNKER_ROWS,
  BUNKER_W,
  BUNKER_Y,
  EXPLOSION_FRAMES,
  INITIAL_LIVES,
  INV_CELL_H,
  INV_CELL_W,
  INV_COLS,
  INV_EDGE_PAD,
  INV_ROWS,
  INV_START_X,
  INV_START_Y,
  INV_STEP_MIN_FRACTION,
  INV_STEP_X,
  INV_STEP_Y,
  INV_WAVE_DROP,
  MAX_BOMBS,
  MAX_SHOTS,
  ROW_POINTS,
  SHIP_H,
  SHIP_INVULN_FRAMES,
  SHIP_W,
  SHIP_Y,
  SHOT_COOLDOWN_MS,
  SHOT_H,
  SHOT_SPEED,
  SHOT_W,
  UFO_H,
  UFO_MAX_DELAY_MS,
  UFO_MIN_DELAY_MS,
  UFO_POINTS,
  UFO_SPEED,
  UFO_W,
  UFO_Y,
} from "./constants";
import { INVADER_SPRITES, spriteSize } from "./sprites";
import type {
  BunkerBlock,
  DifficultyParams,
  Invader,
  ShooterInput,
  TickResult,
  World,
} from "./types";

/** Fixed delta in ms (~60fps), matching the page's FIXED_STEP_MS. */
const FIXED_DT = 16;

const INVADER_TOTAL = INV_ROWS * INV_COLS;

/** Sprite footprint of an invader (all tiers share the same 11×8 box). */
const INV_SPRITE = spriteSize(INVADER_SPRITES[0]![0]);
/** Offset of the sprite within its formation cell (keeps it centred). */
const INV_OFF_X = (INV_CELL_W - INV_SPRITE.w) / 2;
const INV_OFF_Y = (INV_CELL_H - INV_SPRITE.h) / 2;

function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

/** Sprite-rect bounding box of an invader in board coordinates. */
export function invaderRect(world: World, inv: Invader): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  return {
    x: world.formX + inv.col * INV_CELL_W + INV_OFF_X,
    y: world.formY + inv.row * INV_CELL_H + INV_OFF_Y,
    w: INV_SPRITE.w,
    h: INV_SPRITE.h,
  };
}

function tierForRow(row: number): 0 | 1 | 2 {
  if (row === 0) return 0;
  if (row <= 2) return 1;
  return 2;
}

function createFormation(): Invader[] {
  const invaders: Invader[] = [];
  for (let row = 0; row < INV_ROWS; row += 1) {
    for (let col = 0; col < INV_COLS; col += 1) {
      invaders.push({ col, row, tier: tierForRow(row), alive: true });
    }
  }
  return invaders;
}

/** Build the four destructible bunkers with the classic notched silhouette. */
function createBunkers(): BunkerBlock[] {
  const blocks: BunkerBlock[] = [];
  const gap = (BOARD_W - BUNKER_COUNT * BUNKER_W) / (BUNKER_COUNT + 1);
  for (let b = 0; b < BUNKER_COUNT; b += 1) {
    const originX = gap + b * (BUNKER_W + gap);
    for (let r = 0; r < BUNKER_ROWS; r += 1) {
      for (let c = 0; c < BUNKER_COLS; c += 1) {
        // Round the top corners.
        if (r === 0 && (c === 0 || c === BUNKER_COLS - 1)) continue;
        // Carve the bottom-centre notch (a doorway).
        if (r >= BUNKER_ROWS - 2 && c >= 2 && c <= BUNKER_COLS - 3) continue;
        blocks.push({
          x: originX + c * BUNKER_BLOCK,
          y: BUNKER_Y + r * BUNKER_BLOCK,
          alive: true,
        });
      }
    }
  }
  return blocks;
}

function randomUfoDelay(): number {
  return UFO_MIN_DELAY_MS + Math.random() * (UFO_MAX_DELAY_MS - UFO_MIN_DELAY_MS);
}

/** A fresh world for wave 1. */
export function initialWorld(): World {
  return {
    shipX: (BOARD_W - SHIP_W) / 2,
    shipInvuln: 0,
    invaders: createFormation(),
    formX: INV_START_X,
    formY: INV_START_Y,
    formDir: 1,
    animFrame: 0,
    stepClockMs: 0,
    shots: [],
    bombs: [],
    nextProjectileId: 1,
    shotCooldownMs: 0,
    bombClockMs: 0,
    bunkers: createBunkers(),
    ufo: null,
    ufoTimerMs: randomUfoDelay(),
    explosions: [],
    wave: 1,
    lives: INITIAL_LIVES,
    score: 0,
  };
}

/** Next-wave world: fresh formation/bunkers, dropped a touch lower, score kept. */
export function nextWaveWorld(prev: World): World {
  const dropped = Math.min(INV_START_Y + prev.wave * INV_WAVE_DROP, INV_START_Y + 4 * INV_WAVE_DROP);
  return {
    ...initialWorld(),
    formY: dropped,
    bunkers: createBunkers(),
    wave: prev.wave + 1,
    lives: prev.lives,
    score: prev.score,
  };
}

function aliveCount(world: World): number {
  let n = 0;
  for (const inv of world.invaders) if (inv.alive) n += 1;
  return n;
}

/** Formation step cadence (ms): faster as fewer invaders remain. */
export function stepIntervalMs(world: World, dp: DifficultyParams): number {
  const fraction = Math.max(INV_STEP_MIN_FRACTION, aliveCount(world) / INVADER_TOTAL);
  return dp.stepBaseMs * fraction;
}

/** True if any alive invader breaches [pad, BOARD_W-pad] after a candidate move. */
function formationWouldBreach(world: World, dx: number): boolean {
  for (const inv of world.invaders) {
    if (!inv.alive) continue;
    const x = world.formX + inv.col * INV_CELL_W + INV_OFF_X + dx;
    if (x < INV_EDGE_PAD || x + INV_SPRITE.w > BOARD_W - INV_EDGE_PAD) {
      return true;
    }
  }
  return false;
}

/** Lowest (max bottom Y) of any alive invader cell. */
function formationBottom(world: World): number {
  let maxRow = -1;
  for (const inv of world.invaders) if (inv.alive) maxRow = Math.max(maxRow, inv.row);
  if (maxRow < 0) return 0;
  return world.formY + (maxRow + 1) * INV_CELL_H;
}

/** Pick a firing invader: bottom-most alive invader in a random occupied column. */
function pickBombSource(world: World): Invader | null {
  const cols: number[] = [];
  for (let c = 0; c < INV_COLS; c += 1) {
    if (world.invaders.some((inv) => inv.alive && inv.col === c)) cols.push(c);
  }
  if (cols.length === 0) return null;
  const col = cols[Math.floor(Math.random() * cols.length)]!;
  let source: Invader | null = null;
  for (const inv of world.invaders) {
    if (inv.alive && inv.col === col && (!source || inv.row > source.row)) source = inv;
  }
  return source;
}

/**
 * Advance the world by one fixed step.
 * `input.shipX` is the desired ship left-edge (already clamped); `input.fire`
 * is whether the fire control is held.
 */
export function tick(prev: World, input: ShooterInput, dp: DifficultyParams): TickResult {
  const world: World = {
    ...prev,
    invaders: prev.invaders,
    shots: [...prev.shots],
    bombs: [...prev.bombs],
    bunkers: prev.bunkers,
    explosions: [...prev.explosions],
  };

  let invaderKilled = false;
  let ufoKilled = false;
  let shipHit = false;

  /* ── Ship ── */
  world.shipX = Math.max(0, Math.min(BOARD_W - SHIP_W, input.shipX));
  if (world.shipInvuln > 0) world.shipInvuln -= 1;

  /* ── Player fire ── */
  if (world.shotCooldownMs > 0) world.shotCooldownMs -= FIXED_DT;
  if (input.fire && world.shotCooldownMs <= 0 && world.shots.length < MAX_SHOTS) {
    world.shots.push({
      id: world.nextProjectileId++,
      x: world.shipX + SHIP_W / 2 - SHOT_W / 2,
      y: SHIP_Y - SHOT_H,
      vy: -SHOT_SPEED,
    });
    world.shotCooldownMs = SHOT_COOLDOWN_MS;
  }

  /* ── Move shots / bombs ── */
  for (const s of world.shots) s.y += s.vy;
  for (const b of world.bombs) b.y += b.vy;
  world.shots = world.shots.filter((s) => s.y + SHOT_H > 0);
  world.bombs = world.bombs.filter((b) => b.y < BOARD_H);

  /* ── Formation step ── */
  world.stepClockMs += FIXED_DT;
  const interval = stepIntervalMs(world, dp);
  if (world.stepClockMs >= interval && aliveCount(world) > 0) {
    world.stepClockMs -= interval;
    const dx = world.formDir * INV_STEP_X;
    if (formationWouldBreach(world, dx)) {
      world.formY += INV_STEP_Y;
      world.formDir = world.formDir === 1 ? -1 : 1;
    } else {
      world.formX += dx;
    }
    world.animFrame = world.animFrame === 0 ? 1 : 0;
  }

  /* ── Invader bombs ── */
  world.bombClockMs += FIXED_DT;
  if (world.bombClockMs >= dp.bombIntervalMs && world.bombs.length < MAX_BOMBS) {
    const source = pickBombSource(world);
    if (source) {
      const r = invaderRect(world, source);
      world.bombs.push({
        id: world.nextProjectileId++,
        x: r.x + r.w / 2 - BOMB_W / 2,
        y: r.y + r.h,
        vy: BOMB_SPEED,
      });
    }
    // Reset with jitter so volleys feel organic.
    world.bombClockMs = -Math.random() * dp.bombIntervalMs * 0.5;
  }

  /* ── UFO ── */
  if (world.ufo) {
    world.ufo = { ...world.ufo, x: world.ufo.x + world.ufo.dir * UFO_SPEED };
    if (world.ufo.x > BOARD_W + 4 || world.ufo.x + UFO_W < -4) {
      world.ufo = null;
      world.ufoTimerMs = randomUfoDelay();
    }
  } else {
    world.ufoTimerMs -= FIXED_DT;
    if (world.ufoTimerMs <= 0 && aliveCount(world) > 2) {
      const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      world.ufo = {
        x: dir === 1 ? -UFO_W : BOARD_W,
        dir,
        points: UFO_POINTS[Math.floor(Math.random() * UFO_POINTS.length)]!,
      };
    }
  }

  /* ── Explosions ── */
  if (world.explosions.length > 0) {
    world.explosions = world.explosions
      .map((e) => ({ ...e, life: e.life - 1 }))
      .filter((e) => e.life > 0);
  }

  /* ── Collisions: player shots ── */
  const survivingShots: typeof world.shots = [];
  for (const shot of world.shots) {
    let consumed = false;

    // vs invaders
    for (const inv of world.invaders) {
      if (!inv.alive) continue;
      const r = invaderRect(world, inv);
      if (rectsOverlap(shot.x, shot.y, SHOT_W, SHOT_H, r.x, r.y, r.w, r.h)) {
        inv.alive = false;
        world.score += ROW_POINTS[inv.row] ?? 10;
        world.explosions.push({ x: r.x + r.w / 2, y: r.y + r.h / 2, life: EXPLOSION_FRAMES });
        invaderKilled = true;
        consumed = true;
        break;
      }
    }
    if (consumed) continue;

    // vs UFO
    if (world.ufo && rectsOverlap(shot.x, shot.y, SHOT_W, SHOT_H, world.ufo.x, UFO_Y, UFO_W, UFO_H)) {
      world.score += world.ufo.points;
      world.explosions.push({ x: world.ufo.x + UFO_W / 2, y: UFO_Y + UFO_H / 2, life: EXPLOSION_FRAMES + 4 });
      world.ufo = null;
      world.ufoTimerMs = randomUfoDelay();
      ufoKilled = true;
      continue;
    }

    // vs bunkers
    if (eraseBunkerHit(world, shot.x, shot.y, SHOT_W, SHOT_H)) continue;

    survivingShots.push(shot);
  }
  world.shots = survivingShots;

  /* ── Collisions: bombs ── */
  const survivingBombs: typeof world.bombs = [];
  for (const bomb of world.bombs) {
    // vs player shots (mutual destruction — a satisfying skill shot)
    const shotHitIndex = world.shots.findIndex((s) =>
      rectsOverlap(bomb.x, bomb.y, BOMB_W, BOMB_H, s.x, s.y, SHOT_W, SHOT_H),
    );
    if (shotHitIndex >= 0) {
      const s = world.shots[shotHitIndex]!;
      world.explosions.push({ x: s.x, y: s.y, life: EXPLOSION_FRAMES - 4 });
      world.shots.splice(shotHitIndex, 1);
      continue;
    }

    // vs bunkers
    if (eraseBunkerHit(world, bomb.x, bomb.y, BOMB_W, BOMB_H)) continue;

    // vs ship
    if (
      world.shipInvuln <= 0 &&
      rectsOverlap(bomb.x, bomb.y, BOMB_W, BOMB_H, world.shipX, SHIP_Y, SHIP_W, SHIP_H)
    ) {
      world.lives -= 1;
      world.shipInvuln = SHIP_INVULN_FRAMES;
      world.explosions.push({ x: world.shipX + SHIP_W / 2, y: SHIP_Y + SHIP_H / 2, life: EXPLOSION_FRAMES + 6 });
      shipHit = true;
      continue;
    }

    survivingBombs.push(bomb);
  }
  world.bombs = survivingBombs;

  /* ── Resolve status ── */
  let status: TickResult["status"] = "running";
  if (world.lives <= 0) {
    status = "game-over";
  } else if (aliveCount(world) === 0) {
    status = "wave-cleared";
  } else if (formationBottom(world) >= SHIP_Y) {
    world.lives = 0;
    status = "game-over";
  }

  return { world, status, invaderKilled, ufoKilled, shipHit };
}

/** Knock out the first bunker block overlapping a projectile rect. Returns true on hit. */
function eraseBunkerHit(world: World, x: number, y: number, w: number, h: number): boolean {
  for (const block of world.bunkers) {
    if (!block.alive) continue;
    if (rectsOverlap(x, y, w, h, block.x, block.y, BUNKER_BLOCK, BUNKER_BLOCK)) {
      block.alive = false;
      return true;
    }
  }
  return false;
}

// Geometry the renderer reuses.
export { INV_OFF_X, INV_OFF_Y, INV_SPRITE, INVADER_TOTAL };
