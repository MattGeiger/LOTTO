/* ── Zombie Attack! – Numeric constants (v2: top-down survival) ──
 *
 * A top-down last-stand: zombies spawn at the top and shamble DOWN toward the
 * bunker line that protects the helipad. The player (a hero with an Uzi) paces
 * the bottom and fires upward. Survive each timed round; the helicopter lands,
 * refuels, boards, and takes off across a 4-round cycle. Coordinates are virtual
 * board pixels; CSS scales the canvas up with `image-rendering: pixelated`.
 */

/** Native (virtual) canvas size in pixels. Tall portrait. */
export const BOARD_W = 240;
export const BOARD_H = 360;

/** Distinct civilian zombie sprite variants. */
export const ZOMBIE_TYPE_COUNT = 4;

/** Fixed timestep in milliseconds (~60 fps). Matches the other arcade games. */
export const FIXED_STEP_MS = 16;

/** Starting lives (the hero). */
export const INITIAL_LIVES = 3;

/* ── Sprite draw sizes (source PNGs are 32×32; helicopter 128×128) ── */
export const ZOMBIE_SIZE = 32;
export const BUB_SIZE = 32;
export const HERO_SIZE = 32;
export const GRENADE_SIZE = 22;
export const AMBULANCE_W = 36;
export const AMBULANCE_H = 36;
export const HELI_SIZE = 116;

/* ── Hero (just behind the fence, moves left↔right, fires up) ── */
export const HERO_Y = 196; // sprite top — close to the fence line
export const HERO_MIN_X = 2;
export const HERO_MAX_X = BOARD_W - HERO_SIZE - 2;
export const HERO_KEY_SPEED = 2.8;
export const HERO_INVULN_FRAMES = 80;
/** Muzzle offset from the hero sprite (where shots spawn). */
export const HERO_MUZZLE_DX = HERO_SIZE / 2;
export const HERO_MUZZLE_DY = 4;
/** A breached zombie within this distance of the hero mauls them (100% / turn). */
export const HERO_CLOSE_RANGE = 24;

/* ── Player shots (Uzi — rapid, several on screen) ── */
export const SHOT_W = 3;
export const SHOT_H = 7;
export const SHOT_SPEED = 4.6;
export const MAX_SHOTS = 3;
export const SHOT_COOLDOWN_MS = 150;

/* ── Zombies (individual stochastic descent) ── */
export const ZOMBIE_RADIUS = 10; // collision radius (sprite body is ~20px wide)
export const ZOMBIE_SCORE = 20;
/** Per-step direction re-roll cadence. */
export const DIR_REROLL_MS = 520;
/** Movement weights: straight down vs. the two 45° diagonals. */
export const DIR_DOWN_WEIGHT = 0.5;
export const DIR_DIAG_WEIGHT = 0.25; // each side
/** Walk animation frame cadence (ms). */
export const ANIM_FRAME_MS = 220;
/** Death animation duration (frames at 60fps) before the corpse is removed. */
export const DEATH_FRAMES = 26;
/** Spawn x stays this far from the walls. */
export const SPAWN_MARGIN = 18;
/** Hard cap on living zombies on screen. */
export const MAX_ZOMBIES = 30;

/* ── Probabilistic hits ── */
/** A civilian hit: chance it's a kill (else it's only a wound). */
export const ZOMBIE_KILL_CHANCE = 0.5;
/** A killed civilian: chance it gets back up (death animation in reverse). */
export const ZOMBIE_REVIVE_CHANCE = 0.1;
/** Once Bub's HP is gone, chance a further hit kills him (else another wound). */
export const BUB_KILL_CHANCE = 0.5;
/** A killed Bub: chance he gets back up. */
export const BUB_REVIVE_CHANCE = 0.25;
/** Frames the hurt sprite shows after a wound. */
export const HURT_FRAMES = 16;
/** Frames the "get back up" (reverse death) animation plays before reviving. */
export const REVIVE_FRAMES = 30;
/** Frames a melee/attack lunge sprite shows. */
export const ATTACK_ANIM_FRAMES = 18;
/** Attack-roll cadence ("per turn") for fence / helo / hero melee (ms). */
export const ATTACK_INTERVAL_MS = 1000;

