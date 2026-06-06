// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARCADE_TICKET_CALLED_EVENT } from "@/arcade/lib/events";
import SnakePage from "@/app/(arcade)/arcade/snake/page";
import { LanguageProvider } from "@/contexts/language-context";

function renderSnake() {
  return render(
    <LanguageProvider>
      <SnakePage />
    </LanguageProvider>,
  );
}

describe("Snake ticket-called pause behavior", () => {
  beforeEach(() => {
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ scores: [] }), { status: 200 }),
    ));
    vi.spyOn(window, "setInterval").mockImplementation(() => 0 as unknown as number);
    vi.spyOn(window, "clearInterval").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("pauses a running game when the ticket-called event is dispatched", async () => {
    renderSnake();

    await act(async () => {
      fireEvent.keyDown(window, { key: "ArrowUp" });
    });
    expect(await screen.findByRole("button", { name: "Pause game" })).toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(new CustomEvent(ARCADE_TICKET_CALLED_EVENT));
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Resume game" })).toBeInTheDocument();
      expect(screen.getByText("PLAY")).toBeInTheDocument();
    });
  });
});
