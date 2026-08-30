// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";

import { BottomTabBar } from "@/components/navigation/bottom-tab-bar";
import { StaffAuthContext } from "@/components/staff-auth-context";
import { LanguageProvider } from "@/contexts/language-context";

const renderBar = (ui: ReactElement) => render(<LanguageProvider>{ui}</LanguageProvider>);

const navHrefs = () =>
  Array.from(document.querySelectorAll("nav a")).map((a) => a.getAttribute("href"));

describe("BottomTabBar", () => {
  it("renders the public nav when unauthenticated (default context)", () => {
    renderBar(<BottomTabBar />);
    expect(navHrefs()).toEqual(["/", "/display", "/inventory", "/arcade"]);
    expect(screen.getByText("Your ticket")).toBeInTheDocument();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  it("lets animated icon geometry extend beyond the SVG viewport", () => {
    renderBar(<BottomTabBar />);

    const iconSlots = document.querySelectorAll(
      '[data-slot="navigation-icon-label"]',
    );
    expect(iconSlots).toHaveLength(4);
    for (const slot of iconSlots) {
      expect(slot).toHaveClass("[&_svg]:overflow-visible");
      expect(slot.querySelector("svg")).not.toBeNull();
    }
  });

  it("renders the staff nav (Admin · Dashboard · What's in stock · Games) when authenticated", () => {
    renderBar(
      <StaffAuthContext.Provider value={true}>
        <BottomTabBar />
      </StaffAuthContext.Provider>,
    );
    expect(navHrefs()).toEqual(["/admin", "/display", "/inventory", "/arcade"]);
    expect(screen.getByText("Admin")).toBeInTheDocument();
    // The client "Your ticket" destination is not part of the staff bar.
    expect(screen.queryByText("Your ticket")).not.toBeInTheDocument();
  });
});
