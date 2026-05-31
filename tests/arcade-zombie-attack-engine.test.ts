import { afterEach, describe, expect, it } from "vitest";

import {
  AMBULANCE_H,
  BOARD_W,
  BUB_SCORE,
  FENCE_MAX_HP,
  FENCE_Y,
  HELO_ATTACK_Y,
  HERO_SIZE,
  HERO_Y,
  INITIAL_LIVES,
  SHOT_SPEED,
  ZOMBIE_SCORE,
} from "@/arcade/game/zombie-attack/constants";
import { __resetRng, __setRng, initialWorld, tick } from "@/arcade/game/zombie-attack/engine";
import type { DifficultyParams, Projectile, World, Zombie } from "@/arcade/game/zombie-attack/types";

const DP: DifficultyParams = { spawnIntervalMs: 800, zombieSpeed: 0.175, bubIntervalMs: 11000, ambulanceHp: 4 };

afterEach(() => __resetRng());

/** RNG that returns the given values in order, then repeats the last. */
function seq(...vals: number[]): () => number {
  let i = 0;
  return () => vals[Math.min(i++, vals.length - 1)]!;
}

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
    dirTimerMs: 1e9,
    animMs: 0,
    frame: 0,
    hp: kind === "bub" ? 2 : 1,
    fireTimerMs: 1e9,
    aim: "down",
    attackFrames: 0,
    hurtFrames: 0,
    attacking: 0,
    attackTimerMs: 1e9, // no attack unless overridden
    dying: 0,
    reviving: 0,
    ...over,
  };
}

const mkShot = (x: number, y: number): Projectile => ({ id: Math.floor(Math.random() * 1e6), x, y, vx: 0, vy: -SHOT_SPEED });
const input = (w: World, fire = false) => ({ heroX: w.hero.x, fire });
const heroCx = (BOARD_W - HERO_SIZE) / 2 + HERO_SIZE / 2;
const heroCy = HERO_Y + HERO_SIZE / 2;

