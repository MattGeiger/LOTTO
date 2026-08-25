// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LoginExperience } from "@/components/login-experience";

const { signIn } = vi.hoisted(() => ({ signIn: vi.fn() }));

vi.mock("next-auth/react", () => ({ signIn }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

describe("LoginExperience", () => {
  beforeEach(() => {
    signIn.mockReset();
  });

  it("presents the scanner-safe Magic Link flow first and Verification Code second", () => {
    render(<LoginExperience />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent?.trim())).toEqual([
      "Magic Link",
      "Verification Code",
    ]);
    expect(tabs[0]).toHaveAttribute("data-state", "active");
    expect(screen.getByRole("button", { name: "Send magic link" })).toBeVisible();
  });

  it("keeps a failed verification-code request on the email step", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Email address is not authorized." }),
      }),
    );

    render(<LoginExperience />);
    await user.click(screen.getByRole("tab", { name: "Verification Code" }));
    await user.type(
      screen.getByLabelText("Work email", { selector: "#email-otp" }),
      "person@example.org",
    );
    await user.click(screen.getByRole("button", { name: "Send 6-digit code" }));

    expect(
      (await screen.findAllByText("Email address is not authorized.")).some(
        (element) => !element.closest("[hidden]"),
      ),
    ).toBe(true);
    expect(screen.getByRole("button", { name: "Send 6-digit code" })).toBeVisible();
    expect(screen.queryByText(/Code sent to/)).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("shows code entry only after the server confirms delivery", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      }),
    );

    render(<LoginExperience />);
    await user.click(screen.getByRole("tab", { name: "Verification Code" }));
    await user.type(
      screen.getByLabelText("Work email", { selector: "#email-otp" }),
      "staff@williamtemple.org",
    );
    await user.click(screen.getByRole("button", { name: "Send 6-digit code" }));

    expect(await screen.findByText("Code sent to staff@williamtemple.org")).toBeVisible();
    expect(screen.getByText("The code expires in 10 minutes.")).toBeVisible();
    vi.unstubAllGlobals();
  });

  it("reports Magic Link delivery failures inline", async () => {
    signIn.mockResolvedValue({ error: "EmailSignInError" });
    render(<LoginExperience />);

    fireEvent.change(screen.getByLabelText("Work email", { selector: "#email-magic" }), {
      target: { value: "staff@williamtemple.org" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send magic link" }));

    await waitFor(() =>
      expect(
        screen.getAllByText(
          "LOTTO could not send the sign-in link. Check the email and try again.",
        ).some((element) => !element.closest("[hidden]")),
      ).toBe(true),
    );
  });
});
