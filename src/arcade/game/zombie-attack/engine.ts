/* ── Zombie Attack! – Game engine (pure, fixed-timestep) ── */

import {
  BLAST_FRAMES,
  BLAST_KILL_POINTS,
  BLAST_RADIUS,
  BOARD_H,
  BOARD_W,
  BOMB_CARRIERS_PER_WAVE,
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
  FENCE_DRAIN_PER_ZOMBIE,
  FENCE_MAX_HP,
  FENCE_Y,
  GROUND_BOMB_H,
  GROUND_BOMB_SPEED,
  GROUND_BOMB_W,
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
  VEHICLE_H,
  VEHICLE_MAX_DELAY_MS,
  VEHICLE_MIN_DELAY_MS,
  VEHICLE_POINTS,
  VEHICLE_SPEED,
  VEHICLE_W,
} from "./constants";
import { spriteSize, ZOMBIE_SPRITES } from "./sprites";
import type {
  BunkerBlock,
  DifficultyParams,
  Explosion,
  ShooterInput,
  TickResult,
  World,
  Zombie,
} from "./types";

/** Fixed delta in ms (~60fps), matching the page's FIXED_STEP_MS. */
const FIXED_DT = 16;

const ZOMBIE_TOTAL = INV_ROWS * INV_COLS;

/** Sprite footprint of a zombie (all tiers share the same 11×8 box). */
const INV_SPRITE = spriteSize(ZOMBIE_SPRITES[0]![0]);
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

/** Sprite-rect bounding box of a zombie in board coordinates. */
export function zombieRect(world: World, z: Zombie): { x: number; y: number; w: number; h: number } {
  return {
    x: world.formX + z.col * INV_CELL_W + INV_OFF_X,
    y: world.formY + z.row * INV_CELL_H + INV_OFF_Y,
    w: INV_SPRITE.w,
    h: INV_SPRITE.h,
  };
}

function tierForRow(row: number): 0 | 1 | 2 {
  if (row === 0) return 0;
  if (row <= 2) return 1;
  return 2;
}

function createFormation(): Zombie[] {
  const zombies: Zombie[] = [];
  for (let row = 0; row < INV_ROWS; row += 1) {
    for (let col = 0; col < INV_COLS; col += 1) {
      zombies.push({ col, row, tier: tierForRow(row), alive: true, carriesBomb: false });
    }
  }
  // Mark a handful of random zombies as bomb-carriers.
  const indices = zombies.map((_, i) => i);
  for (let i = 0; i < BOMB_CARRIERS_PER_WAVE && indices.length > 0; i += 1) {
    const pick = Math.floor(Math.random() * indices.length);
    zombies[indices[pick]!]!.carriesBomb = true;
    indices.splice(pick, 1);
  }
  return zombies;
}

/** Build the four sandbag bunkers — empty when the difficulty has no bunkers. */
function createBunkers(dp: DifficultyParams): BunkerBlock[] {
  if (!dp.bunkers) return [];
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
        blocks.push({ x: originX + c * BUNKER_BLOCK, y: BUNKER_Y + r * BUNKER_BLOCK, alive: true });
      }
    }
  }
  return blocks;
}

function randomVehicleDelay(): number {
  return VEHICLE_MIN_DELAY_MS + Math.random() * (VEHICLE_MAX_DELAY_MS - VEHICLE_MIN_DELAY_MS);
}

/** A fresh world for wave 1. */
export function initialWorld(dp: DifficultyParams): World {
  return {
    shipX: (BOARD_W - SHIP_W) / 2,
    shipInvuln: 0,
    zombies: createFormation(),
    formX: INV_START_X,
    formY: INV_START_Y,
    formDir: 1,
    animFrame: 0,
    stepClockMs: 0,
    shots: [],
    bombs: [],
    groundBombs: [],
    nextProjectileId: 1,
    shotCooldownMs: 0,
    bombClockMs: 0,
    bunkers: createBunkers(dp),
    fenceHp: FENCE_MAX_HP,
    fenceMaxHp: FENCE_MAX_HP,
    vehicle: null,
    vehicleTimerMs: randomVehicleDelay(),
    explosions: [],
    wave: 1,
    lives: INITIAL_LIVES,
    score: 0,
  };
}

