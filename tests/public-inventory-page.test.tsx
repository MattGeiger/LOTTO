import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import InventoryPage from "@/app/inventory/page";
import NewPage from "@/app/new/page";
import { LanguageProvider } from "@/contexts/language-context";
import type { FeedPublicInventory } from "@/lib/feed-public-inventory";
import { HOMEPAGE_TICKET_STORAGE_KEY } from "@/lib/home-ticket-storage";
import type { RaffleState } from "@/lib/state-types";

vi.mock("next/font/local", () => ({
  default: () => ({ className: "font-arcade-display", variable: "" }),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span data-testid={`next-image-${alt}`} />,
}));

vi.mock("@/components/theme-switcher", () => ({
  ThemeSwitcher: () => <div data-testid="theme-switcher" />,
}));

const inventoryPayload: FeedPublicInventory = {
  generatedAt: "2026-05-24T12:00:00.000Z",
  version: "1.2.2",
  languages: ["English", "Spanish"],
  totals: { categories: 1, foodItems: 2 },
  categories: [
    {
      id: 1,
      name: "Canned Goods",
      translations: { Spanish: "Productos enlatados" },
      icon: "can",
      limit: 100,
      limitType: "household",
      itemCount: 2,
      items: [
        {
          id: 10,
          name: "Garbanzo Beans",
          translations: { Spanish: "Garbanzos" },
          limit: 1,
          limitType: "household",
          statusTags: { inStock: true, limited: true, clearance: false },
          dietaryFlags: {
            vegan: true,
            vegetarian: true,
            glutenFree: true,
            organic: false,
            halal: false,
            kosher: false,
            readyToEat: true,
          },
          updatedAt: "2026-05-24T12:00:00.000Z",
        },
        {
          id: 11,
          name: "Tuna",
          translations: {},
          limit: null,
          limitType: null,
          statusTags: { inStock: true, limited: false, clearance: true },
          dietaryFlags: {
            vegan: false,
            vegetarian: false,
            glutenFree: true,
            organic: false,
            halal: false,
            kosher: false,
            readyToEat: true,
          },
          updatedAt: "2026-05-24T12:00:00.000Z",
        },
      ],
    },
  ],
};

const raffleState: RaffleState = {
  startNumber: 1,
  endNumber: 20,
  mode: "random",
  generatedOrder: [1, 2, 3],
  currentlyServing: 1,
  ticketStatus: {},
  calledAt: {},
  orderLocked: true,
  timestamp: 1_739_898_000_000,
  displayUrl: null,
  operatingHours: null,
  timezone: "America/Los_Angeles",
};

function renderWithLanguage(ui: React.ReactNode) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe("public inventory page", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders FEED inventory in category tables with tags and limits", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(inventoryPayload), { status: 200 })));

    renderWithLanguage(<InventoryPage />);

    expect(await screen.findByRole("heading", { name: "What's in stock today" })).toBeInTheDocument();
    expect(screen.getByText("Canned Goods")).toBeInTheDocument();
    expect(screen.queryByText("Limit 100 per household")).not.toBeInTheDocument();
    expect(screen.getAllByText("Garbanzo Beans").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Limit 1 per household").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Limited").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Clearance").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ready to eat").length).toBeGreaterThan(0);
  });

  it("uses selected language translations and filters by displayed names", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(inventoryPayload), { status: 200 })));

    renderWithLanguage(<InventoryPage />);

    await user.click(await screen.findByRole("button", { name: /change language/i }));
    await user.click(screen.getByRole("menuitemradio", { name: "Español" }));

    expect(await screen.findByText("Productos enlatados")).toBeInTheDocument();
    expect(screen.getAllByText("Garbanzos").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tuna").length).toBeGreaterThan(0);

    await user.type(screen.getByRole("textbox", { name: "Search inventory" }), "garbanzos");

    await waitFor(() => {
      expect(screen.queryByText("Tuna")).not.toBeInTheDocument();
    });
    expect(screen.getAllByText("Garbanzos").length).toBeGreaterThan(0);
  });

  it("adds an inventory entry point to /new", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(raffleState), { status: 200 })));
    window.localStorage.setItem(
      HOMEPAGE_TICKET_STORAGE_KEY,
      JSON.stringify({
        ticketNumber: 12,
        expiresAt: Date.now() + 60_000,
        savedAt: Date.now(),
        rangeKey: "1-20",
      }),
    );

    renderWithLanguage(<NewPage />);

    const links = await screen.findAllByRole("link", { name: "See what's in stock" });
    expect(links[0]).toHaveAttribute("href", "/inventory");
    const changeTicket = await screen.findByRole("button", { name: "Enter a new ticket number" });
    const inventory = links[0];
    const arcade = screen.getByRole("link", { name: /PLAY GAMES/i });
    expect(changeTicket.compareDocumentPosition(inventory) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(inventory.compareDocumentPosition(arcade) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
