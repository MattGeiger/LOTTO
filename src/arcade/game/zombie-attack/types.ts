/* ── Zombie Attack! – Type definitions ── */

export type GameResultStatus = "running" | "wave-cleared" | "game-over";

/** A single zombie in the horde grid. */
export type Zombie = {
  /** Column index (0-based) within the formation. */
  col: number;
  /** Row index (0-based); 0 is the top (back) row. */
  row: number;
  /** Sprite tier (0..2): 0 skinny, 1 ribs-exposed, 2 fat. */
  tier: 0 | 1 | 2;
  alive: boolean;
  /** Carries a bomb — drops it in place when shot (highlighted in the render). */
  carriesBomb: boolean;
};

/** A player shot (travels up) or a thrown zombie bomb (travels down). */
export type Projectile = {
  id: number;
  x: number;
  y: number;
  vy: number;
};

/** A bomb dropped by a shot bomb-carrier. Detonates (AoE) if the player shoots it. */
export type GroundBomb = {
  id: number;
  x: number;
  y: number;
  vy: number;
};

/** One destructible block in a bunker. */
export type BunkerBlock = {
  x: number;
  y: number;
  alive: boolean;
};

/** A short-lived explosion flash. `radius` > 0 draws an expanding blast ring. */
export type Explosion = {
  x: number;
  y: number;
  /** Remaining frames. */
  life: number;
  /** Starting life (for ring growth). */
  maxLife: number;
  /** Blast ring radius in px; 0 = a small sprite burst. */
  radius: number;
};

/** The flaming vehicle barreling toward the fence; inactive when null. */
export type Vehicle = {
  x: number;
  y: number;
  /** Hits remaining before it's destroyed. */
  hp: number;
  points: number;
} | null;

/** Complete world state for one frame. */
export type World = {
  shipX: number;
  /** Frames of remaining invulnerability (blink) after a hit; 0 = vulnerable. */
  shipInvuln: number;

  zombies: Zombie[];
  /** Formation origin (top-left of the cell grid). */
  formX: number;
  formY: number;
  /** Current horizontal direction of the formation: +1 right, -1 left. */
  formDir: 1 | -1;
  /** Animation frame toggle (0/1), flipped on each formation step. */
  animFrame: 0 | 1;
  /** Accumulated ms toward the next formation step. */
  stepClockMs: number;

  shots: Projectile[];
  bombs: Projectile[];
  groundBombs: GroundBomb[];
  nextProjectileId: number;
  /** Cooldown remaining before the gun may fire again (ms). */
  shotCooldownMs: number;
  /** Accumulated ms toward the next thrown bomb. */
  bombClockMs: number;

  bunkers: BunkerBlock[];

  /** Fence health; <= 0 means collapsed (zombies break through). */
  fenceHp: number;
  fenceMaxHp: number;

  vehicle: Vehicle;
  /** Countdown (ms) to the next vehicle appearance. */
  vehicleTimerMs: number;

  explosions: Explosion[];

  wave: number;
  lives: number;
  score: number;
};

/** Difficulty-dependent parameters threaded through the engine. */
export type DifficultyParams = {
  /** Base formation step cadence (ms) at full horde. */
  stepBaseMs: number;
  /** Average ms between thrown bombs. */
  bombIntervalMs: number;
  /** Whether sandbag bunkers are present this game (false on Nightmare). */
  bunkers: boolean;
  /** Whether bunkers are immune to enemy bombs (Very Easy) — player shots still erode. */
  bunkerBombProof: boolean;
  /** Hits required to destroy the flaming vehicle (3 → 5 by difficulty). */
  vehicleHp: number;
};

/** Per-frame input from the page (slider + fire button + keyboard). */
export type ShooterInput = {
  /** Absolute target gun X (left edge), already clamped by the caller. */
  shipX: number;
  /** Whether the fire control is currently held/pressed. */
  fire: boolean;
};

/** Result of a single `tick`, consumed by the page for state + haptics. */
export type TickResult = {
  world: World;
  status: GameResultStatus;
  /** A zombie was destroyed this tick (for haptics/sfx). */
  zombieKilled: boolean;
  /** The vehicle was destroyed this tick. */
  vehicleKilled: boolean;
  /** A dropped bomb was detonated this tick. */
  bombDetonated: boolean;
  /** The gun was hit (lost a life) this tick. */
  shipHit: boolean;
};
