import { describe, expect, it } from "vitest";

import {
  BLAST_RADIUS,
  BOARD_W,
  BOMB_SPEED,
  BOMB_W,
  BUNKER_Y,
  GROUND_BOMB_H,
  INITIAL_LIVES,
  INV_COLS,
  INV_ROWS,
  MAX_SHOTS,
  ROW_POINTS,
  SHIP_W,
  SHIP_Y,
  SHOT_SPEED,
  VEHICLE_POINTS,
} from "@/arcade/game/zombie-attack/constants";
import { initialWorld, nextWaveWorld, tick, zombieRect } from "@/arcade/game/zombie-attack/engine";
import type { DifficultyParams, World, Zombie } from "@/arcade/game/zombie-attack/types";

const DP: DifficultyParams = {
  stepBaseMs: 600,
  bombIntervalMs: 1500,
  bunkers: true,
  bunkerBombProof: false,
  vehicleHp: 3,
};
const DP_NO_BUNKERS: DifficultyParams = { ...DP, bunkers: false };
const DP_BOMBPROOF: DifficultyParams = { ...DP, bunkerBombProof: true };

const ALIVE = (w: World) => w.zombies.filter((z) => z.alive).length;

/** A controlled world: no random bombs/vehicle interference, single concern under test. */
function controlled(overrides: Partial<World>): World {
  return {
    ...initialWorld(DP),
    zombies: [],
    shots: [],
    bombs: [],
    groundBombs: [],
    vehicle: null,
    explosions: [],
    vehicleTimerMs: 9_000_000,
    ...overrides,
  };
}

function zombieAt(col: number, row: number, carriesBomb = false): Zombie {
  const tier = row === 0 ? 0 : row <= 2 ? 1 : 2;
  return { col, row, tier, alive: true, carriesBomb };
}

/** Place a shot centered on a zombie so it collides on the next tick. */
function shotOnZombie(world: World, z: Zombie) {
  const r = zombieRect(world, z);
  return { id: 1, x: r.x + r.w / 2, y: r.y + r.h / 2, vy: -SHOT_SPEED };
}

