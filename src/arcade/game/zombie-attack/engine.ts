/* ── Zombie Attack! – Game engine (pure, fixed-timestep, v2) ── */

import {
  AMBULANCE_BLAST_RADIUS,
  AMBULANCE_EXPLODE_FRAME_MS,
  AMBULANCE_H,
  AMBULANCE_INTERVAL_MS,
  AMBULANCE_SCORE,
  AMBULANCE_SPEED,
  AMBULANCE_W,
  ANIM_FRAME_MS,
  BLAST_KILL_POINTS,
  BOARD_H,
  BOARD_W,
  BUB_FIRE_INTERVAL_MS,
  BUB_GRENADE_DROP_CHANCE,
  BUB_HP,
  BUB_RADIUS,
  BUB_SCORE,
  BUB_SHOT_SPEED,
  BUNKER_Y,
  DEATH_FRAMES,
  DIR_REROLL_MS,
  GRENADE_BLAST_RADIUS,
  GRENADE_EXPLODE_FRAME_MS,
  HERO_INVULN_FRAMES,
  HERO_MAX_X,
  HERO_MIN_X,
  HERO_MUZZLE_DX,
  HERO_MUZZLE_DY,
  HERO_SIZE,
  HERO_Y,
  HELI_TAKEOFF_RISE,
  INITIAL_LIVES,
  MAX_SHOTS,
  MAX_ZOMBIES,
  RESCUE_CELEBRATION_MS,
  ROUND_COUNT,
  ROUND_DURATIONS_MS,
  SHOT_COOLDOWN_MS,
  SHOT_SPEED,
  SPAWN_MARGIN,
  ZOMBIE_RADIUS,
  ZOMBIE_SCORE,
  ZOMBIE_TYPE_COUNT,
} from "./constants";
import type {
  DifficultyParams,
  MoveDir,
  Projectile,
  ShooterInput,
  TickResult,
  World,
  Zombie,
} from "./types";

const FIXED_DT = 16;
const DIAG = Math.SQRT1_2; // 0.707 — 45° component so diagonal speed == straight speed
const GRENADE_EXPLODE_TOTAL = Math.round((GRENADE_EXPLODE_FRAME_MS * 4) / FIXED_DT);
const AMBULANCE_EXPLODE_TOTAL = Math.round((AMBULANCE_EXPLODE_FRAME_MS * 4) / FIXED_DT);

let RNG = Math.random;
/** Test seam: make spawns/rolls deterministic. */
export function __setRng(fn: () => number): void {
  RNG = fn;
}
export function __resetRng(): void {
  RNG = Math.random;
}

function rand(min: number, max: number): number {
  return min + RNG() * (max - min);
}

/** Roll a stochastic movement direction: 50% down, 25% each diagonal. */
function rollDir(): MoveDir {
  const r = RNG();
  if (r < 0.5) return "down";
  return r < 0.75 ? "down-left" : "down-right";
}

function applyDir(z: Zombie, dir: MoveDir, speed: number): void {
  z.aim = dir;
  if (dir === "down") {
    z.vx = 0;
    z.vy = speed;
  } else if (dir === "down-left") {
    z.vx = -speed * DIAG;
    z.vy = speed * DIAG;
  } else {
    z.vx = speed * DIAG;
    z.vy = speed * DIAG;
  }
}

/** Effective (cycle-scaled) difficulty for the current world. */
function scaled(world: World, dp: DifficultyParams) {
  const s = 1 + world.cycle * 0.12;
  return {
    zombieSpeed: dp.zombieSpeed * s,
    spawnIntervalMs: dp.spawnIntervalMs / s,
    bubIntervalMs: dp.bubIntervalMs / s,
  };
}

function spawnZombie(world: World, dp: DifficultyParams, kind: "civilian" | "bub"): void {
  const { zombieSpeed } = scaled(world, dp);
  const x = rand(SPAWN_MARGIN, BOARD_W - SPAWN_MARGIN);
  const z: Zombie = {
    id: world.nextId++,
    kind,
    type: Math.floor(RNG() * ZOMBIE_TYPE_COUNT),
    x,
    y: -16,
    vx: 0,
    vy: zombieSpeed,
    dirTimerMs: rand(DIR_REROLL_MS * 0.5, DIR_REROLL_MS),
    animMs: rand(0, ANIM_FRAME_MS),
    frame: 0,
    hp: kind === "bub" ? BUB_HP : 1,
    fireTimerMs: rand(BUB_FIRE_INTERVAL_MS * 0.5, BUB_FIRE_INTERVAL_MS),
    aim: "down",
    dying: 0,
  };
  applyDir(z, rollDir(), kind === "bub" ? zombieSpeed * 0.85 : zombieSpeed);
  world.zombies.push(z);
}

