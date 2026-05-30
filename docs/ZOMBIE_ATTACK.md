# Zombie Attack! - Game Design Document

## Status
- **Implemented and shipped.** Core gameplay is fully playable on touch and keyboard.
- Re-theme of the v1.10.0 *Star Swarm* fixed-shooter into a zombie horde defense
  (same engine architecture, new theme + several new mechanics).
- Scaffolding (page shell, CSS, translations, menu entry) is complete.
- Engine (horde movement, firing, collisions, thrown + dropped bombs, blast AoE,
  fence pressure, flaming vehicle, bunkers, waves, rendering) is complete.
- Endless waves with escalating difficulty.
- 6-tier difficulty (Very Easy → Nightmare) tuning march cadence, bomb frequency,
  bunker rules, and vehicle toughness.
- Theme-aware page chrome; a deliberate thematic palette inside the canvas.
- Deterministic engine unit test (`tests/arcade-zombie-attack-engine.test.ts`, 11 cases).

## Concept

Zombie Attack! is a fixed-shooter in the **Space Invaders** lineage, re-skinned as
a last-stand against a shambling horde. The player works a gun along the bottom of
a tall dirt lot and fires upward at a descending grid of zombies. Between the
player and the horde stand a **fence** and four **sandbag bunkers** — the horde
must be stopped before it overruns them.

It is the Arcade's third game alongside Snake and Brick Mayhem, sharing the retro
pixel-art system, the sticky bottom control dock, and the page-layout conventions,
while being mechanically distinct (aiming/timing + structure defense).

---

## Core Rules

### Objective
- Destroy every zombie in the horde to **clear the wave**; the next wave begins
  immediately, a little lower and faster.

### Lives
- Start with **3 lives**.
- A life is lost when a **thrown bomb hits the gun**. After a hit the gun is
  **invulnerable ~1.5s** and blinks.
- Game over at **0 lives**, or when **the horde reaches the bunker line**.

### The Fence
- A wooden fence stands in front of the bunkers. The descending horde **presses on
  it** instead of marching straight through.
- Fence health drains by `(living zombies × 2)` per horde step while the horde is
  pressing — **the bigger the horde, the faster it collapses**. Clearing front
  rows relieves the pressure.
- When the fence collapses, the horde resumes descending toward the bunkers.
  **Reaching the bunker line = game over** (even on Nightmare, which has a fence
  but no bunkers — the bunker *location* is still the death line).
- The fence is rebuilt at full strength at the start of each wave.

### Scoring
- Zombies are worth more the higher (further back) they stand:

  | Row (back → front) | Build | Points |
  |--------------------|-------|--------|
  | Row 0 | Skinny       | 40 |
  | Row 1 | Ribs-exposed | 30 |
  | Row 2 | Ribs-exposed | 20 |
  | Row 3 | Fat          | 10 |
  | Row 4 | Fat          | 10 |

- Zombies caught in a **bomb blast** are worth 25 each.
- Destroying the **flaming vehicle** is worth 250.

---

## Mechanics

### Bombs (two kinds)
1. **Thrown bombs** — the front-most zombie of a random column lobs a bomb that
   falls toward the gun. Hits the gun → lose a life. Erodes bunkers on contact
   (except on Very Easy, where bunkers are bomb-proof — see Difficulty).
2. **Carried bombs** — a few zombies each wave visibly **carry a bomb** (red
   marker + fuse spark). Shoot the carrier and it **drops its bomb in place**; the
   dropped bomb drifts down slowly. **Shoot the dropped bomb** to detonate a large
   blast (radius covers ~25% of the board area) that wipes out every zombie inside
   it — a high-value chain kill.

### The Flaming Vehicle
- Periodically a **flaming truck barrels down from the top** toward the fence.
- It takes **3–5 shots** to destroy (by difficulty). Destroy it for 250 points.
- If it reaches the fence, **it crashes through and collapses the fence instantly**
  — a fast path to being overrun if ignored.

### The Horde
- A **5 × 8 = 40** zombie grid that marches side to side, drops and reverses at the
  walls, and shambles through a 2-frame animation each step.
- The march **speeds up as the horde thins** (down to ~26% of the base step
  interval) — the last stragglers are the most dangerous.

---

## Controls

The play area stays unobstructed; all input is in the control dock below the board.

- **Movement slider** (wide, left) — the thumb's X maps 1:1 to the gun's X.
- **Fire button "A"** (compact, right) — **hold to autofire** (gated by cooldown
  and the on-screen shot cap). `touch-action: none` and `user-select: none` keep a
  held/dragged press from scrolling or selecting the label mid-game.
- **Keyboard:** ←/→ move, **A** / Space / ↑ fire, **P** pause.
- A **Start / Pause / Play** button sits above the fire row. Moving the slider or
  pressing a key from `READY` auto-starts.

---

## Play Area

- The board is **224 × 280 px** — taller than wide (`aspect-ratio: 224 / 280`), so
  the game fills more of a phone screen vertically (it was square in Star Swarm).
- Layout top → bottom: **horde → fence → sandbag bunkers → gun.**
- Rendered via `<canvas>` scaled up with `image-rendering: pixelated`.
- Background is a **dirt lot** — a deterministic scatter of pebbles, clods, dead
  grass, and rocks over an earthy gradient.

