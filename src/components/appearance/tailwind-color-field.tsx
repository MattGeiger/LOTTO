// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Matt Geiger, Temple Consulting, LLC.

"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  TAILWIND_PALETTE,
  type TailwindPaletteEntry,
} from "@/lib/brand-theme/palette.generated";
import { paletteSrgbCss } from "@/lib/brand-theme/palette";
import { cn } from "@/lib/utils";

const STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const byName = new Map(TAILWIND_PALETTE.map((entry) => [entry.name, entry]));
const families = [...new Set(TAILWIND_PALETTE.map((entry) => entry.family))];

export function TailwindColorField({
  value,
  onSelect,
  disabled,
  label,
}: {
  value: string;
  onSelect: (entry: TailwindPaletteEntry) => void;
  disabled?: boolean;
  label: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [family, setFamily] = React.useState(() => value.replace(/-\d+$/, ""));

  React.useEffect(() => setFamily(value.replace(/-\d+$/, "")), [value]);

  const matches = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle
      ? TAILWIND_PALETTE.filter((entry) => entry.name.includes(needle)).slice(0, 24)
      : [];
  }, [query]);

  const choose = (entry: TailwindPaletteEntry | undefined) => {
    if (!entry) return;
    onSelect(entry);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={`${label} — choose a Tailwind color`}
          className="flex min-w-44 items-center gap-2 rounded-md border border-input px-2 py-1.5 text-left disabled:opacity-50"
        >
          <span
            aria-hidden
            className="size-5 shrink-0 rounded border border-border"
            style={{ background: paletteSrgbCss(value) }}
          />
          <span className="truncate font-mono text-sm">{value}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={12}
        className="flex max-h-[var(--radix-popover-content-available-height)] w-80 flex-col gap-3 overflow-y-auto"
      >
        <div className="space-y-1.5">
          <Label htmlFor={`palette-search-${label}`} className="text-xs">
            Search the palette
          </Label>
          <Input
            id={`palette-search-${label}`}
            value={query}
            placeholder="emerald-600"
            className="h-8 font-mono text-xs"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                choose(byName.get(query.trim().toLowerCase()) ?? matches[0]);
              }
            }}
          />
          {matches.length > 0 ? (
            <div className="max-h-32 overflow-y-auto rounded-md border">
              {matches.map((entry) => (
                <button
                  key={entry.name}
                  type="button"
                  onClick={() => choose(entry)}
                  className="flex w-full items-center gap-2 px-2 py-1 text-left text-xs hover:bg-accent"
                >
                  <span
                    aria-hidden
                    className="size-3.5 rounded-sm border border-border"
                    style={{ background: paletteSrgbCss(entry.name) }}
                  />
                  <span className="font-mono">{entry.name}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`palette-family-${label}`} className="text-xs">
            Family and weight
          </Label>
          <select
            id={`palette-family-${label}`}
            value={family}
            onChange={(event) => setFamily(event.target.value)}
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
          >
            {families.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <div className="flex gap-1">
            {STOPS.map((stop) => {
              const entry = byName.get(`${family}-${stop}`);
              return entry ? (
                <button
                  key={stop}
                  type="button"
                  title={entry.name}
                  aria-label={entry.name}
                  onClick={() => choose(entry)}
                  style={{ background: paletteSrgbCss(entry.name) }}
                  className={cn(
                    "h-7 flex-1 rounded-sm border",
                    entry.name === value
                      ? "border-foreground ring-1 ring-foreground"
                      : "border-border/50",
                  )}
                />
              ) : <span key={stop} className="h-7 flex-1" />;
            })}
          </div>
          <div className="flex gap-1 text-[9px] text-muted-foreground">
            {STOPS.map((stop) => (
              <span key={stop} className="flex-1 text-center">{stop}</span>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
