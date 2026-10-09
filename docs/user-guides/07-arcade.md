# The Arcade

The Arcade (`/arcade`) offers a few simple games to keep waiting guests
entertained. It's optional and kept separate from the raffle.

## The Games

![The Arcade game menu](/help-screenshots/arcade.webp)

- **Snake** — eat pellets, grow longer, avoid the walls and yourself.
- **Brick Mayhem** — a paddle-and-ball brick breaker.
- **Memory Grid** — match pairs of pixel-art foods, with no countdown.
- **Tower of Hanoi** — move a tower of disks between three pegs, with no timer.
- **Day of the Dead** — a zombie-survival game containing cartoon violence.

Each game has difficulty settings, retro pixel-art visuals, and works on phones,
tablets, and browsers tested from iOS 17 onward. Staff tools retain their
separate older-iPad support.

**Day of the Dead** shows a content warning before play, including when opened
from a direct link. It contains shooting zombies and explosions. Choose
**Continue to game** to enter or **Back to games** to choose something else.
The notice is highlighted in red with an exclamation mark on both the game card
and pre-game screen. The warning appears again on a fresh visit or reload;
it does not repeat during
replay on the same page. Availability is not automatically limited to October.

![Day of the Dead warning with Continue and Back to games choices](/help-screenshots/cartoon-violence-warning.webp)

## Playing A Game

![Snake running in a phone-sized portrait game screen](/help-screenshots/arcade-game.webp)

1. Open the Arcade from the staff home page (**Play Games**) or the bottom nav.
2. Pick a game from the arcade index.
3. Follow the on-screen instructions; use **Back** to return to the index.

