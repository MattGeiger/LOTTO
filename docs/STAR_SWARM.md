# Star Swarm - Game Design Document

## Status
- **Implemented and shipped.** Core gameplay is fully playable on touch and keyboard.
- Scaffolding (page shell, CSS, translations, menu entry) is complete.
- Game engine (formation movement, firing, collisions, bombs, bunkers, saucer, waves, rendering) is complete.
- Ship slider control, FIRE button (hold-to-autofire), keyboard input, and the game loop are wired up.
- Endless waves with escalating difficulty.
- 6-tier difficulty system (Very Easy → Nightmare) tuning formation march cadence and bomb frequency.
- Theme-aware canvas rendering (light / dark / hi-viz) via Arcade CSS custom properties.
- Deterministic engine unit test (`tests/arcade-star-swarm-engine.test.ts`).

## Concept

Star Swarm is a fixed-shooter in the **Space Invaders** lineage and the Arcade's
third game, alongside Snake and Brick Mayhem. The player pilots a ship along the
bottom edge of a square play area and fires upward at a descending formation of
invaders. The objective is to clear the entire formation each wave before it
marches down to the ship's row. The game shares the Arcade's retro pixel-art
visual system, the sticky bottom control dock, and the page-layout conventions
established by the other two games.

It is thematically aligned with the Arcade's invader-style "gaming" icon, and is
mechanically distinct from both Snake (grid/tick movement) and Brick Mayhem
(ball physics): Star Swarm is about aiming, timing, and managing a shrinking
formation that speeds up as it thins.

---

## Core Rules

### Objective
- Destroy every invader in the formation to **clear the wave**.
- Clearing a wave immediately spawns the next wave (a fresh formation, dropped a
  little lower and moving a little faster).

### Lives
- The player starts each game with **3 lives**.
- A life is lost when an invader **bomb hits the ship**.
- After a hit, the ship is **invulnerable for ~1.5s** (90 frames) and **blinks**
  to signal the recovery window.
- The game ends when the player reaches **0 lives**, or when the **formation
  reaches the ship's row** (a breach is an instant loss).

### Waves
- Each wave is a full **5 × 8 = 40** invader formation.
- The formation marches side to side; when it reaches a wall it **drops down**
  and reverses direction.
- The **march speed scales with how many invaders remain** — the fewer are left,
  the faster they move (down to ~26% of the base step interval). The final few
  invaders are the most dangerous.
- Each subsequent wave starts the formation a little lower (capped) and uses the
  difficulty's base cadence, so survival pressure ramps over time.

### Scoring
- Invaders are worth more the higher they sit in the formation:

  | Row (top → bottom) | Sprite tier | Points |
  |--------------------|-------------|--------|
  | Row 0 | Squid  | 40 |
  | Row 1 | Crab   | 30 |
  | Row 2 | Crab   | 20 |
  | Row 3 | Octopus| 10 |
  | Row 4 | Octopus| 10 |

- The **bonus saucer** that periodically crosses the top is worth a random value
  from **{50, 100, 150, 200, 300}**.

---

## Controls

### Design Principle
The play area stays **completely unobstructed** during gameplay. All input is
handled via the control dock below the board — the player's fingers never cover
the ship, shots, or invaders.

### Input Model
The control dock (sticky bottom bar) contains:
1. A **Start / Pause / Play** button (top) — toggles the run state.
2. A **fire row** (bottom) with:
   - A **movement slider** (left, flex-grow): the thumb's X position maps 1:1 to
     the ship's X position on the board. Drag to move; works for touch and mouse.
   - A large **FIRE** button (right): **hold to autofire** (gated by the shot
     cooldown and the on-screen shot cap). `touch-action: none` keeps a held
     press from scrolling the page.

### Keyboard (desktop fallback)
- **← / →** — move the ship (incremental; syncs the movement slider).
- **Space / ↑** — fire (hold for autofire). Also starts the game from `READY`
  and restarts from `GAME_OVER`.
- **P** — pause / resume.

No input is accepted on the play area itself — the board is view-only. Moving the
slider or pressing an arrow from `READY` auto-starts the game.

---

## Play Area

