// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import * as React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DISPLAY_LANGUAGE_SESSION_STORAGE_KEY,
  LanguageProvider,
  useLanguage,
} from "@/contexts/language-context";
import { useDisplayLanguageRotation } from "@/hooks/use-display-language-rotation";
import type { DisplayLanguageRotation } from "@/lib/state-types";

function Harness({ config }: { config: DisplayLanguageRotation | null }) {
  const { language } = useLanguage();
  useDisplayLanguageRotation(config);
  return <span data-testid="lang">{language}</span>;
}

function renderHarness(config: DisplayLanguageRotation | null) {
  return render(
    <LanguageProvider persist={false}>
      <Harness config={config} />
    </LanguageProvider>,
  );
}

function ManualPauseHarness({ config }: { config: DisplayLanguageRotation | null }) {
  const [paused, setPaused] = React.useState(false);
  const { language, setLanguage } = useLanguage();
  useDisplayLanguageRotation(config, { paused });

  return (
    <>
      <span data-testid="lang">{language}</span>
      <button
        type="button"
        onClick={() => {
          setLanguage("vi");
          setPaused(true);
        }}
      >
        Manual Vietnamese
      </button>
    </>
  );
}

function LanguageSessionHarness() {
  const { hasSessionLanguageOverride, isLanguageHydrated, language, setLanguage } = useLanguage();

  return (
    <>
      <span data-testid="lang">{language}</span>
      <span data-testid="hydrated">{String(isLanguageHydrated)}</span>
      <span data-testid="override">{String(hasSessionLanguageOverride)}</span>
      <button type="button" onClick={() => setLanguage("en")}>
        Manual English
      </button>
    </>
  );
}

describe("useDisplayLanguageRotation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("cycles through the configured languages on the interval", () => {
    const { getByTestId } = renderHarness({
      enabled: true,
      languages: ["en", "es", "ar"],
      intervalSeconds: 60,
    });

    // Starts at the first language immediately.
    expect(getByTestId("lang").textContent).toBe("en");

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(getByTestId("lang").textContent).toBe("es");

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(getByTestId("lang").textContent).toBe("ar");

    // Wraps back to the start.
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(getByTestId("lang").textContent).toBe("en");
    expect(window.sessionStorage.getItem(DISPLAY_LANGUAGE_SESSION_STORAGE_KEY)).toBeNull();
  });

  it("stays static for a single language (no interval needed)", () => {
    const { getByTestId } = renderHarness({
      enabled: true,
      languages: ["es"],
      intervalSeconds: 60,
    });
    expect(getByTestId("lang").textContent).toBe("es");
    act(() => {
      vi.advanceTimersByTime(300_000);
    });
    expect(getByTestId("lang").textContent).toBe("es");
  });

  it("does not rotate when disabled", () => {
    const { getByTestId } = renderHarness({
      enabled: false,
      languages: ["en", "es"],
      intervalSeconds: 60,
    });
    expect(getByTestId("lang").textContent).toBe("en");
    act(() => {
      vi.advanceTimersByTime(180_000);
    });
    expect(getByTestId("lang").textContent).toBe("en");
  });

  it("does nothing when the config is null", () => {
    const { getByTestId } = renderHarness(null);
    expect(getByTestId("lang").textContent).toBe("en");
    act(() => {
      vi.advanceTimersByTime(180_000);
    });
    expect(getByTestId("lang").textContent).toBe("en");
  });

  it("restarts the cycle when the config changes", () => {
    const { getByTestId, rerender } = renderHarness({
      enabled: true,
      languages: ["en", "es"],
      intervalSeconds: 60,
    });
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(getByTestId("lang").textContent).toBe("es");

    rerender(
      <LanguageProvider persist={false}>
        <Harness config={{ enabled: true, languages: ["ru", "uk"], intervalSeconds: 30 }} />
      </LanguageProvider>,
    );
    // The new config restarts at its first language.
    expect(getByTestId("lang").textContent).toBe("ru");
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(getByTestId("lang").textContent).toBe("uk");
  });

  it("switches back to English when rotation is disabled", () => {
    const { getByTestId, rerender } = renderHarness({
      enabled: true,
      languages: ["es", "ar"],
      intervalSeconds: 60,
    });
    expect(getByTestId("lang").textContent).toBe("es");

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(getByTestId("lang").textContent).toBe("ar");

    rerender(
      <LanguageProvider persist={false}>
        <Harness config={{ enabled: false, languages: ["es", "ar"], intervalSeconds: 60 }} />
      </LanguageProvider>,
    );
    expect(getByTestId("lang").textContent).toBe("en");

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(getByTestId("lang").textContent).toBe("en");
  });

  it("stops rotating without resetting language when paused by a manual session choice", () => {
    const { getByTestId, getByRole } = render(
      <LanguageProvider persist={false}>
        <ManualPauseHarness
          config={{
            enabled: true,
            languages: ["es", "ar"],
            intervalSeconds: 60,
          }}
        />
      </LanguageProvider>,
    );
    expect(getByTestId("lang").textContent).toBe("es");

    act(() => {
      fireEvent.click(getByRole("button", { name: "Manual Vietnamese" }));
    });
    expect(getByTestId("lang").textContent).toBe("vi");
    expect(window.sessionStorage.getItem(DISPLAY_LANGUAGE_SESSION_STORAGE_KEY)).toBe("vi");

    act(() => {
      vi.advanceTimersByTime(180_000);
    });
    expect(getByTestId("lang").textContent).toBe("vi");
  });

  it("treats an explicit English choice as a session override", () => {
    const { getByRole, getByTestId } = render(
      <LanguageProvider>
        <LanguageSessionHarness />
      </LanguageProvider>,
    );

    act(() => {
      fireEvent.click(getByRole("button", { name: "Manual English" }));
    });

    expect(getByTestId("lang").textContent).toBe("en");
    expect(getByTestId("override").textContent).toBe("true");
    expect(window.sessionStorage.getItem(DISPLAY_LANGUAGE_SESSION_STORAGE_KEY)).toBe("en");
  });

  it("hydrates an explicit English session override from storage", () => {
    window.sessionStorage.setItem(DISPLAY_LANGUAGE_SESSION_STORAGE_KEY, "en");

    const { getByTestId } = render(
      <LanguageProvider>
        <LanguageSessionHarness />
      </LanguageProvider>,
    );

    expect(getByTestId("lang").textContent).toBe("en");
    expect(getByTestId("hydrated").textContent).toBe("true");
    expect(getByTestId("override").textContent).toBe("true");
  });
});
