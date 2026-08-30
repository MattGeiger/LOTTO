# Appearance

Make LOTTO look like *your* organization — name, logos, colors, and the icon
guests see when they install the app — all from a guided setup, no code
required.

## Opening the Setup

1. Open the [Staff Dashboard](02-staff-controls.md) (`/admin`) and expand
   **Advanced**.
2. Find the **Appearance** card. It shows which look is currently live: the
   built-in William Temple House appearance or one of your saved appearances.
3. Choose **Set up appearance** (or **New appearance** if you already have
   saved ones). A step-by-step window walks you through everything.

## The Steps

1. **Starting point.** Begin from the William Temple House template or from a neutral blank
   slate with placeholder graphics. Either way, every choice can be changed in
   the following steps. Give the configuration a short name — saving with the
   same name later updates it.
2. **Organization identity.** Your organization's name, the app name shown in
   browser tabs, the service heading shown above the date on the board
   (any queue works: "Clinic Hours For", "Equipment Checkout For" — blank
   keeps the standard "Food Pantry Service For"), the label phones show under the installed icon (check the
   exact spelling your organization uses!), a tagline, your website, and the
   app's public address. **Use suggested wording** fills in the page
   descriptions from your organization name; edit them freely.
3. **Logos & icons.** Upload a light-mode and a dark-mode logo as SVG, PNG,
   JPEG, or WebP, up to 4 MB — SVG is best, because it stays a true vector and renders crisply
   at every size and on hi-DPI screens (export a plain, self-contained SVG:
   no scripts, links, or embedded images — the uploader will tell you if
   yours isn't). Internal SVG class styles are supported. LOTTO inspects the
   actual image instead of relying on the file label supplied by the browser.
   If an upload cannot be used, the message identifies whether the file is
   empty, too large, unreadable, unsafe, or whether hosted storage needs an
   administrator's attention—and tells you what to do next. Sizes are measured automatically, and the preview shows
   each logo at the exact height the app uses, on your own colors. LOTTO keeps
   the uploaded filename and format, warns when a raster is too small for a
   crisp high-density display, and automatically suggests the dark-plate
   treatment when it measures light artwork on a transparent ground. If your
   light logo needs a dark plate behind it (common for white-lettered
   logos), pick the **Dark plate** treatment; LOTTO also carries that surface
   into staff sign-in emails. Upload one square mark and
   every browser, Apple, and install icon size is generated for you. A wide or
   tall mark is refused before anything is stored; use an approximately square
   source.
4. **Your color story.** The rows have fixed jobs in this order: **Main
   color**, **Accent**, **Background tint**, **Dark anchor**, and **Light
   anchor**. A new blank appearance starts with Main color; **Add color**
   reveals the next job, and only the final optional row can be cleared, so no
   existing color silently changes jobs. Open a row to choose from the closest
   Tailwind families, search by a name such as `emerald-600`, or choose a family
   and then one of its 11 weights. The exact named stop shown is what LOTTO
   saves. If you've uploaded a logo, choose **Extract from light logo** to fill
   the story, then review the nearby Tailwind matches and adjust anything you
   dislike. If a logo color sits in the range reserved for ticket status
   (Returned red, Unclaimed gold), the recommendation works around it and a
   note explains how; you can still override manually. Prefer to choose
   yourself? Pick the fixed roles directly.
   The wizard tells you in plain language what each fixed role will do. Light
   mode, dark mode, and both
   high-visibility modes are derived from the story with a live preview,
   and readability is checked as you go — if a combination would be hard
   to read, the wizard says exactly what to change, and it warns you if a
   color sits too close to the reserved Returned-red or Unclaimed-gold
   status colors.
5. **Staff sign-in.** The heading and guidance text staff see on the login
   screen.
6. **What's in stock.** If your organization runs FEED, paste your public
   inventory address to enable the inventory tab; leave it off for a
   queue-only app.
7. **Review & save.** Check the summary and four-mode preview. **Preview in
   app** applies the draft only to your current browser session so you can
   close the wizard and explore it; **Stop preview** restores the live look.
   Use **Save draft** to keep working later, or **Save & activate** to make it
   live after LOTTO prepares any changed service heading for every enabled
   visitor language. If translation fails, the draft is saved but the current
   live appearance stays in place.

## Good to Know

- **Ticket status colors never change.** Returned stays red and Unclaimed
  stays gold in every appearance — those colors mean the same thing in every
  LOTTO, so staff and guests can always trust them. The wizard shows them in
  the preview so you can see they stay put.
- **Activation is atomic and reversible.** LOTTO prepares changed localized
  service copy first, then applies the whole appearance for everyone at once.
  **Use built-in appearance** on the Appearance
  card reverts just as instantly; your saved configuration stays available.
- **Drafts are safe.** A saved draft changes nothing until you activate it.
- **Editing.** Choose **Edit** next to a saved appearance to reopen the
  steps with its current values.

## What To Read Next

- [Staff Controls](02-staff-controls.md) — the rest of the dashboard.
- [Languages & Themes](06-languages-themes.md) — light, dark, and
  high-visibility modes your colors flow into.
