/* ── Zombie Attack! – Numeric constants ──
 *
 * A fixed-shooter (Space Invaders lineage) re-themed as a zombie horde defense.
 * All gameplay runs on a tall pixel-art virtual canvas; CSS scales it up with
 * `image-rendering: pixelated`. Coordinates are in virtual board pixels.
 *
 * Layout, top → bottom: zombie horde → FENCE → bunkers (sandbags) → your gun.
 */

/** Native (virtual) canvas size in pixels. Taller-than-wide (4:5). */
export const BOARD_W = 224;
export const BOARD_H = 280;

/** Fixed timestep in milliseconds (~60 fps). Matches the other arcade games. */
export const FIXED_STEP_MS = 16;

/** Starting number of lives. */
export const INITIAL_LIVES = 3;

/* ── Player gun ── */
export const SHIP_W = 16;
export const SHIP_H = 8;
/** Gun top-edge Y — parked near the bottom of the board. */
export const SHIP_Y = BOARD_H - SHIP_H - 8;
/** Keyboard move speed (px per frame while an arrow is held). */
export const SHIP_KEY_SPEED = 2.4;
/** Frames of invulnerability (blink) after the gun is hit. */
export const SHIP_INVULN_FRAMES = 90;

/* ── Player shots ── */
export const SHOT_W = 2;
export const SHOT_H = 6;
export const SHOT_SPEED = 4.2;
/** Max simultaneous player shots on screen. */
export const MAX_SHOTS = 2;
/** Cooldown between shots (ms). */
export const SHOT_COOLDOWN_MS = 320;

/* ── Zombie horde (formation) ── */
export const INV_ROWS = 5;
export const INV_COLS = 8;
/** Per-zombie cell (sprites are centred inside this cell). */
export const INV_CELL_W = 18;
export const INV_CELL_H = 16;
/** Drawn sprite size (must be <= cell). */
export const INV_SPRITE_W = 12;
export const INV_SPRITE_H = 8;
/** Formation starting offsets (top-left of the cell grid) for wave 1. */
export const INV_START_X = (BOARD_W - INV_COLS * INV_CELL_W) / 2;
export const INV_START_Y = 24;
/** Each wave drops the formation start down by this much (capped by engine). */
export const INV_WAVE_DROP = 8;
/** Horizontal step distance per move (px). */
export const INV_STEP_X = 4;
/** Vertical drop when the formation reverses at a wall (px). */
export const INV_STEP_Y = 8;
/** Side padding the formation must respect before reversing. */
export const INV_EDGE_PAD = 6;
/** The formation move cadence (ms) scales between base and base*MIN_FRACTION. */
export const INV_STEP_MIN_FRACTION = 0.26;
/** How many zombies in a fresh wave carry a bomb (highlighted). */
export const BOMB_CARRIERS_PER_WAVE = 3;

/* ── Thrown bombs (a horde member lobs one at your gun) ── */
export const BOMB_W = 2;
export const BOMB_H = 6;
export const BOMB_SPEED = 1.9;
export const MAX_BOMBS = 4;

/* ── Dropped bombs (from a shot bomb-carrier) + blast ── */
export const GROUND_BOMB_W = 5;
export const GROUND_BOMB_H = 5;
/** Dropped bombs drift down slowly, giving you time to detonate them. */
export const GROUND_BOMB_SPEED = 1.0;
/** Blast radius (px) covering ~25% of the board area when detonated. */
export const BLAST_RADIUS = Math.round(Math.sqrt((0.25 * BOARD_W * BOARD_H) / Math.PI));
/** Frames the blast ring is drawn. */
export const BLAST_FRAMES = 16;
/** Points per zombie caught in a blast. */
export const BLAST_KILL_POINTS = 25;

/* ── Scoring (closer-to-the-fence rows are worth less; back rows more) ── */
export const ROW_POINTS: readonly number[] = [40, 30, 20, 10, 10];

/* ── Fence (collapses under horde pressure; in front of the bunkers) ── */
export const BUNKER_Y = SHIP_Y - 34;
/** Fence sits just above the bunker line. Reaching the bunker line = game over. */
export const FENCE_Y = BUNKER_Y - 16;
export const FENCE_H = 6;
/** Fence health. Pressure drains it by (alive zombies × drain) per horde step. */
export const FENCE_MAX_HP = 900;
export const FENCE_DRAIN_PER_ZOMBIE = 2;

/* ── Flaming vehicle (descends top→bottom toward the fence) ── */
export const VEHICLE_W = 18;
export const VEHICLE_H = 16;
export const VEHICLE_SPEED = 0.55;
export const VEHICLE_POINTS = 250;
/** Min/max delay between vehicle appearances (ms). */
export const VEHICLE_MIN_DELAY_MS = 16_000;
export const VEHICLE_MAX_DELAY_MS = 30_000;

/* ── Bunkers (destructible sandbag walls) ── */
export const BUNKER_COUNT = 4;
/** Each bunker is a grid of destructible blocks. */
export const BUNKER_COLS = 6;
export const BUNKER_ROWS = 4;
export const BUNKER_BLOCK = 4;
export const BUNKER_W = BUNKER_COLS * BUNKER_BLOCK;
export const BUNKER_H = BUNKER_ROWS * BUNKER_BLOCK;

/** Explosion flash duration (frames) for a killed zombie. */
export const EXPLOSION_FRAMES = 12;
