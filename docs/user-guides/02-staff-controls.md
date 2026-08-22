# Staff Controls

Everything you do to run the queue happens on the **Staff Dashboard**. Go to
`/staff` and sign in with your email (a magic link or a 6-digit code) — you'll
land on the dashboard at `/admin`. Already signed in? Going straight to
`/admin` works too. Only email addresses authorized by your agency administrator
can receive or complete a staff sign-in.

## Setting Today's Ticket Range

Before calling anyone, tell LOTTO which ticket numbers are in play.

1. Open the Staff Dashboard (`/admin`).
2. Enter the **start** and **end** numbers for today's tickets.
3. Save. The board and client lookups now recognize that range.

A drawing can be **random** (numbers are shuffled into a fair order) or
**sequential**, depending on how your event hands out tickets.

## Calling Numbers

When you're ready for the next person:

1. Use the **call next / now serving** control on the dashboard.
2. The number you call becomes "Now Serving" on the [display board](03-display-board.md)
   and on that client's phone — with a celebration when it's their turn.
3. Repeat as each client is served.

## Handling Problem Tickets

Not every called number shows up. You can mark a ticket:

- **Unclaimed** — called, but nobody came. It stays visible in gold so staff and
  clients can spot it.
- **Returned** — pulled out of the drawing entirely; it will not be called.

Mark these from the dashboard; the board updates with the matching status color.
The **Mark ticket** action is red for Returned and gold for Unclaimed. Until a
valid ticket number is entered, the action stays neutral to show that it is not
yet available.

**Made a mistake?** In the **Returned tickets** and **Unclaimed tickets** lists,
tap any ticket number and confirm **Revert** to clear its status — the ticket
returns to normal without changing who's currently being served.

## Operating Hours & the Display URL

- **Operating hours** tell the board when the pantry is open, before-open, or
  closed, so clients see the right message.
- The **display URL / QR code** can point clients to wherever you like; by
  default the board's QR sends them to the home screen to look up their ticket.

## Ending a Service Day

Choose **Reset for New Day** when the queue is finished. LOTTO first preserves
the meaningful queue activity for FEED Analytics, then clears the live board.
An empty reset creates no history. If a reset happens the following morning,
the preserved session still belongs to the date its first tickets entered the
queue.

LOTTO records the operational facts only. If the pattern looks like testing or
an accidental setup, FEED withholds it from Analytics and asks staff to classify
it there; Reset does not add another question to the end-of-shift workflow.

## The Advanced Section

Expand **Advanced** on the dashboard for less-frequent setup tasks: operating
hours, display-language rotation, writing an
[announcement](10-announcements.md), and
[AI-powered translation](11-ai-translation.md).

## What To Read Next

- How clients see all this: [Tickets & the Queue](04-tickets-queue.md).
- Putting the board on a screen: [The Display Board](03-display-board.md).
- Greeting guests with a message: [Announcements](10-announcements.md).
- Adding more languages: [AI-Powered Translation](11-ai-translation.md).
- Something not working? [Troubleshooting](08-troubleshooting.md).
