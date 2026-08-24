
## Unreleased

- **Connect FEED without Vercel or terminal work.** Open History on the Admin
  dashboard, choose **Sync history with FEED**, and copy the displayed URL and
  one-time token into FEED. LOTTO stores only a protected hash. Generating a
  replacement immediately invalidates the old connection.

## Version 1.21.0 — August 22, 2026

- **Queue history now survives Reset.** When staff choose **Reset for New Day**,
  LOTTO first preserves the completed queue as an immutable operational
  closeout. Empty resets do not create noise, and the normal workflow remains
  one action.
- **FEED can synchronize queue timing safely.** A new read-only integration
  supplies anonymous issuance-to-first-call observations, batching, append, and
  mode-change evidence. Physical ticket numbers and client identities are not
  included.
- **Unusual activity stays reviewable.** LOTTO preserves facts rather than
  deciding whether activity was service or testing. FEED applies the agency's
  operating-hours and authenticity rules, withholds anomalies from Analytics,
  and asks staff to classify them there.

## Version 1.20.1 — July 20, 2026

- **Typing an announcement is fast again on older iPads.** Editing the
  Announcement message on an iPad mini 4 could leave several seconds between
  pressing a key and the letter appearing. Every keystroke was redrawing the
  whole Admin page — including the Translation and Appearance cards hidden
  behind other tabs. The announcement text now updates on its own, so typing
  stays responsive no matter how long the message is. Nothing about the
  Announcement workflow changed: the toolbar, live preview, character limit,
  scheduling, and unsaved-draft recovery all behave exactly as before.

## Version 1.20.0 — July 20, 2026

- **Create an agency appearance without changing code.** Staff can now open
  Appearance under Admin's Advanced section and build a complete identity from
  a template or from scratch: organization and app names, logos, install icon,
  colors, staff sign-in copy, inventory access, and the public service heading.
- **Get a safe color recommendation from a logo.** LOTTO extracts a logo's
  palette, recommends the main, accent, ambient, and neutral colors, and keeps
  universal Returned-red and Unclaimed-gold meanings out of brand signaling.
  Staff can review every recommendation and adjust it before activation.
- **Preview every important mode before activation.** The wizard shows the
  derived identity in light, dark, and high-visibility themes, checks contrast,
  and keeps operational status colors consistent across organizations.
- **Use sharper, safer brand assets.** SVG logos remain crisp and are validated
  as self-contained files; uploaded square marks generate a complete browser,
  Apple, and install-icon set automatically.
- **Adapt LOTTO beyond food pantries.** The public board's “Food Pantry Service
  For” heading can now be replaced with organization-specific wording such as
  “Clinic Hours For” or “Equipment Checkout For.” Leaving it blank preserves
  the translated standard heading.
- **A quieter, more reliable Admin experience.** Advanced-card shadows no
  longer clip, derived contrast problems are corrected automatically when staff
  have no direct control to fix them, and the public service clock no longer
  causes harmless hydration warnings during page startup.

## Version 1.19.0 — July 18, 2026

- **LOTTO can now serve more than one organization from the same codebase.**
  Deployments can carry their own name, logos, colors, install identity, staff
  guidance, database, and integrations while sharing queue improvements.
- **Welcome, St. Johns Food Share.** A complete St. Johns profile adds its
  teal, off-white, and charcoal identity across light, dark, high-visibility,
  and Arcade views, plus its own rounded browser-tab and padded home-screen
  icons. Its production home is `stjohnsfoodshare.app`.
- **Inventory is optional.** Queue-only agencies no longer see “What's in
  stock” unless their deployment is connected to its own FEED inventory app.
- **Safer staff access for small organizations.** A deployment may authorize
  individual email addresses instead of opening staff login to an entire public
  provider such as Gmail, and may combine those exceptions with a trusted staff
  domain. The restrictions cover both one-time codes and Magic Links.
- **Status colors keep their operational meaning.** Returned actions remain
  red, Unclaimed actions remain gold, and unavailable actions remain neutral
  regardless of agency branding.
- **Cleaner mobile display layout.** Branded logos now reserve enough room
  below the language, ticket-search, and theme controls on narrow screens.
- **A maintainable color system underneath.** Core and Arcade palettes are
  separated by responsibility, and authored CSS colors now use a consistent
  OKLCH format with automated regression protection.

## Version 1.18.0 — June 30, 2026

- **Staff now sign in through one login screen.** Signing in takes you straight
  to a dedicated staff navigation — Admin, Dashboard, What's in stock, and
  Games — instead of the public menu.
- **Write an announcement that greets every guest.** Admins can now compose a
  homepage announcement, with simple formatting like bold, bullets, and titles,
  that appears as part of the welcome a guest sees when they arrive.
- **Way more languages, powered by AI.** Beyond the original eight languages,
  staff can turn on AI-assisted translation to add many more on the fly — the
  whole guest experience, including "What's in stock," can now be automatically
  translated.
- **Undo a returned or unclaimed ticket.** If a ticket was marked Returned or
  Unclaimed by mistake, staff can now revert it back to normal instead of
  starting over.
- **Find answers without leaving the app.** The Staff page now has a searchable
  Help section, plus About and Release Notes (this page!), all one tap away.
- **Confetti follows you.** When your ticket number is called, the celebration
  (confetti + "Ticket Called!") now appears no matter which page you're on —
  your ticket status, the display board, or the inventory list — not just the
  home screen.
- **Less nagging at the door.** Once you've chosen a language this visit, the
  home screen stops re-asking for it and jumps straight to the ticket step.
- **Tidier display board.** On the `/display` board the bottom navigation now
  fades away after a period of quiet and reappears the moment anyone interacts,
  keeping the big screen clean between language cycles.
- **Fixed: older iPads couldn't tap anything.** Login and the home screen would
  load but not respond to taps on iPadOS 15.8 — fixed.
- **Fixed: buttons near the bottom nav bar were unclickable on wide screens.**
  On desktop and iPad, anything sharing a row with the floating navigation bar
  couldn't be tapped — fixed.
- **Fixed: the browser tab and Google search title no longer go stale.** The
  tab and search-result title now read a stable "William Temple House App"
  instead of a pantry date that could fall out of date between Google's crawls.
- **New: a real home-screen icon.** Adding the site to a phone's home screen
  (iPhone or Android) now shows the William Temple House logo instead of a
  generic letter on a black square.

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
