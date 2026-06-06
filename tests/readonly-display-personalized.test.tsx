// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";

import { ReadOnlyDisplay } from "@/components/readonly-display";
import { LanguageProvider } from "@/contexts/language-context";
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

vi.mock("@/components/animate-ui/primitives/texts/morphing", () => ({
  MorphingText: ({ text }: { text: string }) => <span>{text}</span>,
}));

vi.mock("@/components/animate-ui/primitives/texts/rolling", () => ({
  RollingText: ({ text }: { text: string }) => <span>{text}</span>,
}));

const baseState: RaffleState = {
  startNumber: 10,
  endNumber: 30,
  mode: "random",
  generatedOrder: [14, 18, 24],
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

function renderPersonalizedDisplay(props?: Partial<ComponentProps<typeof ReadOnlyDisplay>>) {
  return render(
    <LanguageProvider>
      <ReadOnlyDisplay
        displayVariant="personalized"
        personalizedTicketNumber={24}
        showQrCode={false}
        showHeaderLogo={false}
        {...props}
      />
    </LanguageProvider>,
  );
}

describe("ReadOnlyDisplay personalized variant", () => {
  let currentState: RaffleState;

  beforeEach(() => {
    window.localStorage.clear();
    currentState = structuredClone(baseState);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(currentState), { status: 200 })),
    );
  });

  it("renders personalized ticket data in the requested row order", async () => {
    renderPersonalizedDisplay({ onRequestTicketChange: vi.fn() });

    await screen.findByText("YOUR TICKET");

    const estimatedLabel = screen.getByText("YOUR ESTIMATED WAIT TIME");
    const aheadLabel = screen.getByText("TICKETS AHEAD OF YOU");
    const positionLabel = screen.getByText("YOUR TICKET'S POSITION");

    expect(estimatedLabel.compareDocumentPosition(aheadLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(aheadLabel.compareDocumentPosition(positionLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("YOUR TICKET NUMBER")).toBeInTheDocument();
    expect(screen.getByText("24")).toBeInTheDocument();
    expect(screen.getByText("4 minutes")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByTestId("service-time")).toHaveTextContent(/\S/);
    expect(screen.getByRole("button", { name: "Enter a new ticket number" })).toBeInTheDocument();
    // The inventory and games links moved out of the ticket card into the
    // bottom tab bar (rendered by the personalized homepage, not by ReadOnlyDisplay).
    expect(screen.queryByRole("link", { name: "PLAY GAMES" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "See what's in stock" })).not.toBeInTheDocument();
  });

  it("shows inline not-in-drawing messaging and check-back placeholders", async () => {
    renderPersonalizedDisplay({ personalizedTicketNumber: 53 });

    await screen.findByText("YOUR TICKET");

    expect(screen.getByText("Your ticket number is not yet in the drawing. Check back soon.")).toBeInTheDocument();
    expect(screen.getByText("53")).toBeInTheDocument();
    expect(screen.getAllByText("CHECK BACK SOON").length).toBeGreaterThanOrEqual(3);
  });

  it("formats service time using the active language locale", async () => {
    window.localStorage.setItem("display-language", "zh");
    renderPersonalizedDisplay();

    const serviceTime = await screen.findByTestId("service-time");
    expect(serviceTime).toHaveAttribute("dir", "ltr");
    await waitFor(() => {
      expect(serviceTime.textContent ?? "").not.toMatch(/[aApP][mM]/);
    });
  });

  it("keeps personalized display structure LTR while allowing RTL card text", async () => {
    window.localStorage.setItem("display-language", "ar");
    renderPersonalizedDisplay();

    expect(await screen.findByText("تذكرتك")).toBeInTheDocument();
    expect(screen.getByTestId("readonly-display-content")).toHaveAttribute("dir", "ltr");

    const serviceDate = screen.getByTestId("service-date");
    expect(serviceDate.closest("[dir='rtl']")).toContainElement(serviceDate);
    expect(serviceDate.closest("[dir='ltr']")).toContainElement(serviceDate);

    const ticketCardTitle = screen.getByText("تذكرتك").closest("[data-slot='card-title']");
    expect(ticketCardTitle).toHaveAttribute("dir", "ltr");

    const updatedBadge = screen.getByText("تم التحديث").closest("[data-slot='badge']");
    expect(updatedBadge).toHaveAttribute("dir", "ltr");
  });

  it("hides the public legend in personalized mode", async () => {
    renderPersonalizedDisplay();
    await screen.findByText("YOUR TICKET");

    expect(screen.queryByText("Not called")).not.toBeInTheDocument();
    expect(screen.queryByText("Unclaimed")).not.toBeInTheDocument();
  });

  it("exposes a change-ticket action callback", async () => {
    const onRequestTicketChange = vi.fn();
    const user = userEvent.setup();

    renderPersonalizedDisplay({ onRequestTicketChange });
    await screen.findByRole("button", { name: "Enter a new ticket number" });
    await user.click(screen.getByRole("button", { name: "Enter a new ticket number" }));

    expect(onRequestTicketChange).toHaveBeenCalledTimes(1);
  });

  it("keeps existing no-draw messaging when there are no generated tickets", async () => {
    currentState = {
      ...currentState,
      generatedOrder: [],
      currentlyServing: null,
      startNumber: 0,
      endNumber: 0,
    };

    renderPersonalizedDisplay();

    await waitFor(() => {
      expect(screen.getByText("Welcome!")).toBeInTheDocument();
      expect(screen.getByText("The raffle has not yet started.")).toBeInTheDocument();
      expect(screen.getByText("Check back soon for updates.")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("service-time")).not.toBeInTheDocument();
    expect(screen.queryByText("YOUR TICKET NUMBER")).not.toBeInTheDocument();
  });

  it("no longer renders the called-ticket overlay itself (moved to TicketCalledCelebration)", async () => {
    currentState = {
      ...currentState,
      calledAt: { 24: 1_739_898_060_000 },
    };

    renderPersonalizedDisplay();

    // The board still shows the persistent "called at" message, but the
    // celebratory overlay/confetti is now owned by the shared component.
    await screen.findByText("YOUR TICKET");
    expect(screen.queryByText("Ticket Called!")).not.toBeInTheDocument();
    expect(screen.queryByTestId("confetti-canvas")).not.toBeInTheDocument();
  });
});
