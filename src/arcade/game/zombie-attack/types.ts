/* ── Zombie Attack! – Type definitions (v2) ── */

export type GameResultStatus = "running" | "game-over";

export type MoveDir = "down" | "down-left" | "down-right";
export type ZombieKind = "civilian" | "bub";

/** A single shambling zombie (or Bub) descending the lot. */
export type Zombie = {
  id: number;
  kind: ZombieKind;
  /** Civilian sprite variant 0..3 (unused for Bub). */
  type: number;
  /** Centre position. */
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** ms until the next stochastic direction re-roll. */
  dirTimerMs: number;
  /** Walk-animation accumulator + current frame. */
  animMs: number;
  frame: 0 | 1;
  hp: number;
  /** Bub: ms until the next 1911 shot. */
  fireTimerMs: number;
  /** Bub: current aim direction (drives the attack sprite); null = not aiming. */
  aim: MoveDir | null;
  /** Bub: frames remaining in the gun-firing pose (otherwise he walks/shambles). */
  attackFrames: number;
  /** Frames remaining showing the hurt sprite after a wound. */
  hurtFrames: number;
  /** Frames remaining showing a melee-lunge sprite (fence / helo / hero attack). */
  attacking: number;
  /** ms until the next attack roll while besieging the fence / helo / hero. */
  attackTimerMs: number;
  /** >0 while the death animation plays (frames remaining); 0 = alive. */
  dying: number;
  /** >0 while the "get back up" (reverse death) animation plays; then revives. */
  reviving: number;
};

/** A bullet: player shots travel up (vx 0); Bub bullets can angle (vx, vy). */
export type Projectile = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

/** A live grenade dropped by Bub. Sits in place; shoot it to detonate. */
export type Grenade = {
  id: number;
  x: number;
  y: number;
  /** True until shot; a shot detonates it. */
  armed: boolean;
  /** >0 while the explosion animation plays (frames remaining). */
  exploding: number;
};

/** The ambulance hazard: drives down a lane; shoot it to blow it (clears zombies). */
export type Ambulance = {
  x: number;
  y: number;
  hp: number;
  /** 0 = driving; >0 = explosion-animation frames remaining. */
  exploding: number;
} | null;

/** The hero (player). */
export type Hero = {
  /** Sprite-left X. */
  x: number;
  /** Frames of remaining invulnerability (blink) after a hit. */
  invuln: number;
  /** Whether the hero fired this tick (sprite selection). */
  firing: boolean;
  /** -1 / 0 / 1 movement this tick (sprite flip + run animation). */
  moveDir: -1 | 0 | 1;
  animMs: number;
  frame: 0 | 1;
  /** ms until the gun may fire again. */
  cooldownMs: number;
};

/** Complete world state for one frame. */
export type World = {
  hero: Hero;
  shots: Projectile[];
  bubShots: Projectile[];
  zombies: Zombie[];
  grenades: Grenade[];
  ambulance: Ambulance;
  nextId: number;

  spawnTimerMs: number;
  bubTimerMs: number;
  ambulanceTimerMs: number;

  /** Round 1..4 within the current cycle. */
  round: number;
  /** Completed extractions (rescues); raises difficulty. */
  cycle: number;
  roundMsLeft: number;
  roundTotalMs: number;
  /** >0 during the post-extraction celebration flash. */
  celebrationMs: number;
  /** Px the helicopter has climbed during takeoff (round 4). */
  heliRise: number;

  /** Fence hit points; 0 = breached (zombies pour through toward the helo). */
  fenceHp: number;
  fenceMaxHp: number;

  lives: number;
  score: number;
};

/** Difficulty-dependent parameters threaded through the engine. */
export type DifficultyParams = {
  /** Base ms between zombie spawns. */
  spawnIntervalMs: number;
  /** Base downward speed (px/frame). */
  zombieSpeed: number;
  /** Base ms between Bub spawns. */
  bubIntervalMs: number;
  /** Hits to destroy the ambulance. */
  ambulanceHp: number;
  /** Chance a killed civilian gets back up (0 disables revives). */
  reviveChance: number;
  /** Multiplier applied to all score gains. */
  scoreMultiplier: number;
  /** Lives granted on each successful extraction (rescue). */
  rescueLifeBonus: number;
  /** Chance Bub drops a grenade on death. */
  bubGrenadeChance: number;
  /** Whether a protective fence exists this game (false on Nightmare). */
  fence: boolean;
};

/** Per-frame input from the page (slider/keyboard + fire control). */
export type ShooterInput = {
  /** Absolute target hero left-edge X (already clamped by the caller). */
  heroX: number;
  /** Whether the fire control is currently held/pressed. */
  fire: boolean;
};

/** Result of a single `tick`, consumed by the page for HUD + feedback. */
export type TickResult = {
  world: World;
  status: GameResultStatus;
  zombieKilled: boolean;
  bubKilled: boolean;
  heroHit: boolean;
  grenadeDetonated: boolean;
  ambulanceDestroyed: boolean;
  /** A round boundary was crossed this tick. */
  roundAdvanced: boolean;
  /** A full 4-round cycle completed (helicopter extracted) this tick. */
  rescued: boolean;
};
