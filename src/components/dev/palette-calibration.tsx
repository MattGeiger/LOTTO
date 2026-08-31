// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

"use client";

/**
 * Development-only Tailwind palette calibration, ported from FEED.
 *
 * The side sheet intentionally leaves the page visible. Picks are session-only,
 * apply to core and Arcade chrome immediately, and export as the flat JSON map
 * used by FEED's calibration workflow.
 */

import * as React from "react";
import { Check, Download, RotateCcw, SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  BUILT_IN_PALETTE_ROWS,
  type BuiltInPaletteRow,
  type BuiltInPaletteScope,
} from "@/lib/brand-theme/built-in-palette";
import {
  isTailwindPaletteName,
  paletteCandidates,
  paletteColor,
  paletteCss,
  paletteSrgbCss,
} from "@/lib/brand-theme/palette";
import {
  TAILWIND_PALETTE,
  TAILWIND_PALETTE_VERSION,
} from "@/lib/brand-theme/palette.generated";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "lotto.paletteCalibration";
const STYLE_ID = "lotto-palette-calibration-overrides";
const DATALIST_ID = "lotto-palette-calibration-names";

export const normalizePaletteCalibrationPicks = (
  value: unknown,
): Record<string, string> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  return Object.fromEntries(
    BUILT_IN_PALETTE_ROWS.flatMap((row) => {
      const pick = source[row.key];
      return typeof pick === "string" &&
        pick !== row.chosen &&
        isTailwindPaletteName(pick)
        ? [[row.key, pick] as const]
        : [];
    }),
  );
};

export type PaletteCalibrationSort = "order" | "drift-desc" | "drift-asc";

export const sortPaletteRows = <T,>(
  rows: readonly T[],
  mode: PaletteCalibrationSort,
  driftOf: (row: T) => number,
): T[] => {
  if (mode === "order") return [...rows];
  const direction = mode === "drift-desc" ? -1 : 1;
  return [...rows].sort((left, right) => {
    const leftDrift = driftOf(left);
    const rightDrift = driftOf(right);
    if (Number.isNaN(leftDrift) && Number.isNaN(rightDrift)) return 0;
    if (Number.isNaN(leftDrift)) return 1;
    if (Number.isNaN(rightDrift)) return -1;
    return (leftDrift - rightDrift) * direction;
  });
};

const perceptualDrift = (leftName: string, rightName: string): number => {
  const left = paletteColor(leftName);
  const right = paletteColor(rightName);
  const toLab = ({ l, c, h }: typeof left) => {
    const radians = (h * Math.PI) / 180;
    return [l, c * Math.cos(radians), c * Math.sin(radians)] as const;
  };
  const [leftL, leftA, leftB] = toLab(left);
  const [rightL, rightA, rightB] = toLab(right);
  return Math.hypot(leftL - rightL, leftA - rightA, leftB - rightB);
};

const selectorFor = (scope: BuiltInPaletteScope) =>
  scope === "light"
    ? "html:not(.dark):not(.hi-viz)"
    : "html.dark:not(.hi-viz)";

export const buildPaletteCalibrationCss = (
  picks: Readonly<Record<string, string>>,
): string => {
  const baseline: Record<BuiltInPaletteScope, string[]> = { light: [], dark: [] };
  const wideGamut: Record<BuiltInPaletteScope, string[]> = { light: [], dark: [] };

  for (const row of BUILT_IN_PALETTE_ROWS) {
    const pick = picks[row.key];
    if (!pick || pick === row.chosen || !isTailwindPaletteName(pick)) continue;
    baseline[row.scope].push(`  --${row.token}: ${paletteSrgbCss(pick)};`);
    wideGamut[row.scope].push(`    --${row.token}: ${paletteCss(pick)};`);
  }

  const blocks = (["light", "dark"] as const)
    .filter((scope) => baseline[scope].length > 0)
    .map(
      (scope) =>
        `${selectorFor(scope)} {\n${baseline[scope].join("\n")}\n}`,
    );
  const supportsBlocks = (["light", "dark"] as const)
    .filter((scope) => wideGamut[scope].length > 0)
    .map(
      (scope) =>
        `  ${selectorFor(scope)} {\n${wideGamut[scope].join("\n")}\n  }`,
    );

  if (supportsBlocks.length > 0) {
    blocks.push(
      `@supports (color: oklch(0 0 0)) {\n${supportsBlocks.join("\n")}\n}`,
    );
  }
  return blocks.join("\n\n");
};

function CustomPaletteEntry({
  value,
  onChoose,
}: {
  value: string;
  onChoose: (name: string) => void;
}) {
  const [draft, setDraft] = React.useState("");
  const normalized = draft.trim().toLowerCase();
  const valid = normalized.length > 0 && isTailwindPaletteName(normalized);

  const commit = () => {
    if (!valid) return;
    onChoose(normalized);
    setDraft("");
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
        }}
        list={DATALIST_ID}
        spellCheck={false}
        placeholder="Type a palette name, e.g. sky-100"
        aria-label={`Custom Tailwind palette value; current value ${value}`}
        aria-invalid={normalized.length > 0 && !valid}
        className={cn(
          "h-8 flex-1 bg-background font-mono text-xs",
          normalized.length > 0 && !valid && "border-destructive",
        )}
      />
      <span
        aria-hidden="true"
        className="size-8 shrink-0 rounded border"
        style={{ background: valid ? paletteSrgbCss(normalized) : "transparent" }}
      />
      <Button size="sm" variant="outline" onClick={commit} disabled={!valid}>
        Use
      </Button>
    </div>
  );
}

