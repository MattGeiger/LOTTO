import { afterEach, describe, expect, it } from "vitest";

import {
  AMBULANCE_SCORE,
  BOARD_W,
  BUB_SCORE,
  BUNKER_Y,
  HERO_SIZE,
  HERO_Y,
  INITIAL_LIVES,
  SHOT_SPEED,
  ZOMBIE_SCORE,
} from "@/arcade/game/zombie-attack/constants";
import { __resetRng, __setRng, initialWorld, tick } from "@/arcade/game/zombie-attack/engine";
import type { DifficultyParams, Projectile, World, Zombie } from "@/arcade/game/zombie-attack/types";

const DP: DifficultyParams = {
  spawnIntervalMs: 1600,
  zombieSpeed: 0.35,
  bubIntervalMs: 11000,
  bunkers: true,
  ambulanceHp: 4,
};
const DP_NO_BUNKERS: DifficultyParams = { ...DP, bunkers: false };

afterEach(() => __resetRng());

/** A controlled world with spawns/timers disabled so a single concern is testable. */
function controlled(overrides: Partial<World>): World {
  return {
    ...initialWorld(DP),
    zombies: [],
    shots: [],
    bubShots: [],
    grenades: [],
    ambulance: null,
    spawnTimerMs: 1e9,
    bubTimerMs: 1e9,
    ambulanceTimerMs: 1e9,
    ...overrides,
  };
}

function mkZombie(x: number, y: number, kind: "civilian" | "bub" = "civilian", over: Partial<Zombie> = {}): Zombie {
  return {
    id: Math.floor(Math.random() * 1e6),
    kind,
    type: 0,
    x,
    y,
    vx: 0,
    vy: 0,
    dirTimerMs: 1e9, // no re-roll
    animMs: 0,
    frame: 0,
    hp: kind === "bub" ? 2 : 1,
    fireTimerMs: 1e9, // bub won't fire
    aim: "down",
    attackFrames: 0,
    dying: 0,
    ...over,
  };
}

function mkShot(x: number, y: number): Projectile {
  return { id: Math.floor(Math.random() * 1e6), x, y, vx: 0, vy: -SHOT_SPEED };
}

const input = (w: World, fire = false) => ({ heroX: w.hero.x, fire });

