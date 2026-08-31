// SPDX-License-Identifier: AGPL-3.0-or-later

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const arcadeCss = readFileSync(
  path.join(process.cwd(), "src/arcade/styles/arcade.css"),
  "utf8",
);

describe("Arcade appearance bridge", () => {
  it("maps shared identity and chrome roles into Arcade", () => {
    expect(arcadeCss).toContain("--arcade-bg: var(--background)");
    expect(arcadeCss).toContain("--arcade-panel: var(--card)");
    expect(arcadeCss).toContain("--arcade-wall: var(--primary)");
    expect(arcadeCss).toContain("--arcade-neon: var(--accent)");
    expect(arcadeCss).toContain("--arcade-serving-border: var(--ticket-serving-border)");
    expect(arcadeCss).toContain("--arcade-action-text: var(--primary-foreground)");
  });

  it("does not remap game-art colors or protected queue statuses", () => {
    const bridge = arcadeCss.slice(
      arcadeCss.indexOf("/* Appearance bridge:"),
      arcadeCss.indexOf(".arcade-scope {", arcadeCss.indexOf("html.light .arcade-scope") + 1),
    );

    expect(bridge).not.toMatch(/--arcade-(snake-head|snake-body|pellet|brick-ball):/);
    expect(bridge).not.toMatch(/--status-|--gradient-status-|--ticket-(unclaimed|returned)/);
  });
});
