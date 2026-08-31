// SPDX-License-Identifier: AGPL-3.0-or-later

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) =>
  readFileSync(path.join(process.cwd(), file), "utf8");

describe("legacy-safe active navigation highlight", () => {
  it("consumes a pre-alpha theme token instead of runtime slash opacity", () => {
    const navigation = read("src/components/navigation/bottom-tab-bar.tsx");

    expect(navigation).toContain("bg-[var(--nav-active-background)]");
    expect(navigation).not.toContain("bg-primary/");
  });

  it("defines and derives the token in every appearance scope", () => {
    const compiled = read("src/app/styles/brands/william-temple-house.css");
    const highVisibility = read("src/app/styles/shared/high-visibility.css");
    const derivation = read("src/lib/brand-theme/derive.ts");

    expect(compiled.match(/--nav-active-background:/g)).toHaveLength(2);
    expect(highVisibility.match(/--nav-active-background:/g)).toHaveLength(2);
    expect(derivation.match(/"nav-active-background":/g)).toHaveLength(4);
  });
});
