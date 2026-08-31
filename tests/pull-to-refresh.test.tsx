// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PullToRefresh } from "@/components/pull-to-refresh";

vi.mock("@/contexts/language-context", () => ({
  useLanguage: () => ({ t: () => "Refreshing…" }),
}));

const setStandaloneMode = (matches: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => ({
      matches,
      media: "(display-mode: standalone)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  Object.defineProperty(window.navigator, "standalone", {
    configurable: true,
    value: false,
  });
};

describe("PullToRefresh", () => {
  beforeEach(() => {
    setStandaloneMode(true);
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      writable: true,
      value: 0,
    });
    delete document.documentElement.dataset.appMode;
  });

  it("refreshes after a pull that starts anywhere on an unscrolled page", () => {
    const onRefresh = vi.fn();
    render(<PullToRefresh onRefresh={onRefresh} />);

    expect(document.documentElement.dataset.appMode).toBe("standalone");
    fireEvent.touchStart(window, { touches: [{ clientY: 420 }] });
    fireEvent.touchMove(window, { touches: [{ clientY: 580 }] });

    expect(screen.getByTestId("pull-to-refresh-indicator")).toHaveAttribute(
      "data-ready",
      "true",
    );
    fireEvent.touchEnd(window);

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status", { name: "Refreshing…" })).toBeInTheDocument();
  });

  it("ignores short pulls, scrolled pages, and nested interactive regions", () => {
    const onRefresh = vi.fn();
    render(
      <>
        <PullToRefresh onRefresh={onRefresh} />
        <div data-pull-to-refresh-ignore data-testid="nested-scroll-region" />
      </>,
    );

    fireEvent.touchStart(window, { touches: [{ clientY: 40 }] });
    fireEvent.touchMove(window, { touches: [{ clientY: 100 }] });
    fireEvent.touchEnd(window);

    const nestedScrollRegion = screen.getByTestId("nested-scroll-region");
    fireEvent.touchStart(nestedScrollRegion, { touches: [{ clientY: 140 }] });
    fireEvent.touchMove(nestedScrollRegion, { touches: [{ clientY: 320 }] });
    fireEvent.touchEnd(nestedScrollRegion);

    window.scrollY = 10;
    fireEvent.touchStart(window, { touches: [{ clientY: 40 }] });
    fireEvent.touchMove(window, { touches: [{ clientY: 220 }] });
    fireEvent.touchEnd(window);

    expect(onRefresh).not.toHaveBeenCalled();
    expect(screen.queryByTestId("pull-to-refresh-indicator")).not.toBeInTheDocument();
  });

  it("stays inactive in an ordinary browser tab", () => {
    setStandaloneMode(false);
    const onRefresh = vi.fn();
    render(<PullToRefresh onRefresh={onRefresh} />);

    fireEvent.touchStart(window, { touches: [{ clientY: 40 }] });
    fireEvent.touchMove(window, { touches: [{ clientY: 220 }] });
    fireEvent.touchEnd(window);

    expect(document.documentElement.dataset.appMode).toBeUndefined();
    expect(onRefresh).not.toHaveBeenCalled();
  });
});
