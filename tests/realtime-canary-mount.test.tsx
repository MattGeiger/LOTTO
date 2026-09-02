// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import RealtimeCanaryMount from "@/components/realtime-canary-mount";
import { defaultState } from "@/lib/state-types";

vi.mock("@/components/realtime-canary-observer", () => ({
  default: ({ polledRevision }: { polledRevision: number | null }) => (
    <div data-testid="mounted-realtime-observer" data-revision={polledRevision ?? undefined} />
  ),
}));

const config = {
  agencyId: "william-temple-house",
  eventsUrl:
    "wss://lotto-realtime-beta.et2-geiger.workers.dev/v1/agencies/william-temple-house/events",
};

describe("RealtimeCanaryMount", () => {
  afterEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("loads the observer only for the exact opted-in browser URL", async () => {
    window.history.replaceState({}, "", "/inventory?realtime=observe");
    render(
      <RealtimeCanaryMount
        config={config}
        polledState={structuredClone(defaultState)}
        polledRevision={16}
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("mounted-realtime-observer")).toHaveAttribute(
        "data-revision",
        "16",
      );
    });
  });

  it("does not load for the control URL or when server configuration is absent", () => {
    const { rerender } = render(
      <RealtimeCanaryMount
        config={config}
        polledState={structuredClone(defaultState)}
        polledRevision={16}
      />,
    );
    expect(screen.queryByTestId("mounted-realtime-observer")).not.toBeInTheDocument();

    window.history.replaceState({}, "", "/?realtime=observe");
    rerender(
      <RealtimeCanaryMount
        config={null}
        polledState={structuredClone(defaultState)}
        polledRevision={16}
      />,
    );
    expect(screen.queryByTestId("mounted-realtime-observer")).not.toBeInTheDocument();
  });
});
