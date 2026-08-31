// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ArcadeLanguageSwitcher } from "@/arcade/components/arcade-language-switcher";

const setLanguage = vi.fn();
const refreshAvailableLanguages = vi.fn(async () => {});
const trigger = vi.fn();
let currentLanguage = "bs";
let availableLanguages = [
  { code: "en", label: "English", ready: true },
  { code: "es", label: "Español", ready: true },
  { code: "bs", label: "Bosanski", ready: true },
];

vi.mock("@/contexts/language-context", () => ({
  useLanguage: () => ({
    language: currentLanguage,
    setLanguage,
    t: (key: string) => (key === "language" ? "Language" : key),
    availableLanguages,
    refreshAvailableLanguages,
  }),
}));

vi.mock("@/components/haptics-provider", () => ({
  useAppHaptics: () => ({ trigger }),
}));

vi.mock("@/arcade/ui/8bit", () => ({
  Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} />,
}));

describe("ArcadeLanguageSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentLanguage = "bs";
    availableLanguages = [
      { code: "en", label: "English", ready: true },
      { code: "es", label: "Español", ready: true },
      { code: "bs", label: "Bosanski", ready: true },
    ];
  });

  it("uses the shared catalog label for a dynamic active language", () => {
    render(<ArcadeLanguageSwitcher />);

    expect(screen.getByRole("button", { name: "Bosanski" })).toBeInTheDocument();
    expect(refreshAvailableLanguages).not.toHaveBeenCalled();
  });

  it("refreshes the catalog before offering and selecting a dynamic language", async () => {
    currentLanguage = "en";
    availableLanguages = [{ code: "en", label: "English", ready: true }];
    refreshAvailableLanguages.mockImplementationOnce(async () => {
      availableLanguages = [
        { code: "en", label: "English", ready: true },
        { code: "bs", label: "Bosanski", ready: true },
      ];
    });
    render(<ArcadeLanguageSwitcher />);

    fireEvent.click(screen.getByRole("button", { name: "English" }));
    await waitFor(() => expect(refreshAvailableLanguages).toHaveBeenCalledTimes(1));

    fireEvent.click(await screen.findByRole("button", { name: "Bosanski" }));
    expect(setLanguage).toHaveBeenCalledWith("bs");
    expect(trigger).toHaveBeenCalledWith("uiSelect");
  });

  it("does not poll for languages before the visitor opens the menu", () => {
    currentLanguage = "en";
    availableLanguages = [{ code: "en", label: "English", ready: true }];
    render(<ArcadeLanguageSwitcher />);

    expect(screen.getByRole("button", { name: "English" })).toBeInTheDocument();
    expect(refreshAvailableLanguages).not.toHaveBeenCalled();
  });

  it("masks the bottom fifth while more activated languages remain below the fold", async () => {
    currentLanguage = "en";
    availableLanguages = Array.from({ length: 11 }, (_, index) => ({
      code: index === 0 ? "en" : `language-${index}`,
      label: index === 0 ? "English" : `Language ${index}`,
      ready: true,
    }));
    render(<ArcadeLanguageSwitcher />);

    fireEvent.click(screen.getByRole("button", { name: "English" }));
    const scrollRegion = await screen.findByTestId("arcade-language-scroll-region");
    Object.defineProperties(scrollRegion, {
      clientHeight: { configurable: true, value: 320 },
      scrollHeight: { configurable: true, value: 448 },
      scrollTop: { configurable: true, writable: true, value: 0 },
    });
    fireEvent.scroll(scrollRegion);

    expect(screen.getByTestId("arcade-language-scroll-cue")).toBeInTheDocument();

    scrollRegion.scrollTop = 128;
    fireEvent.scroll(scrollRegion);
    expect(screen.queryByTestId("arcade-language-scroll-cue")).not.toBeInTheDocument();
  });
});
