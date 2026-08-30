// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const themePath = resolve(repositoryRoot, "node_modules/tailwindcss/theme.css");
const packagePath = resolve(repositoryRoot, "node_modules/tailwindcss/package.json");
const outputPath = resolve(repositoryRoot, "src/lib/brand-theme/palette.generated.ts");

const entryPattern =
  /--color-([a-z]+)-(\d+):\s*oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+|none)\)/g;

const neutralFamilies = [
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "mauve",
  "olive",
  "mist",
  "taupe",
];

export function readTailwindPalette() {
  const css = readFileSync(themePath, "utf8");
  const entries = [];
  for (const match of css.matchAll(entryPattern)) {
    const [, family, stop, lightness, chroma, hue] = match;
    entries.push({
      name: `${family}-${stop}`,
      family,
      stop: Number(stop),
      l: Number(lightness) / 100,
      c: Number(chroma),
      h: hue === "none" ? 0 : Number(hue),
    });
  }
  if (entries.length < 280) {
    throw new Error(`Only ${entries.length} Tailwind colors were parsed; expected the full v4 palette.`);
  }
  return entries;
}

export function renderBrandPalette() {
  const version = JSON.parse(readFileSync(packagePath, "utf8")).version;
  const entries = readTailwindPalette();
  const rows = entries.map((entry) => `  ${JSON.stringify(entry)},`).join("\n");
  const neutrals = neutralFamilies.map((family) => `  ${JSON.stringify(family)},`).join("\n");
  return `// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

/**
 * GENERATED FILE — do not edit by hand.
 * Run \`npm run generate:brand-palette\` after changing Tailwind.
 * Source: tailwindcss ${version} theme.css.
 */

export const TAILWIND_PALETTE_VERSION = ${JSON.stringify(version)} as const;

export type TailwindPaletteEntry = {
  name: string;
  family: string;
  stop: number;
  l: number;
  c: number;
  h: number;
};

export const TAILWIND_NEUTRAL_FAMILIES = [
${neutrals}
] as const;

export const TAILWIND_PALETTE: readonly TailwindPaletteEntry[] = [
${rows}
];
`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeFileSync(outputPath, renderBrandPalette(), "utf8");
  console.log(`Wrote ${outputPath}`);
}
