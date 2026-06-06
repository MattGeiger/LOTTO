// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import HomePage from "@/app/page";
import { LanguageProvider } from "@/contexts/language-context";

vi.mock("next/font/local", () => ({
  default: () => ({ className: "font-arcade-display", variable: "" }),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span data-testid={`next-image-${alt}`} />,
}));

vi.mock("@/components/theme-switcher", () => ({
  ThemeSwitcher: () => <div data-testid="theme-switcher" />,
}));

vi.mock("@/components/language-switcher", () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher" />,
}));

vi.mock("@/components/readonly-display", () => ({
  ReadOnlyDisplay: () => <div data-testid="readonly-display" />,
}));

vi.mock("@/components/animate-ui/icons/icon", () => ({
  AnimateIcon: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/animate-ui/icons/search", () => ({
  Search: () => <span data-testid="search-icon" />,
}));

vi.mock("@/components/animate-ui/primitives/texts/morphing", () => ({
  MorphingText: ({ text }: { text: string }) => <span>{text}</span>,
}));

vi.mock("@/components/animate-ui/primitives/texts/rolling", () => ({
  RollingText: ({ text }: { text: string }) => <span>{text}</span>,
}));

function renderRootPage() {
  return render(
    <LanguageProvider>
      <HomePage />
    </LanguageProvider>,
  );
}

describe("root route personalized homepage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("renders the personalized onboarding modal at root", async () => {
    renderRootPage();

    // The homepage now opens the language + ticket onboarding on mount
    // (promoted from the former /new preview); the public board lives at /display.
    expect(await screen.findByText("Choose your language")).toBeInTheDocument();
  });

  it("skips the language step and opens at the ticket step when a session language exists", async () => {
    // A language chosen earlier this browser session is recorded here; the
    // homepage should not re-prompt for language, only for the ticket number.
    window.sessionStorage.setItem("display-language-session", "es");

    renderRootPage();

    // Ticket step renders, localized to the session language; the language gate
    // (Spanish: "Elige tu idioma") never appears.
    expect(await screen.findByPlaceholderText("Buscar boleto #")).toBeInTheDocument();
    expect(screen.queryByText("Elige tu idioma")).not.toBeInTheDocument();
  });

  it("does not render the public-board search controls at root", () => {
    renderRootPage();

    expect(screen.queryByLabelText("Search ticket number")).not.toBeInTheDocument();
  });

  it("keeps homepage chrome and bottom-nav order LTR for RTL languages", async () => {
    window.localStorage.setItem("display-language", "ar");

    renderRootPage();

    expect(document.querySelector("header[aria-label='Homepage controls']")).toHaveAttribute("dir", "ltr");
    await waitFor(() => {
      expect(document.querySelector("nav a[href='/display']")).toHaveTextContent("لوحة المعلومات");
    });

    const nav = document.querySelector("nav");
    expect(nav).toHaveAttribute("dir", "ltr");
    await waitFor(() => {
      expect(Array.from(document.querySelectorAll("nav a")).map((link) => link.getAttribute("href"))).toEqual([
        "/",
        "/display",
        "/inventory",
        "/arcade",
      ]);
    });
    expect(document.querySelector("nav a[href='/display'] span[dir='rtl']")).toBeInTheDocument();
  });
});
