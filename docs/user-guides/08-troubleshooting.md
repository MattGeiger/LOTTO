# Troubleshooting

Quick fixes for the most common questions. If something here doesn't resolve it,
note what you saw and when, and contact your administrator.

## A Client's Number Won't Show Up

1. Confirm the ticket number is inside today's range on the
   [Staff Dashboard](02-staff-controls.md).
2. Check whether the ticket was marked **returned** (it won't be called) or
   **unclaimed** (it was called already).
3. Have the client re-enter the number on the home screen.

## The Display Board Looks Stuck

1. The board refreshes itself — give it a few seconds after calling a number.
2. After an interruption, the board keeps its last queue and tries to reconnect
   for up to two minutes. It then checks the public snapshot automatically while
   continuing to reconnect. These checks run about every 15 seconds during service.
3. If **Error loading state** appears, the displayed queue may be out of date.
   Confirm calls with staff and check the computer's internet connection.
4. If updates remain missing after connectivity returns, contact an administrator
   to check publication status under Admin realtime diagnostics. Reloading the
   board cannot repair a staff update that has not reached the public snapshot.

Saved appearance and language changes refresh the server's shared configuration
cache immediately. Reload the affected page to obtain the saved configuration.
If it still shows old content, report the page URL and time to an administrator.

## The Board Navigation Disappeared

That's expected — on `/display` the bottom navigation hides after a quiet period
to keep the screen clean. Move the mouse, tap, or press a key and it returns.

## The QR Code Sends People To The Wrong Place

The QR follows the display URL set on the [Staff Dashboard](02-staff-controls.md).
Update it there; the board picks up the change on its next refresh.

## Text Is In The Wrong Language

- Each client can pick a language on the home screen; it sticks for their visit.
- The board's language is controlled separately — see
  [Languages & Themes](06-languages-themes.md).

## A Staff Sign-In Link Does Not Work

![The Verification Code alternative on the staff sign-in page](/help-screenshots/sign-in-code.webp)

1. Open the newest LOTTO sign-in email; links expire after ten minutes and are
   single-use.
2. The link should open a **Confirm sign in** page. Select **Sign in** there.
   Refreshing the confirmation page is safe and does not use the link.
3. If the page says the link is incomplete or verification fails, return to
   `/login` and request a new one.
4. Select **Verification Code** if the mail program rewrites or breaks the link.
   Request a fresh six-digit code and enter it within ten minutes.

If LOTTO says the address is not authorized, contact the agency administrator;
retrying with the same address will not change its access policy.

## What To Read Next

- Back to the basics: [Getting Started](01-getting-started.md).