describe("Zombie Attack engine (v3 — fence siege)", () => {
  it("starts a fresh run: full fence, 3 lives, round 1", () => {
    const w = initialWorld(DP);
    expect(w.fenceHp).toBe(FENCE_MAX_HP);
    expect(w.lives).toBe(INITIAL_LIVES);
    expect(w.round).toBe(1);
    expect(w.zombies.length).toBe(0);
  });

  it("resolves a civilian hit as kill / wound / revive by probability", () => {
    // kill (0.2 < kill 0.5, 0.2 >= revive 0.1)
    __setRng(() => 0.2);
    const k = controlled({ zombies: [mkZombie(120, 80)], shots: [mkShot(120, 80)] });
    const rk = tick(k, input(k), DP);
    expect(rk.world.zombies[0]!.dying).toBeGreaterThan(0);
    expect(rk.world.score).toBe(ZOMBIE_SCORE);

    // wound (0.7 >= kill 0.5)
    __setRng(() => 0.7);
    const wd = controlled({ zombies: [mkZombie(120, 80)], shots: [mkShot(120, 80)] });
    const rw = tick(wd, input(wd), DP);
    expect(rw.world.zombies[0]!.hurtFrames).toBeGreaterThan(0);
    expect(rw.world.zombies[0]!.dying).toBe(0);
    expect(rw.world.score).toBe(0);

    // revive (0.05 < kill 0.5 and < revive 0.1)
    __setRng(() => 0.05);
    const rv = controlled({ zombies: [mkZombie(120, 80)], shots: [mkShot(120, 80)] });
    const rr = tick(rv, input(rv), DP);
    expect(rr.world.zombies[0]!.reviving).toBeGreaterThan(0);
  });

  it("only wounds Bub for his first two hits, then can kill + drop a grenade", () => {
    let w = controlled({ zombies: [mkZombie(120, 80, "bub")], shots: [mkShot(120, 80)] });
    w = tick(w, input(w), DP).world; // hit 1 → wound
    expect(w.zombies[0]!.hp).toBe(1);
    w = { ...w, shots: [mkShot(120, 80)] };
    w = tick(w, input(w), DP).world; // hit 2 → wound
    expect(w.zombies[0]!.hp).toBe(0);
    expect(w.zombies[0]!.dying).toBe(0); // still standing

    // hit 3 (depleted): kill (0.4<0.5), no revive (0.4>=0.25), grenade (0.1<0.25)
    __setRng(seq(0.4, 0.4, 0.1));
    const r3 = tick({ ...w, shots: [mkShot(120, 80)] }, input(w), DP);
    expect(r3.bubKilled).toBe(true);
    expect(r3.world.score).toBe(BUB_SCORE);
    expect(r3.world.grenades.length).toBe(1);
  });

  it("detonates a grenade for an instant AoE kill (no wound roll)", () => {
    // All well above the fence line so nothing gets clamped into the blast.
    const near = mkZombie(120, 100);
    const far = mkZombie(120, 30);
    const w = controlled({
      zombies: [near, far],
      grenades: [{ id: 9, x: 120, y: 100, armed: true, exploding: 0 }],
      shots: [mkShot(120, 108)],
    });
    const r = tick(w, input(w), DP);
    expect(r.grenadeDetonated).toBe(true);
    expect(r.world.zombies.find((z) => z.id === near.id)!.dying).toBeGreaterThan(0);
    expect(r.world.zombies.find((z) => z.id === far.id)!.dying).toBe(0);
  });

  it("drains the fence faster the more zombies besiege it (stacked odds)", () => {
    __setRng(() => 0.05); // always under the stacked chance
    const one = controlled({ zombies: [mkZombie(120, FENCE_Y, "civilian", { attackTimerMs: 0 })] });
    expect(tick(one, input(one), DP).world.fenceHp).toBe(FENCE_MAX_HP - 1);

    const three = controlled({
      zombies: [
        mkZombie(60, FENCE_Y, "civilian", { attackTimerMs: 0 }),
        mkZombie(120, FENCE_Y, "civilian", { attackTimerMs: 0 }),
        mkZombie(180, FENCE_Y, "civilian", { attackTimerMs: 0 }),
      ],
    });
    expect(tick(three, input(three), DP).world.fenceHp).toBe(FENCE_MAX_HP - 3);
  });

  it("lets zombies advance past the breached fence toward the helo", () => {
    const z = mkZombie(120, FENCE_Y - 4, "civilian", { vy: 3 });
    const w = controlled({ fenceHp: 0, zombies: [z] });
    const r = tick(w, input(w), DP);
    expect(r.world.zombies[0]!.y).toBeGreaterThan(FENCE_Y - 4); // moved through
  });

  it("is game over when a breached zombie reaches and wrecks the helo", () => {
    __setRng(() => 0.05); // under helo-attack chance 0.1
    const z = mkZombie(120, HELO_ATTACK_Y, "civilian", { attackTimerMs: 0, vy: 0 });
    const w = controlled({ fenceHp: 0, zombies: [z] });
    expect(tick(w, input(w), DP).status).toBe("game-over");
  });

  it("mauls the hero at close range once the fence is down", () => {
    const z = mkZombie(heroCx, heroCy, "civilian", { attackTimerMs: 0, vy: 0 });
    const w = controlled({ fenceHp: 0, zombies: [z] });
    const r = tick(w, input(w), DP);
    expect(r.heroHit).toBe(true);
    expect(r.world.lives).toBe(INITIAL_LIVES - 1);
  });

  it("blows up the ambulance against an intact fence, clearing nearby zombies", () => {
    const z = mkZombie(120, FENCE_Y, "civilian");
    const w = controlled({ zombies: [z], ambulance: { x: 102, y: FENCE_Y - AMBULANCE_H, hp: 4, exploding: 0 } });
    const r = tick(w, input(w), DP);
    expect(r.ambulanceDestroyed).toBe(true);
    expect(r.world.zombies[0]!.dying).toBeGreaterThan(0);
    expect(r.world.fenceHp).toBe(FENCE_MAX_HP); // fence itself is unharmed
  });

  it("is game over if the ambulance reaches the helo through a breached fence", () => {
    const w = controlled({ fenceHp: 0, ambulance: { x: 100, y: HELO_ATTACK_Y - 8, hp: 4, exploding: 0 } });
    expect(tick(w, input(w), DP).status).toBe("game-over");
  });

  it("a Bub bullet that hits the hero costs a life", () => {
    const w = controlled({ bubShots: [{ id: 7, x: heroCx, y: heroCy, vx: 0, vy: 0 }] });
    const r = tick(w, input(w), DP);
    expect(r.heroHit).toBe(true);
    expect(r.world.lives).toBe(INITIAL_LIVES - 1);
  });
});