export function PaletteCalibration() {
  const [open, setOpen] = React.useState(false);
  const [picks, setPicks] = React.useState<Record<string, string>>({});
  const [filter, setFilter] = React.useState("");
  const [onlyChanged, setOnlyChanged] = React.useState(false);
  const [sort, setSort] = React.useState<PaletteCalibrationSort>("order");

  React.useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) setPicks(normalizePaletteCalibrationPicks(JSON.parse(saved)));
    } catch {
      // Private browsing can disable storage; live calibration still works.
    }
  }, []);

  React.useEffect(() => {
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = buildPaletteCalibrationCss(picks);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(picks));
    } catch {
      // Session persistence is a convenience, not a prerequisite.
    }
  }, [picks]);

  const choose = React.useCallback((row: BuiltInPaletteRow, name: string) => {
    setPicks((current) => {
      const next = { ...current };
      if (name === row.chosen) delete next[row.key];
      else next[row.key] = name;
      return next;
    });
  }, []);

  const activeDrift = React.useCallback(
    (row: BuiltInPaletteRow) =>
      perceptualDrift(row.chosen, picks[row.key] ?? row.chosen),
    [picks],
  );

  const visibleRows = React.useMemo(() => {
    const query = filter.trim().toLowerCase();
    const rows = BUILT_IN_PALETTE_ROWS.filter((row) => {
      if (onlyChanged && !picks[row.key]) return false;
      return !query || row.key.toLowerCase().includes(query);
    });
    return sortPaletteRows(rows, sort, activeDrift);
  }, [activeDrift, filter, onlyChanged, picks, sort]);

  const exportJson = () => {
    const output = Object.fromEntries(
      Object.entries(picks).filter(([key, value]) =>
        BUILT_IN_PALETTE_ROWS.some(
          (row) => row.key === key && row.chosen !== value && isTailwindPaletteName(value),
        ),
      ),
    );
    const blob = new Blob([`${JSON.stringify(output, null, 2)}\n`], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "lotto-palette-picks.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const changed = Object.keys(picks).length;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Open palette calibration"
        className="fixed right-3 top-[max(env(safe-area-inset-top),0.75rem)] z-[100] bg-card/95 shadow-md"
      >
        <SlidersHorizontal aria-hidden="true" />
        Palette{changed > 0 ? ` (${changed})` : ""}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex flex-col gap-4">
          <SheetHeader>
            <SheetTitle>Palette calibration</SheetTitle>
            <SheetDescription>
              Pick Tailwind v{TAILWIND_PALETTE_VERSION} values for the compiled
              appearance. Changes apply live to core and Arcade chrome and last
              for this browser session only.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter tokens…"
              className="h-8 min-w-36 flex-1 bg-background"
            />
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as PaletteCalibrationSort)}
              aria-label="Sort palette tokens"
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="order">Source order</option>
              <option value="drift-desc">Deviation: high to low</option>
              <option value="drift-asc">Deviation: low to high</option>
            </select>
            <Button
              variant={onlyChanged ? "default" : "outline"}
              size="sm"
              onClick={() => setOnlyChanged((current) => !current)}
            >
              Changed{changed > 0 ? ` (${changed})` : ""}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPicks({})}
              disabled={changed === 0}
            >
              <RotateCcw aria-hidden="true" />
              Reset
            </Button>
            <Button size="sm" onClick={exportJson} disabled={changed === 0}>
              <Download aria-hidden="true" />
              Export
            </Button>
          </div>

          <ScrollArea className="min-h-0 flex-1 pr-3">
            <div className="space-y-4 pb-6">
              {visibleRows.map((row) => {
                const active = picks[row.key] ?? row.chosen;
                const suggestions = paletteCandidates(
                  paletteColor(row.chosen),
                  "any",
                  8,
                ).map(({ entry }) => entry);
                const activeEntry = TAILWIND_PALETTE.find(
                  (entry) => entry.name === active,
                );
                if (
                  activeEntry &&
                  !suggestions.some((entry) => entry.name === activeEntry.name)
                ) {
                  suggestions.unshift(activeEntry);
                }

                return (
                  <section key={row.key} className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs">{row.key}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {active} · drift {activeDrift(row).toFixed(4)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {row.scope}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {suggestions.map((entry) => {
                        const selected = entry.name === active;
                        return (
                          <button
                            key={entry.name}
                            type="button"
                            onClick={() => choose(row, entry.name)}
                            aria-label={`${row.key}: ${entry.name}`}
                            aria-pressed={selected}
                            title={entry.name}
                            className={cn(
                              "relative size-8 rounded border transition-transform hover:scale-110",
                              selected && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                            )}
                            style={{ background: paletteSrgbCss(entry.name) }}
                          >
                            {selected ? (
                              <Check
                                aria-hidden="true"
                                className="absolute inset-0 m-auto size-4 text-white drop-shadow-[0_1px_1px_rgb(0_0_0)]"
                              />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>

                    <CustomPaletteEntry
                      value={active}
                      onChoose={(name) => choose(row, name)}
                    />
                  </section>
                );
              })}
              {visibleRows.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No tokens match that filter.
                </p>
              ) : null}
            </div>
          </ScrollArea>

          <datalist id={DATALIST_ID}>
            {TAILWIND_PALETTE.map((entry) => (
              <option key={entry.name} value={entry.name} />
            ))}
          </datalist>
        </SheetContent>
      </Sheet>
    </>
  );
}
