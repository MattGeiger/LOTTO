// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. Agency branding is not covered
// by this license; see TRADEMARKS.md.

"use client";

// Admin Advanced "Appearance" card: shows which brand is live, lists saved
// configurations and templates, and launches the multi-step Appearance
// wizard. When no configuration exists this is the prominent call to action
// (no auto-open — decision recorded 2026-07-18 in
// docs/CONFIGURABLE_BRANDING_PLAN.md).

import * as React from "react";
import { Palette } from "lucide-react";
import { toast } from "sonner";

import { AppearanceWizard } from "@/components/appearance/appearance-wizard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmAction } from "@/components/confirm-action";
import { useBrand } from "@/contexts/brand-context";
import { parseBrandConfig } from "@/lib/brand-theme/config-schema";
import type { BrandConfig } from "@/lib/brand-theme/config-schema";

import type { AppearanceDraftState, TemplateOption } from "./types";

type ConfigRow = {
  id: string;
  payload: unknown;
  isActive: boolean;
  isTemplate: boolean;
  updatedAt: string;
};

const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  "template-william-temple-house":
    "FEED-aligned Tailwind colors and current William Temple House artwork.",
};

const templateName = (id: string) =>
  id
    .replace(/^template-/, "")
    .split("-")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");

export function AppearanceCard() {
  const brand = useBrand();
  const [rows, setRows] = React.useState<ConfigRow[] | null>(null);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [editingDraft, setEditingDraft] = React.useState<AppearanceDraftState | null>(null);
  const [pending, setPending] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const response = await fetch("/api/brand-config");
      if (!response.ok) throw new Error();
      const body = await response.json();
      setRows(body.configurations);
      setActiveId(body.activeId);
    } catch {
      setRows([]);
      toast.error("Unable to load appearance configurations.");
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const templates: TemplateOption[] = React.useMemo(
    () =>
      (rows ?? [])
        .filter((row) => row.isTemplate)
        .flatMap((row) => {
          const parsed = parseBrandConfig(row.payload);
          if (!parsed.ok) return [];
          return [
            {
              id: row.id,
              name: `Start from ${templateName(row.id)}`,
              description: TEMPLATE_DESCRIPTIONS[row.id] ?? "Example configuration.",
              config: parsed.config,
            },
          ];
        }),
    [rows],
  );

  const savedConfigs = (rows ?? []).filter((row) => !row.isTemplate);

  const openNew = () => {
    setEditingDraft(null);
    setWizardOpen(true);
  };

  const openEdit = (row: ConfigRow) => {
    const parsed = parseBrandConfig(row.payload);
    if (!parsed.ok) {
      toast.error("This saved configuration is invalid and cannot be edited safely.");
      return;
    }
    setEditingDraft({ id: row.id, config: parsed.config as BrandConfig, startSource: "saved" });
    setWizardOpen(true);
  };

  const postAction = async (body: object, success: string) => {
    setPending(true);
    try {
      const response = await fetch("/api/brand-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(payload.error ?? "That didn't work. Please try again.");
        return;
      }
      toast.success(success);
      await load();
      // The active brand is server-resolved; a reload applies it everywhere.
      window.location.reload();
    } finally {
      setPending(false);
    }
  };

  const deleteConfig = async (id: string) => {
    setPending(true);
    try {
      const response = await fetch(`/api/brand-config?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        toast.error("Unable to delete the configuration.");
        return;
      }
      toast.success("Configuration deleted.");
      await load();
    } finally {
      setPending(false);
    }
  };

  return (
    <Card className="bg-card space-y-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="size-4 text-muted-foreground" />
          Appearance
        </CardTitle>
        <CardDescription>
          {brand.source === "custom"
            ? `Custom appearance "${activeId ?? ""}" is live.`
            : `Using the built-in ${brand.organizationName} appearance.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            {savedConfigs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-center">
                <p className="text-sm font-medium">
                  Set up your organization&apos;s appearance
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Name, logos, colors, and install icons — configured in a few
                  guided steps, no code required.
                </p>
                <Button className="mt-3" onClick={openNew} disabled={pending}>
                  Set up appearance
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {savedConfigs.map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {row.id}
                    </span>
                    {row.isActive ? <Badge>Active</Badge> : null}
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(row)}
                        disabled={pending}
                      >
                        Edit
                      </Button>
                      {!row.isActive ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            void postAction(
                              { action: "activate", id: row.id },
                              "Appearance activated.",
                            )
                          }
                          disabled={pending}
                        >
                          Activate
                        </Button>
                      ) : null}
                      {!row.isActive ? (
                        <ConfirmAction
                          title="Delete this configuration?"
                          description={`"${row.id}" will be permanently removed. This cannot be undone.`}
                          actionLabel="Delete"
                          onConfirm={() => void deleteConfig(row.id)}
                        >
                          <Button variant="ghost" size="sm" disabled={pending}>
                            Delete
                          </Button>
                        </ConfirmAction>
                      ) : null}
                    </div>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={openNew} disabled={pending}>
                    New appearance
                  </Button>
                  {brand.source === "custom" ? (
                    <ConfirmAction
                      title="Return to the built-in appearance?"
                      description="The saved configuration stays available; the app immediately reverts to the built-in brand."
                      actionLabel="Use built-in appearance"
                      onConfirm={() =>
                        void postAction(
                          { action: "deactivate" },
                          "Reverted to the built-in appearance.",
                        )
                      }
                    >
                      <Button variant="outline" size="sm" disabled={pending}>
                        Use built-in appearance
                      </Button>
                    </ConfirmAction>
                  ) : null}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      <AppearanceWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        templates={templates}
        existingDraft={editingDraft}
        onSaved={() => {
          void load();
          window.location.reload();
        }}
      />
    </Card>
  );
}
