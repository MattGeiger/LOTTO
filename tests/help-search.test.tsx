// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { HelpSearch } from "@/components/help/help-search";
import type { GuideSearchEntry } from "@/lib/user-guides";

const index: GuideSearchEntry[] = [
  {
    id: "staff-controls:calling-numbers",
    guideSlug: "staff-controls",
    guideTitle: "Staff Controls",
    guideOrder: 2,
    sectionId: "calling-numbers",
    sectionTitle: "Calling Numbers",
    content: "Use the call next control to call the next ticket number for the queue.",
  },
  {
    id: "tickets-queue:looking-up-a-ticket",
    guideSlug: "tickets-queue",
    guideTitle: "Tickets & the Queue",
    guideOrder: 4,
    sectionId: "looking-up-a-ticket",
    sectionTitle: "Looking Up A Ticket",
    content: "Enter the ticket number from the physical ticket to see its position.",
  },
  {
    id: "inventory:searching",
    guideSlug: "inventory",
    guideTitle: "What's In Stock",
    guideOrder: 5,
    sectionId: "searching",
    sectionTitle: "Searching",
    content: "Type in the search box to filter the inventory list of items.",
  },
];

function getInput() {
  return screen.getByLabelText("Search help") as HTMLInputElement;
}

describe("HelpSearch", () => {
  it("ranks section-title matches first and links to deep-linked sections", async () => {
    const user = userEvent.setup();
    render(<HelpSearch index={index} />);

    await user.type(getInput(), "ticket");

    const list = await screen.findByRole("listbox", { name: "Help search results" });
    const links = within(list).getAllByRole("link");
    // "Looking Up A Ticket" (title match) outranks the plain content match, so it
    // is the first result and deep-links to its section.
    expect(links[0]).toHaveAttribute(
      "href",
      "/help/tickets-queue?q=ticket#looking-up-a-ticket",
    );
    expect(within(list).getByText("Looking Up A", { exact: false })).toBeInTheDocument();
  });

  it("highlights matched terms in the results", async () => {
    const user = userEvent.setup();
    const { container } = render(<HelpSearch index={index} />);

    await user.type(getInput(), "search");

    const marks = container.querySelectorAll("mark");
    expect(marks.length).toBeGreaterThan(0);
    expect(Array.from(marks).some((m) => /search/i.test(m.textContent ?? ""))).toBe(true);
  });

  it("requires at least two characters", async () => {
    const user = userEvent.setup();
    render(<HelpSearch index={index} />);

    await user.type(getInput(), "t");

    expect(screen.getByText(/Type at least 2 characters/i)).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows an empty state when nothing matches", async () => {
    const user = userEvent.setup();
    render(<HelpSearch index={index} />);

    await user.type(getInput(), "zzzzz");

    expect(screen.getByText(/No help sections match/i)).toBeInTheDocument();
  });

  it("clears the query with the clear button", async () => {
    const user = userEvent.setup();
    render(<HelpSearch index={index} />);

    const input = getInput();
    await user.type(input, "ticket");
    expect(input.value).toBe("ticket");

    await user.click(screen.getByLabelText("Clear help search"));
    expect(input.value).toBe("");
  });
});
