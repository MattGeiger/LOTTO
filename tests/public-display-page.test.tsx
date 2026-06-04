import type { ReactNode } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PublicDisplayPage } from "@/components/public-display-page";
import type { RaffleState } from "@/lib/state-types";

// --- Mocks ---------------------------------------------------------------

vi.mock("next/font/local", () => ({
  default: () => ({ className: "font-arcade-display", variable: "" }),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span data-testid={`next-image-${alt}`} />,
}));

vi.mock("@/components/theme-switcher", () => ({
  ThemeSwitcher: () => <div data-testid="theme-switcher" />,
}));

const useDisplayLanguageRotationMock = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-display-language-rotation", () => ({
  useDisplayLanguageRotation: useDisplayLanguageRotationMock,
}));

vi.mock("@/components/language-switcher", () => ({
  LanguageSwitcher: ({
    onLanguageChange,
  }: {
    onLanguageChange?: (language: "vi") => void;
  }) => (
    <button type="button" data-testid="language-switcher" onClick={() => onLanguageChange?.("vi")}>
      Language switcher
    </button>
  ),
}));

let capturedSearchRequest: unknown = undefined;
let capturedOnStateChange: ((state: RaffleState) => void) | undefined = undefined;
vi.mock("@/components/readonly-display", () => ({
  ReadOnlyDisplay: (props: Record<string, unknown>) => {
    capturedSearchRequest = props.ticketSearchRequest;
    capturedOnStateChange = props.onStateChange as typeof capturedOnStateChange;
    return <div data-testid="readonly-display" />;
  },
}));

vi.mock("@/components/animate-ui/icons/icon", () => ({
  AnimateIcon: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/animate-ui/icons/search", () => ({
  Search: () => <span data-testid="search-icon" />,
}));

vi.mock("@/contexts/language-context", () => ({
  useLanguage: () => ({
    language: "en",
    setLanguage: vi.fn(),
    t: (key: string) => {
      const map: Record<string, string> = {
        searchTicketLabel: "Enter your ticket number",
        searchTicketPlaceholder: "ENTER TICKET #",
        searchButtonLabel: "Submit",
      };
      return map[key] ?? key;
    },
  }),
}));

// --- Helpers --------------------------------------------------------------

function renderPage() {
  return render(<PublicDisplayPage />);
}

function getSearchInput() {
  return screen.getByLabelText("Search ticket number") as HTMLInputElement;
}

const stateWithRotationEnabled = {
  displayLanguageRotation: {
    enabled: true,
    languages: ["en", "es"],
    intervalSeconds: 120,
  },
} as RaffleState;

// --- Tests ----------------------------------------------------------------

describe("PublicDisplayPage", () => {
  beforeEach(() => {
    capturedSearchRequest = undefined;
    capturedOnStateChange = undefined;
    useDisplayLanguageRotationMock.mockClear();
  });

  it("renders search input, language switcher, and theme switcher", () => {
    renderPage();
    expect(getSearchInput()).toBeInTheDocument();
    expect(screen.getByTestId("language-switcher")).toBeInTheDocument();
    expect(screen.getByTestId("theme-switcher")).toBeInTheDocument();
  });

  it("renders the ReadOnlyDisplay component", () => {
    renderPage();
    expect(screen.getByTestId("readonly-display")).toBeInTheDocument();
  });

  it("keeps the language switcher visible when admin rotation is enabled", () => {
    renderPage();

    act(() => {
      capturedOnStateChange?.(stateWithRotationEnabled);
    });

    expect(screen.getByTestId("language-switcher")).toBeVisible();
    expect(screen.getByTestId("language-switcher").parentElement).not.toHaveClass("invisible");
  });

  it("pauses display rotation for the browser session after a manual language choice", async () => {
    renderPage();

    act(() => {
      capturedOnStateChange?.(stateWithRotationEnabled);
    });
    expect(useDisplayLanguageRotationMock).toHaveBeenLastCalledWith(
      stateWithRotationEnabled.displayLanguageRotation,
      { paused: false },
    );

    const user = userEvent.setup();
    await user.click(screen.getByTestId("language-switcher"));

    expect(useDisplayLanguageRotationMock).toHaveBeenLastCalledWith(
      stateWithRotationEnabled.displayLanguageRotation,
      { paused: true },
    );
  });

  it("filters non-digit characters from input", async () => {
    renderPage();
    const user = userEvent.setup();
    const input = getSearchInput();

    await user.type(input, "abc123def456");
    expect(input.value).toBe("123456");
  });

  it("truncates input at 6 characters", async () => {
    renderPage();
    const user = userEvent.setup();
    const input = getSearchInput();

    await user.type(input, "1234567890");
    expect(input.value).toBe("123456");
  });

  it("submits search on Enter key", async () => {
    renderPage();
    const user = userEvent.setup();
    const input = getSearchInput();

    await user.type(input, "42");
    await user.keyboard("{Enter}");

    expect(capturedSearchRequest).toEqual({
      ticketNumber: 42,
      triggerId: 1,
    });
  });

  it("submits search on search button click", async () => {
    renderPage();
    const user = userEvent.setup();
    const input = getSearchInput();

    await user.type(input, "99");

    const submitBtn = screen.getByRole("button", { name: "Submit" });
    await user.click(submitBtn);

    expect(capturedSearchRequest).toEqual({
      ticketNumber: 99,
      triggerId: 1,
    });
  });

  it("does not submit when input is empty", async () => {
    renderPage();
    const user = userEvent.setup();
    const input = getSearchInput();

    // Type nothing, press Enter
    await user.click(input);
    await user.keyboard("{Enter}");

    expect(capturedSearchRequest).toBeUndefined();
  });

  it("increments triggerId on multiple submissions", async () => {
    renderPage();
    const user = userEvent.setup();
    const input = getSearchInput();

    // First search
    await user.type(input, "10");
    await user.keyboard("{Enter}");
    expect(capturedSearchRequest).toEqual({ ticketNumber: 10, triggerId: 1 });

    // Second search — same ticket, new triggerId
    await user.keyboard("{Enter}");
    expect(capturedSearchRequest).toEqual({ ticketNumber: 10, triggerId: 2 });

    // Third search — different ticket
    await user.clear(input);
    await user.type(input, "55");
    await user.keyboard("{Enter}");
    expect(capturedSearchRequest).toEqual({ ticketNumber: 55, triggerId: 3 });
  });
});
