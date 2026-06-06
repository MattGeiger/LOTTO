// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { render, screen } from "@testing-library/react";

import { BoardGrid } from "@/components/board-grid";

describe("BoardGrid", () => {
  it("highlights the current and upcoming tickets", () => {
    render(<BoardGrid order={[1, 2, 3, 4]} currentlyServing={2} />);

    expect(screen.getByLabelText("ticket-2-current")).toBeInTheDocument();
    expect(screen.getByLabelText("ticket-3-upcoming")).toBeInTheDocument();
  });

  it("shows a waiting message when no tickets exist", () => {
    render(<BoardGrid order={[]} currentlyServing={null} />);

    expect(screen.getByText(/waiting for tickets/i)).toBeInTheDocument();
  });
});