In **Brick Mayhem**, the control dock at the bottom of the screen carries the
paddle slider above the **Start**/**Pause** button, so the slider sits within
easy thumb reach and the button is furthest from the play area.

Every game's **Start / Pause / Resume** control stays in the dock's bottom
action row. Sliders and directional controls sit above it. In **Snake**, Pause
is below the D-pad. **Day of the Dead** has its movement slider above a shared
row with **Pause on the left** and **A (Fire) on the right**. These positions
stay the same when you switch languages. Games with Restart or Undo keep those
buttons beside Pause in the bottom row.

The Arcade language menu uses the same ready, organization-enabled list as Home
and Display. Opening it refreshes the choices; a blurred lower edge means more
are available by swiping upward.

## Memory Grid

![Memory Grid with a food card revealed and turn/pair counters](/help-screenshots/memory-grid.webp)

Choose **Easy** (six pairs), **Normal** (eight pairs), or **Hard** (twelve pairs),
then **Play Now** or **Start game**. Changing difficulty prepares a new board.
Tap two cards to reveal their foods. A match stays face up with a check mark;
different foods turn back over after a brief pause. Each two-card attempt counts
as one turn. There is no timer: take as long as you like and aim for fewer turns.

Completing the board earns **1,000 points**, plus a **memory bonus** for using
fewer turns. Your final score is `1,000 + round(1,000 × pairs ÷ turns)`:
a six-pair board finished in six turns earns 2,000 points; nine turns earns
1,667; twelve turns earns 1,500. Thinking time and pauses do not affect points.
The finish screen shows your score and its two parts. There is no par target.

With a keyboard, use the arrow keys to move between cards and Enter or Space to
reveal one. **Pause game** hides the board; **Resume game** restores it. Leaving
the tab or a ticket call also pauses play, including any pending mismatch.
Returning to the page does not resume automatically. **Restart game** returns
to the ready screen; starting again shuffles the foods.

Screen readers announce both revealed foods and the result of the turn. The
announcement remains available after different cards close, until you choose
the next card; the brief visual reveal does not limit reading time.

Best completed turn counts are saved separately for each difficulty on this
device. Clearing browser storage removes them; private browsing or blocked
storage may prevent saving. Gameplay needs no network once its page and food
images have loaded. The online leaderboard and score submission need a
connection; if they are unavailable, you can still finish and keep your local
best turns. The queue banner still needs its connection for ticket calls.

The food artwork is **Free Pixel Food! by Henry Software**, used under **CC0**.
Credits and links appear below the game and in LOTTO's **About** modal.

## Tower of Hanoi

![Tower of Hanoi with numbered disks and three pegs](/help-screenshots/tower-of-hanoi.webp)

Choose **Easy** (three disks), **Normal** (four), or **Hard** (five), then
**Play Now**. Move the entire tower from **A** on the left to **C** on the right.
Tap a peg with a disk, then a destination. Only the top disk moves, and a larger
disk cannot rest on a smaller one. Tap the selected peg again to cancel.
The disk numbers identify sizes; lower numbers mean smaller disks.

With a keyboard, arrow keys move focus between pegs; Enter or Space selects
and moves, and Escape cancels. The peg order stays the same in every language.
**Undo** reverses your last move, but **counts as another move**. Invalid taps
and cancellations do not count. **Pause game** and ticket calls preserve the
board; resume explicitly. Restart or a difficulty change prepares a fresh puzzle.

There is no timer or speed bonus. Finishing earns **1,000 points** plus
`round(1,000 × minimum moves ÷ your counted moves)`. The minimums are **7**, **15**,
and **31** moves. An optimal finish earns **2,000** points. On Easy, ten counted
moves earn 1,700 points. Your best completed move count stays on this device.
Once the page loads, the puzzle and local record work offline; shared scores
require a connection. Board moves, Undo and pauses do not refresh the leaderboard.

After finishing three disks, choose **Continue: 4 disks** to start the next
puzzle immediately. Finishing four disks offers **Continue: 5 disks**. Each
new puzzle resets the move counter and Undo history, and updates the difficulty
setting. Five disks is the current final level; you can replay it or choose
another difficulty. Each level has its own best moves and shared high-score
board. **Save your score before continuing** if you want it on the shared board;
Continue does not submit a score. Progression also works offline.

## Installed App Mode

When LOTTO is added to an iPhone, iPad, or Android home screen, browser refresh
controls are hidden. While the page is already at the top, drag downward from
anywhere outside an input or scrollable menu and release after the refresh
indicator appears to reload the current page.

Arcade game controls also reserve extra space above the phone's home indicator
in installed mode. This keeps sliders and action buttons clear of the system's
swipe-home gesture area.

Arcade page backgrounds, panels, borders, buttons, text, and the Now Serving
banner follow the active Appearance. The games keep their own pixel-art colors
so changing agency branding does not change gameplay cues.

## Good Citizen: Ticket Calls Come First

The Arcade watches the queue. If a player's saved ticket number is called while
they're playing, the game pauses and shows the same celebration used elsewhere,
so nobody misses their turn. See [Tickets & the Queue](04-tickets-queue.md).

If **Error loading state** appears, the queue connection is unavailable and a
call notification may be delayed. Confirm your status with staff. Queue updates
reconnect automatically, with snapshot checks after a two-minute interruption;
see [connection recovery](03-display-board.md#connection-recovery).

## High Scores

All five games track online top scores separately for each
game and difficulty. When you earn a top-10 result, enter exactly **three
letters** (including letters in your language), then **Save**. These initials
and your points appear on the shared leaderboard. Only submit initials you
want other players to see.

Memory Grid and Tower of Hanoi give you unlimited time to enter initials.
Snake, Brick Mayhem and Day of the Dead retain their 30-second entry countdown.
Hanoi accepts a result tied with tenth place; among equal Hanoi scores, the
newest appears first. Other games retain their existing tie policy.
Best turns in Memory Grid and best moves in Hanoi also stay
saved locally on your device. Leaderboards refresh when a board is ready or
finished; they do not continuously poll during play or while idle.

## Artwork and Font Credits

LOTTO's **About** modal lists the Memory Grid food artwork by Henry Software
(CC0) and the shared Seven Fifteen pixel font by Douglas Vautour / Burpy Fresh
(CC BY 4.0), with links to their sources and licenses. The font is processed
for web delivery. These assets retain their own licenses.

## What To Read Next

- Get back to your ticket: [Tickets & the Queue](04-tickets-queue.md).
