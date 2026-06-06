// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "@/contexts/language-context";

vi.mock("@/arcade/game/zombie-attack/assets", () => ({
  loadAssets: vi.fn().mockResolvedValue({}),
}));

function renderWithProviders(ui: ReactNode) {
  return render(
    <LanguageProvider>
      {ui}
    </LanguageProvider>,
  );
}

describe("Arcade game high-score integrations", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ scores: [] }), { status: 200 }),
    ));
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () => null as unknown as CanvasRenderingContext2D,
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders Top 10 Scores on Snake before game start", async () => {
    const { default: SnakePage } = await import("@/app/(arcade)/arcade/snake/page");
    renderWithProviders(<SnakePage />);

    expect(await screen.findByTestId("arcade-high-scores")).toBeInTheDocument();
    expect(screen.getByText("TOP 10 SCORES")).toBeInTheDocument();
  });

  it("renders Top 10 Scores on Brick Mayhem before game start", async () => {
    const { default: BrickMayhemPage } = await import("@/app/(arcade)/arcade/brick-mayhem/page");
    renderWithProviders(<BrickMayhemPage />);

    expect(await screen.findByTestId("arcade-high-scores")).toBeInTheDocument();
    expect(screen.getByText("TOP 10 SCORES")).toBeInTheDocument();
  });

  it("renders Top 10 Scores on Day of the Dead before game start", async () => {
    const { default: ZombieAttackPage } = await import("@/app/(arcade)/arcade/zombie-attack/page");
    renderWithProviders(<ZombieAttackPage />);

    expect(await screen.findByTestId("arcade-high-scores")).toBeInTheDocument();
    expect(screen.getByText("TOP 10 SCORES")).toBeInTheDocument();
  });
});
