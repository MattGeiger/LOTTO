// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageSettingsTab } from "@/components/translation/language-settings-tab";

const { runStagedTranslation, toastSuccess, toastError } = vi.hoisted(() => ({
  runStagedTranslation: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/lib/translation/run-translation", () => ({
  runStagedTranslation: (...args: unknown[]) => runStagedTranslation(...args),
}));

vi.mock("sonner", () => ({
  toast: { success: toastSuccess, error: toastError },
}));

const initialRows = [
  { name: "English", isEnabled: true, sortOrder: 0 },
  { name: "Spanish", isEnabled: true, sortOrder: 49 },
  { name: "Bosnian", isEnabled: false, sortOrder: 6 },
];

describe("LanguageSettingsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runStagedTranslation.mockImplementation(async (onProgress?: (value: unknown) => void) => {
      onProgress?.({ total: 4, done: 4, remaining: 0, failed: 0 });
      return { total: 4, done: 4, remaining: 0, failed: 0 };
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "PUT") {
          return new Response(
            JSON.stringify({
              languages: initialRows.map((row) =>
                row.name === "Bosnian" ? { ...row, isEnabled: true } : row,
              ),
            }),
            { status: 200 },
          );
        }
        return new Response(JSON.stringify({ languages: initialRows }), { status: 200 });
      }),
    );
  });

  it("automatically sweeps missing translations when a dynamic language is enabled", async () => {
    const user = userEvent.setup();
    render(<LanguageSettingsTab />);

    await user.click(await screen.findByRole("checkbox", { name: /Bosnian/i }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(runStagedTranslation).toHaveBeenCalledTimes(1));
    expect(toastSuccess).toHaveBeenCalledWith(
      "Language settings saved. Preparing the newly enabled languages now.",
    );
    expect(toastSuccess).toHaveBeenCalledWith(
      "Bosnian is translated and now available in client language menus.",
    );
    expect(toastError).not.toHaveBeenCalled();
  });

  it("keeps a language hidden and gives staff a recovery action when preparation fails", async () => {
    runStagedTranslation.mockResolvedValue({ total: 4, done: 3, remaining: 0, failed: 1 });
    const user = userEvent.setup();
    render(<LanguageSettingsTab />);

    await user.click(await screen.findByRole("checkbox", { name: /Bosnian/i }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        "Bosnian remains hidden because 1 translation could not be completed. " +
          "Review the failed items in Translation Management, then retry them.",
      );
    });
  });
});
