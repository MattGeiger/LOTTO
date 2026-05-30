/* ── Star Swarm – Numeric constants ──
 *
 * A fixed-shooter (Space Invaders lineage). All gameplay runs on a square,
 * pixel-art virtual canvas; CSS scales it up with `image-rendering: pixelated`.
 * Coordinates are in virtual board pixels.
 */

/** Native (virtual) canvas size in pixels. Square board. */
export const BOARD_W = 224;
export const BOARD_H = 224;

/** Fixed timestep in milliseconds (~60 fps). Matches the other arcade games. */
export const FIXED_STEP_MS = 16;

/** Starting number of lives. */
export const INITIAL_LIVES = 3;

/* ── Player ship ── */
export const SHIP_W = 16;
export const SHIP_H = 8;
/** Ship top-edge Y — parked near the bottom of the board. */
export const SHIP_Y = BOARD_H - SHIP_H - 8;
/** Keyboard ship movement speed (px per frame while an arrow is held). */
export const SHIP_KEY_SPEED = 2.4;
/** Frames of invulnerability (blink) after the ship is hit. */
export const SHIP_INVULN_FRAMES = 90;

/* ── Player shots ── */
export const SHOT_W = 2;
export const SHOT_H = 6;
export const SHOT_SPEED = 4.2;
/** Max simultaneous player shots on screen. */
export const MAX_SHOTS = 2;
/** Cooldown between shots (ms). */
export const SHOT_COOLDOWN_MS = 320;

/* ── Invader formation ── */
export const INV_ROWS = 5;
export const INV_COLS = 8;
/** Per-invader cell (sprites are centred inside this cell). */
export const INV_CELL_W = 18;
export const INV_CELL_H = 16;
/** Drawn sprite size (must be <= cell). */
export const INV_SPRITE_W = 12;
export const INV_SPRITE_H = 8;
/** Formation starting offsets (top-left of the cell grid) for wave 1. */
export const INV_START_X = (BOARD_W - INV_COLS * INV_CELL_W) / 2;
export const INV_START_Y = 26;
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

/* ── Invader bombs ── */
export const BOMB_W = 2;
export const BOMB_H = 6;
export const BOMB_SPEED = 1.9;
export const MAX_BOMBS = 4;

/* ── Scoring (classic: higher rows are worth more) ── */
export const ROW_POINTS: readonly number[] = [40, 30, 20, 10, 10];
export const UFO_POINTS: readonly number[] = [50, 100, 150, 200, 300];

/* ── UFO bonus saucer ── */
export const UFO_W = 16;
export const UFO_H = 7;
export const UFO_Y = 12;
export const UFO_SPEED = 1.1;
/** Min/max delay between UFO appearances (ms). */
export const UFO_MIN_DELAY_MS = 14_000;
export const UFO_MAX_DELAY_MS = 26_000;

/* ── Bunkers (destructible shields) ── */
export const BUNKER_COUNT = 4;
/** Each bunker is a grid of destructible blocks. */
export const BUNKER_COLS = 6;
export const BUNKER_ROWS = 4;
export const BUNKER_BLOCK = 4;
export const BUNKER_W = BUNKER_COLS * BUNKER_BLOCK;
export const BUNKER_H = BUNKER_ROWS * BUNKER_BLOCK;
export const BUNKER_Y = SHIP_Y - 34;

/** Explosion flash duration (frames) for a killed invader. */
export const EXPLOSION_FRAMES = 12;
