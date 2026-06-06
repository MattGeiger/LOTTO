// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LanguageProvider } from "@/contexts/language-context";
import {
  LanguageSwitcher,
  LANGUAGE_SWITCHER_TRIGGER_ID,
} from "@/components/language-switcher";

describe("LanguageSwitcher", () => {
  it("uses a deterministic trigger id for hydration stability", () => {
    render(
      <LanguageProvider>
        <LanguageSwitcher />
      </LanguageProvider>,
    );

    expect(
      screen.getByRole("button", { name: /change language/i }),
    ).toHaveAttribute("id", LANGUAGE_SWITCHER_TRIGGER_ID);
  });
});
