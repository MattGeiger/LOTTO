// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// Regression coverage for docs/ISSUES.md Issue 35: typing in the Announcement
// editor used to re-render the entire `/admin` tree once per character, which
// produced multi-second input lag on iPad mini 4 class hardware. The draft now
// lives in the keystroke-isolated `AnnouncementSection`.
//
// These tests assert the *isolation property* (heavy siblings do not re-render
// while typing), not a wall-clock timing, so they stay meaningful on any
// machine. The dev machine is far too fast for a timing assertion to catch a
// regression that only manifests on low-power devices.

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as React from "react";

import AdminPage from "@/app/admin/admin-page-client";
import { ANNOUNCEMENT_DRAFT_KEY } from "@/components/announcement-section";

const renderCounts = {
  translationCard: 0,
  appearanceCard: 0,
  rotationEditor: 0,
};

vi.mock("@/components/navigation/bottom-tab-bar", () => ({
  BottomTabBar: () => null,
}));

vi.mock("@/components/translation/translation-card", () => ({
  TranslationCard: () => {
    renderCounts.translationCard += 1;
    return <div>Translation</div>;
  },
}));

vi.mock("@/components/appearance/appearance-card", () => ({
  AppearanceCard: () => {
    renderCounts.appearanceCard += 1;
    return <div>Appearance</div>;
  },
}));

vi.mock("@/components/display-language-rotation-editor", () => ({
  DisplayLanguageRotationEditor: () => {
    renderCounts.rotationEditor += 1;
    return <div>Rotation</div>;
  },
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("next/image", () => ({
  default: ({ alt }: Record<string, unknown>) => (
    <span data-testid={`next-image-${String(alt ?? "image")}`} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: unknown; href: string }) => (
    <a href={href} {...rest}>
      {children as React.ReactNode}
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
  currentlyServing: 3,
  ticketStatus: {},
  calledAt: {},
  orderLocked: true,
  timestamp: Date.now(),
  displayUrl: null,
  operatingHours: null,
  timezone: "America/Los_Angeles",
  announcement: null,
};

let postBodies: Record<string, unknown>[] = [];

const openAdvancedAndFindTextarea = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: /Advanced/i }));
  await screen.findByText("Translation");
  // The Markdown editor mounts both panes; drive the "Edit code" textarea,
  // which behaves deterministically under jsdom (unlike the Tiptap surface).
  await user.click(screen.getByRole("tab", { name: /Edit code/i }));
  const textarea = document.querySelector("textarea");
  expect(textarea).toBeTruthy();
  return textarea as HTMLTextAreaElement;
};

const TEST_TIMEOUT_MS = 30_000;

describe("Announcement editor input isolation (Issue 35)", () => {
  beforeEach(() => {
    renderCounts.translationCard = 0;
    renderCounts.appearanceCard = 0;
    renderCounts.rotationEditor = 0;
    postBodies = [];
    window.localStorage.clear();

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

    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const method = init?.method ?? "GET";
        if (method === "GET") {
          return new Response(JSON.stringify(baseState), { status: 200 });
        }
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        postBodies.push(body);
        if (body.action === "listSnapshots") {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        return new Response(JSON.stringify(baseState), { status: 200 });
      }),
    );

    window.scrollTo = vi.fn();
  });

  it("does not re-render heavy sibling cards while typing an announcement", async () => {
    render(<AdminPage />);
    await screen.findByText("Now Serving");
    const user = userEvent.setup({ delay: null });

    const textarea = await openAdvancedAndFindTextarea(user);

    const before = { ...renderCounts };
    await user.type(textarea, "Closed Mon");
    await waitFor(() => expect(textarea.value).toBe("Closed Mon"));

    // Before the fix this was one re-render per character (10 here).
    expect(renderCounts.translationCard - before.translationCard).toBe(0);
    expect(renderCounts.appearanceCard - before.appearanceCard).toBe(0);
    expect(renderCounts.rotationEditor - before.rotationEditor).toBe(0);
  }, TEST_TIMEOUT_MS);

  it("still saves the locally-owned draft when Save is pressed", async () => {
    render(<AdminPage />);
    await screen.findByText("Now Serving");
    const user = userEvent.setup({ delay: null });

    const textarea = await openAdvancedAndFindTextarea(user);
    await user.type(textarea, "Closed Mon");
    await waitFor(() => expect(textarea.value).toBe("Closed Mon"));

    await user.click(screen.getByRole("button", { name: /Save announcement/i }));

    await waitFor(() => {
      const saves = postBodies.filter((b) => b.action === "setAnnouncement");
      expect(saves.length).toBeGreaterThan(0);
      const announcement = saves[saves.length - 1].announcement as { markdown: string };
      expect(announcement.markdown).toBe("Closed Mon");
    });
  }, TEST_TIMEOUT_MS);

  it("persists an unsaved draft to local storage after typing settles", async () => {
    render(<AdminPage />);
    await screen.findByText("Now Serving");
    const user = userEvent.setup({ delay: null });

    const textarea = await openAdvancedAndFindTextarea(user);
    await user.type(textarea, "Draft text");

    await waitFor(
      () => {
        const raw = window.localStorage.getItem(ANNOUNCEMENT_DRAFT_KEY);
        expect(raw).toBeTruthy();
        expect(JSON.parse(raw as string).markdown).toBe("Draft text");
      },
      { timeout: 3000 },
    );
  }, TEST_TIMEOUT_MS);

  it("hydrates an unsaved draft from local storage on mount", async () => {
    window.localStorage.setItem(
      ANNOUNCEMENT_DRAFT_KEY,
      JSON.stringify({
        enabled: true,
        markdown: "Recovered draft",
        startsAt: null,
        endsAt: null,
        updatedAt: 0,
      }),
    );

    render(<AdminPage />);
    await screen.findByText("Now Serving");
    const user = userEvent.setup({ delay: null });

    const textarea = await openAdvancedAndFindTextarea(user);
    expect(textarea.value).toBe("Recovered draft");
  }, TEST_TIMEOUT_MS);
});
