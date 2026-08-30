// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach, vi } from "vitest";

import { HapticsProvider } from "@/components/haptics-provider";
import { ThemeProvider } from "@/components/theme-provider";
import {
  getThemeCycleTarget,
  ThemeSwitcher,
  THEME_SWITCHER_TRIGGER_ID,
} from "@/components/theme-switcher";

const rawTriggerMock = vi.fn();

vi.mock("web-haptics/react", () => ({
  useWebHaptics: () => ({
    trigger: rawTriggerMock,
    cancel: vi.fn(),
    isSupported: true,
  }),
}));

type ViewTransitionResult = {
  ready: Promise<void>;
  finished: Promise<void>;
};

function installMatchMedia(matches = false) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function renderSwitcher(enableHaptics = false) {
  render(
    <ThemeProvider>
      <HapticsProvider>
        <ThemeSwitcher enableHaptics={enableHaptics} />
      </HapticsProvider>
    </ThemeProvider>,
  );
}

function installViewTransition() {
  const startViewTransition = vi.fn(
    (callback: () => void | Promise<void>): ViewTransitionResult => {
      callback();
      return {
        ready: Promise.resolve(),
        finished: Promise.resolve(),
      };
    },
  );

  Object.defineProperty(document, "startViewTransition", {
    configurable: true,
    writable: true,
    value: startViewTransition,
  });

  return startViewTransition;
}

describe("ThemeSwitcher", () => {
  beforeEach(() => {
    window.localStorage.clear();
    rawTriggerMock.mockReset();
    document.documentElement.classList.remove("dark", "light", "hi-viz");
    installMatchMedia(false);
    Reflect.deleteProperty(document, "startViewTransition");
  });

  it("uses one control with no dropdown and starts by offering dark", async () => {
    renderSwitcher();

    expect(
      await screen.findByRole("button", { name: "Switch to dark theme" }),
    ).toBeEnabled();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("uses a deterministic trigger id for hydration stability", () => {
    renderSwitcher();

    expect(
      screen.getByRole("button", { name: "Switch to dark theme" }),
    ).toHaveAttribute("id", THEME_SWITCHER_TRIGGER_ID);
  });

  it("keeps the pre-mount target stable when the client prefers dark", () => {
    expect(getThemeCycleTarget(false, false, "dark")).toBe("dark");
    expect(getThemeCycleTarget(false, true, "dark")).toBe("dark");
    expect(getThemeCycleTarget(true, false, "dark")).toBe("hi-viz");
  });

  it("cycles light to dark to hi-viz to light", async () => {
    renderSwitcher();
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: "Switch to dark theme" }),
    );
    await waitFor(() => {
      expect(window.localStorage.getItem("theme")).toBe("dark");
      expect(
        screen.getByRole("button", { name: "Switch to high-visibility theme" }),
      ).toBeEnabled();
    });

    await user.click(
      screen.getByRole("button", { name: "Switch to high-visibility theme" }),
    );

    await waitFor(() => {
      expect(document.documentElement).toHaveClass("hi-viz");
      expect(window.localStorage.getItem("contrast-mode")).toBe("hi-viz");
      expect(window.localStorage.getItem("theme")).toBe("system");
      expect(
        screen.getByRole("button", { name: "Switch to light theme" }),
      ).toBeEnabled();
    });

    await user.click(
      screen.getByRole("button", { name: "Switch to light theme" }),
    );

    await waitFor(() => {
      expect(document.documentElement).not.toHaveClass("hi-viz");
      expect(window.localStorage.getItem("contrast-mode")).toBeNull();
      expect(window.localStorage.getItem("theme")).toBe("light");
      expect(
        screen.getByRole("button", { name: "Switch to dark theme" }),
      ).toBeEnabled();
    });
  });

  it("uses view transition when available for base theme changes", async () => {
    const startViewTransition = installViewTransition();

    renderSwitcher();
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: "Switch to dark theme" }),
    );

    await waitFor(() => {
      expect(startViewTransition).toHaveBeenCalledTimes(1);
      expect(window.localStorage.getItem("theme")).toBe("dark");
    });
  });

  it("restores persisted hi-viz mode on mount", async () => {
    window.localStorage.setItem("contrast-mode", "hi-viz");

    renderSwitcher();

    await waitFor(() => {
      expect(document.documentElement).toHaveClass("hi-viz");
      expect(
        screen.getByRole("button", { name: "Switch to light theme" }),
      ).toBeEnabled();
    });
  });

  it("triggers soft haptics when theme-selection haptics are enabled", async () => {
    renderSwitcher(true);
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: "Switch to dark theme" }),
    );

    expect(rawTriggerMock).toHaveBeenCalledWith("soft");
  });
});
