// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminPage from "@/app/admin/admin-page-client";

const toastError = vi.fn();
const toastSuccess = vi.fn();

vi.mock("@/components/navigation/bottom-tab-bar", () => ({
  BottomTabBar: () => null,
}));

vi.mock("@/components/announcement-editor", () => ({
  AnnouncementEditor: () => null,
}));

vi.mock("@/components/translation/translation-card", () => ({
  TranslationCard: () => <div>Translation</div>,
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}));

vi.mock("next/image", () => ({
  default: ({ alt }: Record<string, unknown>) => (
    <span data-testid={`next-image-${String(alt ?? "image")}`} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: import("react").ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/theme-switcher", () => ({
  ThemeSwitcher: () => <div data-testid="theme-switcher" />,
}));

const baseState = {
  startNumber: 1,
  endNumber: 10,
  mode: "random",
  generatedOrder: [3, 7, 1, 9, 5, 2, 10, 4, 8, 6],
  currentlyServing: 3 as number | null,
  ticketStatus: {},
  calledAt: {},
  orderLocked: true,
  timestamp: Date.now(),
  displayUrl: null,
  operatingHours: null,
  timezone: "America/Los_Angeles",
};

const twoSnapshots = [
  { id: "snap-1", timestamp: Date.now(), path: "snap-1" },
  { id: "snap-2", timestamp: Date.now() - 60_000, path: "snap-2" },
];

const oneSnapshot = [{ id: "snap-1", timestamp: Date.now(), path: "snap-1" }];

let currentState = { ...baseState };
let currentSnapshots: typeof twoSnapshots = [...twoSnapshots];
let postBodies: Record<string, unknown>[] = [];
let pairingStatus = {
  configured: false,
  source: null as "database" | "environment" | null,
  createdAt: null as string | null,
  lastUsedAt: null as string | null,
};

const installMatchMedia = () => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

const installFetch = () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (String(input).includes("/api/integrations/feed/token")) {
        return new Response(JSON.stringify({ status: pairingStatus }), { status: 200 });
      }
      if (method === "GET") {
        return new Response(JSON.stringify(currentState), { status: 200 });
      }

      const body = init?.body ? JSON.parse(String(init.body)) : {};
      postBodies.push(body);

      if (body.action === "listSnapshots") {
        return new Response(JSON.stringify(currentSnapshots), { status: 200 });
      }

      return new Response(JSON.stringify(currentState), { status: 200 });
    }),
  );
};

