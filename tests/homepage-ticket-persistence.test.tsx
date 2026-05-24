import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import HomePage from "@/app/new/page";
import { LanguageProvider } from "@/contexts/language-context";
import { HOMEPAGE_TICKET_STORAGE_KEY } from "@/lib/home-ticket-storage";
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
    expect(parsed.expiresAt).toBeGreaterThan(parsed.savedAt);
    expect(new Date(parsed.expiresAt).getHours()).toBe(0);
    expect(new Date(parsed.expiresAt).getMinutes()).toBe(0);
    expect(new Date(parsed.expiresAt).getSeconds()).toBe(0);
    expect(new Date(parsed.expiresAt).getMilliseconds()).toBe(0);
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

  it("does not persist ticket input while the active ticket range is reset", async () => {
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

    expect(await screen.findByText("Ticket lookup will be available when today's tickets are ready.")).toBeInTheDocument();
    expect(window.localStorage.getItem(HOMEPAGE_TICKET_STORAGE_KEY)).toBeNull();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
