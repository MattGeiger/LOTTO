// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

/** Palette-backed roles in LOTTO's compiled William Temple House appearance. */
export type BuiltInPaletteScope = "light" | "dark";

export type BuiltInPaletteRow = {
  key: string;
  scope: BuiltInPaletteScope;
  token: string;
  chosen: string;
};

const rows = (
  scope: BuiltInPaletteScope,
  values: Record<string, string>,
): BuiltInPaletteRow[] =>
  Object.entries(values).map(([token, chosen]) => ({
    key: `${scope} --${token}`,
    scope,
    token,
    chosen,
  }));

export const BUILT_IN_PALETTE_ROWS: readonly BuiltInPaletteRow[] = [
  ...rows("light", {
    foreground: "zinc-900",
    card: "slate-50",
    "card-foreground": "zinc-800",
    popover: "slate-50",
    "popover-foreground": "slate-900",
    primary: "sky-700",
    secondary: "zinc-100",
    "secondary-foreground": "zinc-900",
    muted: "mist-100",
    "muted-foreground": "gray-500",
    accent: "teal-100",
    "accent-foreground": "zinc-800",
    border: "slate-300",
    input: "sky-600",
    ring: "sky-700",
    sidebar: "slate-50",
    "sidebar-foreground": "zinc-900",
    "sidebar-primary": "sky-700",
    "sidebar-accent": "sky-100",
    "sidebar-accent-foreground": "zinc-800",
    "sidebar-border": "slate-300",
    "sidebar-ring": "sky-700",
  }),
  ...rows("dark", {
    card: "slate-900",
    popover: "gray-950",
    primary: "yellow-300",
    "primary-foreground": "sky-700",
    secondary: "zinc-800",
    "secondary-foreground": "zinc-50",
    muted: "slate-800",
    "muted-foreground": "gray-400",
    accent: "gray-800",
    "accent-foreground": "mauve-100",
    border: "sky-700",
    input: "sky-700",
    ring: "gray-800",
    sidebar: "slate-900",
    "sidebar-primary": "gray-800",
    "sidebar-accent": "blue-900",
    "sidebar-border": "blue-900",
    "sidebar-ring": "gray-800",
  }),
];