| Entity | Size (px) | Notes |
|--------|-----------|-------|
| **Gun** | 16 × 8 | Bottom-centre, horizontal only. |
| **Player shot** | 2 × 6 | Up at 4.2/step. Max 2 on screen, 320ms cooldown. |
| **Zombie** | 11 × 8 in an 18 × 16 cell | 3 builds (skinny / ribs / fat), 2-frame shamble. |
| **Thrown bomb** | 2 × 6 | Falls at 1.9/step, max 4 on screen. |
| **Dropped bomb** | 5 × 5 | Drifts down at 1.0/step; detonates an AoE if shot. |
| **Fence** | full width, 6 tall | HP-driven erosion; collapses under pressure. |
| **Bunker** | 24 × 16 | 6 × 4 grid of 4px sandbag blocks (notched). |
| **Vehicle** | 18 × 16 | Flaming truck, descends at 0.55/step, 3–5 HP. |

---

## Game States

Same four-state model as the other arcade games:

| State | Description |
|-------|-------------|
| `READY` | Board drawn (horde, fence, bunkers, gun). Waiting to start. |
| `RUNNING` | Horde marches, gun responds, collisions active. |
| `PAUSED` | Frozen. Triggered by the pause button or a ticket-called event. |
| `GAME_OVER` | Lives exhausted or bunkers overrun. Tap / A / Start to retry. |

Clearing the last zombie reports `wave-cleared`; the page swaps in the next wave
(`nextWaveWorld`) and keeps `RUNNING` for continuous play.

---

## Difficulty

Six presets (slider, default **Normal**). Each tunes the horde step cadence,
thrown-bomb interval, bunker rules, and vehicle toughness:

| Preset | Step base (ms) | Bomb interval (ms) | Bunkers | Vehicle HP |
|--------|----------------|--------------------|---------|------------|
| Very Easy | 760 | 2200 | yes, **bomb-proof** | 3 |
| Easy | 640 | 1750 | yes | 3 |
| Normal | 540 | 1400 | yes | 3 |
| Hard | 450 | 1050 | yes | 4 |
| Very Hard | 370 | 780 | yes | 4 |
| Nightmare | 290 | 560 | **none** | 5 |

- **Very Easy** — bunkers take damage only from the player's shots, never from
  enemy bombs (a permanent shield vs. bombs).
- **Nightmare** — no sandbag bunkers at all; the fence still stands, and the
  bunker *location* remains the game-over line.

---

## Engine Architecture

Pure functions under `src/arcade/game/zombie-attack/`; the page is a thin shell
wiring a canvas, a `requestAnimationFrame` fixed-timestep loop (~16ms), and input.
Same architecture as Brick Mayhem (continuous motion, vs. Snake's `setInterval`).

```
accumulator += deltaTime
while (accumulator >= FIXED_STEP) {
  result = tick(world, { shipX, fire }, difficulty)
  world = result.world
  accumulator -= FIXED_STEP
}
render(world)
```

Rendering is one `drawBoard(ctx, world, canvas)` pass: dirt → bunkers → fence →
zombies (with carrier markers) → vehicle → dropped bombs → thrown bombs → shots →
gun → explosions/blast rings. The gun, shots, and burst read CSS custom properties
so they pop in every theme; the thematic colors (dirt, undead green, fire,
weathered wood, sandbag) are intentional constants. A `MutationObserver` + resize
listener redraw on theme change.

---

## File Structure

```text
src/
  app/(arcade)/arcade/zombie-attack/page.tsx   # canvas, rAF loop, controls, state
  arcade/game/zombie-attack/
    types.ts        # World, Zombie, Projectile, GroundBomb, Vehicle, BunkerBlock, Explosion, ...
    constants.ts    # board, gun, shots, horde, bombs, blast, fence, vehicle, bunkers
    sprites.ts      # zombie builds (×2 frames), gun, explosion bitmaps
    engine.ts       # initialWorld, nextWaveWorld, tick, collisions, fence/vehicle/blast logic
    renderer.ts     # drawBoard — dirt, fence, vehicle, bombs, blasts (procedural + sprite)
  arcade/styles/arcade.css                      # arcade-zombie-* classes
tests/arcade-zombie-attack-engine.test.ts
```

---

## Decided Specifications

| Parameter | Value |
|-----------|-------|
| Board grid | 224 × 280 px (taller than wide, `aspect-ratio: 224 / 280`) |
| Game loop | Continuous `requestAnimationFrame`, ~16ms fixed timestep |
| Starting lives | 3; post-hit invulnerability 90 frames (~1.5s) |
| Player shots | 2 × 6, speed 4.2, max 2, 320ms cooldown |
| Horde | 5 × 8 = 40; step 4px H, drop 8px; cadence speeds up as it thins |
| Bomb carriers | 3 random zombies per wave |
| Thrown bombs | 2 × 6, speed 1.9, max 4; from a random column's front zombie |
| Dropped-bomb blast | radius ≈ √(0.25·W·H/π) ≈ 70px; 25 pts per zombie |
| Fence | full-width; HP 900, drains (alive × 2) per step under pressure; rebuilt each wave |
| Vehicle | 18 × 16 flaming truck, speed 0.55, 3–5 HP, 250 pts; crashing the fence collapses it |
| Bunkers | 4 sandbag walls (6 × 4 of 4px), eroded by shots (and bombs unless bomb-proof) |
| Loss conditions | 0 lives, or horde reaches the bunker line |
| Difficulty | 6 presets; default Normal; Very Easy bomb-proof bunkers; Nightmare no bunkers |

## Open Questions / Deferred
- Sound effects — deferred (visual-only on the web path, like the other games).
- Per-wave palette shifts or special "boss" zombies — possible future polish.
- High-score persistence — deferred to the broader Arcade v2.0 work.

---

Document Version: 2.0 (Zombie Attack! re-theme)
Last Updated: 2026-05-30
