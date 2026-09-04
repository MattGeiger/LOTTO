# The Display Board

The public board at `/display` is the big screen clients watch while they wait.
Open it from the staff home page with **View Public Board**.

## What's On The Board

![The public Display Board with Now Serving, ticket search, QR code, service details, and drawing order](/help-screenshots/display-board.webp)

The board combines **Now Serving**, ticket search, a phone-friendly QR code,
service details, and the drawing order. In the grid, blue is now serving, green
is called, gold is unclaimed, and red is returned. The service date always uses
the pantry timezone, regardless of the screen or hosting server timezone.

## Putting It On A Screen

1. Open `/display` on the computer connected to your TV or large monitor.
2. Put the browser in full screen.
3. Leave it running — the board refreshes itself automatically as you call
   numbers from the [Staff Dashboard](02-staff-controls.md).

## Languages On The Board

The board can greet everyone in their own language:

- A language switcher is available on the board at any time.
- Staff can turn on **automatic language rotation** so the board cycles through
  chosen languages on a timer. See [Languages & Themes](06-languages-themes.md).
- The bottom navigation on the board hides itself after a quiet period and
  reappears as soon as anyone interacts, keeping the screen clean.

## Beta Realtime Testing

On the separate beta site, the ordinary `/display` page receives queue changes
through the realtime feed after confirming it matches the database. If that
feed becomes unavailable or cannot be trusted, the board checks the database
immediately and continues with its normal automatic refresh schedule.

Authorized testers can use `/display?realtime=poll` for the polling-only
control or `/display?realtime=observe` for the diagnostic comparison badge.
**Neon match** means the two public copies agree. Report a persistent mismatch
to the test lead rather than using the badge as a queue instruction.

The live production board does not yet enable realtime.

## What To Read Next

- Turning on rotation: [Languages & Themes](06-languages-themes.md).
- How clients use their phones: [Tickets & the Queue](04-tickets-queue.md).
