// SPDX-License-Identifier: AGPL-3.0-or-later

import { describe, expect, it } from "vitest";

import {
  buildPaletteCalibrationCss,
  normalizePaletteCalibrationPicks,
  sortPaletteRows,
} from "@/components/dev/palette-calibration";

describe("palette calibration", () => {
  it("emits an sRGB baseline and gated OKLCH enhancement in exclusive scopes", () => {
    const css = buildPaletteCalibrationCss({
      "light --primary": "teal-600",
      "dark --primary": "amber-300",
    });

    expect(css).toContain("html:not(.dark):not(.hi-viz)");
    expect(css).toContain("html.dark:not(.hi-viz)");
    expect(css).toContain("--primary: rgb(");
    expect(css).toContain("@supports (color: oklch(0 0 0))");
    expect(css).toContain("--primary: oklch(");
    expect(css.indexOf("rgb(")).toBeLessThan(css.indexOf("@supports"));
  });

  it("ignores unknown palette names and unchanged picks", () => {
    expect(
      buildPaletteCalibrationCss({
        "light --primary": "sky-700",
        "dark --primary": "not-a-tailwind-color",
      }),
    ).toBe("");
  });

  it("sorts invalid drift values last in either direction", () => {
    const rows = ["small", "invalid", "large"];
    const drift = (row: string) =>
      row === "invalid" ? Number.NaN : row === "small" ? 0.1 : 0.9;

    expect(sortPaletteRows(rows, "drift-desc", drift)).toEqual([
      "large",
      "small",
      "invalid",
    ]);
    expect(sortPaletteRows(rows, "drift-asc", drift)).toEqual([
      "small",
      "large",
      "invalid",
    ]);
  });

  it("drops corrupt, unknown, and unchanged session picks", () => {
    expect(
      normalizePaletteCalibrationPicks({
        "light --primary": "teal-600",
        "dark --primary": "not-a-color",
        "light --card": "slate-50",
        "unknown --token": "red-500",
      }),
    ).toEqual({ "light --primary": "teal-600" });
  });
});
