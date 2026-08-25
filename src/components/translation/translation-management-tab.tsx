// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";
import type { Column, ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { RefreshCwIcon } from "@/components/animate-ui/icons/refresh-cw";
import { RotateCcwIcon } from "@/components/animate-ui/icons/rotate-ccw";
import { SearchCheckIcon } from "@/components/animate-ui/icons/search-check";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EnhancedDataTable } from "@/components/ui/enhanced-data-table";
import { ResponsiveTruncatedText } from "@/components/ui/responsive-truncated-text";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableActionMenu } from "@/components/ui/table-action-menu";
import { Textarea } from "@/components/ui/textarea";
import { FindMissingDialog } from "@/components/translation/find-missing-dialog";
import {
  TRANSLATION_STATUSES,
  TRANSLATION_TYPES,
  type TranslationRecord,
  type TranslationStatus,
  type TranslationType,
} from "@/lib/translation/types";
import { cn } from "@/lib/utils";
import type { TableBulkAction } from "@/types/table";

const ALL = "all";

function StatusBadge({ status }: { status: TranslationStatus }) {
  if (status === "completed") {
    return (
      <Badge variant="outline" className="border-status-success-border text-status-success-text">
        Completed
      </Badge>
    );
  }
  if (status === "failed") {
    return <Badge variant="destructive">Failed</Badge>;
  }
  return (
    <Badge variant="outline" className="border-status-warning-border text-status-warning-text">
      Pending
    </Badge>
  );
}

function formatTranslationType(type: TranslationType) {
  if (type === "ui_string") return "UI string";
  if (type === "brand_string") return "Brand copy";
  if (type === "announcement") return "Announcement";
  return "Inventory";
}

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

