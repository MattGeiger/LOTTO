// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  AnimateIcon,
  useAnimateIconContext,
} from "@/components/animate-ui/icons/icon";

function ActiveProbe({ onActive }: { onActive: (active: boolean) => void }) {
  const { active } = useAnimateIconContext();

  React.useEffect(() => {
    onActive(Boolean(active));
  }, [active, onActive]);

  return <span>Icon probe</span>;
}

describe("AnimateIcon hover replay", () => {
  it("replays hover animation even when the icon is already active from mount animation", async () => {
    const user = userEvent.setup();
    const activeStates: boolean[] = [];
    const handleActive = (active: boolean) => activeStates.push(active);

    render(
      <AnimateIcon data-testid="icon-trigger" animate animateOnHover>
        <ActiveProbe onActive={handleActive} />
      </AnimateIcon>,
    );

    await waitFor(() => {
      expect(activeStates.at(-1)).toBe(true);
    });

    activeStates.length = 0;
    await user.hover(screen.getByTestId("icon-trigger"));

    await waitFor(() => {
      expect(activeStates).toEqual([false, true]);
    });
  });
});
