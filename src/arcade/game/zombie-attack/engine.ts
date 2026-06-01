/* ── Zombie Attack! – Game engine (pure, fixed-timestep, v3: fence siege) ── */

import {
  AMBULANCE_BLAST_RADIUS,
  AMBULANCE_EXPLODE_FRAME_MS,
  AMBULANCE_H,
  AMBULANCE_INTERVAL_MS,
  AMBULANCE_SCORE,
  AMBULANCE_SPEED,
  AMBULANCE_W,
  ANIM_FRAME_MS,
  ZOMBIE_ANIM_FRAME_MS,
  ATTACK_ANIM_FRAMES,
  ATTACK_INTERVAL_MS,
  BLAST_KILL_POINTS,
  BOARD_H,
  BOARD_W,
  BUB_ATTACK_POSE_FRAMES,
  BUB_FIRE_CHANCE_AIMED,
  BUB_FIRE_CHANCE_IDLE,
  BUB_FIRE_INTERVAL_MS,
  BUB_HP,
  BUB_KILL_CHANCE,
  BUB_RADIUS,
  BUB_REVIVE_CHANCE,
  BUB_SCORE,
  BUB_SHOT_SPEED,
  DEATH_FRAMES,
  DIR_REROLL_MS,
  FENCE_ATTACK_CHANCE_PER_ZOMBIE,
  FENCE_MAX_HP,
  FENCE_Y,
  GRENADE_BLAST_RADIUS,
  GRENADE_EXPLODE_FRAME_MS,
  HELI_LIFT_START,
  HELI_TAKEOFF_RISE,
  HELO_ATTACK_CHANCE,
  HELO_ATTACK_Y,
  HERO_CLOSE_RANGE,
  HERO_INVULN_FRAMES,
  HERO_MAX_X,
  HERO_MIN_X,
  HERO_MUZZLE_DX,
  HERO_MUZZLE_DY,
  HERO_SIZE,
  HERO_Y,
  HURT_FRAMES,
  INITIAL_LIVES,
  MAX_SHOTS,
  MAX_ZOMBIES,
  RESCUE_CELEBRATION_MS,
  REVIVE_FRAMES,
  ROUND_COUNT,
  ROUND_DURATIONS_MS,
  SHOT_COOLDOWN_MS,
  SHOT_SPEED,
  SPAWN_MARGIN,
  ZOMBIE_ANIM_REF_SPEED,
  ZOMBIE_KILL_CHANCE,
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
const DIAG = Math.SQRT1_2;
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
  const z: Zombie = {
    id: world.nextId++,
    kind,
    type: Math.floor(RNG() * ZOMBIE_TYPE_COUNT),
    x: rand(SPAWN_MARGIN, BOARD_W - SPAWN_MARGIN),
    y: -16,
    vx: 0,
    vy: zombieSpeed,
    dirTimerMs: rand(DIR_REROLL_MS * 0.5, DIR_REROLL_MS),
    animMs: rand(0, ZOMBIE_ANIM_FRAME_MS),
    frame: 0,
    hp: kind === "bub" ? BUB_HP : 1,
    fireTimerMs: rand(BUB_FIRE_INTERVAL_MS * 0.5, BUB_FIRE_INTERVAL_MS),
    aim: "down",
    attackFrames: 0,
    hurtFrames: 0,
    attacking: 0,
    attackTimerMs: rand(0, ATTACK_INTERVAL_MS),
    dying: 0,
    reviving: 0,
  };
  applyDir(z, rollDir(), kind === "bub" ? zombieSpeed * 0.85 : zombieSpeed);
  world.zombies.push(z);
}

/** A fresh world for round 1 of cycle 0. */
export function initialWorld(dp: DifficultyParams): World {
  return {
    hero: { x: (BOARD_W - HERO_SIZE) / 2, invuln: 0, firing: false, moveDir: 0, animMs: 0, frame: 0, cooldownMs: 0 },
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
    fenceHp: dp.fence ? FENCE_MAX_HP : 0,
    fenceMaxHp: dp.fence ? FENCE_MAX_HP : 0,
    lives: INITIAL_LIVES,
    score: 0,
  };
}

