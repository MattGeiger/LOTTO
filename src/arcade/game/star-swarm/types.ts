/* ── Star Swarm – Type definitions ── */

export type GameResultStatus = "running" | "wave-cleared" | "game-over";

/** A single invader in the formation grid. */
export type Invader = {
  /** Column index (0-based) within the formation. */
  col: number;
  /** Row index (0-based); 0 is the top row. */
  row: number;
  /** Sprite tier (0..2) — drives appearance and base points group. */
  tier: 0 | 1 | 2;
  alive: boolean;
};

/** A player shot (travels up) or invader bomb (travels down). */
export type Projectile = {
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

/** A short-lived explosion flash at a board position. */
export type Explosion = {
  x: number;
  y: number;
  /** Remaining frames. */
  life: number;
};

/** The bonus saucer. `dir` is +1 (L→R) or -1 (R→L); inactive when null. */
export type Ufo = {
  x: number;
  dir: 1 | -1;
  points: number;
} | null;

/** Complete world state for one frame. */
export type World = {
  shipX: number;
  /** Frames of remaining invulnerability (blink) after a hit; 0 = vulnerable. */
  shipInvuln: number;

  invaders: Invader[];
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
  nextProjectileId: number;
  /** Cooldown remaining before the ship may fire again (ms). */
  shotCooldownMs: number;
  /** Accumulated ms toward the next invader bomb. */
  bombClockMs: number;

  bunkers: BunkerBlock[];

  ufo: Ufo;
  /** Countdown (ms) to the next UFO appearance. */
  ufoTimerMs: number;

  explosions: Explosion[];

  wave: number;
  lives: number;
  score: number;
};

/** Difficulty-dependent parameters threaded through the engine. */
export type DifficultyParams = {
  /** Base formation step cadence (ms) at full formation. */
  stepBaseMs: number;
  /** Average ms between invader bombs. */
  bombIntervalMs: number;
};

/** Per-frame input from the page (slider + fire button + keyboard). */
export type ShooterInput = {
  /** Absolute target ship X (left edge), already clamped by the caller. */
  shipX: number;
  /** Whether the fire control is currently held/pressed. */
  fire: boolean;
};

/** Result of a single `tick`, consumed by the page for state + haptics. */
export type TickResult = {
  world: World;
  status: GameResultStatus;
  /** An invader was destroyed this tick (for haptics/sfx). */
  invaderKilled: boolean;
  /** The UFO was destroyed this tick. */
  ufoKilled: boolean;
  /** The ship was hit (lost a life) this tick. */
  shipHit: boolean;
};