/** Next wave: fresh horde/bunkers, the fence rebuilt, dropped a touch lower, score kept. */
export function nextWaveWorld(prev: World, dp: DifficultyParams): World {
  const dropped = Math.min(INV_START_Y + prev.wave * INV_WAVE_DROP, INV_START_Y + 4 * INV_WAVE_DROP);
  return {
    ...initialWorld(dp),
    formY: dropped,
    wave: prev.wave + 1,
    lives: prev.lives,
    score: prev.score,
  };
}

function aliveCount(world: World): number {
  let n = 0;
  for (const z of world.zombies) if (z.alive) n += 1;
  return n;
}

/** Formation step cadence (ms): faster as fewer zombies remain. */
export function stepIntervalMs(world: World, dp: DifficultyParams): number {
  const fraction = Math.max(INV_STEP_MIN_FRACTION, aliveCount(world) / ZOMBIE_TOTAL);
  return dp.stepBaseMs * fraction;
}

/** True if any alive zombie breaches [pad, BOARD_W-pad] after a candidate move. */
function formationWouldBreach(world: World, dx: number): boolean {
  for (const z of world.zombies) {
    if (!z.alive) continue;
    const x = world.formX + z.col * INV_CELL_W + INV_OFF_X + dx;
    if (x < INV_EDGE_PAD || x + INV_SPRITE.w > BOARD_W - INV_EDGE_PAD) return true;
  }
  return false;
}

/** Lowest (max bottom Y) of any alive zombie cell. */
function formationBottom(world: World): number {
  let maxRow = -1;
  for (const z of world.zombies) if (z.alive) maxRow = Math.max(maxRow, z.row);
  if (maxRow < 0) return 0;
  return world.formY + (maxRow + 1) * INV_CELL_H;
}

/** Pick a throwing zombie: bottom-most alive zombie in a random occupied column. */
function pickBombSource(world: World): Zombie | null {
  const cols: number[] = [];
  for (let c = 0; c < INV_COLS; c += 1) {
    if (world.zombies.some((z) => z.alive && z.col === c)) cols.push(c);
  }
  if (cols.length === 0) return null;
  const col = cols[Math.floor(Math.random() * cols.length)]!;
  let source: Zombie | null = null;
  for (const z of world.zombies) {
    if (z.alive && z.col === col && (!source || z.row > source.row)) source = z;
  }
  return source;
}

function smallBurst(x: number, y: number, life = EXPLOSION_FRAMES): Explosion {
  return { x, y, life, maxLife: life, radius: 0 };
}

/**
 * Advance the world by one fixed step.
 * `input.shipX` is the desired gun left-edge (already clamped); `input.fire`
 * is whether the fire control is held.
 */
