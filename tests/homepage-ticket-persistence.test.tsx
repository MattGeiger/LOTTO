// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PersonalizedHomePage as HomePage } from "@/components/personalized-home-page";
import { LanguageProvider } from "@/contexts/language-context";
import { EIGHT_HOURS_MS, HOMEPAGE_TICKET_STORAGE_KEY } from "@/lib/home-ticket-storage";
import type { RaffleState } from "@/lib/state-types";

vi.mock("next/font/local", () => ({
  default: () => ({ className: "font-arcade-display", variable: "" }),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span data-testid={`next-image-${alt}`} />,
}));

vi.mock("@/components/language-morph-text", () => ({
  LanguageMorphText: ({ text }: { text: string | string[] }) => (
    <>{Array.isArray(text) ? text[0] : text}</>
  ),
}));

vi.mock("@/components/theme-switcher", () => ({
  ThemeSwitcher: () => <div data-testid="theme-switcher" />,
}));

vi.mock("@/components/language-switcher", () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher" />,
}));

vi.mock("@/components/animate-ui/primitives/texts/morphing", () => ({
  MorphingText: ({ text }: { text: string }) => <span>{text}</span>,
}));

vi.mock("@/components/animate-ui/primitives/texts/rolling", () => ({
  RollingText: ({ text }: { text: string }) => <span>{text}</span>,
}));

const statePayload: RaffleState = {
  startNumber: 10,
  endNumber: 40,
  mode: "random",
  generatedOrder: [14, 18, 24, 31],
  currentlyServing: 14,
  ticketStatus: {},
  calledAt: {},
  orderLocked: true,
  timestamp: 1_739_898_000_000,
  displayUrl: null,
  operatingHours: null,
  timezone: "America/Los_Angeles",
  displayLanguageRotation: null,
        announcement: null,
};

function renderHomePage() {
  return render(
    <LanguageProvider>
      <HomePage />
    </LanguageProvider>,
  );
}

describe("homepage ticket persistence", () => {
  let currentState: RaffleState;

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    currentState = structuredClone(statePayload);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(currentState), { status: 200 })),
    );
  });

  it("skips onboarding when a valid persisted ticket exists", async () => {
    window.localStorage.setItem(
      HOMEPAGE_TICKET_STORAGE_KEY,
      JSON.stringify({
        ticketNumber: 24,
        expiresAt: Date.now() + 60_000,
        savedAt: Date.now(),
        rangeKey: "10-40",
      }),
    );

    renderHomePage();

    await waitFor(() => {
      expect(screen.queryByText("Choose your language")).not.toBeInTheDocument();
    });
    expect(screen.getByText("YOUR TICKET")).toBeInTheDocument();
    expect(screen.getByText("24")).toBeInTheDocument();
  });

  it("shows onboarding when persisted ticket has expired", async () => {
    window.localStorage.setItem(
      HOMEPAGE_TICKET_STORAGE_KEY,
      JSON.stringify({
        ticketNumber: 24,
        expiresAt: Date.now() - 1_000,
        savedAt: Date.now() - 5_000,
        rangeKey: "10-40",
      }),
    );

    renderHomePage();

    expect(await screen.findByText("Choose your language")).toBeInTheDocument();
  });

  it("writes persisted ticket data after successful submit", async () => {
    const user = userEvent.setup();
    renderHomePage();

    await user.click(await screen.findByRole("button", { name: "English" }));
    const ticketInput = await screen.findByRole("textbox", {
      name: "Enter your ticket number",
    });
    await user.clear(ticketInput);
    await user.type(ticketInput, "B07");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    const raw = window.localStorage.getItem(HOMEPAGE_TICKET_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw ?? "{}") as {
      ticketNumber: number;
      expiresAt: number;
      savedAt: number;
      rangeKey?: string;
    };

    expect(parsed.ticketNumber).toBe(7);
    expect(parsed.rangeKey).toBe("10-40");
    expect(parsed.expiresAt).toBe(parsed.savedAt + EIGHT_HOURS_MS);
  });

  it("reopens ticket modal prefilled when entering a new ticket number", async () => {
    window.localStorage.setItem(
      HOMEPAGE_TICKET_STORAGE_KEY,
      JSON.stringify({
        ticketNumber: 24,
        expiresAt: Date.now() + 60_000,
        savedAt: Date.now(),
        rangeKey: "10-40",
      }),
    );

    const user = userEvent.setup();
    renderHomePage();

    await user.click(await screen.findByRole("button", { name: "Enter a new ticket number" }));
    const ticketInput = await screen.findByRole("textbox", {
      name: "Enter your ticket number",
    });
    expect((ticketInput as HTMLInputElement).value).toBe("24");
  });

  it("saves the ticket and dismisses onboarding even before the drawing has started", async () => {
    currentState = {
      ...currentState,
      startNumber: 0,
      endNumber: 0,
      generatedOrder: [],
      currentlyServing: null,
      orderLocked: false,
      timestamp: null,
    };

    const user = userEvent.setup();
    renderHomePage();

    await user.click(await screen.findByRole("button", { name: "English" }));
    const ticketInput = await screen.findByRole("textbox", {
      name: "Enter your ticket number",
    });
    await user.clear(ticketInput);
    await user.type(ticketInput, "24");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    // No active range yet, but the ticket is accepted, persisted, and the
    // onboarding modal is dismissed (the holding "check back soon" state shows).
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    const raw = window.localStorage.getItem(HOMEPAGE_TICKET_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw ?? "{}") as { ticketNumber: number; rangeKey?: string };
    expect(parsed.ticketNumber).toBe(24);
    // No active range at save time → no rangeKey stored.
    expect(parsed.rangeKey).toBeUndefined();
  });

  it("dismisses onboarding from the ticket step via the close button without saving", async () => {
    const user = userEvent.setup();
    renderHomePage();

    await user.click(await screen.findByRole("button", { name: "English" }));
    // The close (X) on the ticket step is the "just looking" escape hatch.
    await user.click(await screen.findByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    // Browsing path persists no ticket.
    expect(window.localStorage.getItem(HOMEPAGE_TICKET_STORAGE_KEY)).toBeNull();
  });

  it("dismisses onboarding from the ticket step with the Escape key", async () => {
    const user = userEvent.setup();
    renderHomePage();

    await user.click(await screen.findByRole("button", { name: "English" }));
    await screen.findByRole("textbox", { name: "Enter your ticket number" });
    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("keeps the language step a focused gate with no dismiss affordance", async () => {
    renderHomePage();

    expect(await screen.findByText("Choose your language")).toBeInTheDocument();
    // No close affordance on step 1 — the user must pick a language to proceed.
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  });
});
