// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// Find Missing Translations modal — ported from FEED's enhanced-find-missing
// dialog onto LOTTO primitives: a pre-scan "what this does" card with an
// animated progress bar, then Overview / Details / Languages tabs with
// per-type selection and a queue-and-translate action.

"use client";

import * as React from "react";
import {
  CheckCircle,
  CheckCircle2,
  FileSearch,
  FileText,
  Loader2,
  Megaphone,
  Package,
  Palette,
  Search,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { collectFeedInventoryNames, fetchFeedPublicInventory } from "@/lib/feed-public-inventory";
import { runStagedTranslation, type TranslationProgress } from "@/lib/translation/run-translation";
import { TRANSLATION_TYPES, type TranslationType } from "@/lib/translation/types";
import { useBrand } from "@/contexts/brand-context";

type MissingDetails = {
  count: number;
  byType: Record<string, number>;
  byLanguage: Record<string, number>;
  sampleItems: string[];
  sourceCounts?: Record<string, number>;
  inventorySource?: { ok: boolean; error: string | null; url: string };
};

const TYPE_META: Record<TranslationType, { label: string; icon: LucideIcon }> = {
  ui_string: { label: "UI strings", icon: FileText },
  brand_string: { label: "Brand copy", icon: Palette },
  announcement: { label: "Announcement", icon: Megaphone },
  inventory: { label: "Inventory", icon: Package },
};

const availableTranslationTypes = (inventoryEnabled: boolean) =>
  inventoryEnabled
    ? TRANSLATION_TYPES
    : TRANSLATION_TYPES.filter((type) => type !== "inventory");

export function FindMissingDialog({
  open,
  onOpenChange,
  onProcessed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProcessed: () => void;
}) {
  const brand = useBrand();
  const AVAILABLE_TRANSLATION_TYPES = availableTranslationTypes(brand.inventory.enabled);
  const [scanning, setScanning] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [result, setResult] = React.useState<MissingDetails | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [queueProgress, setQueueProgress] = React.useState<TranslationProgress | null>(null);
  const [activeTab, setActiveTab] = React.useState("overview");
  const [selectedTypes, setSelectedTypes] = React.useState<Partial<Record<TranslationType, boolean>>>({});
  // English inventory names read from FEED's public feed in *this* browser, then
  // bridged to the server — which may not be able to reach the feed itself.
  const [inventoryNames, setInventoryNames] = React.useState<string[] | undefined>(undefined);

  // Reset whenever the dialog opens.
  React.useEffect(() => {
    if (open) {
      setScanning(false);
      setProgress(0);
      setResult(null);
      setProcessing(false);
      setActiveTab("overview");
      setSelectedTypes({});
      setInventoryNames(undefined);
    }
  }, [open]);

  const runScan = async () => {
    setScanning(true);
    setProgress(0);
    // Animate progress toward 90% while the scan runs; the response sets 100%.
    const timer = setInterval(() => setProgress((p) => (p < 90 ? p + 3 : p)), 80);
    try {
      // Source inventory names from this browser (FEED's feed is public via CORS
      // even when the server's egress to it is blocked). On failure, fall through
      // without them and let the server attempt its own fetch + report why.
      let names: string[] | undefined;
      if (brand.inventory.enabled) {
        try {
          names = collectFeedInventoryNames(await fetchFeedPublicInventory(brand.inventory.url));
        } catch {
          names = undefined;
        }
      }
      setInventoryNames(names);
      const res = await fetch("/api/translations/find-missing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ process: false, ...(names ? { inventoryNames: names } : {}) }),
      });
      const data = (await res.json().catch(() => ({}))) as { details?: MissingDetails; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Scan failed.");
      const details = data.details ?? { count: 0, byType: {}, byLanguage: {}, sampleItems: [] };
      setResult(details);
      // Default-select every type that has missing items.
      const defaults: Partial<Record<TranslationType, boolean>> = {};
      for (const type of AVAILABLE_TRANSLATION_TYPES) {
        if ((details.byType[type] ?? 0) > 0) defaults[type] = true;
      }
      setSelectedTypes(defaults);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Scan failed.");
    } finally {
      clearInterval(timer);
      setProgress(100);
      setScanning(false);
    }
  };

  const selectedCount = Object.values(selectedTypes).filter(Boolean).length;

  const runQueue = async () => {
    const types = (Object.keys(selectedTypes) as TranslationType[]).filter((t) => selectedTypes[t]);
    if (types.length === 0) {
      toast.error("Select at least one type to translate.");
      return;
    }
    setProcessing(true);
    setQueueProgress({ total: 0, done: 0, remaining: 0, failed: 0 });
    try {
      // Queue the selected types and drive the staged chunks to completion,
      // re-bridging the browser-sourced inventory names so the server queues them.
      const result = await runStagedTranslation(setQueueProgress, types, inventoryNames);
      toast.success(
        `Translated ${result.done} item${result.done === 1 ? "" : "s"}` +
          (result.failed > 0 ? `, ${result.failed} failed.` : "."),
      );
      onProcessed();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to queue translations.");
    } finally {
      setProcessing(false);
      setQueueProgress(null);
    }
  };

  const typeCards = AVAILABLE_TRANSLATION_TYPES.map((type) => ({
    type,
    count: result?.byType[type] ?? 0,
    ...TYPE_META[type],
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Find missing translations</DialogTitle>
          <DialogDescription>
            {!result
              ? "Scan your content to find and queue missing translations."
              : result.count > 0
                ? `Found ${result.count} missing translation${result.count === 1 ? "" : "s"} that need attention.`
                : "All content is fully translated for the enabled languages."}
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">What this will do</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <Search className="mt-0.5 size-4 shrink-0 text-status-warning-text" aria-hidden="true" />
                    <span className="text-sm">
                      Find UI strings missing translations for newly enabled languages
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileSearch className="mt-0.5 size-4 shrink-0 text-status-warning-text" aria-hidden="true" />
                    <span className="text-sm">
                      Discover the active announcement missing in any enabled language
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Palette className="mt-0.5 size-4 shrink-0 text-status-warning-text" aria-hidden="true" />
                    <span className="text-sm">
                      Find active visitor-facing brand copy missing in any enabled language
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
                    <span className="text-sm">Surface failed or stuck translations that need attention</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-status-success-text" aria-hidden="true" />
                    <span className="text-sm">Choose which content types to translate</span>
                  </div>
                </CardContent>
              </Card>

              {scanning ? (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-sm">
                    <span>Scanning for missing translations…</span>
                    <span className="tabular-nums">{progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-primary transition-all duration-150"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ) : null}

              <p className="text-sm text-muted-foreground">
                This scans all content for the currently enabled languages.
              </p>
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="overview">
                Overview
                {result.count > 0 ? (
                  <Badge variant="destructive" className="ml-2">
                    {result.count}
                  </Badge>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="languages">Languages</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="min-h-0 flex-1">
              <ScrollArea className="h-[min(48vh,420px)]">
                <div className="flex flex-col gap-4 p-1">
                  {brand.inventory.enabled && result.sourceCounts && (result.sourceCounts.inventory ?? 0) === 0 ? (
                    <div className="flex items-start gap-2 rounded-md border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-text">
                      <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      <div className="space-y-1">
                        <p>
                          No inventory items were found to translate. The FEED inventory feed
                          couldn&apos;t be read from this browser or the server, so inventory names
                          can&apos;t be localized.
                        </p>
                        {result.inventorySource ? (
                          <p className="break-all font-mono text-xs opacity-90">
                            {result.inventorySource.error
                              ? `Error: ${result.inventorySource.error}`
                              : "Feed returned no items."}
                            {" — "}
                            {result.inventorySource.url}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  {result.count > 0 ? (
                    <Card className="border-status-warning-border">
                      <CardHeader>
                        <CardTitle className="text-base">Missing translations found</CardTitle>
                        <CardDescription>{result.count} need attention</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 items-center justify-center rounded-full bg-status-warning-bg">
                            <Search className="size-5 text-status-warning-text" aria-hidden="true" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Select which content types to translate using the checkboxes below, then
                            queue them.
                          </p>
                        </div>
                      </CardContent>
                      <CardFooter className="flex flex-col items-start gap-3 border-t pt-4">
                        <Button onClick={runQueue} disabled={processing || selectedCount === 0} className="w-full">
                          {processing ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" /> : null}
                          {processing
                            ? queueProgress && queueProgress.total > 0
                              ? `Translating… ${queueProgress.done}/${queueProgress.total}`
                              : "Translating…"
                            : `Queue & translate${selectedCount > 0 ? ` (${selectedCount} type${selectedCount === 1 ? "" : "s"})` : ""}`}
                        </Button>
                      </CardFooter>
                    </Card>
                  ) : (
                    <Card className="border-status-success-border">
                      <CardHeader>
                        <CardTitle className="text-base">No missing translations</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 items-center justify-center rounded-full bg-status-success-bg">
                            <CheckCircle className="size-5 text-status-success-text" aria-hidden="true" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Everything is translated for the enabled languages.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {result.count > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      {typeCards.map((card) => {
                        const Icon = card.icon;
                        return (
                          <Card key={card.type} className={card.count > 0 ? "border-status-warning-border" : ""}>
                            <CardHeader className="pb-2">
                              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                <Icon className="size-4" aria-hidden="true" />
                                {card.label}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold tabular-nums">{card.count}</div>
                            </CardContent>
                            <CardFooter className="pt-0">
                              {card.count > 0 ? (
                                <label className="flex cursor-pointer items-center gap-2 text-xs">
                                  <Checkbox
                                    checked={selectedTypes[card.type] ?? false}
                                    onCheckedChange={(c) =>
                                      setSelectedTypes((prev) => ({ ...prev, [card.type]: c === true }))
                                    }
                                  />
                                  Select for translation
                                </label>
                              ) : (
                                <span className="text-xs text-muted-foreground">All translated</span>
                              )}
                            </CardFooter>
                          </Card>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="details" className="min-h-0 flex-1">
              <ScrollArea className="h-[min(48vh,420px)]">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Sample items</CardTitle>
                    <CardDescription>Examples of content needing translation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {result.sampleItems.length > 0 ? (
                      <div className="rounded-md border p-3">
                        {result.sampleItems.map((item, i) => (
                          <React.Fragment key={item}>
                            <div className="text-sm text-muted-foreground">{item}</div>
                            {i < result.sampleItems.length - 1 ? <Separator className="my-2" /> : null}
                          </React.Fragment>
                        ))}
                      </div>
                    ) : (
                      <p className="py-4 text-center text-sm text-muted-foreground">No details available.</p>
                    )}
                  </CardContent>
                </Card>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="languages" className="min-h-0 flex-1">
              <ScrollArea className="h-[min(48vh,420px)]">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Language breakdown</CardTitle>
                    <CardDescription>Missing translations by language</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(result.byLanguage).length > 0 ? (
                      <div className="space-y-4">
                        {Object.entries(result.byLanguage)
                          .sort((a, b) => b[1] - a[1])
                          .map(([language, count]) => (
                            <div key={language} className="flex flex-col gap-1">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium">{language}</span>
                                <span className="tabular-nums">{count} missing</span>
                              </div>
                              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                                <div
                                  className="h-full bg-primary"
                                  style={{ width: `${Math.min(100, (count / (result.count || 1)) * 100)}%` }}
                                />
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="py-4 text-center text-sm text-muted-foreground">No breakdown available.</p>
                    )}
                  </CardContent>
                </Card>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="pt-2">
          {!result ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={scanning}>
                Cancel
              </Button>
              <Button onClick={runScan} disabled={scanning}>
                {scanning ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" /> : null}
                {scanning ? "Scanning…" : "Find missing translations"}
              </Button>
            </>
          ) : (
            <Button onClick={() => onOpenChange(false)} disabled={processing}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
