# Day of the Dead - Game Design Document (top-down survival)

> **Title:** the game is presented to players as **"Day of the Dead"** — a tribute
> to George A. Romero's 1985 film (the namesake of the **Bub** soldier zombie).
> Its internal slug stays `zombie-attack` (route `/arcade/zombie-attack`, module
> `src/arcade/game/zombie-attack/`, `arcade-zombie-*` CSS, `zombieAttack*` i18n
> keys) since that describes the genre and avoids churn.

## Status
- **Implemented and shipped (v1.12.0).** Top-down survival rework of the v1.11.0
  side-to-side shooter.
- Image-based rendering: preloaded NES-era PNG sprites blitted with `drawImage`
  (nearest-neighbour). Procedural dirt lot, helipad, fence, and bunker line.
- Stochastic downward zombie descent; four civilian sprite variants; the **Bub**
  soldier zombie; an **ambulance** hazard; a **helicopter** rescue across a timed
  4-round cycle.
- 6-tier difficulty; all eight languages; deterministic engine unit test
  (`tests/arcade-zombie-attack-engine.test.ts`, 9 cases).

## Concept

A top-down last stand. The hero (with an Uzi) paces the bottom of a dirt lot and
fires upward at a horde of zombies that shambles down from the top. A fence and
sandbag **bunker line** protect the **helipad** at the bottom centre. The game is
a **timed rescue**: a helicopter flies in, refuels, boards survivors, and takes
off across four rounds — outlast each round's clock to keep the extraction going.

The threat is mostly **numbers**: civilian zombies don't shoot, they just keep
coming. The exception is **Bub**, a zombie soldier (homage to George Romero's
*Day of the Dead*, 1985) who shoots back and drops grenades.

It is the Arcade's third game, alongside Snake and Brick Mayhem, sharing the
retro pixel-art system, the sticky control dock, and the page conventions.

---

## Core Loop

- Zombies **spawn at the top** on a timer and **descend** toward the bunker line.
- Each zombie, every ~0.5s, **re-rolls a stochastic direction**: 50% straight
  down, 25% down-left, 25% down-right (45° diagonals, constant downward speed).
- The hero moves left↔right along the bottom and fires the Uzi **upward**
  (rapid, up to 3 orange `#FFAA00` tracers on screen).
- Each zombie that reaches the **bunker line** is absorbed and chips the line's
  **integrity**; when integrity hits zero the pad is overrun → **game over**.
- The hero also has **3 lives**, lost to **Bub's bullets**; 0 lives → game over.
- Survive each **round timer** to advance the rescue. Completing round 4 extracts
  the chopper (a **rescue**), clears the lot, repairs the line, and loops the
  cycle at higher difficulty.

### Rounds (timed cycle)
| Round | Objective | Helicopter |
|-------|-----------|------------|
| 1 | Clear the pad — chopper inbound | flies in / descends to the pad |
| 2 | Refueling — hold the line | refuel pose |
| 3 | Boarding — protect the chopper | spin-up pose |
| 4 | Takeoff — cover the lift-off | takeoff frames, climbing away |

Win condition: the helicopter lifts off with survivors (end of round 4) → the
cycle repeats, faster. Lose condition: zombies overrun the bunker line, or the
hero runs out of lives.

---

## Cast & Hazards

### Civilian zombies (4 variants)
Street-clothes sprites (red, purple, blue-jeans, pink — pale/green faces, exposed
bone). Two-frame shamble. One shot kills. Worth 20 points. They don't shoot.

### Bub (zombie soldier)
- Fatigues + helmet, top-down. **2 HP.** Worth 150 points.
- Fires a **1911** on a timer with the same stochastic spread as the walk
  (50% down, 25% each diagonal). A Bub bullet that hits the hero costs a life.
- **50% chance to drop a live grenade** where he falls. The grenade sits armed;
  shoot it to detonate a **blast (radius ≈ 25% of the board area)** that wipes out
  every zombie inside it — a high-value chain kill.
- Spawns occasionally on its own timer; **more frequently on Nightmare**.

### Ambulance
A runaway ambulance periodically drives down a lane. Shoot it (3–6 hits by
difficulty) and it **explodes**, clearing zombies in a blast radius. Worth 200.

### Helicopter
The objective. 128×128 sprite drawn at ~116px over the helipad; animates by round
(idle → refuel → spin-up → takeoff), descending in on round 1 and climbing away
on round 4.

---

## Controls

All input is in the control dock; the play area stays unobstructed.
- **Movement slider** (wide) — thumb X maps 1:1 to the hero's X.
- **Fire button "A"** (compact) — hold to autofire. `touch-action: none` +
  `user-select: none` keep a held/dragged press from scrolling or selecting text.
