/* ── Zombie Attack! – Pixel-art sprite bitmaps ──
 *
 * Each sprite is an array of equal-length rows. "X" is a filled pixel; "." is
 * transparent. The renderer draws one board pixel per cell. The flaming
 * vehicle, dropped bombs, fence, bunkers, blasts, and dirt terrain are drawn
 * procedurally in the renderer (they need multiple colors / dynamic shapes).
 */

export type Sprite = readonly string[];

/** Width (cols) and height (rows) of a sprite, in board pixels. */
export function spriteSize(sprite: Sprite): { w: number; h: number } {
  return { w: sprite[0]?.length ?? 0, h: sprite.length };
}

/* ── Zombies: three builds, two shamble frames each (11×8) ──
 * Tier 0 = skinny, Tier 1 = ribs-exposed, Tier 2 = fat. Humanoid silhouette:
 * head with hollow eyes, arms reaching out, torso, legs, feet. The two frames
 * swap arm reach and leg stance for a shambling gait. */

const SKINNY_A: Sprite = [
  "....XXX....",
  "....X.X....",
  "..XXXXXXX..",
  "....XXX....",
  "....XXX....",
  "....XXX....",
  "...XX.XX...",
  "..XX...XX..",
];
const SKINNY_B: Sprite = [
  "....XXX....",
  "....X.X....",
  "X..XXXXX..X",
  "....XXX....",
  "....XXX....",
  "....XXX....",
  "...XX.XX...",
  "...XX.XX...",
];

const RIBS_A: Sprite = [
  "....XXX....",
  "....X.X....",
  "..XXXXXXX..",
  "...X.X.X...",
  "...XXXXX...",
  "...X.X.X...",
  "...XX.XX...",
  "..XX...XX..",
];
const RIBS_B: Sprite = [
  "....XXX....",
  "....X.X....",
  "X..XXXXX..X",
  "...X.X.X...",
  "...XXXXX...",
  "...X.X.X...",
  "...XX.XX...",
  "...XX.XX...",
];

const FAT_A: Sprite = [
  "...XXXX....",
  "...X..X....",
  ".XXXXXXXXX.",
  "..XXXXXXX..",
  "..XXXXXXX..",
  "...XXXXX...",
  "...XX.XX...",
  "..XX...XX..",
];
const FAT_B: Sprite = [
  "...XXXX....",
  "...X..X....",
  "X.XXXXXXX.X",
  "..XXXXXXX..",
  "..XXXXXXX..",
  "...XXXXX...",
  "...XX.XX...",
  "...XX.XX...",
];

/** Indexed by tier (0..2), then by animation frame (0/1). */
export const ZOMBIE_SPRITES: readonly (readonly [Sprite, Sprite])[] = [
  [SKINNY_A, SKINNY_B],
  [RIBS_A, RIBS_B],
  [FAT_A, FAT_B],
];

/* ── Player gun / turret (16×8) ── */
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

/* ── Explosion burst (11×8) — small zombie-death flash ── */
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