export function TranslationManagementTab() {
  const [rows, setRows] = React.useState<TranslationRecord[]>([]);
  const [languages, setLanguages] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterLanguage, setFilterLanguage] = React.useState<string>(ALL);
  const [filterType, setFilterType] = React.useState<string>(ALL);
  const [filterStatus, setFilterStatus] = React.useState<string>(ALL);
  const [busy, setBusy] = React.useState(false);
  const tableRef = React.useRef<{ clearSelection?: () => void }>(null);

  const [editRow, setEditRow] = React.useState<TranslationRecord | null>(null);
  const [editText, setEditText] = React.useState("");

  const [deleteRow, setDeleteRow] = React.useState<TranslationRecord | null>(null);
  const [findOpen, setFindOpen] = React.useState(false);

  const loadLanguages = React.useCallback(async () => {
    try {
      const res = await fetch("/api/languages?enabled", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { languages: { name: string }[] };
      setLanguages(data.languages.map((language) => language.name).filter((name) => name !== "English"));
    } catch {
      /* ignore */
    }
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterLanguage !== ALL) params.set("language", filterLanguage);
      if (filterType !== ALL) params.set("type", filterType);
      if (filterStatus !== ALL) params.set("status", filterStatus);
      const res = await fetch(`/api/translations?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Unable to load translations.");
      const data = (await res.json()) as { translations: TranslationRecord[] };
      setRows(data.translations);
      tableRef.current?.clearSelection?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load translations.");
    } finally {
      setLoading(false);
    }
  }, [filterLanguage, filterType, filterStatus]);

  React.useEffect(() => {
    void loadLanguages();
  }, [loadLanguages]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const openEdit = React.useCallback((row: TranslationRecord) => {
    setEditRow(row);
    setEditText(row.translatedText ?? "");
  }, []);

  const runEdit = async () => {
    if (!editRow) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/translations/${editRow.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ translatedText: editText }),
      });
      if (!res.ok) throw new Error("Unable to save the correction.");
      toast.success("Translation updated.");
      setEditRow(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save the correction.");
    } finally {
      setBusy(false);
    }
  };

  const runRetry = React.useCallback(
    async (row: TranslationRecord) => {
      setBusy(true);
      try {
        const res = await fetch(`/api/translations/${row.id}/retry`, { method: "POST" });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Unable to retry.");
        toast.success(row.status === "completed" ? "Restarted translation." : "Retried translation.");
        await load();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to retry.");
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  const runDelete = async () => {
    if (!deleteRow) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/translations/${deleteRow.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Unable to delete.");
      toast.success("Deleted.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete.");
    } finally {
      setDeleteRow(null);
      setBusy(false);
    }
  };

  const bulkRetry = React.useCallback(
    async (selectedRows: TranslationRecord[]) => {
      if (selectedRows.length === 0) return;
      setBusy(true);
      try {
        const res = await fetch("/api/translations/bulk-retry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: selectedRows.map((row) => row.id) }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          translated?: number;
          failed?: number;
        };
        if (!res.ok) throw new Error(data.error ?? "Unable to retry.");
        toast.success(`Retried ${data.translated ?? 0}, ${data.failed ?? 0} failed.`);
        tableRef.current?.clearSelection?.();
        await load();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to retry.");
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  const bulkDelete = React.useCallback(
    async (selectedRows: TranslationRecord[]) => {
      if (selectedRows.length === 0) return;
      setBusy(true);
      try {
        const res = await fetch("/api/translations/bulk-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: selectedRows.map((row) => row.id) }),
        });
        if (!res.ok) throw new Error("Unable to delete.");
        toast.success("Deleted selected.");
        tableRef.current?.clearSelection?.();
        await load();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to delete.");
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  const recoverStuck = React.useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/translations/recover-stuck", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { recovered?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Recovery failed.");
      toast.success(`Recovered ${data.recovered ?? 0} stuck translation(s).`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Recovery failed.");
    } finally {
      setBusy(false);
    }
  }, [load]);

  const columns = React.useMemo<ColumnDef<TranslationRecord>[]>(
    () => [
      {
        id: "select",
        size: 44,
        enableSorting: false,
        enableHiding: false,
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllRowsSelected() ||
              (table.getIsSomeRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllRowsSelected(Boolean(value))}
            aria-label="Select all translations"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
            aria-label={`Select translation ${row.original.id}`}
          />
        ),
        meta: {
          style: { width: 44, minWidth: 44, maxWidth: 44 },
          headerClassName: "pl-4",
          cellClassName: "pl-4",
        },
      },
      {
        accessorKey: "originalText",
        size: 280,
        header: ({ column }) => <SortableHeader column={column} label="Original" />,
        cell: ({ row }) => (
          <ResponsiveTruncatedText
            text={row.original.originalText}
            title="View full original text"
            className="max-w-[18rem]"
          />
        ),
        meta: {
          cellClassName: "max-w-0",
        },
      },
      {
        accessorKey: "translatedText",
        size: 280,
        header: ({ column }) => <SortableHeader column={column} label="Translation" />,
        cell: ({ row }) =>
          row.original.translatedText ? (
            <ResponsiveTruncatedText
              text={row.original.translatedText}
              title="View full translated text"
              className="max-w-[18rem] text-muted-foreground"
            />
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        meta: {
          cellClassName: "max-w-0",
        },
      },
      {
        accessorKey: "language",
        size: 130,
        enableHiding: true,
        header: ({ column }) => <SortableHeader column={column} label="Language" />,
        cell: ({ row }) => <span className="whitespace-nowrap">{row.original.language}</span>,
      },
      {
        accessorKey: "type",
        size: 120,
        enableHiding: true,
        header: ({ column }) => <SortableHeader column={column} label="Type" />,
        cell: ({ row }) => <Badge variant="secondary">{formatTranslationType(row.original.type)}</Badge>,
      },
      {
        accessorKey: "status",
        size: 120,
        enableHiding: true,
        header: ({ column }) => <SortableHeader column={column} label="Status" />,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
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
              isLoading={busy}
              triggerLabel={`Open actions for ${row.original.originalText}`}
              actions={[
                {
                  label: "Edit",
                  icon: SquarePenIcon,
                  onClick: () => openEdit(row.original),
                },
                {
                  label: row.original.status === "completed" ? "Restart Translation" : "Retry Translation",
                  icon: row.original.status === "completed" ? RotateCcwIcon : RefreshCwIcon,
                  onClick: () => void runRetry(row.original),
                },
                {
                  label: "Delete",
                  icon: Trash2Icon,
                  onClick: () => setDeleteRow(row.original),
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
    [busy, openEdit, runRetry],
  );

  const filterControls = (
    <>
      <Select value={filterLanguage} onValueChange={setFilterLanguage}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Language" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All languages</SelectItem>
          {languages.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filterType} onValueChange={setFilterType}>
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All types</SelectItem>
          {TRANSLATION_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {formatTranslationType(type)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filterStatus} onValueChange={setFilterStatus}>
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {TRANSLATION_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );

  const bulkActions = React.useMemo<TableBulkAction<TranslationRecord>[]>(
    () => [
      {
        label: "Retry Selected",
        icon: RefreshCwIcon,
        action: bulkRetry,
      },
      {
        label: "Delete Selected",
        icon: Trash2Icon,
        action: bulkDelete,
        variant: "destructive",
      },
    ],
    [bulkDelete, bulkRetry],
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Review, correct, retry, and find missing translations for the enabled
        languages. Translations cover UI strings, active visitor-facing brand
        copy, the active announcement, and inventory item names.
      </p>

      <EnhancedDataTable
        ref={tableRef}
        columns={columns}
        data={rows}
        isLoading={loading}
        filterColumn="originalText"
        filterPlaceholder="Filter original text..."
        bodyMaxHeight="420px"
        minTableWidth="100%"
        tableClassName="table-fixed"
        defaultPageSize={25}
        getRowId={(row) => String(row.id)}
        mobileHiddenColumnIds={["language", "type", "status"]}
        selection={{
          enabled: true,
          bulkActions,
        }}
        toolbarControls={filterControls}
        toolbarActions={[
          {
            label: "Find missing",
            icon: SearchCheckIcon,
            variant: "default",
            action: () => setFindOpen(true),
            disabled: busy,
          },
          {
            label: "Recover stuck",
            icon: RotateCcwIcon,
            variant: "ghost",
            action: () => void recoverStuck(),
            disabled: busy,
          },
          {
            label: "Refresh",
            icon: RefreshCwIcon,
            variant: "ghost",
            action: () => void load(),
            disabled: busy,
          },
        ]}
      />

      <Dialog open={editRow !== null} onOpenChange={(open) => !open && setEditRow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit translation</DialogTitle>
            <DialogDescription>
              Correct the {editRow?.language} translation. Saving marks it completed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Original</Label>
              <div className="rounded-md border bg-muted/40 p-2 text-sm text-muted-foreground">
                {editRow?.originalText}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tm-edit-text">Translation ({editRow?.language})</Label>
              <Textarea
                id="tm-edit-text"
                value={editText}
                onChange={(event) => setEditText(event.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setEditRow(null)} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" onClick={runEdit} disabled={busy}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FindMissingDialog open={findOpen} onOpenChange={setFindOpen} onProcessed={load} />

      <AlertDialog open={deleteRow !== null} onOpenChange={(open) => !open && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete translation?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the translation row. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
