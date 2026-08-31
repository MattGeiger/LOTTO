// SPDX-License-Identifier: AGPL-3.0-or-later

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Arcade standalone controls", () => {
  it("preserves a 32px home-indicator lane for every game dock", () => {
    const css = readFileSync(
      path.join(process.cwd(), "src/arcade/styles/arcade.css"),
      "utf8",
    );
    const standaloneRules = css.slice(
      css.indexOf("@media (display-mode: standalone)"),
      css.indexOf(".arcade-pixel-grid"),
    );

    expect(standaloneRules).toContain(".arcade-snake-control-dock");
    expect(standaloneRules).toContain(".arcade-brick-control-dock");
    expect(standaloneRules).toContain(".arcade-zombie-control-dock");
    expect(standaloneRules.match(/\+ 2rem/g)).toHaveLength(2);
  });
});
