// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";
import type { Column, ColumnDef } from "@tanstack/react-table";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { ClipboardCheckIcon } from "@/components/animate-ui/icons/clipboard-check";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { BotIcon } from "@/components/animate-ui/icons/bot";
import { MessageSquareQuoteIcon } from "@/components/animate-ui/icons/message-square-quote";
import { PlusIcon } from "@/components/animate-ui/icons/plus";
import { SquarePenIcon } from "@/components/animate-ui/icons/square-pen";
import { Trash2Icon } from "@/components/animate-ui/icons/trash-2";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CpuIcon, type CpuIconHandle } from "@/components/ui/cpu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EnhancedDataTable } from "@/components/ui/enhanced-data-table";
import { ResponsiveTruncatedText } from "@/components/ui/responsive-truncated-text";
import { TableActionMenu } from "@/components/ui/table-action-menu";
import { AiConfigDialog, type AiConfigDialogMode } from "@/components/translation/ai-config/ai-config-dialog";
import {
  SystemPromptDialog,
  type SystemPromptDialogMode,
} from "@/components/translation/ai-config/system-prompt-dialog";
import { toPromptConfiguration, type SystemPrompt, type SystemPromptInput } from "@/lib/ai/system-prompt-types";
import type { AiConfigInput, AiConfigPublic } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

type AiModelRow = AiConfigPublic & { configType: "apikey"; originalId: number };
type SystemPromptRow = ReturnType<typeof toPromptConfiguration>;
type ConfigRow = AiModelRow | SystemPromptRow;
const TYPE_PICKER_ICON_RESET_DELAY_MS = 1500;

function SortableHeader<TData>({
  column,
  label,
  className,
}: {
  column: Column<TData, unknown>;
  label: string;
  className?: string;
}) {
  const sorted = column.getIsSorted();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn("-ml-2 h-8 px-2", className)}
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {label}
      <span className="ml-1 text-xs text-muted-foreground" aria-hidden="true">
        {sorted === "asc" ? "↑" : sorted === "desc" ? "↓" : "↕"}
      </span>
    </Button>
  );
}