/* ── Bub (zombie soldier — Day of the Dead homage) ── */
export const BUB_HP = 2;
export const BUB_RADIUS = 12;
export const BUB_SCORE = 150;
/** Bub mostly shambles; he only re-evaluates firing this often. */
export const BUB_FIRE_INTERVAL_MS = 3800;
/** Chance Bub fires when the hero is in his line of sight (a firing cone). */
export const BUB_FIRE_CHANCE_AIMED = 0.8;
/** Chance Bub fires a random shot when the hero is NOT lined up. */
export const BUB_FIRE_CHANCE_IDLE = 0.12;
/** Frames Bub holds the firing pose after a shot (otherwise he walks). */
export const BUB_ATTACK_POSE_FRAMES = 22;
export const BUB_SHOT_SPEED = 2.7;
export const BUB_SHOT_SIZE = 4;
/** Chance Bub drops a live grenade where he falls. */
export const BUB_GRENADE_DROP_CHANCE = 0.25;

/* ── Grenade (dropped by Bub; shoot it to detonate) ── */
export const GRENADE_BLAST_RADIUS = 54;
export const GRENADE_EXPLODE_FRAME_MS = 70; // per explosion frame (4 frames)
export const BLAST_KILL_POINTS = 25;

/* ── Ambulance (periodic shootable hazard that explodes, clearing zombies) ── */
export const AMBULANCE_SPEED = 0.5;
export const AMBULANCE_SCORE = 200;
export const AMBULANCE_BLAST_RADIUS = 60;
export const AMBULANCE_INTERVAL_MS = 23_000;
export const AMBULANCE_EXPLODE_FRAME_MS = 90; // per explosion frame (4 frames)

/* ── Fence (solid siege barrier) + helipad ── */
/** Fence line Y (sprite centre). Zombies stop here and besiege it. */
export const FENCE_Y = 168;
/** Fence sprite tile size (square). */
export const FENCE_TILE = 30;
/** Fence hit points; each zombie at the fence has (count × chance) to hit/turn. */
export const FENCE_MAX_HP = 10;
/** Per-zombie fence-attack chance, scaled by the crowd size at the fence. */
export const FENCE_ATTACK_CHANCE_PER_ZOMBIE = 0.1;
/** Helipad centre + radius (drawn under the helicopter). */
export const HELIPAD_X = BOARD_W / 2;
export const HELIPAD_Y = 304;
export const HELIPAD_R = 56;
/** Helicopter rest position (sprite centre) and its takeoff climb. */
export const HELI_CENTER_X = BOARD_W / 2;
export const HELI_REST_Y = 300;
export const HELI_TAKEOFF_RISE = 380; // px the helicopter climbs across the takeoff round
export const HELI_INBOUND_RISE = 250; // px above rest the helicopter starts on its inbound approach
/** A breached zombie at/below this Y is "at the helo" — 10%/turn to wreck it (game over). */
export const HELO_ATTACK_Y = 250;
export const HELO_ATTACK_CHANCE = 0.1;
/** Fraction of round 4 spent on the pad (rotors up) before lift-off begins. */
export const HELI_LIFT_START = 0.35;

/* ── Rounds (timed survival cycle) ── */
export const ROUND_COUNT = 4;
/** Per-round duration (ms): land, refuel, board, takeoff. */
export const ROUND_DURATIONS_MS: readonly number[] = [28_000, 34_000, 34_000, 22_000];
/** Brief celebration window after a successful extraction (ms). */
export const RESCUE_CELEBRATION_MS = 3200;

/* ── Explosions (generic small burst) ── */
export const EXPLOSION_FRAMES = 12;