### Board Dimensions
- The play area grid is **224 × 224 pixels** — a **square** board
  (`aspect-ratio: 1 / 1`), like Snake (and unlike Brick Mayhem's 6:5).
- Container width is driven by `--arcade-board-size`; height follows the square
  aspect ratio.
- Rendered via an HTML5 `<canvas>` scaled up with `image-rendering: pixelated`
  to preserve the native pixel grid.

### Entity Dimensions

| Entity | Size (pixels) | Notes |
|--------|---------------|-------|
| **Ship** | 16w × 8h | Parked near the bottom edge (`SHIP_Y = 208`). |
| **Player shot** | 2w × 6h | Travels up at 4.2 px/step. Max **2** on screen, **320ms** cooldown. |
| **Invader** | 11w × 8h sprite in an 18 × 16 cell | Centered in its formation cell. |
| **Invader bomb** | 2w × 6h | Falls at 1.9 px/step. Max **4** on screen. |
| **Bunker** | 24w × 16h | A 6 × 4 grid of 4px destructible blocks, notched silhouette. |
| **Bonus saucer** | 16w × 7h | Crosses the top row (`UFO_Y = 12`) at 1.1 px/step. |

### Entities
- **Ship** — player-controlled, moves horizontally only, clamped to the board.
- **Invader formation** — a 5 × 8 grid that steps horizontally, drops and
  reverses at the walls, and toggles a 2-frame animation on each step.
- **Bombs** — dropped by the **bottom-most invader of a random occupied column**,
  at the difficulty's average interval (with jitter so volleys feel organic).
- **Bunkers** — four destructible shields between the formation and the ship.
  Player shots **and** invader bombs erode them block by block.
- **Bonus saucer** — appears on a 14–26s timer (only while >2 invaders remain),
  flies in from a random side, and awards bonus points if shot.
- **Explosions** — short pixel bursts on invader/saucer kills and ship hits.

### Notable Interactions
- A **player shot can destroy an invader bomb** mid-air (mutual destruction) —
  a satisfying skill shot.
- A shot is consumed by the **first** thing it hits (invader, saucer, bunker
  block), so bunkers genuinely block your own fire too.

---

## Game States

The game uses the same four-state model as Snake and Brick Mayhem:

| State | Description |
|-------|-------------|
| `READY` | Board drawn with the formation, bunkers, and ship. Waiting to start. |
| `RUNNING` | Formation marches, ship responds to input, collisions are active. |
| `PAUSED` | Logic frozen. Triggered by the pause button or a ticket-called event. |
| `GAME_OVER` | Lives exhausted (or formation breach). Final score shown; tap / Space / Start to play again. |

### Wave Transitions
- When the last invader dies, the engine reports `wave-cleared`; the page swaps
  in the next wave (`nextWaveWorld`) and keeps `RUNNING` — continuous play, no
  interruption.

---

## Engine Architecture

### Separation Principle
All game logic lives in pure functions under `src/arcade/game/star-swarm/`. The
page component is a thin shell that wires up a canvas, an animation loop, and
input listeners. No game math in the React component.

### Game Loop
Star Swarm uses a **continuous `requestAnimationFrame` loop with a fixed
timestep** (~16ms), like Brick Mayhem — the shooter needs smooth, continuous
projectile motion (vs. Snake's discrete `setInterval` grid ticks). The loop uses
a delta-time accumulator:

```
accumulator += deltaTime
while (accumulator >= FIXED_STEP) {
  result = tick(world, { shipX, fire }, difficulty)
  world = result.world
  accumulator -= FIXED_STEP
}
render(world)
```

This keeps gameplay deterministic regardless of frame rate.

### Rendering
One canvas, one `drawBoard(ctx, world, canvas)` pass per frame: clear → starfield
→ bunkers → invaders → saucer → shots/bombs → ship → explosions. Sprites are
string-bitmaps (`"X"` = filled pixel) drawn one board-pixel per cell. The palette
is read from the canvas element's **CSS custom properties**
(`--arcade-neon`, `--arcade-ghost`, `--arcade-pellet`, `--arcade-dot`,
`--arcade-snake-head`, etc.), so it follows the active arcade theme (light / dark
/ hi-viz) automatically. A `MutationObserver` + resize listener trigger a redraw
on theme change. The starfield is a deterministic seeded array so it never
flickers between frames.

---

## Arcade Integration

Star Swarm follows the Arcade integration patterns established by Snake and Brick
Mayhem:

- **Route:** `/arcade/star-swarm` under the `(arcade)` route group.
- **Layout:** Inherits the shared Arcade layout (`NowServingBanner`, language /
  theme switchers, the persistent bottom nav on the index).
- **Ticket-called event:** Listens for `ARCADE_TICKET_CALLED_EVENT` and
  auto-pauses to `PAUSED` if `RUNNING` (and drops the held-fire state).
- **Play-resumed event:** Dispatches `ARCADE_PLAY_RESUMED_EVENT` on start/resume.
- **Haptics:** Uses the shared semantic haptics layer for **direct button input
  only** — Start/Pause/Play/Reset/Back use explicit UI intents, the FIRE button
  emits a light tick on press, and the movement / difficulty sliders stay
  haptic-free. Gameplay collisions (invader/ship/saucer/bunker) are **visual-only
  on the web path**, matching Snake and Brick Mayhem.
- **Styling:** Arcade-scoped CSS classes (`arcade-swarm-*`) and shared Arcade CSS
  custom properties. The board and dock are pinned LTR so controls don't mirror
  in Arabic / Persian. No global theme changes.
- **Data boundary:** All game state is local client state. No raffle API
  dependency.
- **Translations:** Title, five instructions, difficulty labels, FIRE, and the
  WAVE readout are defined for all 8 supported locales under `starSwarm*` keys
  (reusing the shared `score` / `lives` / control-label keys).

---

## File Structure

```text
src/
  app/
    (arcade)/
      arcade/
        star-swarm/
          page.tsx              # game page (canvas, rAF loop, controls, state)
  arcade/
    game/
      star-swarm/
        types.ts                # World, Invader, Projectile, BunkerBlock, Ufo, Explosion, DifficultyParams, ShooterInput, TickResult
        constants.ts            # board, ship, shots, formation, bombs, scoring, saucer, bunkers
        sprites.ts              # string-bitmap sprites (invader tiers ×2 frames, ship, saucer, explosion)
        engine.ts               # pure logic: initialWorld, nextWaveWorld, tick, collisions, status
        renderer.ts             # drawBoard(ctx, world, canvas) — single themed canvas pass per frame
    styles/
      arcade.css                # arcade-swarm-* classes
tests/
  arcade-star-swarm-engine.test.ts
```

---

## Decided Specifications

| Parameter | Value |
|-----------|-------|
| Board grid | 224 × 224 pixels (square, `aspect-ratio: 1 / 1`) |
| Game loop | Continuous `requestAnimationFrame`, ~16ms fixed timestep |
| Engine separation | Pure functions in `src/arcade/game/star-swarm/`, React page is a thin shell |
| Rendering | Single `<canvas>`, one themed `drawBoard()` pass per frame |
| Starting lives | 3 |
| Ship | 16 × 8, parked at `SHIP_Y = 208`; keyboard move 2.4 px/frame |
| Post-hit invulnerability | 90 frames (~1.5s), blinking |
| Player shots | 2 × 6, speed 4.2, **max 2** on screen, **320ms** cooldown |
| Formation | 5 rows × 8 cols = 40 invaders; 18 × 16 cell, 11 × 8 sprite |
| Formation step | 4px horizontal; drop 8px + reverse at walls (6px edge pad) |
| Step cadence | `stepBaseMs × max(0.26, aliveFraction)` — speeds up as the swarm thins |
| Invader bombs | 2 × 6, speed 1.9, **max 4** on screen; from a random occupied column's bottom invader |
| Scoring | Rows 40 / 30 / 20 / 10 / 10 (top → bottom) |
| Bonus saucer | 16 × 7, speed 1.1, 14–26s timer; points ∈ {50, 100, 150, 200, 300} |
| Bunkers | 4 shields, each a 6 × 4 grid of 4px blocks (notched), destructible by shots and bombs |
| Difficulty tiers | 6: Very Easy → Nightmare, tuning `stepBaseMs` (760 → 290) and `bombIntervalMs` (2200 → 560) |
| Default difficulty | Normal (index 2) |
| Loss conditions | 0 lives, or formation bottom reaches the ship row |
| Wave progression | Endless; next wave drops the formation lower (capped) and keeps score/lives |

## Open Questions / Deferred
- Sound effects — deferred (consistent with Snake / Brick Mayhem on the web path).
- Per-wave palette shifts or boss waves — possible future polish.
- High-score persistence — deferred to the broader Arcade v2.0 work.

---

Document Version: 1.0
Last Updated: 2026-05-29
