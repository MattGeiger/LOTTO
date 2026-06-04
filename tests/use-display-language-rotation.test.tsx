import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageProvider, useLanguage } from "@/contexts/language-context";
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

describe("useDisplayLanguageRotation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
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
});