/** A fresh world for round 1 of cycle 0. */
export function initialWorld(dp: DifficultyParams): World {
  const integrity = dp.bunkers ? 6 : 2;
  return {
    hero: {
      x: (BOARD_W - HERO_SIZE) / 2,
      invuln: 0,
      firing: false,
      moveDir: 0,
      animMs: 0,
      frame: 0,
      cooldownMs: 0,
    },
    shots: [],
    bubShots: [],
    zombies: [],
    grenades: [],
    ambulance: null,
    nextId: 1,
    spawnTimerMs: 900,
    bubTimerMs: dp.bubIntervalMs,
    ambulanceTimerMs: AMBULANCE_INTERVAL_MS,
    round: 1,
    cycle: 0,
    roundMsLeft: ROUND_DURATIONS_MS[0]!,
    roundTotalMs: ROUND_DURATIONS_MS[0]!,
    celebrationMs: 0,
    heliRise: 0,
    bunkers: dp.bunkers,
    bunkerIntegrity: integrity,
    bunkerMaxIntegrity: integrity,
    lives: INITIAL_LIVES,
    score: 0,
  };
}

function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

/** Kill every alive zombie within `radius` of (cx, cy); award blast points. */
function blast(world: World, cx: number, cy: number, radius: number): void {
  const r2 = radius * radius;
  for (const z of world.zombies) {
    if (z.hp <= 0) continue;
    if (dist2(z.x, z.y, cx, cy) <= r2) {
      z.hp = 0;
      z.dying = DEATH_FRAMES;
      world.score += BLAST_KILL_POINTS;
    }
  }
}

