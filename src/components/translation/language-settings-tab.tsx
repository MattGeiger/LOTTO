// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";
import { toast } from "sonner";

import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { PlusIcon } from "@/components/animate-ui/icons/plus";
import { XIcon } from "@/components/animate-ui/icons/x";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SearchIcon, type SearchIconHandle } from "@/components/ui/search";
import {
  ALWAYS_ON_LANGUAGE_NAMES,
  getCatalogEntryByName,
  LANGUAGE_CATALOG,
} from "@/lib/languages";
import { runStagedTranslation, type TranslationProgress } from "@/lib/translation/run-translation";
import { cn } from "@/lib/utils";

type LanguageRow = { name: string; isEnabled: boolean; sortOrder: number };

const ALWAYS_ON = new Set<string>(ALWAYS_ON_LANGUAGE_NAMES);

export function LanguageSettingsTab() {
  const [rows, setRows] = React.useState<LanguageRow[]>([]);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [translating, setTranslating] = React.useState(false);
  const [progress, setProgress] = React.useState<TranslationProgress | null>(null);
  const searchIconRef = React.useRef<SearchIconHandle>(null);

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

  React.useEffect(() => {
    searchIconRef.current?.startAnimation();
  }, []);

  const playSearchIcon = React.useCallback(() => {
    searchIconRef.current?.startAnimation();
  }, []);

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
    const previouslyEnabled = new Set(rows.filter((row) => row.isEnabled).map((row) => row.name));
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
      const newlyEnabled = data.languages.filter(
        (row) => row.isEnabled && !ALWAYS_ON.has(row.name) && !previouslyEnabled.has(row.name),
      );
      toast.success(
        newlyEnabled.length > 0
          ? "Language settings saved. Preparing the newly enabled languages now."
          : "Language settings saved.",
      );
      setSaving(false);

      // Auto-start staged translation for newly enabled languages, with live
      // progress, so the admin sees what the wait is for (and need not run
      // Find missing by hand).
      if (newlyEnabled.length > 0) {
        setTranslating(true);
        setProgress({ total: 0, done: 0, remaining: 0, failed: 0 });
        try {
          const result = await runStagedTranslation(setProgress);
          const languageLabel =
            newlyEnabled.length === 1
              ? newlyEnabled[0].name
              : `${newlyEnabled.length} languages`;
          if (result.failed > 0 || result.remaining > 0) {
            toast.error(
              `${languageLabel} remains hidden because ${result.failed + result.remaining} ` +
                `translation${result.failed + result.remaining === 1 ? "" : "s"} could not be completed. ` +
                "Review the failed items in Translation Management, then retry them.",
            );
          } else {
            toast.success(
              `${languageLabel} is translated and now available in client language menus.`,
            );
          }
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : "Translation could not be completed.",
          );
        } finally {
          setTranslating(false);
          setProgress(null);
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save languages.");
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
        <div
          className="relative min-w-[12rem] flex-1"
          onMouseEnter={playSearchIcon}
          onClick={playSearchIcon}
        >
          <SearchIcon
            ref={searchIconRef}
            size={16}
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
        <AnimateIcon asChild animateOnView animateOnViewOnce animateOnHover animateOnTap>
          <Button type="button" variant="outline" size="sm" onClick={selectAllVisible} disabled={loading || saving || translating}>
            <PlusIcon className="mr-1 size-3.5" aria-hidden="true" />
            Select all
          </Button>
        </AnimateIcon>
        <AnimateIcon asChild animateOnView animateOnViewOnce animateOnHover animateOnTap>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearToBase}
            disabled={loading || saving || translating || selectedCount <= ALWAYS_ON.size}
          >
            <XIcon className="mr-1 size-3.5" aria-hidden="true" />
            Reset
          </Button>
        </AnimateIcon>
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
                  disabled={locked || loading || saving || translating}
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

      {translating ? (
        <div className="space-y-2 rounded-md border border-status-warning-border bg-status-warning-bg/40 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">
              Translating new languages… keep LOTTO open until this finishes.
            </span>
            <span className="tabular-nums text-muted-foreground">
              {progress && progress.total > 0 ? `${progress.done}/${progress.total}` : "starting…"}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{
                width:
                  progress && progress.total > 0
                    ? `${Math.min(100, Math.round((progress.done / progress.total) * 100))}%`
                    : "8%",
              }}
            />
          </div>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={save}
          disabled={loading || saving || translating || !dirty}
        >
          {saving ? "Saving…" : translating ? "Translating…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
