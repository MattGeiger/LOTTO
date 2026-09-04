# Appearance

Make LOTTO look like *your* organization — name, logos, colors, and the icon
guests see when they install the app — all from a guided setup, no code
required.

## Opening the Setup

![The Appearance manager and live preview on the Staff Dashboard](/help-screenshots/appearance.webp)

Open the [Staff Dashboard](02-staff-controls.md), expand **Advanced**, and find
**Appearance**. The manager names the live configuration; the preview shows its
logo, queue colors, primary action, card surface, and universal status colors
in the current Light, Dark, or Hi-viz mode. Choose **Set up appearance** or
**New appearance** to begin.

![The first step of the guided Appearance setup](/help-screenshots/appearance-wizard.webp)

## The Steps

1. **Starting point.** Begin from the William Temple House template or a neutral
   blank slate, then give the configuration a short name. Saving that name
   again updates the same configuration.
2. **Organization identity.** Your organization's name, the app name shown in
   browser tabs, the service heading shown above the date on the board
   (any queue works: "Clinic Hours For", "Equipment Checkout For" — blank
   keeps "Food Pantry Service For"), installed-icon label, tagline, website,
   and public address. **Use suggested wording** drafts page descriptions from
   the organization name; edit them freely.
3. **Logos & icons.** Upload a light-mode and a dark-mode logo as SVG, PNG,
   JPEG, or WebP, up to 4 MB. Prefer a plain, self-contained SVG for crisp
   scaling; scripts, links, and embedded images are refused. LOTTO verifies the
   actual file, previews it at its real app size, warns about undersized raster
   art, and can place light artwork on a **Dark plate** that also appears in
   staff sign-in emails. Upload an approximately square mark to generate the
   browser, Apple, and install icons; wide or tall marks are refused.
4. **Your color story.** The rows have fixed jobs in this order: **Main
   color**, **Accent**, **Background tint**, **Dark anchor**, and **Light
   anchor**. **Add color** reveals each optional job without silently changing
   earlier roles. Choose or search an exact Tailwind stop such as
   `emerald-600`, or use **Extract from light logo** and adjust the suggested
   matches. The four-mode preview checks readability and warns when a choice is
   too close to the reserved Returned-red or Unclaimed-gold meanings.
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
  the preview so you can see they stay put. Your Primary choice does style the
  **Next up** queue card with a bottom-to-top gradient in regular light and dark
  modes; Hi-viz deliberately flattens that surface along with the status cards.
- **Arcade shares your identity, not its game pieces.** Page surfaces, panels,
  controls, text, and Now Serving use the active appearance. Snake pieces,
  pellets, bricks, and other gameplay colors remain stable and recognizable.
- **Activation is atomic and reversible.** LOTTO prepares changed localized
  service copy first, then applies the whole appearance for everyone at once.
  **Use built-in appearance** on the Appearance
  card reverts just as instantly; your saved configuration stays available.
- **Drafts are safe.** A saved draft changes nothing until you activate it.
- **Editing.** Choose **Edit** next to a saved appearance to reopen the
  steps with its current values.
- **Confirmations stay visually focused.** Delete, deactivate, and other
  confirmation windows blur the page behind them consistently with the rest of
  LOTTO's modal windows.

## What To Read Next

- [Staff Controls](02-staff-controls.md) — the rest of the dashboard.
- [Languages & Themes](06-languages-themes.md) — light, dark, and
  high-visibility modes your colors flow into.
