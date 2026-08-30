// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HelpIndexPage from "@/app/help/page";

vi.mock("@/components/help/help-search", () => ({
  HelpSearch: () => <div data-testid="help-search" />,
}));

vi.mock("@/components/navigation/bottom-tab-bar", () => ({
  BottomTabBar: () => <nav aria-label="Bottom navigation" />,
}));

vi.mock("@/lib/user-guides.server", () => ({
  getAllUserGuides: () => [],
  getHelpSearchIndex: () => [],
}));

describe("Help index navigation", () => {
  it("returns staff to Admin without using the retired Staff route", () => {
    render(<HelpIndexPage />);

    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(screen.queryByRole("link", { name: /staff home/i })).not.toBeInTheDocument();
  });
});