describe("Zombie Attack engine (v2)", () => {
  it("starts a fresh run: hero centred, 3 lives, round 1, full bunker integrity", () => {
    const w = initialWorld(DP);
    expect(w.lives).toBe(INITIAL_LIVES);
    expect(w.round).toBe(1);
    expect(w.cycle).toBe(0);
    expect(w.zombies.length).toBe(0);
    expect(w.bunkerIntegrity).toBe(6);
    expect(initialWorld(DP_NO_BUNKERS).bunkerIntegrity).toBe(2);
  });

  it("spawns descending zombies with a stochastic, downward-biased direction", () => {
    // RNG = 0 → rollDir 'down' (vx 0); RNG ≈ 0.6 → 'down-left' (vx < 0).
    __setRng(() => 0);
    const down = controlled({ spawnTimerMs: 0 });
    const r1 = tick(down, input(down), DP).world;
    const z1 = r1.zombies.at(-1)!;
    expect(z1.vy).toBeGreaterThan(0);
    expect(z1.vx).toBe(0);

    __setRng(() => 0.6);
    const diag = controlled({ spawnTimerMs: 0 });
    const r2 = tick(diag, input(diag), DP).world;
    const z2 = r2.zombies.at(-1)!;
    expect(z2.vx).toBeLessThan(0); // down-left
    expect(z2.vy).toBeGreaterThan(0);
  });

  it("a player shot kills a civilian and scores", () => {
    const w = controlled({ zombies: [mkZombie(120, 100)], shots: [mkShot(120, 100)] });
    const res = tick(w, input(w), DP);
    expect(res.zombieKilled).toBe(true);
    expect(res.world.zombies[0]!.hp).toBeLessThanOrEqual(0);
    expect(res.world.score).toBe(ZOMBIE_SCORE);
  });

  it("Bub takes two shots and can drop a grenade on death", () => {
    const bub = mkZombie(120, 100, "bub");
    const w1 = controlled({ zombies: [bub], shots: [mkShot(120, 100)] });
    const r1 = tick(w1, input(w1), DP);
    expect(r1.bubKilled).toBe(false);
    expect(r1.world.zombies[0]!.hp).toBe(1);

    // Second hit kills him; RNG 0 < drop-chance → drops a grenade.
    __setRng(() => 0);
    const r2 = tick({ ...r1.world, shots: [mkShot(r1.world.zombies[0]!.x, r1.world.zombies[0]!.y)] }, input(r1.world), DP);
    expect(r2.bubKilled).toBe(true);
    expect(r2.world.score).toBe(BUB_SCORE);
    expect(r2.world.grenades.length).toBe(1);
  });

  it("shooting a dropped grenade detonates an AoE blast, sparing distant zombies", () => {
    const near = [mkZombie(120, 118), mkZombie(138, 120), mkZombie(120, 148)];
    const far = mkZombie(120, 200);
    const w = controlled({
      zombies: [...near, far],
      grenades: [{ id: 99, x: 120, y: 120, armed: true, exploding: 0 }],
      shots: [mkShot(120, 128)],
    });
    const res = tick(w, input(w), DP);
    expect(res.grenadeDetonated).toBe(true);
    for (const z of near) {
      expect(res.world.zombies.find((q) => q.id === z.id)!.hp).toBeLessThanOrEqual(0);
    }
    expect(res.world.zombies.find((q) => q.id === far.id)!.hp).toBeGreaterThan(0);
  });

  it("destroys the ambulance after its HP is spent and scores", () => {
    const base = controlled({ ambulance: { x: 100, y: 60, hp: 2, exploding: 0 } });
    const r1 = tick({ ...base, shots: [mkShot(110, 70)] }, input(base), DP);
    expect(r1.ambulanceDestroyed).toBe(false);
    expect(r1.world.ambulance?.hp).toBe(1);

    const r2 = tick({ ...r1.world, shots: [mkShot(110, 70)] }, input(r1.world), DP);
    expect(r2.ambulanceDestroyed).toBe(true);
    expect(r2.world.score).toBeGreaterThanOrEqual(AMBULANCE_SCORE);
  });

  it("a Bub bullet that hits the hero costs a life (and ends the game at zero)", () => {
    const heroCx = (BOARD_W - HERO_SIZE) / 2 + HERO_SIZE / 2;
    const heroCy = HERO_Y + HERO_SIZE / 2;
    const w = controlled({ bubShots: [{ id: 7, x: heroCx, y: heroCy, vx: 0, vy: 0 }] });
    const r1 = tick(w, input(w), DP);
    expect(r1.heroHit).toBe(true);
    expect(r1.world.lives).toBe(INITIAL_LIVES - 1);

    const lethal = controlled({ lives: 1, bubShots: [{ id: 8, x: heroCx, y: heroCy, vx: 0, vy: 0 }] });
    const r2 = tick(lethal, input(lethal), DP);
    expect(r2.world.lives).toBe(0);
    expect(r2.status).toBe("game-over");
  });

  it("advances rounds on the timer and extracts (rescue) after round 4", () => {
    const r = controlled({ round: 1, roundMsLeft: 10, roundTotalMs: 28000 });
    const adv = tick(r, input(r), DP);
    expect(adv.roundAdvanced).toBe(true);
    expect(adv.world.round).toBe(2);

    const last = controlled({ round: 4, roundMsLeft: 10, roundTotalMs: 22000, zombies: [mkZombie(120, 80)] });
    const rescue = tick(last, input(last), DP);
    expect(rescue.rescued).toBe(true);
    expect(rescue.world.cycle).toBe(1);
    expect(rescue.world.round).toBe(1);
    expect(rescue.world.zombies.length).toBe(0); // the lot clears on extraction
    expect(rescue.world.celebrationMs).toBeGreaterThan(0);
  });

  it("is game over once the horde overruns the bunker line", () => {
    const w = controlled({ bunkerIntegrity: 1, zombies: [mkZombie(120, BUNKER_Y - 0.05, "civilian", { vy: 0.5 })] });
    const res = tick(w, input(w), DP);
    expect(res.status).toBe("game-over");
  });
});
