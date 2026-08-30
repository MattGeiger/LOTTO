// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { scratchConfig } from "@/components/appearance/draft";
import { ColorsStep } from "@/components/appearance/steps/ColorsStep";
import type { AppearanceDraftState } from "@/components/appearance/types";
import { extractPaletteFromImage } from "@/components/appearance/palette-extract";

const toastError = vi.fn();
const toastSuccess = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}));

vi.mock("@/components/appearance/palette-extract", () => ({
  extractPaletteFromImage: vi.fn(),
}));

function Harness() {
  const [draft, setDraft] = React.useState<AppearanceDraftState>({
    id: "custom",
    config: scratchConfig(),
    startSource: "scratch",
  });
  return (
    <ColorsStep
      draft={draft}
      onChange={(updates) => setDraft((current) => ({ ...current, ...updates }))}
      templates={[]}
      isLoading={false}
      animateIntro={false}
    />
  );
}

describe("Appearance color-story parity", () => {
  beforeEach(() => {
    toastError.mockReset();
    toastSuccess.mockReset();
    vi.mocked(extractPaletteFromImage).mockReset();
  });

  it("uses FEED's fixed-slot add/clear flow without shifting roles", async () => {
    render(<Harness />);

    expect(screen.getByText(/Main color — Buttons/)).toBeInTheDocument();
    expect(screen.queryByText(/Accent — Hover/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add color" }));
    expect(await screen.findByText(/Accent — Hover/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Clear / })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Clear Accent" }));
    await waitFor(() =>
      expect(screen.queryByText(/Accent — Hover/)).not.toBeInTheDocument(),
    );
    expect(screen.getByText(/Main color — Buttons/)).toBeInTheDocument();
  });

  it("extracts a five-role story and exposes nearby families in the picker", async () => {
    vi.mocked(extractPaletteFromImage).mockResolvedValue([
      { color: { l: 0.5, c: 0.18, h: 270 }, population: 1200 },
      { color: { l: 0.65, c: 0.15, h: 145 }, population: 900 },
      { color: { l: 0.55, c: 0.13, h: 210 }, population: 600 },
      { color: { l: 0.2, c: 0.01, h: 250 }, population: 500 },
      { color: { l: 0.96, c: 0.01, h: 250 }, population: 1000 },
    ]);

    render(<Harness />);
    fireEvent.click(
      screen.getByRole("button", { name: "Extract from light logo" }),
    );

    expect(await screen.findByText(/Dark anchor — Dark-mode/)).toBeInTheDocument();
    expect(screen.getByText(/Light anchor — Light-mode/)).toBeInTheDocument();
    expect(toastSuccess).toHaveBeenCalledWith(
      "Brand color story extracted from the light logo.",
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /Main color — choose a Tailwind color/,
      }),
    );
    expect(await screen.findByText("Closest to your logo color")).toBeInTheDocument();
    expect(screen.getByLabelText("Search the palette")).toBeInTheDocument();
    expect(screen.getByLabelText("Or pick a family and weight")).toBeInTheDocument();
  });
});
