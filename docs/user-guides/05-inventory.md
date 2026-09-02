# What's In Stock

The optional inventory page (`/inventory`, "What's in stock") shows clients
which items are available today, with search and dietary filters. It appears
only when your organization has connected LOTTO to its own FEED inventory
deployment. If there is no Inventory tab, your LOTTO deployment is currently
queue-only; use the ticket, display, and games pages normally.

## Browsing Inventory

- Items are grouped into categories with their availability and any limits
  (for example, "Limit 2 per household").
- The list is read-only for clients — it reflects what staff have stocked.

## Searching

1. Type in the **search** box at the top of the inventory page.
2. The list narrows as you type, matching item and category names.
3. Clear the box to see everything again.

## Filtering By Dietary Needs

1. Open the **dietary filters** dropdown.
2. Select one or more needs (gluten-free, vegan, halal, kosher, and more).
3. Selections combine with the search box; use **Clear filters** to reset.

## Beta Realtime Testing

This is not part of the normal Inventory workflow. On the isolated LOTTO beta,
authorized architecture testers may open `/inventory?realtime=observe`. A small
**Realtime observer** badge compares the queue state already fetched for ticket
call celebrations with the experimental Cloudflare delivery. Inventory and
ticket-call rendering continue to use the existing authoritative poll. Remove
the query parameter to return immediately to the ordinary control path.

## What To Read Next

- Back to your ticket status: [Tickets & the Queue](04-tickets-queue.md).
- Change the language: [Languages & Themes](06-languages-themes.md).