describe("Zombie Attack engine", () => {
  it("builds a full wave-1 horde with lives, fence, and bunkers", () => {
    const w = initialWorld(DP);
    expect(ALIVE(w)).toBe(INV_ROWS * INV_COLS);
    expect(w.lives).toBe(INITIAL_LIVES);
    expect(w.wave).toBe(1);
    expect(w.fenceHp).toBe(w.fenceMaxHp);
    expect(w.fenceHp).toBeGreaterThan(0);
    expect(w.bunkers.length).toBeGreaterThan(0);
  });

  it("omits bunkers on a no-bunker difficulty (e.g. Nightmare)", () => {
    expect(initialWorld(DP_NO_BUNKERS).bunkers.length).toBe(0);
  });

  it("destroys a zombie hit by a player shot and awards that row's points", () => {
    const z = zombieAt(0, 0);
    const base = controlled({ zombies: [z] });
    const world: World = { ...base, shots: [shotOnZombie(base, z)], nextProjectileId: 2 };

    const res = tick(world, { shipX: world.shipX, fire: false }, DP);
    expect(res.zombieKilled).toBe(true);
    expect(res.world.zombies[0]!.alive).toBe(false);
    expect(res.world.score).toBe(ROW_POINTS[0]);
  });

  it("drops a bomb in place when a bomb-carrier is shot", () => {
    const carrier = zombieAt(2, 0, true);
    const base = controlled({ zombies: [carrier] });
    const world: World = { ...base, shots: [shotOnZombie(base, carrier)], nextProjectileId: 2 };

    const res = tick(world, { shipX: world.shipX, fire: false }, DP);
    expect(res.zombieKilled).toBe(true);
    expect(res.world.groundBombs.length).toBe(1);
  });

  it("detonates a dropped bomb to wipe out nearby zombies (AoE), sparing distant ones", () => {
    // Cluster up top, the dropped bomb just below them, a lone zombie far away.
    const near = [zombieAt(0, 0), zombieAt(0, 1), zombieAt(1, 0)];
    const far = zombieAt(5, 4);
    const base = controlled({ zombies: [...near, far], formX: 100, formY: 40 });
    const gb = { id: 1, x: 117.5, y: 93.5, vy: 1 }; // centre ≈ (120, 96)
    // Shot just below the bomb → they converge on the next tick.
    const shot = { id: 2, x: 119, y: gb.y + GROUND_BOMB_H + 2, vy: -SHOT_SPEED };
    const world: World = { ...base, groundBombs: [gb], shots: [shot], nextProjectileId: 3 };

    const res = tick(world, { shipX: world.shipX, fire: false }, DP);
    expect(res.bombDetonated).toBe(true);
    expect(res.world.groundBombs.length).toBe(0);
    for (const z of near) {
      const after = res.world.zombies.find((q) => q.col === z.col && q.row === z.row)!;
      expect(after.alive).toBe(false);
    }
    const farAfter = res.world.zombies.find((q) => q.col === far.col && q.row === far.row)!;
    expect(farAfter.alive).toBe(true);
    // Sanity: the far zombie really is outside the blast radius.
    const fr = zombieRect(base, far);
    const dist = Math.hypot(fr.x + fr.w / 2 - 120, fr.y + fr.h / 2 - 96);
    expect(dist).toBeGreaterThan(BLAST_RADIUS);
  });

  it("takes the difficulty's vehicleHp shots to destroy the flaming vehicle", () => {
    const decoy = zombieAt(0, 0);
    const make = () =>
      controlled({ zombies: [decoy], formX: 10, formY: 10, vehicle: { x: 100, y: 20, hp: DP.vehicleHp, points: VEHICLE_POINTS } });

    // One hit only chips it.
    const hit = make();
    const r1 = tick({ ...hit, shots: [{ id: 1, x: 108, y: 30, vy: -SHOT_SPEED }], nextProjectileId: 2 }, { shipX: hit.shipX, fire: false }, DP);
    expect(r1.vehicleKilled).toBe(false);
    expect(r1.world.vehicle?.hp).toBe(DP.vehicleHp - 1);

    // A vehicle on its last hit is destroyed and scores.
    const lethal = controlled({ zombies: [decoy], formX: 10, formY: 10, vehicle: { x: 100, y: 20, hp: 1, points: VEHICLE_POINTS } });
    const r2 = tick({ ...lethal, shots: [{ id: 1, x: 108, y: 30, vy: -SHOT_SPEED }], nextProjectileId: 2 }, { shipX: lethal.shipX, fire: false }, DP);
    expect(r2.vehicleKilled).toBe(true);
    expect(r2.world.vehicle).toBeNull();
    expect(r2.world.score).toBe(VEHICLE_POINTS);
  });

  it("subtracts a life (with invulnerability) when a thrown bomb hits the gun, and ends at zero", () => {
    const decoy = zombieAt(0, 0);
    const shipX = (BOARD_W - SHIP_W) / 2;
    const bomb = () => ({ id: 1, x: shipX + SHIP_W / 2 - BOMB_W / 2, y: SHIP_Y, vy: BOMB_SPEED });

    const hurt = controlled({ zombies: [decoy], formX: 10, formY: 10, shipX, shipInvuln: 0, bombs: [bomb()], nextProjectileId: 2 });
    const r1 = tick(hurt, { shipX, fire: false }, DP);
    expect(r1.shipHit).toBe(true);
    expect(r1.world.lives).toBe(INITIAL_LIVES - 1);
    expect(r1.world.shipInvuln).toBeGreaterThan(0);

    const lastLife = controlled({ zombies: [decoy], formX: 10, formY: 10, shipX, shipInvuln: 0, lives: 1, bombs: [bomb()], nextProjectileId: 2 });
    const r2 = tick(lastLife, { shipX, fire: false }, DP);
    expect(r2.world.lives).toBe(0);
    expect(r2.status).toBe("game-over");
  });

  it("is game over when the horde reaches the bunker line", () => {
    const z = zombieAt(0, 0);
    const world = controlled({ zombies: [z], formY: BUNKER_Y - 16, fenceHp: 0 });
    const res = tick(world, { shipX: world.shipX, fire: false }, DP);
    expect(res.status).toBe("game-over");
    expect(res.world.lives).toBe(0);
  });

  it("clears the wave when the last zombie dies and rebuilds the fence next wave", () => {
    const z = zombieAt(3, 0);
    const base = controlled({ zombies: [z], fenceHp: 10 });
    const cleared = tick({ ...base, shots: [shotOnZombie(base, z)], nextProjectileId: 2 }, { shipX: base.shipX, fire: false }, DP);
    expect(cleared.status).toBe("wave-cleared");

    const next = nextWaveWorld({ ...cleared.world, wave: 2, score: 500, lives: 2 }, DP);
    expect(next.wave).toBe(3);
    expect(next.score).toBe(500);
    expect(next.lives).toBe(2);
    expect(ALIVE(next)).toBe(INV_ROWS * INV_COLS);
    expect(next.fenceHp).toBe(next.fenceMaxHp);
  });

  it("makes bunkers bomb-proof only on the easiest difficulty", () => {
    const erodes = initialWorld(DP);
    const target1 = erodes.bunkers[0]!;
    const w1: World = { ...erodes, shots: [], bombs: [{ id: 1, x: target1.x, y: target1.y, vy: BOMB_SPEED }], vehicle: null, vehicleTimerMs: 9_000_000, nextProjectileId: 2 };
    tick(w1, { shipX: w1.shipX, fire: false }, DP);
    expect(target1.alive).toBe(false); // normal difficulty erodes

    const proof = initialWorld(DP_BOMBPROOF);
    const target2 = proof.bunkers[0]!;
    const w2: World = { ...proof, shots: [], bombs: [{ id: 1, x: target2.x, y: target2.y, vy: BOMB_SPEED }], vehicle: null, vehicleTimerMs: 9_000_000, nextProjectileId: 2 };
    const r2 = tick(w2, { shipX: w2.shipX, fire: false }, DP_BOMBPROOF);
    expect(target2.alive).toBe(true); // bomb-proof survives
    expect(r2.world.bombs.length).toBe(0); // ...but the bomb is still stopped
  });

  it("respects the shot cooldown and the on-screen shot cap", () => {
    const decoy = zombieAt(0, 0);
    const shipX = (BOARD_W - SHIP_W) / 2;

    const w0 = controlled({ zombies: [decoy], formX: 10, formY: 10, shipX, shotCooldownMs: 0 });
    const t1 = tick(w0, { shipX, fire: true }, DP);
    expect(t1.world.shots.length).toBe(1);
    expect(t1.world.shotCooldownMs).toBeGreaterThan(0);

    const t2 = tick(t1.world, { shipX, fire: true }, DP);
    expect(t2.world.shots.length).toBe(1); // cooldown blocks a second shot

    const full = controlled({
      zombies: [decoy],
      formX: 10,
      formY: 10,
      shipX,
      shotCooldownMs: 0,
      shots: [
        { id: 1, x: shipX, y: 160, vy: -SHOT_SPEED },
        { id: 2, x: shipX + 4, y: 170, vy: -SHOT_SPEED },
      ],
      nextProjectileId: 3,
    });
    const t3 = tick(full, { shipX, fire: true }, DP);
    expect(t3.world.shots.length).toBeLessThanOrEqual(MAX_SHOTS);
  });
});
