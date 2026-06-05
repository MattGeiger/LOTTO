# Release notes

Plain-language summaries of what's new in LOTTO, newest first. For the full
technical history, see `CHANGELOG.md` and `docs/RELEASES.md`.

## Unreleased

- **Confetti follows you.** When your ticket number is called, the celebration
  (confetti + "Ticket Called!") now appears no matter which page you're on —
  your ticket status, the display board, or the inventory list — not just the
  home screen.
- **Less nagging at the door.** Once you've chosen a language this visit, the
  home screen stops re-asking for it and jumps straight to the ticket step.
- **Tidier display board.** On the `/display` board the bottom navigation now
  fades away after a period of quiet and reappears the moment anyone interacts,
  keeping the big screen clean between language cycles.

## Version 1.17.0 — June 4, 2026

- **The display board can greet everyone in their own language.** Staff can turn
  on **language rotation** in Admin, pick which of the eight supported languages
  to cycle through, and set how long each one shows. The board transitions
  smoothly and flips to right-to-left for Arabic and Farsi. Rotation only affects
  the big board — each client still picks their own language on the home screen.

## Version 1.16.0 — June 3, 2026

- **The personalized home screen is now the front door.** Opening the app greets
  each guest with the language picker and ticket lookup; returning guests with a
  saved ticket skip straight to their status.
- **The public board moved to `/display`.** Point lobby and TV screens there.
- **Clearer "just looking."** A prominent "I'm just looking" button, and you can
  dismiss the welcome dialog with the X, Escape, or by tapping outside.

## Version 1.12.0 — May 31, 2026

- **Day of the Dead (Zombie Attack!) became a top-down survival game** with
  hand-drawn NES-era art: defend a helicopter rescue across timed rounds, watch
  for the soldier zombie and his grenade, and shoot the runaway ambulance for a
  screen-clearing blast.

## Version 1.11.0 — May 30, 2026

- **The arcade's space shooter was re-themed into a last-stand against a horde**,
  with a fence and sandbag bunkers to defend, carried bombs that chain-explode,
  a flaming truck, a taller play area, and a simpler one-button fire control.

## Version 1.10.0 — May 29, 2026

- **A third arcade game arrived: a classic fixed-shooter** — clear a descending
  formation of invaders, hide behind destructible bunkers, shoot bonus saucers,
  and survive endless, faster waves. Six difficulty presets, all eight languages.

## Version 1.9.0 — May 29, 2026

- **A big look-and-feel pass.** The live board's ticket cells gained a clear,
  color-coded status language (blue "now serving," green "called," gold
  "unclaimed," red "returned"), modals share one frosted-glass style, and the
  high-visibility accessibility theme renders every surface as a solid, flat,
  maximum-contrast color.

## Version 1.7.0 — May 26, 2026

- **One consistent bottom navigation bar** across the client-facing pages,
  replacing scattered buttons — with an arcade-styled pixel-art variant for the
  games section.
- **Friendlier ticket entry.** You can enter and save a physical ticket before
  the drawing starts (it shows a calm "not in the drawing yet" state), plus a
  clear "I don't have a ticket — just browsing" option.
- **Fully translated ticket entry** across all eight languages, and the display
  QR code now follows the admin-configured URL live.

## Earlier releases

- Versions 1.1–1.6 built out the core raffle: admin controls and ticket ranges,
  the live "now serving" board with ticket lookup and estimated waits, the public
  inventory ("what's in stock") page, multilingual support, visual themes, and
  the first arcade games (Snake and Brick Mayhem).
