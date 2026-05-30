/* ── Star Swarm – Pixel-art sprite bitmaps ──
 *
 * Each sprite is an array of equal-length rows. Any non-space, non-dot
 * character ("X") is a filled pixel; "." / " " are transparent. The renderer
 * draws one board pixel per cell, so a sprite's footprint is cols × rows board
 * pixels.
 */

export type Sprite = readonly string[];

/** Width (cols) and height (rows) of a sprite, in board pixels. */
export function spriteSize(sprite: Sprite): { w: number; h: number } {
  return { w: sprite[0]?.length ?? 0, h: sprite.length };
}

/* ── Invaders: three tiers, two animation frames each (11×8) ── */

const SQUID_A: Sprite = [
  "..X.....X..",
  "...X...X...",
  "..XXXXXXX..",
  ".XX.XXX.XX.",
  "XXXXXXXXXXX",
  "X.XXXXXXX.X",
  "X.X.....X.X",
  "...XX.XX...",
];
const SQUID_B: Sprite = [
  "..X.....X..",
  "X..X...X..X",
  "X.XXXXXXX.X",
  "XXX.XXX.XXX",
  "XXXXXXXXXXX",
  ".XXXXXXXXX.",
  "..X.....X..",
  ".X.......X.",
];

const CRAB_A: Sprite = [
  ".X.......X.",
  "..X.....X..",
  "..XXXXXXX..",
  ".XX.XXX.XX.",
  "XXXXXXXXXXX",
  "X.XXXXXXX.X",
  "X.........X",
  ".X.X...X.X.",
];
const CRAB_B: Sprite = [
  ".X.......X.",
  "X.X.....X.X",
  "X.XXXXXXX.X",
  "XXX.XXX.XXX",
  "XXXXXXXXXXX",
  ".XXXXXXXXX.",
  ".X.......X.",
  "X...X.X...X",
];

const OCTO_A: Sprite = [
  "...XXXXX...",
  ".XXXXXXXXX.",
  "XXXXXXXXXXX",
  "XXX.XXX.XXX",
  "XXXXXXXXXXX",
  "..XX.X.XX..",
  ".X.X...X.X.",
  "X.X.....X.X",
];
const OCTO_B: Sprite = [
  "...XXXXX...",
  ".XXXXXXXXX.",
  "XXXXXXXXXXX",
  "XXX.XXX.XXX",
  "XXXXXXXXXXX",
  ".XX.X.X.XX.",
  "X.X.....X.X",
  ".X.......X.",
];

/** Indexed by tier (0..2), then by animation frame (0/1). */
export const INVADER_SPRITES: readonly (readonly [Sprite, Sprite])[] = [
  [SQUID_A, SQUID_B],
  [CRAB_A, CRAB_B],
  [OCTO_A, OCTO_B],
];

/* ── Player ship (16×8) ── */
export const SHIP_SPRITE: Sprite = [
  ".......XX.......",
  "......XXXX......",
  "......XXXX......",
  "..XXXXXXXXXXXX..",
  ".XXXXXXXXXXXXXX.",
  "XXXXXXXXXXXXXXXX",
  "XXXXXXXXXXXXXXXX",
  "XXX.XXXXXXXX.XXX",
];

/* ── Bonus saucer (16×7) ── */
export const UFO_SPRITE: Sprite = [
  ".....XXXXXX.....",
  "...XXXXXXXXXX...",
  "..XXXXXXXXXXXX..",
  ".XX.XX.XX.XX.XX.",
  "XXXXXXXXXXXXXXXX",
  "..XXX..XX..XXX..",
  "...X........X...",
];

/* ── Explosion burst (11×8) ── */
export const EXPLOSION_SPRITE: Sprite = [
  "X..X...X..X",
  ".X.X.X.X.X.",
  "..X.X.X.X..",
  "XX.X.X.X.XX",
  "..X.X.X.X..",
  ".X.X.X.X.X.",
  "X..X...X..X",
  ".X...X...X.",
];
