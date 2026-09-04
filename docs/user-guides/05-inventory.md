# What's In Stock

The optional inventory page (`/inventory`, "What's in stock") shows clients
which items are available today, with search and dietary filters. It appears
only when your organization has connected LOTTO to its own FEED inventory
deployment. If there is no Inventory tab, your LOTTO deployment is currently
queue-only; use the ticket, display, and games pages normally.

![The public inventory with search, dietary filters, limits, and item categories](/help-screenshots/inventory.webp)

## Browsing Inventory

- Items are grouped into categories with their availability and any limits
  (for example, "Limit 2 per household").
- The list is read-only for clients — it reflects what staff have stocked.

## Searching

Type in the **search** box to match item or category names. Clear the box to
show everything again.

## Filtering By Dietary Needs

Open **Dietary filters** and select one or more needs, such as gluten-free,
vegan, halal, or kosher. Filters combine with search; choose **Clear filters**
to reset them.

## Beta Realtime Testing

On the isolated LOTTO beta, the ordinary `/inventory` page uses realtime for
ticket-call celebrations after confirming the feed matches the database. The
inventory catalog itself remains read-only and independent from queue-state
delivery. If realtime becomes unavailable, ticket calls return automatically
to the existing database refresh schedule.

Authorized testers can use `/inventory?realtime=poll` for polling only or
`/inventory?realtime=observe` for the diagnostic comparison badge. Production
does not yet enable realtime.

## What To Read Next

- Back to your ticket status: [Tickets & the Queue](04-tickets-queue.md).
- Change the language: [Languages & Themes](06-languages-themes.md).
