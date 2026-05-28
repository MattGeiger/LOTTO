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
  generatedAt: "2026-05-25T12:00:00.000Z",
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
        {
          id: 12,
          name: "Rice",
          translations: {},
          limit: null,
          limitType: null,
          statusTags: { inStock: true, limited: false, clearance: false },
          dietaryFlags: {
            vegan: false,
            vegetarian: false,
            glutenFree: false,
            organic: false,
            halal: false,
            kosher: false,
            readyToEat: false,
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
    vi.stubGlobal(
      "ResizeObserver",
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  it("renders FEED inventory in category tables with tags and limits", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(inventoryPayload), { status: 200 })));

    renderWithLanguage(<InventoryPage />);

    expect(await screen.findByRole("heading", { name: "What's in stock today" })).toBeInTheDocument();
    expect(screen.queryByText("Pantry inventory")).not.toBeInTheDocument();
    expect(screen.queryByText("Available pantry items from FEED, grouped by category.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Refresh" })).not.toBeInTheDocument();
    expect(screen.getByText("Canned Goods")).toBeInTheDocument();
    expect(screen.queryByText("Limit 100 per household")).not.toBeInTheDocument();
    expect(screen.getAllByText("Garbanzo Beans").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Limit 1 per household").length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: "Status" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Dietary" })).not.toBeInTheDocument();
    expect(screen.getAllByText("=").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Limited Supply").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Clearance").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ready to eat").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Limited Supply").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Clearance").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Ready to eat").length).toBeGreaterThan(0);
    expect(screen.getByText(/Updated: May 24/)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Inventory results" })).toHaveAttribute("data-slot", "scroll-area");
    expect(screen.queryByText(/Updated: May 25/)).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Status" })).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Dietary" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Tags" })).not.toBeInTheDocument();
    expect(screen.queryByText("None listed")).not.toBeInTheDocument();
  });

  it("uses selected language translations and filters by displayed names", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(inventoryPayload), { status: 200 })));

    renderWithLanguage(<InventoryPage />);

    await user.click(await screen.findByRole("button", { name: /change language/i }));
    await user.click(screen.getByRole("menuitemradio", { name: "Español" }));

    expect(await screen.findByRole("heading", { name: "Qué hay disponible hoy" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Buscar inventario" })).toBeInTheDocument();
    expect(await screen.findByText("Productos enlatados")).toBeInTheDocument();
    expect(screen.getAllByText("Garbanzos").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tuna").length).toBeGreaterThan(0);

    await user.click(screen.getAllByLabelText("Existencias limitadas")[0]);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Existencias limitadas");

    await user.type(screen.getByRole("textbox", { name: "Buscar inventario" }), "garbanzos");

    await waitFor(() => {
      expect(screen.queryByText("Tuna")).not.toBeInTheDocument();
    });
    expect(screen.getAllByText("Garbanzos").length).toBeGreaterThan(0);
  });

  it("uses the public board search control treatment for inventory search", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(inventoryPayload), { status: 200 })));

    renderWithLanguage(<InventoryPage />);

    const searchInput = await screen.findByRole("textbox", { name: "Search inventory" });
    expect(searchInput.closest("[data-slot='input-group']")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search inventory" })).toBeInTheDocument();
  });

  it("filters inventory by selected dietary flags via the filter dropdown", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(inventoryPayload), { status: 200 })));

    renderWithLanguage(<InventoryPage />);

    expect((await screen.findAllByText("Garbanzo Beans")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tuna").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rice").length).toBeGreaterThan(0);

    // Open the dietary filter dropdown; options are checkbox items that keep
    // the menu open so multiple flags can be combined.
    await user.click(screen.getByRole("button", { name: /Dietary filters/ }));

    const glutenFree = await screen.findByRole("menuitemcheckbox", { name: "Gluten-free" });
    expect(glutenFree).toHaveAttribute("aria-checked", "false");
    await user.click(glutenFree);
    expect(glutenFree).toHaveAttribute("aria-checked", "true");
    expect(screen.getAllByText("Garbanzo Beans").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tuna").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Rice")).toHaveLength(0);

    const vegan = await screen.findByRole("menuitemcheckbox", { name: "Vegan" });
    await user.click(vegan);
    expect(vegan).toHaveAttribute("aria-checked", "true");
    expect(screen.getAllByText("Garbanzo Beans").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Tuna")).toHaveLength(0);
    expect(screen.queryAllByText("Rice")).toHaveLength(0);

    await user.click(glutenFree);
    expect(glutenFree).toHaveAttribute("aria-checked", "false");
    expect(screen.getAllByText("Garbanzo Beans").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Tuna")).toHaveLength(0);

    await user.click(vegan);
    expect(vegan).toHaveAttribute("aria-checked", "false");
    expect(screen.getAllByText("Garbanzo Beans").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tuna").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rice").length).toBeGreaterThan(0);
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

    // Inventory and games are now reached through the persistent bottom tab
    // bar; the ticket-change action remains an in-page button.
    const inventoryTab = await screen.findByRole("link", { name: "What's in stock" });
    expect(inventoryTab).toHaveAttribute("href", "/inventory");
    expect(screen.getByRole("link", { name: "Games" })).toHaveAttribute("href", "/arcade");
    expect(screen.getByRole("button", { name: "Enter a new ticket number" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "See what's in stock" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /PLAY GAMES/i })).not.toBeInTheDocument();
  });

  it("localizes the /new inventory entry point", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(raffleState), { status: 200 })));
    window.localStorage.setItem("display-language", "es");
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

    const inventoryTab = await screen.findByRole("link", { name: "Qué hay disponible" });
    expect(inventoryTab).toHaveAttribute("href", "/inventory");
    expect(screen.queryByRole("link", { name: "Ver qué hay disponible" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "See what's in stock" })).not.toBeInTheDocument();
  });
});
