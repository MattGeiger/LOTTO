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

import { CircleCheckIcon } from "@/components/animate-ui/icons/circle-check";
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
import { EnhancedDataTable } from "@/components/ui/enhanced-data-table";
import { ResponsiveTruncatedText } from "@/components/ui/responsive-truncated-text";
import { TableActionMenu } from "@/components/ui/table-action-menu";
import { AiConfigDialog, type AiConfigDialogMode } from "@/components/translation/ai-config/ai-config-dialog";
import type { AiConfigInput, AiConfigPublic } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

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
  const [configs, setConfigs] = React.useState<AiConfigPublic[]>([]);
  const [encryptionConfigured, setEncryptionConfigured] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<AiConfigDialogMode>("add");
  const [editing, setEditing] = React.useState<AiConfigPublic | null>(null);
  const [deleteConfig, setDeleteConfig] = React.useState<AiConfigPublic | null>(null);
  const tableRef = React.useRef<{ clearSelection?: () => void }>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai-config", { cache: "no-store" });
      if (!res.ok) throw new Error("Unable to load AI configurations.");
      const data = (await res.json()) as {
        configs: AiConfigPublic[];
        encryptionConfigured: boolean;
      };
      setConfigs(data.configs);
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

  const openAdd = React.useCallback(() => {
    setDialogMode("add");
    setEditing(null);
    setDialogOpen(true);
  }, []);

  const openEdit = React.useCallback((config: AiConfigPublic) => {
    setDialogMode("edit");
    setEditing(config);
    setDialogOpen(true);
  }, []);

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
      const res = await fetch(`/api/ai-config/${deleteConfig.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Unable to delete the configuration.");
      toast.success("Configuration deleted.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete the configuration.");
    } finally {
      setDeleteConfig(null);
    }
  };

  const columns = React.useMemo<ColumnDef<AiConfigPublic>[]>(
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
        cell: ({ row }) => <Badge variant="secondary">{row.original.serviceType}</Badge>,
      },
      {
        accessorKey: "model",
        size: 260,
        enableHiding: true,
        header: ({ column }) => <SortableHeader column={column} label="Model" />,
        cell: ({ row }) => (
          <ResponsiveTruncatedText
            text={row.original.model}
            title="View model identifier"
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
                  icon: CircleCheckIcon,
                  onClick: () => void validateExisting(row.original.id),
                  disabled: !row.original.hasApiKey,
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
        getRowId={(row) => String(row.id)}
        mobileHiddenColumnIds={["provider", "model", "status"]}
        toolbarActions={[
          {
            label: "Add configuration",
            icon: PlusIcon,
            variant: "default",
            action: openAdd,
            disabled: loading || !encryptionConfigured,
          },
        ]}
      />

      <AiConfigDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        config={editing}
        onSave={handleSave}
      />

      <AlertDialog open={deleteConfig !== null} onOpenChange={(open) => !open && setDeleteConfig(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete configuration?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the AI configuration and its stored API key. This cannot be undone.
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
