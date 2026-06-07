// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ALWAYS_ON_LANGUAGE_NAMES,
  getCatalogEntryByName,
  LANGUAGE_CATALOG,
} from "@/lib/languages";
import { cn } from "@/lib/utils";

type LanguageRow = { name: string; isEnabled: boolean; sortOrder: number };

const ALWAYS_ON = new Set<string>(ALWAYS_ON_LANGUAGE_NAMES);

export function LanguageSettingsTab() {
  const [rows, setRows] = React.useState<LanguageRow[]>([]);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/languages", { cache: "no-store" });
      if (!res.ok) throw new Error("Unable to load languages.");
      const data = (await res.json()) as { languages: LanguageRow[] };
      setRows(data.languages);
      setSelected(new Set(data.languages.filter((row) => row.isEnabled).map((row) => row.name)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load languages.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const filtered = React.useMemo(() => {
    const source = rows.length > 0 ? rows : LANGUAGE_CATALOG.map((entry, index) => ({
      name: entry.name,
      isEnabled: ALWAYS_ON.has(entry.name),
      sortOrder: index,
    }));
    const query = search.trim().toLowerCase();
    if (!query) return source;
    return source.filter((row) => {
      const entry = getCatalogEntryByName(row.name);
      return (
        row.name.toLowerCase().includes(query) ||
        (entry?.label.toLowerCase().includes(query) ?? false)
      );
    });
  }, [rows, search]);

  const toggle = (name: string, checked: boolean) => {
    if (ALWAYS_ON.has(name)) return; // base languages are locked on
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(name);
      else next.delete(name);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const row of filtered) next.add(row.name);
      return next;
    });
  };

  const clearToBase = () => {
    setSelected(new Set(ALWAYS_ON_LANGUAGE_NAMES));
  };

  const dirty = React.useMemo(() => {
    const current = new Set(rows.filter((row) => row.isEnabled).map((row) => row.name));
    if (current.size !== selected.size) return true;
    for (const name of selected) if (!current.has(name)) return true;
    return false;
  }, [rows, selected]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        languages: LANGUAGE_CATALOG.map((entry) => ({
          name: entry.name,
          isEnabled: ALWAYS_ON.has(entry.name) || selected.has(entry.name),
        })),
      };
      const res = await fetch("/api/languages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Unable to save languages.");
      const data = (await res.json()) as { languages: LanguageRow[] };
      setRows(data.languages);
      setSelected(new Set(data.languages.filter((row) => row.isEnabled).map((row) => row.name)));
      toast.success("Language settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save languages.");
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = selected.size;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choose which languages are available for translation. The eight core
        languages are always on. Newly enabled languages appear to visitors once
        their translations are complete.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search languages…"
            aria-label="Search languages"
            disabled={loading || saving}
            className="pl-8"
          />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={selectAllVisible} disabled={loading || saving}>
          Select all
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearToBase}
          disabled={loading || saving || selectedCount <= ALWAYS_ON.size}
        >
          <X className="mr-1 size-3.5" aria-hidden="true" />
          Reset
        </Button>
        <span className="ml-auto text-sm tabular-nums text-muted-foreground">
          {selectedCount} enabled
        </span>
      </div>

      <ScrollArea className="h-[300px] rounded-md border bg-card">
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {filtered.map((row) => {
            const entry = getCatalogEntryByName(row.name);
            const locked = ALWAYS_ON.has(row.name);
            const checked = locked || selected.has(row.name);
            const id = `lang-${row.name}`;
            return (
              <div key={row.name} className="flex items-start gap-2.5">
                <Checkbox
                  id={id}
                  checked={checked}
                  disabled={locked || loading || saving}
                  onCheckedChange={(value) => toggle(row.name, value === true)}
                  className="mt-0.5"
                />
                <label htmlFor={id} className="cursor-pointer select-none leading-tight">
                  <span className={cn("block text-sm", locked && "font-medium")}>
                    {row.name}
                    {locked && <span className="text-muted-foreground"> (core)</span>}
                  </span>
                  {entry && entry.label !== row.name ? (
                    <span className="block text-xs text-muted-foreground">{entry.label}</span>
                  ) : null}
                </label>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={save} disabled={loading || saving || !dirty}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