export function tick(prev: World, input: ShooterInput, dp: DifficultyParams): TickResult {
  const world: World = {
    ...prev,
    hero: { ...prev.hero },
    shots: [...prev.shots],
    bubShots: [...prev.bubShots],
    zombies: prev.zombies,
    grenades: prev.grenades,
  };

  let zombieKilled = false;
  let bubKilled = false;
  let heroHit = false;
  let grenadeDetonated = false;
  let ambulanceDestroyed = false;
  let roundAdvanced = false;
  let rescued = false;

  const eff = scaled(world, dp);

  /* ── Hero ── */
  const prevX = world.hero.x;
  world.hero.x = Math.max(HERO_MIN_X, Math.min(HERO_MAX_X, input.heroX));
  world.hero.moveDir = world.hero.x > prevX + 0.1 ? 1 : world.hero.x < prevX - 0.1 ? -1 : 0;
  world.hero.firing = false;
  if (world.hero.invuln > 0) world.hero.invuln -= 1;
  world.hero.animMs += FIXED_DT;
  if (world.hero.animMs >= ANIM_FRAME_MS) {
    world.hero.frame = world.hero.frame === 0 ? 1 : 0;
    world.hero.animMs = 0;
  }

  /* ── Player fire (Uzi) ── */
  if (world.hero.cooldownMs > 0) world.hero.cooldownMs -= FIXED_DT;
  if (input.fire && world.hero.cooldownMs <= 0 && world.shots.length < MAX_SHOTS) {
    world.shots.push({
      id: world.nextId++,
      x: world.hero.x + HERO_MUZZLE_DX,
      y: HERO_Y + HERO_MUZZLE_DY,
      vx: 0,
      vy: -SHOT_SPEED,
    });
    world.hero.cooldownMs = SHOT_COOLDOWN_MS;
    world.hero.firing = true;
  }

  /* ── Projectiles move ── */
  for (const s of world.shots) s.y += s.vy;
  for (const b of world.bubShots) {
    b.x += b.vx;
    b.y += b.vy;
  }
  world.shots = world.shots.filter((s) => s.y > -8);
  world.bubShots = world.bubShots.filter((b) => b.y < BOARD_H + 8 && b.x > -8 && b.x < BOARD_W + 8);

  /* ── Round timer / helicopter cycle ── */
  if (world.celebrationMs > 0) {
    world.celebrationMs -= FIXED_DT;
    if (world.celebrationMs < 0) world.celebrationMs = 0;
  } else {
    world.roundMsLeft -= FIXED_DT;
    if (world.roundMsLeft <= 0) {
      roundAdvanced = true;
      if (world.round < ROUND_COUNT) {
        world.round += 1;
        world.roundTotalMs = ROUND_DURATIONS_MS[world.round - 1]!;
        world.roundMsLeft = world.roundTotalMs;
        world.heliRise = 0;
      } else {
        // Extraction complete!
        rescued = true;
        world.cycle += 1;
        world.score += 1000;
        world.round = 1;
        world.roundTotalMs = ROUND_DURATIONS_MS[0]!;
        world.roundMsLeft = world.roundTotalMs;
        world.heliRise = 0;
        world.celebrationMs = RESCUE_CELEBRATION_MS;
        world.bunkerIntegrity = world.bunkerMaxIntegrity;
        // The chopper lifts off with the survivors — the lot clears.
        world.zombies = [];
        world.bubShots = [];
        world.grenades = [];
        world.ambulance = null;
      }
    }
    // Helicopter climbs during the takeoff round.
    if (world.round === ROUND_COUNT) {
      const elapsed = world.roundTotalMs - world.roundMsLeft;
      world.heliRise = HELI_TAKEOFF_RISE * Math.max(0, Math.min(1, elapsed / world.roundTotalMs));
    }
  }

  const spawning = world.celebrationMs <= 0;

  /* ── Spawning ── */
  if (spawning) {
    const living = world.zombies.reduce((n, z) => n + (z.hp > 0 ? 1 : 0), 0);
    world.spawnTimerMs -= FIXED_DT;
    if (world.spawnTimerMs <= 0 && living < MAX_ZOMBIES) {
      spawnZombie(world, dp, "civilian");
      world.spawnTimerMs = eff.spawnIntervalMs * rand(0.8, 1.2);
    }
    world.bubTimerMs -= FIXED_DT;
    if (world.bubTimerMs <= 0 && living < MAX_ZOMBIES) {
      spawnZombie(world, dp, "bub");
      world.bubTimerMs = eff.bubIntervalMs * rand(0.85, 1.15);
    }
  }

  /* ── Ambulance ── */
  if (world.ambulance) {
    const amb = { ...world.ambulance };
    if (amb.exploding > 0) {
      amb.exploding -= 1;
      world.ambulance = amb.exploding <= 0 ? null : amb;
    } else {
      amb.y += AMBULANCE_SPEED * (1 + world.cycle * 0.12);
      if (amb.y > BOARD_H + AMBULANCE_H) world.ambulance = null;
      else world.ambulance = amb;
    }
  } else if (spawning) {
    world.ambulanceTimerMs -= FIXED_DT;
    if (world.ambulanceTimerMs <= 0) {
      world.ambulance = {
        x: rand(SPAWN_MARGIN, BOARD_W - SPAWN_MARGIN - AMBULANCE_W),
        y: -AMBULANCE_H,
        hp: dp.ambulanceHp,
        exploding: 0,
      };
      world.ambulanceTimerMs = AMBULANCE_INTERVAL_MS * rand(0.85, 1.15);
    }
  }

  /* ── Zombies: move, animate, Bub fire, breach check ── */
  let overrun = false;
  for (const z of world.zombies) {
    if (z.hp <= 0) {
      if (z.dying > 0) z.dying -= 1;
      continue;
    }
    z.dirTimerMs -= FIXED_DT;
    if (z.dirTimerMs <= 0) {
      applyDir(z, rollDir(), z.kind === "bub" ? eff.zombieSpeed * 0.85 : eff.zombieSpeed);
      z.dirTimerMs = rand(DIR_REROLL_MS * 0.7, DIR_REROLL_MS * 1.3);
    }
    z.x += z.vx;
    z.y += z.vy;
    if (z.x < ZOMBIE_RADIUS) {
      z.x = ZOMBIE_RADIUS;
      z.vx = Math.abs(z.vx);
    } else if (z.x > BOARD_W - ZOMBIE_RADIUS) {
      z.x = BOARD_W - ZOMBIE_RADIUS;
      z.vx = -Math.abs(z.vx);
    }
    z.animMs += FIXED_DT;
    if (z.animMs >= ANIM_FRAME_MS) {
      z.frame = z.frame === 0 ? 1 : 0;
      z.animMs = 0;
    }

    if (z.kind === "bub") {
      z.fireTimerMs -= FIXED_DT;
      if (z.fireTimerMs <= 0 && z.y > 8) {
        const dir = rollDir();
        z.aim = dir;
        const vx = dir === "down-left" ? -BUB_SHOT_SPEED * DIAG : dir === "down-right" ? BUB_SHOT_SPEED * DIAG : 0;
        const vy = dir === "down" ? BUB_SHOT_SPEED : BUB_SHOT_SPEED * DIAG;
        world.bubShots.push({ id: world.nextId++, x: z.x, y: z.y + 10, vx, vy });
        z.fireTimerMs = BUB_FIRE_INTERVAL_MS * rand(0.85, 1.3);
      }
    }

    // Breach: a zombie reaching the bunker line is absorbed; enough breaches lose.
    if (z.y >= BUNKER_Y) {
      z.hp = 0;
      z.dying = 0; // consumed at the line (no death animation)
      world.bunkerIntegrity -= 1;
      if (world.bunkerIntegrity <= 0) overrun = true;
    }
  }

  /* ── Collisions: player shots ── */
  const survivingShots: Projectile[] = [];
  for (const shot of world.shots) {
    let consumed = false;

    // vs ambulance (driving)
    if (world.ambulance && world.ambulance.exploding <= 0) {
      const a = world.ambulance;
      if (shot.x >= a.x && shot.x <= a.x + AMBULANCE_W && shot.y >= a.y && shot.y <= a.y + AMBULANCE_H) {
        a.hp -= 1;
        if (a.hp <= 0) {
          a.exploding = AMBULANCE_EXPLODE_TOTAL;
          blast(world, a.x + AMBULANCE_W / 2, a.y + AMBULANCE_H / 2, AMBULANCE_BLAST_RADIUS);
          world.score += AMBULANCE_SCORE;
          ambulanceDestroyed = true;
        }
        continue; // shot consumed
      }
    }

    // vs grenades (armed)
    let hitGrenade = false;
    for (const g of world.grenades) {
      if (!g.armed) continue;
      if (dist2(shot.x, shot.y, g.x, g.y) <= 12 * 12) {
        g.armed = false;
        g.exploding = GRENADE_EXPLODE_TOTAL;
        blast(world, g.x, g.y, GRENADE_BLAST_RADIUS);
        grenadeDetonated = true;
        hitGrenade = true;
        break;
      }
    }
    if (hitGrenade) continue;

    // vs zombies (nearest alive overlap)
    for (const z of world.zombies) {
      if (z.hp <= 0) continue;
      const r = z.kind === "bub" ? BUB_RADIUS : ZOMBIE_RADIUS;
      if (dist2(shot.x, shot.y, z.x, z.y) <= r * r) {
        z.hp -= 1;
        if (z.hp <= 0) {
          z.dying = DEATH_FRAMES;
          if (z.kind === "bub") {
            world.score += BUB_SCORE;
            bubKilled = true;
            if (RNG() < BUB_GRENADE_DROP_CHANCE) {
              world.grenades.push({ id: world.nextId++, x: z.x, y: z.y, armed: true, exploding: 0 });
            }
          } else {
            world.score += ZOMBIE_SCORE;
            zombieKilled = true;
          }
        }
        consumed = true;
        break;
      }
    }
    if (consumed) continue;

    survivingShots.push(shot);
  }
  world.shots = survivingShots;

  /* ── Bub bullets vs hero ── */
  const heroCx = world.hero.x + HERO_SIZE / 2;
  const heroCy = HERO_Y + HERO_SIZE / 2;
  const survivingBubShots: Projectile[] = [];
  for (const b of world.bubShots) {
    if (world.hero.invuln <= 0 && dist2(b.x, b.y, heroCx, heroCy) <= 12 * 12) {
      world.lives -= 1;
      world.hero.invuln = HERO_INVULN_FRAMES;
      heroHit = true;
      continue;
    }
    survivingBubShots.push(b);
  }
  world.bubShots = survivingBubShots;

  /* ── Grenade explosion animations ── */
  for (const g of world.grenades) {
    if (!g.armed && g.exploding > 0) g.exploding -= 1;
  }
  world.grenades = world.grenades.filter((g) => g.armed || g.exploding > 0);

  /* ── Cull finished corpses ── */
  world.zombies = world.zombies.filter((z) => z.hp > 0 || z.dying > 0);

  /* ── Resolve status ── */
  const status: TickResult["status"] = world.lives <= 0 || overrun ? "game-over" : "running";

  return {
    world,
    status,
    zombieKilled,
    bubKilled,
    heroHit,
    grenadeDetonated,
    ambulanceDestroyed,
    roundAdvanced,
    rescued,
  };
}
