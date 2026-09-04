// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const guidesDir = join(repoRoot, "docs", "user-guides");
const publicDir = join(repoRoot, "public");
const helpImagePattern = /!\[[^\]]*\]\((\/help-screenshots\/[^)]+\.(?:png|webp))\)/g;

describe("Help screenshot assets", () => {
  it("ships every referenced image with its automatic dark-mode partner", () => {
    const missing: string[] = [];

    for (const filename of readdirSync(guidesDir).filter((name) => name.endsWith(".md"))) {
      const guide = readFileSync(join(guidesDir, filename), "utf8");

      for (const match of guide.matchAll(helpImagePattern)) {
        const publicPath = match[1];
        const lightPath = join(publicDir, publicPath.slice(1));
        const darkPath = lightPath.replace(/(\.(?:png|webp))$/, "-dark$1");

        if (!existsSync(lightPath)) missing.push(`${filename}: ${publicPath}`);
        if (!existsSync(darkPath)) {
          missing.push(`${filename}: ${publicPath.replace(/(\.(?:png|webp))$/, "-dark$1")}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });
});