describe("Admin page actions", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_ADMIN_OPTIMISTIC_UI;
    currentState = { ...baseState };
    currentSnapshots = [...twoSnapshots];
    postBodies = [];
    pairingStatus = {
      configured: false,
      source: null,
      createdAt: null,
      lastUsedAt: null,
    };
    toastError.mockReset();
    toastSuccess.mockReset();
    installMatchMedia();
    installFetch();
    window.scrollTo = vi.fn();
  });

  it("renders and shows Now Serving card after loading", async () => {
    render(<AdminPage />);
    await screen.findByText("Now Serving");
    expect(screen.getByText(/Ticket #3/)).toBeInTheDocument();
  });

  it("calls advanceServing next when Next draw button is clicked", async () => {
    render(<AdminPage />);
    await screen.findByText("Now Serving");
    const user = userEvent.setup();

    const nextButton = screen.getByRole("button", { name: "Next draw" });
    await user.click(nextButton);

    await waitFor(() => {
      const advanceCalls = postBodies.filter(
        (b) => b.action === "advanceServing" && b.direction === "next",
      );
      expect(advanceCalls.length).toBeGreaterThan(0);
    });
  });

  it("calls advanceServing prev when Previous draw button is clicked", async () => {
    // Use state where currentlyServing=7 (index 1), so prev to index 0 is possible
    currentState = { ...baseState, currentlyServing: 7 };
    render(<AdminPage />);
    await screen.findByText("Now Serving");
    const user = userEvent.setup();

    const prevButton = screen.getByRole("button", { name: "Previous draw" });
    await user.click(prevButton);

    await waitFor(() => {
      const advanceCalls = postBodies.filter(
        (b) => b.action === "advanceServing" && b.direction === "prev",
      );
      expect(advanceCalls.length).toBeGreaterThan(0);
    });
  });

  it("calls undo when Undo button is clicked", async () => {
    render(<AdminPage />);
    await screen.findByText("Now Serving");
    const user = userEvent.setup();

    const undoButton = screen.getByRole("button", { name: /Undo/i });
    await user.click(undoButton);

    await waitFor(() => {
      const undoCalls = postBodies.filter((b) => b.action === "undo");
      expect(undoCalls.length).toBeGreaterThan(0);
    });
  });

  it("undo button is enabled with 2+ snapshots (v1.5.1 derived canUndo)", async () => {
    currentSnapshots = [...twoSnapshots];
    render(<AdminPage />);
    await screen.findByText("Now Serving");

    const undoButton = screen.getByRole("button", { name: /Undo/i });
    expect(undoButton).not.toBeDisabled();
  });

  it("undo button is disabled with fewer than 2 snapshots", async () => {
    currentSnapshots = [...oneSnapshot];
    render(<AdminPage />);
    await screen.findByText("Now Serving");

    const undoButton = screen.getByRole("button", { name: /Undo/i });
    expect(undoButton).toBeDisabled();
  });

  it("shows error toast when an action fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const method = init?.method ?? "GET";
        if (method === "GET") {
          return new Response(JSON.stringify(currentState), { status: 200 });
        }
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        if (body.action === "listSnapshots") {
          return new Response(JSON.stringify(currentSnapshots), {
            status: 200,
          });
        }
        // All other actions fail
        return new Response(
          JSON.stringify({ error: "Something went wrong" }),
          { status: 500 },
        );
      }),
    );

    render(<AdminPage />);
    await screen.findByText("Now Serving");
    const user = userEvent.setup();

    const nextButton = screen.getByRole("button", { name: "Next draw" });
    await user.click(nextButton);

    await waitFor(() => {
      expect(toastError).toHaveBeenCalled();
    });
    // Let pending rejections settle
    await new Promise((r) => setTimeout(r, 50));
  });

  it("does not block load or action completion when snapshot listing is slow", async () => {
    const snapshotResolvers: Array<() => void> = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const method = init?.method ?? "GET";
        if (method === "GET") {
          return new Response(JSON.stringify(currentState), { status: 200 });
        }

        const body = init?.body ? JSON.parse(String(init.body)) : {};
        postBodies.push(body);

        if (body.action === "listSnapshots") {
          await new Promise<void>((resolve) => snapshotResolvers.push(resolve));
          return new Response(JSON.stringify(currentSnapshots), { status: 200 });
        }

        return new Response(JSON.stringify(currentState), { status: 200 });
      }),
    );

    render(<AdminPage />);
    await screen.findByText("Now Serving");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Next draw" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Next draw" })).not.toBeDisabled();
    });

    await act(async () => {
      snapshotResolvers.forEach((resolve) => resolve());
      await new Promise((r) => setTimeout(r, 20));
    });
  });

  it("renders ticket info in the draw position section", async () => {
    render(<AdminPage />);
    await screen.findByText("Now Serving");
    // "Draw position" appears in the card — use getAllByText and check at least one
    const drawPosElements = screen.getAllByText(/Draw position/);
    expect(drawPosElements.length).toBeGreaterThan(0);
  });

  it("locks returned and unclaimed actions to operational status variants", async () => {
    render(<AdminPage />);
    await screen.findByText("Now Serving");

    const returnedCard = screen.getByText("Mark ticket as returned").closest(".ticket-returned");
    const unclaimedCard = screen
      .getByText("Mark ticket as unclaimed")
      .closest(".ticket-unclaimed");

    expect(returnedCard).not.toBeNull();
    expect(unclaimedCard).not.toBeNull();

    const returnedButton = within(returnedCard as HTMLElement).getByRole("button", {
      name: "Mark ticket",
    });
    const unclaimedButton = within(unclaimedCard as HTMLElement).getByRole("button", {
      name: "Mark ticket",
    });

    expect(returnedButton.className).toContain(
      "bg-[var(--operational-danger-action-bg)]",
    );
    expect(unclaimedButton.className).toContain(
      "bg-[var(--operational-warning-action-bg)]",
    );
    expect(returnedButton.className).toContain("disabled:opacity-100");
    expect(unclaimedButton.className).toContain("disabled:opacity-100");
  });

  it("displays Ticket Range & Order section", async () => {
    render(<AdminPage />);
    await screen.findByText("Ticket Range & Order");
    expect(screen.getByLabelText("Start Number")).toBeInTheDocument();
    expect(screen.getByLabelText("End Number")).toBeInTheDocument();
  });

  it("hides advanced configuration cards until the Advanced accordion is expanded", async () => {
    render(<AdminPage />);
    await screen.findByText("System reset");

    expect(screen.queryByText("Set operating hours")).not.toBeInTheDocument();
    expect(screen.queryByText("Rotate display languages")).not.toBeInTheDocument();
    expect(screen.queryByText("Announcement")).not.toBeInTheDocument();
    expect(screen.queryByText("Translation")).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Advanced/ }));

    expect(await screen.findByText("Set operating hours")).toBeInTheDocument();
    expect(screen.getByText("Rotate display languages")).toBeInTheDocument();
    expect(screen.getByText("Announcement")).toBeInTheDocument();
    expect(screen.getByText("Translation")).toBeInTheDocument();
  });

  it("enables reset action only when RESET phrase is entered", async () => {
    render(<AdminPage />);
    await screen.findByText("System reset");

    const resetButton = screen.getByRole("button", { name: "Reset for New Day" });
    expect(resetButton).toBeDisabled();

    const resetInput = screen.getByPlaceholderText('Type "RESET" to enable');
    const user = userEvent.setup();
    await user.type(resetInput, "RESET");

    expect(resetButton).not.toBeDisabled();
  });

  it("shows dash for Tickets issued when reset state has no active range", async () => {
    currentState = {
      ...baseState,
      startNumber: 0,
      endNumber: 0,
      generatedOrder: [],
      currentlyServing: null,
      orderLocked: false,
      ticketStatus: {},
      calledAt: {},
    };

    render(<AdminPage />);
    await screen.findByText("Live State");

    const ticketsIssuedLabel = screen.getByText("Tickets issued");
    expect(ticketsIssuedLabel.nextElementSibling).toHaveTextContent("—");
  });

  it("caps snapshot options and toggles older entries with checkbox", async () => {
    currentSnapshots = Array.from({ length: 250 }, (_, index) => ({
      id: `snap-${index + 1}`,
      timestamp: Date.now() - index * 1000,
      path: `snap-${index + 1}`,
    }));

    render(<AdminPage />);
    await screen.findByText("History");

    const snapshotSelect = screen.getByLabelText("Restore snapshot");
    expect(snapshotSelect.querySelectorAll("option")).toHaveLength(100);

    const user = userEvent.setup();
    await user.click(screen.getByRole("checkbox", { name: "Show older snapshots" }));

    await waitFor(() => {
      expect(snapshotSelect.querySelectorAll("option")).toHaveLength(250);
    });

    await user.click(screen.getByRole("checkbox", { name: "Show older snapshots" }));

    await waitFor(() => {
      expect(snapshotSelect.querySelectorAll("option")).toHaveLength(100);
    });
  });

  it("places FEED setup beneath the older-snapshots control", async () => {
    currentSnapshots = Array.from({ length: 101 }, (_, index) => ({
      id: `snap-${index + 1}`,
      timestamp: Date.now() - index * 1000,
      path: `snap-${index + 1}`,
    }));

    render(<AdminPage />);
    await screen.findByText("History");

    const olderSnapshots = screen.getByText("Show older snapshots");
    const setup = screen.getByRole("button", { name: "Setup" });

    const sectionTitle = screen.getByText("Sync With FEED");
    expect(sectionTitle).toBeInTheDocument();
    expect(sectionTitle.parentElement?.querySelector(".lucide-database-arrow-up"))
      .toBeInTheDocument();
    expect(
      screen.getByText("Configure LOTTO App to share daily operations data with FEED."),
    ).toBeInTheDocument();
    expect(olderSnapshots.compareDocumentPosition(setup)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(await screen.findByText("Not configured")).toBeInTheDocument();
    expect(screen.getByText(/Last token generated:/)).toHaveTextContent(
      "Last token generated: Never",
    );
  });

  it("shows active FEED configuration and the token generation timestamp", async () => {
    const createdAt = "2026-08-24T18:04:00.000Z";
    pairingStatus = {
      configured: true,
      source: "database",
      createdAt,
      lastUsedAt: "2026-08-24T18:12:00.000Z",
    };

    render(<AdminPage />);
    await screen.findByText("History");

    expect(await screen.findByText("Configured")).toBeInTheDocument();
    expect(screen.getByText(/Last token generated:/)).toHaveTextContent(
      `Last token generated: ${new Date(createdAt).toLocaleString()}`,
    );
  });
});
