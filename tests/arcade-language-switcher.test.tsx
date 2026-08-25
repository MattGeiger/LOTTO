// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ArcadeLanguageSwitcher } from "@/arcade/components/arcade-language-switcher";

const setLanguage = vi.fn();
const ensureAvailableLanguagesLoaded = vi.fn();
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
    ensureAvailableLanguagesLoaded,
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
  });

  it("offers dynamic languages and selects them through the shared context", () => {
    currentLanguage = "en";
    render(<ArcadeLanguageSwitcher />);

    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(ensureAvailableLanguagesLoaded).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Bosanski" }));
    expect(setLanguage).toHaveBeenCalledWith("bs");
    expect(trigger).toHaveBeenCalledWith("uiSelect");
  });

  it("loads the shared catalog when a persisted dynamic language is not yet listed", () => {
    availableLanguages = [{ code: "en", label: "English", ready: true }];
    render(<ArcadeLanguageSwitcher />);

    expect(screen.getByRole("button", { name: "bs" })).toBeInTheDocument();
    expect(ensureAvailableLanguagesLoaded).toHaveBeenCalledTimes(1);
  });
});