function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

/** A grenade/ambulance blast kills outright (no wound/revive roll). */
function blast(world: World, cx: number, cy: number, radius: number, scoreMul: number): void {
  const r2 = radius * radius;
  for (const z of world.zombies) {
    if (z.dying !== 0 || z.reviving > 0) continue;
    if (dist2(z.x, z.y, cx, cy) <= r2) {
      z.dying = DEATH_FRAMES;
      world.score += Math.round(BLAST_KILL_POINTS * scoreMul);
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
  let heloWrecked = false;

  const eff = scaled(world, dp);
  const sm = dp.scoreMultiplier;
  // Walk/idle animation cadence tracks the actual move speed (faster = snappier).
  const zAnimMs = Math.max(100, (ZOMBIE_ANIM_FRAME_MS * ZOMBIE_ANIM_REF_SPEED) / eff.zombieSpeed);

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
    world.shots.push({ id: world.nextId++, x: world.hero.x + HERO_MUZZLE_DX, y: HERO_Y + HERO_MUZZLE_DY, vx: 0, vy: -SHOT_SPEED });
    world.hero.cooldownMs = SHOT_COOLDOWN_MS;
    world.hero.firing = true;
  }

  /* ── Projectiles move ── */
  for (const s of world.shots) s.y += s.vy;
  for (const b of world.bubShots) { b.x += b.vx; b.y += b.vy; }
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
        rescued = true;
        world.cycle += 1;
        world.score += Math.round(1000 * sm);
        world.round = 1;
        world.roundTotalMs = ROUND_DURATIONS_MS[0]!;
        world.roundMsLeft = world.roundTotalMs;
        world.heliRise = 0;
        world.celebrationMs = RESCUE_CELEBRATION_MS;
        world.fenceHp = world.fenceMaxHp;
        world.zombies = [];
        world.bubShots = [];
        world.grenades = [];
        world.ambulance = null;
      }
    }
    if (world.round === ROUND_COUNT) {
      const f = Math.max(0, Math.min(1, (world.roundTotalMs - world.roundMsLeft) / world.roundTotalMs));
      world.heliRise = f <= HELI_LIFT_START ? 0 : HELI_TAKEOFF_RISE * ((f - HELI_LIFT_START) / (1 - HELI_LIFT_START));
    }
  }

  const spawning = world.celebrationMs <= 0;

  /* ── Spawning ── */
  if (spawning) {
    const living = world.zombies.reduce((n, z) => n + (z.dying === 0 && z.reviving === 0 ? 1 : 0), 0);
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
      if (world.fenceHp > 0 && amb.y + AMBULANCE_H >= FENCE_Y) {
        // Crashes the fence: blows up on impact, clearing nearby zombies.
        amb.exploding = AMBULANCE_EXPLODE_TOTAL;
        amb.y = FENCE_Y - AMBULANCE_H / 2;
        blast(world, amb.x + AMBULANCE_W / 2, FENCE_Y, AMBULANCE_BLAST_RADIUS, sm);
        ambulanceDestroyed = true;
        world.ambulance = amb;
      } else if (world.fenceHp <= 0 && amb.y + AMBULANCE_H / 2 >= HELO_ATTACK_Y) {
        heloWrecked = true; // ambulance reaches the helo → game over
        world.ambulance = null;
      } else if (amb.y > BOARD_H + AMBULANCE_H) {
        world.ambulance = null;
      } else {
        world.ambulance = amb;
      }
    }
  } else if (spawning) {
    world.ambulanceTimerMs -= FIXED_DT;
    if (world.ambulanceTimerMs <= 0) {
      world.ambulance = { x: rand(SPAWN_MARGIN, BOARD_W - SPAWN_MARGIN - AMBULANCE_W), y: -AMBULANCE_H, hp: dp.ambulanceHp, exploding: 0 };
      world.ambulanceTimerMs = AMBULANCE_INTERVAL_MS * rand(0.85, 1.15);
    }
  }

  /* ── Zombies: siege the fence, breach, attack ── */
  const fenceUp = world.fenceHp > 0;
  let fenceCount = 0;
  for (const z of world.zombies) {
    if (z.dying === 0 && z.reviving === 0 && fenceUp && z.y >= FENCE_Y - 1) fenceCount += 1;
  }
  const fenceAttackChance = Math.min(1, fenceCount * FENCE_ATTACK_CHANCE_PER_ZOMBIE);

  const heroCx = world.hero.x + HERO_SIZE / 2;
  const heroCy = HERO_Y + HERO_SIZE / 2;

  for (const z of world.zombies) {
    if (z.dying > 0) {
      z.dying -= 1;
      if (z.dying <= 0) z.dying = -1; // finished — culled below
      continue;
    }
    if (z.reviving > 0) {
      z.reviving -= 1;
      if (z.reviving <= 0) z.hp = 1; // back on its feet
      continue;
    }

    // Active zombie.
    if (z.attackFrames > 0) z.attackFrames -= 1;
    if (z.hurtFrames > 0) z.hurtFrames -= 1;
    if (z.attacking > 0) z.attacking -= 1;
    z.animMs += FIXED_DT;
    if (z.animMs >= zAnimMs) { z.frame = z.frame === 0 ? 1 : 0; z.animMs = 0; }
    z.attackTimerMs -= FIXED_DT;
    const canAttack = z.attackTimerMs <= 0;
    if (canAttack) z.attackTimerMs = ATTACK_INTERVAL_MS;

    const atFence = fenceUp && z.y >= FENCE_Y - 1;
    if (atFence) {
      z.y = FENCE_Y;
      z.vx = 0;
      if (canAttack && RNG() < fenceAttackChance) {
        world.fenceHp = Math.max(0, world.fenceHp - 1);
        z.attacking = ATTACK_ANIM_FRAMES;
      }
    } else {
      z.dirTimerMs -= FIXED_DT;
      if (z.dirTimerMs <= 0) {
        applyDir(z, rollDir(), z.kind === "bub" ? eff.zombieSpeed * 0.85 : eff.zombieSpeed);
        z.dirTimerMs = rand(DIR_REROLL_MS * 0.7, DIR_REROLL_MS * 1.3);
      }
      z.x += z.vx;
      z.y += z.vy;
      if (z.x < ZOMBIE_RADIUS) { z.x = ZOMBIE_RADIUS; z.vx = Math.abs(z.vx); }
      else if (z.x > BOARD_W - ZOMBIE_RADIUS) { z.x = BOARD_W - ZOMBIE_RADIUS; z.vx = -Math.abs(z.vx); }
      if (fenceUp && z.y > FENCE_Y) z.y = FENCE_Y;

      if (!fenceUp) {
        // Breached: maul the hero up close, else wreck the helo.
        if (dist2(z.x, z.y, heroCx, heroCy) <= HERO_CLOSE_RANGE * HERO_CLOSE_RANGE) {
          if (canAttack) {
            z.attacking = ATTACK_ANIM_FRAMES;
            if (world.hero.invuln <= 0) { world.lives -= 1; world.hero.invuln = HERO_INVULN_FRAMES; heroHit = true; }
          }
        } else if (z.y >= HELO_ATTACK_Y) {
          if (z.y > HELO_ATTACK_Y + 10) z.y = HELO_ATTACK_Y + 10;
          if (canAttack) {
            z.attacking = ATTACK_ANIM_FRAMES;
            if (RNG() < HELO_ATTACK_CHANCE) heloWrecked = true;
          }
        }
      }
    }

    // Bub keeps shooting his 1911 (line-of-sight provoked), wherever he is.
    if (z.kind === "bub") {
      z.fireTimerMs -= FIXED_DT;
      if (z.fireTimerMs <= 0 && z.y > 8) {
        z.fireTimerMs = BUB_FIRE_INTERVAL_MS * rand(0.8, 1.4);
        const ddy = heroCy - z.y;
        if (ddy > 0) {
          const ratio = (heroCx - z.x) / ddy;
          let aimed: MoveDir | null = null;
          if (ratio < -0.4 && ratio > -2.5) aimed = "down-left";
          else if (ratio > 0.4 && ratio < 2.5) aimed = "down-right";
          else if (ratio >= -0.4 && ratio <= 0.4) aimed = "down";
          if (RNG() < (aimed ? BUB_FIRE_CHANCE_AIMED : BUB_FIRE_CHANCE_IDLE)) {
            const dir = aimed ?? rollDir();
            const vx = dir === "down-left" ? -BUB_SHOT_SPEED * DIAG : dir === "down-right" ? BUB_SHOT_SPEED * DIAG : 0;
            const vy = dir === "down" ? BUB_SHOT_SPEED : BUB_SHOT_SPEED * DIAG;
            world.bubShots.push({ id: world.nextId++, x: z.x, y: z.y + 10, vx, vy });
            z.aim = dir;
            z.attackFrames = BUB_ATTACK_POSE_FRAMES;
          }
        }
      }
    }
  }

  /* ── Collisions: player shots (probabilistic) ── */
  const survivingShots: Projectile[] = [];
  for (const shot of world.shots) {
    let consumed = false;

    if (world.ambulance && world.ambulance.exploding <= 0) {
      const a = world.ambulance;
      if (shot.x >= a.x && shot.x <= a.x + AMBULANCE_W && shot.y >= a.y && shot.y <= a.y + AMBULANCE_H) {
        a.hp -= 1;
        if (a.hp <= 0) {
          a.exploding = AMBULANCE_EXPLODE_TOTAL;
          blast(world, a.x + AMBULANCE_W / 2, a.y + AMBULANCE_H / 2, AMBULANCE_BLAST_RADIUS, sm);
          world.score += Math.round(AMBULANCE_SCORE * sm);
          ambulanceDestroyed = true;
        }
        continue;
      }
    }

    let hitGrenade = false;
    for (const g of world.grenades) {
      if (!g.armed) continue;
      if (dist2(shot.x, shot.y, g.x, g.y) <= 12 * 12) {
        g.armed = false;
        g.exploding = GRENADE_EXPLODE_TOTAL;
        blast(world, g.x, g.y, GRENADE_BLAST_RADIUS, sm);
        grenadeDetonated = true;
        hitGrenade = true;
        break;
      }
    }
    if (hitGrenade) continue;

    for (const z of world.zombies) {
      if (z.dying !== 0 || z.reviving > 0) continue; // already down/getting up
      const r = z.kind === "bub" ? BUB_RADIUS : ZOMBIE_RADIUS;
      if (dist2(shot.x, shot.y, z.x, z.y) > r * r) continue;

      // Probabilistic resolution.
      if (z.kind === "bub") {
        if (z.hp > 0) {
          z.hp -= 1; // first two hits only wound
          z.hurtFrames = HURT_FRAMES;
        } else if (RNG() < BUB_KILL_CHANCE) {
          if (RNG() < BUB_REVIVE_CHANCE) {
            z.reviving = REVIVE_FRAMES;
          } else {
            z.dying = DEATH_FRAMES;
            world.score += Math.round(BUB_SCORE * sm);
            bubKilled = true;
            if (RNG() < dp.bubGrenadeChance) {
              world.grenades.push({ id: world.nextId++, x: z.x, y: z.y, armed: true, exploding: 0 });
            }
          }
        } else {
          z.hurtFrames = HURT_FRAMES; // depleted but survived
        }
      } else if (RNG() < ZOMBIE_KILL_CHANCE) {
        if (RNG() < dp.reviveChance) {
          z.reviving = REVIVE_FRAMES;
        } else {
          z.dying = DEATH_FRAMES;
          world.score += Math.round(ZOMBIE_SCORE * sm);
          zombieKilled = true;
        }
      } else {
        z.hurtFrames = HURT_FRAMES; // wound
      }
      consumed = true;
      break;
    }
    if (consumed) continue;

    survivingShots.push(shot);
  }
  world.shots = survivingShots;

  /* ── Bub bullets vs hero ── */
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
  world.zombies = world.zombies.filter((z) => z.dying >= 0);

  /* ── Resolve status ── */
  const status: TickResult["status"] = world.lives <= 0 || heloWrecked ? "game-over" : "running";

  return { world, status, zombieKilled, bubKilled, heroHit, grenadeDetonated, ambulanceDestroyed, roundAdvanced, rescued };
}