export function tick(prev: World, input: ShooterInput, dp: DifficultyParams): TickResult {
  const world: World = {
    ...prev,
    zombies: prev.zombies,
    shots: [...prev.shots],
    bombs: [...prev.bombs],
    groundBombs: [...prev.groundBombs],
    bunkers: prev.bunkers,
    explosions: [...prev.explosions],
  };

  let zombieKilled = false;
  let vehicleKilled = false;
  let bombDetonated = false;
  let shipHit = false;

  /* ── Gun ── */
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

  /* ── Move projectiles ── */
  for (const s of world.shots) s.y += s.vy;
  for (const b of world.bombs) b.y += b.vy;
  for (const g of world.groundBombs) g.y += g.vy;
  world.shots = world.shots.filter((s) => s.y + SHOT_H > 0);
  world.bombs = world.bombs.filter((b) => b.y < BOARD_H);
  world.groundBombs = world.groundBombs.filter((g) => g.y < BOARD_H);

  /* ── Horde step ── */
  world.stepClockMs += FIXED_DT;
  const interval = stepIntervalMs(world, dp);
  if (world.stepClockMs >= interval && aliveCount(world) > 0) {
    world.stepClockMs -= interval;
    const dx = world.formDir * INV_STEP_X;
    const pressingFence = world.fenceHp > 0 && formationBottom(world) + INV_STEP_Y > FENCE_Y;
    if (formationWouldBreach(world, dx)) {
      if (!pressingFence) world.formY += INV_STEP_Y;
      world.formDir = world.formDir === 1 ? -1 : 1;
    } else {
      world.formX += dx;
    }
    world.animFrame = world.animFrame === 0 ? 1 : 0;

    // Horde pressure collapses the fence over time.
    if (pressingFence) {
      world.fenceHp -= aliveCount(world) * FENCE_DRAIN_PER_ZOMBIE;
      if (world.fenceHp < 0) world.fenceHp = 0;
    }
  }

  /* ── Thrown bombs ── */
  world.bombClockMs += FIXED_DT;
  if (world.bombClockMs >= dp.bombIntervalMs && world.bombs.length < MAX_BOMBS) {
    const source = pickBombSource(world);
    if (source) {
      const r = zombieRect(world, source);
      world.bombs.push({
        id: world.nextProjectileId++,
        x: r.x + r.w / 2 - BOMB_W / 2,
        y: r.y + r.h,
        vy: BOMB_SPEED,
      });
    }
    world.bombClockMs = -Math.random() * dp.bombIntervalMs * 0.5;
  }

  /* ── Flaming vehicle ── */
  if (world.vehicle) {
    const v = { ...world.vehicle, y: world.vehicle.y + VEHICLE_SPEED };
    world.vehicle = v;
    if (v.y + VEHICLE_H >= FENCE_Y) {
      // Crashes into the fence — collapses it on impact.
      if (world.fenceHp > 0) world.fenceHp = 0;
      world.explosions.push({ x: v.x + VEHICLE_W / 2, y: FENCE_Y, life: BLAST_FRAMES, maxLife: BLAST_FRAMES, radius: 28 });
      world.vehicle = null;
      world.vehicleTimerMs = randomVehicleDelay();
    }
  } else {
    world.vehicleTimerMs -= FIXED_DT;
    if (world.vehicleTimerMs <= 0 && aliveCount(world) > 2) {
      world.vehicle = {
        x: Math.floor(Math.random() * (BOARD_W - VEHICLE_W)),
        y: -VEHICLE_H,
        hp: dp.vehicleHp,
        points: VEHICLE_POINTS,
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

    // vs zombies
    for (const z of world.zombies) {
      if (!z.alive) continue;
      const r = zombieRect(world, z);
      if (rectsOverlap(shot.x, shot.y, SHOT_W, SHOT_H, r.x, r.y, r.w, r.h)) {
        z.alive = false;
        world.score += ROW_POINTS[z.row] ?? 10;
        world.explosions.push(smallBurst(r.x + r.w / 2, r.y + r.h / 2));
        if (z.carriesBomb) {
          // Drops its bomb in place — shoot it to detonate the area.
          world.groundBombs.push({
            id: world.nextProjectileId++,
            x: r.x + r.w / 2 - GROUND_BOMB_W / 2,
            y: r.y + r.h / 2,
            vy: GROUND_BOMB_SPEED,
          });
        }
        zombieKilled = true;
        consumed = true;
        break;
      }
    }
    if (consumed) continue;

    // vs vehicle
    if (world.vehicle && rectsOverlap(shot.x, shot.y, SHOT_W, SHOT_H, world.vehicle.x, world.vehicle.y, VEHICLE_W, VEHICLE_H)) {
      const hp = world.vehicle.hp - 1;
      if (hp <= 0) {
        world.score += world.vehicle.points;
        world.explosions.push({
          x: world.vehicle.x + VEHICLE_W / 2,
          y: world.vehicle.y + VEHICLE_H / 2,
          life: BLAST_FRAMES,
          maxLife: BLAST_FRAMES,
          radius: 30,
        });
        world.vehicle = null;
        world.vehicleTimerMs = randomVehicleDelay();
        vehicleKilled = true;
      } else {
        world.vehicle = { ...world.vehicle, hp };
        world.explosions.push(smallBurst(shot.x, shot.y, 6));
      }
      continue;
    }

    // vs dropped bombs → big blast
    const gIdx = world.groundBombs.findIndex((g) =>
      rectsOverlap(shot.x, shot.y, SHOT_W, SHOT_H, g.x, g.y, GROUND_BOMB_W, GROUND_BOMB_H),
    );
    if (gIdx >= 0) {
      const g = world.groundBombs[gIdx]!;
      const bx = g.x + GROUND_BOMB_W / 2;
      const by = g.y + GROUND_BOMB_H / 2;
      for (const z of world.zombies) {
        if (!z.alive) continue;
        const r = zombieRect(world, z);
        const dxz = r.x + r.w / 2 - bx;
        const dyz = r.y + r.h / 2 - by;
        if (dxz * dxz + dyz * dyz <= BLAST_RADIUS * BLAST_RADIUS) {
          z.alive = false;
          world.score += BLAST_KILL_POINTS;
          world.explosions.push(smallBurst(r.x + r.w / 2, r.y + r.h / 2, 8));
        }
      }
      world.explosions.push({ x: bx, y: by, life: BLAST_FRAMES, maxLife: BLAST_FRAMES, radius: BLAST_RADIUS });
      world.groundBombs.splice(gIdx, 1);
      bombDetonated = true;
      continue;
    }

    // vs bunkers (player shots always erode)
    if (eraseBunkerHit(world, shot.x, shot.y, SHOT_W, SHOT_H)) continue;

    survivingShots.push(shot);
  }
  world.shots = survivingShots;

  /* ── Collisions: thrown bombs ── */
  const survivingBombs: typeof world.bombs = [];
  for (const bomb of world.bombs) {
    // vs player shots (mutual destruction — a satisfying skill shot)
    const shotHitIndex = world.shots.findIndex((s) =>
      rectsOverlap(bomb.x, bomb.y, BOMB_W, BOMB_H, s.x, s.y, SHOT_W, SHOT_H),
    );
    if (shotHitIndex >= 0) {
      const s = world.shots[shotHitIndex]!;
      world.explosions.push(smallBurst(s.x, s.y, EXPLOSION_FRAMES - 4));
      world.shots.splice(shotHitIndex, 1);
      continue;
    }

    // vs bunkers — Very Easy makes bunkers bomb-proof (block survives, bomb stops)
    if (bombHitsBunker(world, bomb.x, bomb.y, BOMB_W, BOMB_H, dp.bunkerBombProof)) continue;

    // vs gun
    if (
      world.shipInvuln <= 0 &&
      rectsOverlap(bomb.x, bomb.y, BOMB_W, BOMB_H, world.shipX, SHIP_Y, SHIP_W, SHIP_H)
    ) {
      world.lives -= 1;
      world.shipInvuln = SHIP_INVULN_FRAMES;
      world.explosions.push(smallBurst(world.shipX + SHIP_W / 2, SHIP_Y + SHIP_H / 2, EXPLOSION_FRAMES + 6));
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
  } else if (formationBottom(world) >= BUNKER_Y) {
    // The horde reached the bunkers (or where they should be) — overrun.
    world.lives = 0;
    status = "game-over";
  }

  return { world, status, zombieKilled, vehicleKilled, bombDetonated, shipHit };
}

/** Knock out the first bunker block overlapping a rect. Returns true on hit. */
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

/** Bomb vs bunker: erodes unless bomb-proof (then the bomb stops but the block survives). */
function bombHitsBunker(world: World, x: number, y: number, w: number, h: number, bombProof: boolean): boolean {
  for (const block of world.bunkers) {
    if (!block.alive) continue;
    if (rectsOverlap(x, y, w, h, block.x, block.y, BUNKER_BLOCK, BUNKER_BLOCK)) {
      if (!bombProof) block.alive = false;
      return true;
    }
  }
  return false;
}

// Geometry the renderer reuses.
export { INV_OFF_X, INV_OFF_Y, INV_SPRITE, ZOMBIE_TOTAL };
