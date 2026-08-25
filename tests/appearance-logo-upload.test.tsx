// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { scratchConfig } from "@/components/appearance/draft";
import { LogosStep } from "@/components/appearance/steps/LogosStep";

const toastError = vi.fn();
const toastSuccess = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}));

describe("Appearance logo upload interaction", () => {
  beforeEach(() => {
    toastError.mockReset();
    toastSuccess.mockReset();
    vi.restoreAllMocks();
  });

  it("opens the native picker from the first real button press", () => {
    const inputClick = vi
      .spyOn(HTMLInputElement.prototype, "click")
      .mockImplementation(() => undefined);

    render(
      <LogosStep
        draft={{ id: "custom", config: scratchConfig(), startSource: "scratch" }}
        onChange={vi.fn()}
        isLoading={false}
        animateIntro={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Upload light-mode logo" }));

    expect(inputClick).toHaveBeenCalledTimes(1);
  });

  it("uploads and applies the first selected file", async () => {
    const onChange = vi.fn();
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          asset: {
            src: "https://store.public.blob.vercel-storage.com/brand-assets/logo.svg",
            width: 640,
            height: 160,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <LogosStep
        draft={{ id: "custom", config: scratchConfig(), startSource: "scratch" }}
        onChange={onChange}
        isLoading={false}
        animateIntro={false}
      />,
    );

    const input = document.querySelector<HTMLInputElement>("#upload-logo-light");
    expect(input).not.toBeNull();
    fireEvent.change(input!, {
      target: {
        files: [new File(["svg"], "logo.svg", { type: "image/svg+xml" })],
      },
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(onChange.mock.calls[0][0].config.logo.lightSrc).toBe(
      "https://store.public.blob.vercel-storage.com/brand-assets/logo.svg",
    );
    expect(toastSuccess).toHaveBeenCalledWith("Light-mode logo uploaded.");
    expect(toastError).not.toHaveBeenCalled();
  });
});
