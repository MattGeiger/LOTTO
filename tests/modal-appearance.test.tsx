// SPDX-License-Identifier: AGPL-3.0-or-later

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AppearancePreviewCard } from "@/components/appearance/appearance-preview-card";
import { ConfirmAction } from "@/components/confirm-action";

describe("shared modal and appearance presentation", () => {
  it("blurs the page behind confirmation dialogs", async () => {
    render(
      <ConfirmAction
        title="Confirm Lottery Reset"
        description="This cannot be undone."
        triggerLabel="Reset"
        onConfirm={vi.fn()}
      />,
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "Reset" }));

    expect(document.querySelector("[data-slot='alert-dialog-overlay']")).toHaveClass(
      "backdrop-blur-sm",
    );
  });

  it("shows live identity, queue, action, and protected-status samples", () => {
    render(<AppearancePreviewCard />);

    expect(screen.getByText("Appearance preview")).toBeInTheDocument();
    expect(screen.getByText("Now serving")).toBeInTheDocument();
    expect(screen.getByText("Served 17")).toHaveClass("ticket-served");
    expect(screen.getByText("Next up 58")).toHaveClass("ticket-upcoming");
    expect(screen.getByText("Primary action")).toHaveClass("bg-primary");
    expect(screen.getByText("Unclaimed")).toHaveClass(
      "bg-[var(--operational-warning-action-bg)]",
    );
    expect(screen.getByText("Returned")).toHaveClass(
      "bg-[var(--operational-danger-action-bg)]",
    );
  });
});
