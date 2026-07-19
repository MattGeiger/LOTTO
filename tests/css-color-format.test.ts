// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const collectCssFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const resolved = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectCssFiles(resolved);
    }
    return entry.isFile() && entry.name.endsWith(".css") ? [resolved] : [];
  });

const stripComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "");

describe("CSS color authoring format", () => {
  it("uses OKLCH for every authored CSS color literal", () => {
    const cssFiles = collectCssFiles(path.resolve(process.cwd(), "src"));
    const violations = cssFiles.flatMap((filePath) => {
      const source = stripComments(readFileSync(filePath, "utf8"));
      const lines = source.split("\n");
      return lines.flatMap((line, index) => {
        const hasLegacyFunction = /\b(?:rgb|rgba|hsl|hsla)\(/i.test(line);
        const hasHex = /#[0-9a-f]{3,8}\b/i.test(line);
        const hasNamedBlackOrWhite = /(?<![\w-])(?:black|white)(?![\w-])/i.test(line);
        return hasLegacyFunction || hasHex || hasNamedBlackOrWhite
          ? [`${path.relative(process.cwd(), filePath)}:${index + 1}: ${line.trim()}`]
          : [];
      });
    });

    expect(violations).toEqual([]);
  });
});
