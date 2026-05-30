import { describe, expect, it } from "vitest";

import {
  BOMB_SPEED,
  BOMB_W,
  INITIAL_LIVES,
  INV_COLS,
  INV_ROWS,
  MAX_SHOTS,
  ROW_POINTS,
  SHIP_W,
  SHIP_Y,
  SHOT_SPEED,
} from "@/arcade/game/star-swarm/constants";
import { initialWorld, invaderRect, nextWaveWorld, tick } from "@/arcade/game/star-swarm/engine";
import type { DifficultyParams, Invader, World } from "@/arcade/game/star-swarm/types";

const DP: DifficultyParams = { stepBaseMs: 600, bombIntervalMs: 1500 };

const ALIVE = (w: World) => w.invaders.filter((inv) => inv.alive).length;

/** A controlled world: no random bombs/UFO interference, single concern under test. */
function controlled(overrides: Partial<World>): World {
  return {
    ...initialWorld(),
    invaders: [],
    shots: [],
    bombs: [],
    ufo: null,
    explosions: [],
    ufoTimerMs: 999_999, // keep the saucer from spawning mid-test
    ...overrides,
  };
}

function invAt(col: number, row: number): Invader {
  const tier = row === 0 ? 0 : row <= 2 ? 1 : 2;
  return { col, row, tier, alive: true };
}

/** Place a shot centered on an invader so it collides on the next tick. */
function shotOnInvader(world: World, inv: Invader) {
  const r = invaderRect(world, inv);
  return { id: 1, x: r.x + r.w / 2, y: r.y + r.h / 2, vy: -SHOT_SPEED };
}

describe("Star Swarm engine", () => {
  it("builds a full wave-1 formation with starting lives and score", () => {
    const w = initialWorld();
    expect(ALIVE(w)).toBe(INV_ROWS * INV_COLS);
    expect(w.lives).toBe(INITIAL_LIVES);
    expect(w.score).toBe(0);
    expect(w.wave).toBe(1);
    expect(w.bunkers.length).toBeGreaterThan(0);
  });

  it("destroys an invader hit by a player shot and awards that row's points", () => {
    const inv = invAt(0, 0); // top row → highest points
    const base = controlled({ invaders: [inv] });
    const world: World = { ...base, shots: [shotOnInvader(base, inv)], nextProjectileId: 2 };

    const res = tick(world, { shipX: world.shipX, fire: false }, DP);

    expect(res.invaderKilled).toBe(true);
    expect(res.world.invaders[0]!.alive).toBe(false);
    expect(res.world.score).toBe(ROW_POINTS[0]);
    expect(res.world.shots.length).toBe(0); // shot consumed
  });

  it("reports wave-cleared once the last invader dies", () => {
    const inv = invAt(2, 0);
    const base = controlled({ invaders: [inv] });
    const world: World = { ...base, shots: [shotOnInvader(base, inv)], nextProjectileId: 2 };

    const res = tick(world, { shipX: world.shipX, fire: false }, DP);
    expect(res.status).toBe("wave-cleared");
  });

  it("advances to the next wave keeping score/lives and refilling the formation", () => {
    const prev: World = { ...initialWorld(), wave: 3, score: 1234, lives: 2 };
    const next = nextWaveWorld(prev);

    expect(next.wave).toBe(4);
    expect(next.score).toBe(1234);
    expect(next.lives).toBe(2);
    expect(ALIVE(next)).toBe(INV_ROWS * INV_COLS);
    expect(next.bunkers.length).toBeGreaterThan(0);
  });

  it("subtracts a life and grants invulnerability when a bomb hits the ship", () => {
    const decoy = invAt(0, 0); // keeps the wave 'running'
    const shipX = (224 - SHIP_W) / 2;
    const bomb = { id: 1, x: shipX + SHIP_W / 2 - BOMB_W / 2, y: SHIP_Y, vy: BOMB_SPEED };
    const world = controlled({ invaders: [decoy], bombs: [bomb], shipInvuln: 0, shipX, nextProjectileId: 2 });

    const res = tick(world, { shipX, fire: false }, DP);

    expect(res.shipHit).toBe(true);
    expect(res.world.lives).toBe(INITIAL_LIVES - 1);
    expect(res.world.shipInvuln).toBeGreaterThan(0);
  });

  it("ends the game when the final life is lost", () => {
    const decoy = invAt(0, 0);
    const shipX = (224 - SHIP_W) / 2;
    const bomb = { id: 1, x: shipX + SHIP_W / 2 - BOMB_W / 2, y: SHIP_Y, vy: BOMB_SPEED };
    const world = controlled({ invaders: [decoy], bombs: [bomb], shipInvuln: 0, lives: 1, shipX, nextProjectileId: 2 });

    const res = tick(world, { shipX, fire: false }, DP);
    expect(res.world.lives).toBe(0);
    expect(res.status).toBe("game-over");
  });

  it("ends the game when the formation reaches the ship row", () => {
    const inv = invAt(0, 0);
    const world = controlled({ invaders: [inv], formY: SHIP_Y - 16 });

    const res = tick(world, { shipX: world.shipX, fire: false }, DP);
    expect(res.status).toBe("game-over");
    expect(res.world.lives).toBe(0);
  });

  it("respects the shot cooldown and the on-screen shot cap", () => {
    const decoy = invAt(0, 0);
    const shipX = (224 - SHIP_W) / 2;

    // First fire spawns a shot and arms the cooldown.
    const w0 = controlled({ invaders: [decoy], shipX, shotCooldownMs: 0 });
    const t1 = tick(w0, { shipX, fire: true }, DP);
    expect(t1.world.shots.length).toBe(1);
    expect(t1.world.shotCooldownMs).toBeGreaterThan(0);

    // Holding fire on the very next tick is blocked by the cooldown.
    const t2 = tick(t1.world, { shipX, fire: true }, DP);
    expect(t2.world.shots.length).toBe(1);

    // Never exceeds MAX_SHOTS even with capacity already full.
    const full = controlled({
      invaders: [decoy],
      shipX,
      shotCooldownMs: 0,
      shots: [
        { id: 1, x: shipX, y: 120, vy: -SHOT_SPEED },
        { id: 2, x: shipX + 4, y: 130, vy: -SHOT_SPEED },
      ],
      nextProjectileId: 3,
    });
    const t3 = tick(full, { shipX, fire: true }, DP);
    expect(t3.world.shots.length).toBeLessThanOrEqual(MAX_SHOTS);
  });
});