export function AiConfigTab() {
  const [configs, setConfigs] = React.useState<ConfigRow[]>([]);
  const [prompts, setPrompts] = React.useState<SystemPrompt[]>([]);
  const [encryptionConfigured, setEncryptionConfigured] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [typeOpen, setTypeOpen] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<AiConfigDialogMode>("add");
  const [editing, setEditing] = React.useState<AiModelRow | null>(null);
  const [promptDialogOpen, setPromptDialogOpen] = React.useState(false);
  const [promptDialogMode, setPromptDialogMode] = React.useState<SystemPromptDialogMode>("add");
  const [editingPrompt, setEditingPrompt] = React.useState<SystemPrompt | null>(null);
  const [deleteConfig, setDeleteConfig] = React.useState<ConfigRow | null>(null);
  const [typePickerIntro, setTypePickerIntro] = React.useState(false);
  const tableRef = React.useRef<{ clearSelection?: () => void }>(null);
  const aiModelIconRef = React.useRef<CpuIconHandle>(null);
  const typePickerIntroTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const typePickerImperativeStartRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, promptRes] = await Promise.all([
        fetch("/api/ai-config", { cache: "no-store" }),
        fetch("/api/system-prompts", { cache: "no-store" }),
      ]);
      if (!configRes.ok || !promptRes.ok) throw new Error("Unable to load AI configurations.");
      const data = (await configRes.json()) as {
        configs: AiConfigPublic[];
        encryptionConfigured: boolean;
      };
      const promptData = (await promptRes.json()) as { prompts: SystemPrompt[] };
      const modelRows: AiModelRow[] = data.configs.map((config) => ({
        ...config,
        configType: "apikey",
        originalId: config.id,
      }));
      setPrompts(promptData.prompts);
      setConfigs([...modelRows, ...promptData.prompts.map(toPromptConfiguration)]);
      setEncryptionConfigured(data.encryptionConfigured);
      tableRef.current?.clearSelection?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load AI configurations.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (typePickerIntroTimerRef.current) {
      clearTimeout(typePickerIntroTimerRef.current);
      typePickerIntroTimerRef.current = null;
    }
    if (typePickerImperativeStartRef.current) {
      clearTimeout(typePickerImperativeStartRef.current);
      typePickerImperativeStartRef.current = null;
    }

    if (!typeOpen) {
      setTypePickerIntro(false);
      aiModelIconRef.current?.stopAnimation();
      return;
    }

    setTypePickerIntro(true);
    typePickerImperativeStartRef.current = setTimeout(() => {
      aiModelIconRef.current?.startAnimation();
      typePickerImperativeStartRef.current = null;
    }, 0);
    typePickerIntroTimerRef.current = setTimeout(() => {
      setTypePickerIntro(false);
      aiModelIconRef.current?.stopAnimation();
      typePickerIntroTimerRef.current = null;
    }, TYPE_PICKER_ICON_RESET_DELAY_MS);

    return () => {
      if (typePickerIntroTimerRef.current) {
        clearTimeout(typePickerIntroTimerRef.current);
        typePickerIntroTimerRef.current = null;
      }
      if (typePickerImperativeStartRef.current) {
        clearTimeout(typePickerImperativeStartRef.current);
        typePickerImperativeStartRef.current = null;
      }
    };
  }, [typeOpen]);

  const openAdd = React.useCallback(() => {
    setTypeOpen(true);
  }, []);

  const openAddModel = React.useCallback(() => {
    setTypeOpen(false);
    setDialogMode("add");
    setEditing(null);
    setDialogOpen(true);
  }, []);

  const openAddPrompt = React.useCallback(() => {
    setTypeOpen(false);
    setPromptDialogMode("add");
    setEditingPrompt(null);
    setPromptDialogOpen(true);
  }, []);

  const openEdit = React.useCallback(
    (config: ConfigRow) => {
      if (config.configType === "prompt") {
        setPromptDialogMode("edit");
        setEditingPrompt(prompts.find((prompt) => prompt.id === config.originalId) ?? null);
        setPromptDialogOpen(true);
        return;
      }
      setDialogMode("edit");
      setEditing(config);
      setDialogOpen(true);
    },
    [prompts],
  );

  const handleSave = async (input: AiConfigInput): Promise<boolean> => {
    try {
      const url = dialogMode === "add" ? "/api/ai-config" : `/api/ai-config/${editing?.id}`;
      const method = dialogMode === "add" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Unable to save the configuration.");
      }
      toast.success(dialogMode === "add" ? "Configuration added." : "Configuration updated.");
      await load();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save the configuration.");
      return false;
    }
  };

  const handlePromptSave = async (input: SystemPromptInput): Promise<boolean> => {
    try {
      const url = promptDialogMode === "add" ? "/api/system-prompts" : `/api/system-prompts/${editingPrompt?.id}`;
      const method = promptDialogMode === "add" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Unable to save the system prompt.");
      }
      toast.success(promptDialogMode === "add" ? "System prompt added." : "System prompt updated.");
      await load();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save the system prompt.");
      return false;
    }
  };

  const validateExisting = React.useCallback(async (id: number) => {
    try {
      const res = await fetch("/api/ai-config/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await res.json()) as { result?: { ok: boolean; message: string } };
      if (data.result?.ok) toast.success(data.result.message);
      else toast.error(data.result?.message ?? "Validation failed.");
    } catch {
      toast.error("Unable to validate the API key.");
    }
  }, []);

  const confirmDelete = async () => {
    if (!deleteConfig) return;
    try {
      const url =
        deleteConfig.configType === "prompt"
          ? `/api/system-prompts/${deleteConfig.originalId}`
          : `/api/ai-config/${deleteConfig.originalId}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Unable to delete the configuration.");
      toast.success("Configuration deleted.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete the configuration.");
    } finally {
      setDeleteConfig(null);
    }
  };

  const columns = React.useMemo<ColumnDef<ConfigRow>[]>(
    () => [
      {
        accessorKey: "name",
        size: 220,
        header: ({ column }) => <SortableHeader column={column} label="Name" />,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: "serviceType",
        id: "provider",
        size: 130,
        enableHiding: true,
        header: ({ column }) => <SortableHeader column={column} label="Provider" />,
        cell: ({ row }) => (
          <Badge variant={row.original.configType === "prompt" ? "outline" : "secondary"}>
            {row.original.configType === "prompt" ? "System Prompt" : row.original.serviceType}
          </Badge>
        ),
      },
      {
        accessorKey: "model",
        size: 260,
        enableHiding: true,
        header: ({ column }) => <SortableHeader column={column} label="Model / prompt" />,
        cell: ({ row }) => (
          <ResponsiveTruncatedText
            text={row.original.configType === "prompt" ? row.original.model.replace("_", " ") : row.original.model}
            title={row.original.configType === "prompt" ? "View prompt type" : "View model identifier"}
            className="max-w-[18rem] text-muted-foreground"
          />
        ),
        meta: {
          cellClassName: "max-w-0",
        },
      },
      {
        accessorKey: "isActive",
        id: "status",
        size: 110,
        enableHiding: true,
        header: ({ column }) => <SortableHeader column={column} label="Status" />,
        cell: ({ row }) =>
          row.original.isActive ? (
            <Badge variant="outline" className="border-status-success-border text-status-success-text">
              Active
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Inactive
            </Badge>
          ),
      },
      {
        id: "actions",
        size: 56,
        enableSorting: false,
        enableHiding: false,
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end pr-2">
            <TableActionMenu
              size="sm"
              triggerLabel={`Open actions for ${row.original.name}`}
              actions={[
                {
                  label: "Test key",
                  icon: ClipboardCheckIcon,
                  onClick: () => void validateExisting(row.original.originalId),
                  disabled: row.original.configType === "prompt" || !row.original.hasApiKey,
                },
                {
                  label: "Edit",
                  icon: SquarePenIcon,
                  onClick: () => openEdit(row.original),
                },
                {
                  label: "Delete",
                  icon: Trash2Icon,
                  onClick: () => setDeleteConfig(row.original),
                  variant: "destructive",
                },
              ]}
            />
          </div>
        ),
        meta: {
          style: { width: 56, minWidth: 56, maxWidth: 56 },
          headerClassName: "pr-3 text-right",
          cellClassName: "pr-3",
        },
      },
    ],
    [openEdit, validateExisting],
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Configure AI providers used to translate content. API keys are encrypted
        at rest and never shown again after saving.
      </p>

      {!encryptionConfigured ? (
        <div className="flex items-start gap-2 rounded-md border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-text">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            Server encryption isn&apos;t configured. Set <code>ENCRYPTION_MASTER_KEY</code>{" "}
            (a base64-encoded 32-byte value) in the environment before adding keys.
          </span>
        </div>
      ) : null}

      <EnhancedDataTable
        ref={tableRef}
        columns={columns}
        data={configs}
        isLoading={loading}
        filterColumn="name"
        filterPlaceholder="Filter configurations..."
        minTableWidth="100%"
        tableClassName="table-fixed"
        defaultPageSize={25}
        getRowId={(row) => String(row.id)}
        mobileHiddenColumnIds={["provider", "model", "status"]}
        toolbarActions={[
          {
            label: "Add configuration",
            icon: PlusIcon,
            variant: "default",
            action: openAdd,
            disabled: loading,
          },
        ]}
      />

      <Dialog open={typeOpen} onOpenChange={setTypeOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Add AI Configuration</DialogTitle>
            <DialogDescription>Select the type of AI configuration to create.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <AnimateIcon animate={typePickerIntro} animateOnHover className="inline-block">
                <BotIcon className="mx-auto size-12 text-muted-foreground" size={48} />
              </AnimateIcon>
              <h3 className="mt-2 text-lg font-medium">Configuration Type</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Choose whether to add a provider model or a reusable system prompt.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <Card
                className={cn(
                  "cursor-pointer transition-all hover:border-primary",
                  !encryptionConfigured && "cursor-not-allowed opacity-60",
                )}
                onClick={() => {
                  aiModelIconRef.current?.startAnimation();
                  if (encryptionConfigured) openAddModel();
                }}
                onMouseEnter={() => aiModelIconRef.current?.startAnimation()}
                onMouseLeave={() => aiModelIconRef.current?.stopAnimation()}
                onPointerDown={() => aiModelIconRef.current?.startAnimation()}
                onPointerUp={() => aiModelIconRef.current?.stopAnimation()}
              >
                <CardHeader className="pb-2 text-center">
                  <CpuIcon ref={aiModelIconRef} className="mx-auto size-8 text-primary" size={32} />
                  <CardTitle className="text-base">AI Model</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-center">
                    Configure API key, provider model, costs, and usage limits.
                  </CardDescription>
                </CardContent>
              </Card>
              <AnimateIcon asChild animate={typePickerIntro} animateOnHover animateOnTap>
                <Card className="cursor-pointer transition-all hover:border-primary" onClick={openAddPrompt}>
                  <CardHeader className="pb-2 text-center">
                    <MessageSquareQuoteIcon className="mx-auto size-8 text-primary" size={32} />
                    <CardTitle className="text-base">Prompt</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="text-center">
                      Create a system prompt for translation behavior and tone.
                    </CardDescription>
                  </CardContent>
                </Card>
              </AnimateIcon>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AiConfigDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        config={editing}
        onSave={handleSave}
      />

      <SystemPromptDialog
        open={promptDialogOpen}
        onOpenChange={setPromptDialogOpen}
        mode={promptDialogMode}
        prompt={editingPrompt}
        onSave={handlePromptSave}
      />

      <AlertDialog open={deleteConfig !== null} onOpenChange={(open) => !open && setDeleteConfig(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete configuration?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the selected {deleteConfig?.configType === "prompt" ? "system prompt" : "AI configuration"}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