- **Keyboard:** ←/→ move, **A** / Space / ↑ fire, **P** pause.
- The visible instruction list reads: "USE SLIDER TO MOVE", "HOLD A TO FIRE",
  "PROTECT THE FENCE FROM ZOMBIES", "SHOOT AMBULANCES AND GRENADES FOR A BLAST",
  and "SURVIVE EACH ROUND TO EXTRACT THE CHOPPER". The difficulty title,
  `SETTING: ...` row, and the `ROUND`, `LIVES`, and `SCORE` HUD rows use the
  same text color as this instruction list.

---

## Play Area

- Board **240 × 360** (tall portrait, `aspect-ratio: 240/360`), top-down.
- Layout top → bottom: spawn zone → descent area → **fence** → **bunker line**
  (the death line) → **helipad + helicopter** with the hero pacing in front.
- Background: a procedural **dirt lot** (deterministic pebbles, clods, dead grass).
- Sprites are 32×32 (helicopter 128×128) blitted with `drawImage` and
  `imageSmoothingEnabled = false`; CSS scales the whole canvas up (pixelated).

---

## Engine Architecture

Pure functions in `src/arcade/game/zombie-attack/`; the page is a thin shell
wiring a canvas, a `requestAnimationFrame` fixed-timestep loop (~16ms), input,
and the HUD. `tick(world, { heroX, fire }, difficulty)` advances one step:
hero + fire, projectile motion, the round timer / helicopter cycle, spawning,
the ambulance, per-zombie stochastic movement + Bub fire + breach checks,
shot collisions (ambulance / grenade / zombie), Bub-bullet-vs-hero, explosion
animations, corpse culling, and status resolution.

Randomness goes through a swappable `RNG` (with `__setRng` / `__resetRng` test
seams) so spawns, directions, and grenade drops are deterministic under test.

Rendering is one `drawBoard(ctx, world, assets)` pass; assets are a preloaded
`LoadedAssets` map (`loadAssets()` decodes every PNG before play is enabled).

---

## File Structure

```text
src/
  app/(arcade)/arcade/zombie-attack/page.tsx   # canvas, rAF loop, controls, HUD
  arcade/game/zombie-attack/
    assets.ts       # static PNG imports + loadAssets() preloader
    assets/         # NES-era sprite PNGs (zombies, bub, hero, helicopter, grenade, ambulance)
    types.ts        # World, Zombie, Projectile, Grenade, Ambulance, Hero, DifficultyParams, ...
    constants.ts    # board, hero, shots, zombies, Bub, grenade, ambulance, fence, helipad, rounds
    engine.ts       # initialWorld, tick (spawn/descent/Bub/rounds/collisions), RNG seam
    renderer.ts     # drawBoard — dirt, helipad, helicopter, defense line, zombies, hero, FX
  arcade/styles/arcade.css                      # arcade-zombie-* classes
tests/arcade-zombie-attack-engine.test.ts
```

---

## Difficulty

Six presets (default Normal). Each tunes spawn rate, descent speed, Bub
frequency, bunkers, and ambulance HP; a per-cycle factor ramps it further.

| Preset | Spawn (ms) | Zombie speed | Bub (ms) | Bunkers | Ambulance HP |
|--------|-----------|--------------|----------|---------|--------------|
| Very Easy | 2200 | 0.28 | 16000 | yes | 3 |
| Easy | 1900 | 0.31 | 14000 | yes | 3 |
| Normal | 1600 | 0.35 | 11000 | yes | 4 |
| Hard | 1300 | 0.40 | 9000 | yes | 4 |
| Very Hard | 1050 | 0.46 | 7000 | yes | 5 |
| Nightmare | 800 | 0.54 | 4500 | **no** | 6 |

Nightmare draws no sandbags, but the bunker *location* is still the death line
(integrity 2 vs. 6 with bunkers).

## Decided Specifications

| Parameter | Value |
|-----------|-------|
| Board | 240 × 360, top-down, `aspect-ratio 240/360` |
| Game loop | `requestAnimationFrame`, ~16ms fixed timestep |
| Hero | 32px, bottom lane; 3 lives; 80-frame post-hit invulnerability |
| Uzi | `#FFAA00` 3px×7 tracers, speed 4.6, max 3, 150ms cooldown |
| Zombie descent | re-roll every ~0.52s: 50% down / 25% / 25% diagonals (45°) |
| Civilian | 1 HP, 20 pts, 4 sprite variants |
| Bub | 2 HP, 150 pts, 1911 spread fire, 50% grenade-drop |
| Grenade blast | radius ≈ √(0.25·W·H/π) ≈ 54px; 25 pts per zombie |
| Ambulance | 3–6 HP, 200 pts, blast radius 60px |
| Rounds | 4 timed rounds (28 / 34 / 34 / 22 s); extraction loops the cycle with `EXTRACTION COMPLETE!` in `#00FF00` |
| Loss | bunker line overrun (integrity 0), or 0 lives |

## Open Questions / Deferred
- Sound effects (deferred — visual-only on the web path, like the other games).
- Per-cycle set-dressing or special "boss" waves.
- High-score / longest-survival persistence (Arcade v2.0 work).

---

Document Version: 3.0 (top-down survival)
Last Updated: 2026-05-31
