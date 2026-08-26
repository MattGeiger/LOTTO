
## Unreleased

## Version 1.25.0 — August 26, 2026

**This is a maintenance update.** Nothing changes about how LOTTO looks or works
for staff or visitors.

- **Faster loading.** The framework LOTTO is built on was updated, reducing the
  code the app downloads by roughly 176 KB. This matters most on the older
  tablets used at the counter.
- **Security advisories resolved.** All but one outstanding advisory is now
  closed. The single remaining item affects a mail-sending option LOTTO does
  not use in production, and cannot be reached by anyone visiting the site.
- **Verified on the oldest supported iPad.** Sign-in and a custom appearance
  were checked on a simulated iPad mini 4 running iPadOS 15.4 to confirm the
  update changed nothing for the tablets at the counter.

## Version 1.24.3 — August 26, 2026

**This is a security update.** Nothing changes about how LOTTO looks or works
for staff or visitors.

- **Sign-in libraries updated.** LOTTO's authentication components were moved
  to their current versions, resolving the last of the serious security
  advisories identified earlier this week.
- **Extra sign-in protections kept in place.** The stricter checks LOTTO added
  in v1.24.1 remain, even though the underlying library now performs similar
  checks of its own.
- **Verified on the oldest supported iPad.** Sign-in was checked on a simulated
  iPad mini 4 running iPadOS 15.4 with a custom appearance applied, to confirm
  nothing changed for the tablets used at the counter.

## Version 1.24.2 — August 25, 2026

**This is a bug-fix release.**

- **Custom appearances now work on the older counter tablets.** An agency using
  its own logo and colours saw the app render with missing backgrounds, dark
  outlines around every panel, invisible switches, and pop-up dialogs that were
  impossible to read. The two built-in appearances were unaffected. Custom
  appearances now display correctly on every supported device.
- **Colour accuracy is unchanged on newer devices.** Modern tablets and phones
  still receive the richer colour range; older ones receive an equivalent that
  looks the same to the eye.

## Version 1.24.1 — August 24, 2026

**This is a security patch.** There are no changes to how LOTTO looks or works
for staff or visitors.

- **Sign-in checks are stricter.** If LOTTO's authentication settings are ever
  misconfigured, staff pages and administrative APIs now refuse access instead
  of risking letting a request through.
- **Look-alike email addresses are rejected.** Characters from other alphabets
  can be drawn to look exactly like ordinary letters and the "@" symbol. The
  staff allow list now refuses any address that is not plain text, so a
  look-alike address cannot be mistaken for an approved one.
- **Fewer components ship to the server.** A tool only needed while developing
  LOTTO was being installed alongside the live application. Removing it drops
  seven known security advisories with no change to the running app.
- **Verified on the oldest supported iPad.** The updated application was
  checked on a simulated iPad mini 4 running iOS 15.4 to confirm nothing
  regressed on the tablets used at the counter.

## Version 1.24.0 — August 24, 2026

- **New languages prepare with far fewer AI requests.** LOTTO translates up to
  100 related phrases together instead of contacting the provider once for
  every phrase.
- **Translation results stay safely matched to their source.** Every batch is
  checked for missing, duplicate, or unexpected items before it is saved.
- **Provider problems remain bounded and recoverable.** LOTTO may split one
  malformed batch once, but authentication, quota, and service failures stop
  cleanly and remain available for staff review or retry.
- **Token settings now say what they control.** AI Configuration distinguishes
  the model's supported output limit from LOTTO's per-request translation
  budget, which defaults to 8,192 tokens.

## Version 1.22.3 — August 24, 2026

- **Custom public service headings are translated.** If Appearance replaces
  “Food Pantry Service For,” LOTTO now includes that client-facing wording in
  **Find Missing** and shows its completed translation on the public board.
- **Enabled languages are available in the Arcade.** The Arcade language menu
  now shows the same organization-enabled options as Home and Display,
  including dynamic languages such as Bosnian.
- **New languages prepare automatically before guests see them.** Saving a new
  language starts the complete missing-translation sweep in Admin. It appears
  in Home, Display, and Arcade menus only after preparation succeeds.
- **No more endless language-readiness requests.** Guests are offered only
  ready languages, so an incomplete translation cannot leave a browser making
  repeated background requests.

## Version 1.22.2 — August 24, 2026

- **Uploaded branding can now be saved.** Logos and install icons stored in an
  agency's connected Vercel Blob store pass the Appearance safety check and
  remain available after reloads and deployments.
- **The first upload selection is reliable.** Logo and app-icon controls now
  open the native file picker from a real button instead of depending on an
  indirect label click.

## Version 1.22.1 — August 24, 2026

- **Logos keep their intended background in sign-in email.** If an Appearance
  uses the **Dark plate** treatment, both Magic Link and Verification Code
  messages now show that same dark surface behind the logo.
- **Uploaded logos now persist in hosted LOTTO deployments.** Vercel-hosted
  organizations store logos and generated app icons in durable image storage,
  so an upload remains available across deployments.
- **Image upload problems explain what to do.** LOTTO now distinguishes an
  unreadable file, unsafe SVG, oversized image, missing storage setup, and a
  temporary service problem. Each message explains the next useful action.

## Version 1.22.0 — August 24, 2026

- **Magic Links now work behind Microsoft Defender.** Opening the link first
  shows a confirmation page; selecting **Sign in** completes access. Automated
  email scanners may inspect the link without using it before you do.
- **Authentication email looks like the active organization.** Magic Links and
  Verification Codes now share the agency's logo, app name, colors, clear
  expiry information, plain-text alternative, and security guidance—even when
  the agency uses a saved Appearance configuration.
- **A clearer sign-in experience.** Magic Link is the default and Verification
  Code remains available beside it. Failed code requests no longer claim that a
  code was sent, and requesting one method no longer cancels the other.

## Version 1.21.1 — August 24, 2026

- **See FEED pairing status at a glance.** The Sync With FEED section now shows
  whether LOTTO has an active credential and when the active in-app token was
  generated.

- **Connect FEED without Vercel or terminal work.** Open History on the Admin
  dashboard, choose **Setup** under **Sync With FEED**, and copy the displayed
  URL and one-time token into FEED. LOTTO stores only a protected hash.
  Generating a replacement immediately invalidates the old connection.

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
