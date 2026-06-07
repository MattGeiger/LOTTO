// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";
import { Pencil, Plus, RefreshCw, RotateCcw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  TRANSLATION_STATUSES,
  TRANSLATION_TYPES,
  type TranslationRecord,
  type TranslationStatus,
} from "@/lib/translation/types";

const ALL = "all";

type MissingDetails = {
  count: number;
  byType: Record<string, number>;
  byLanguage: Record<string, number>;
  sampleItems: string[];
};

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

export function TranslationManagementTab() {
  const [rows, setRows] = React.useState<TranslationRecord[]>([]);
  const [languages, setLanguages] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterLanguage, setFilterLanguage] = React.useState<string>(ALL);
  const [filterType, setFilterType] = React.useState<string>(ALL);
  const [filterStatus, setFilterStatus] = React.useState<string>(ALL);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [busy, setBusy] = React.useState(false);

  // Add dialog
  const [addOpen, setAddOpen] = React.useState(false);
  const [addText, setAddText] = React.useState("");
  const [addLanguage, setAddLanguage] = React.useState("");

  // Edit dialog
  const [editRow, setEditRow] = React.useState<TranslationRecord | null>(null);
  const [editText, setEditText] = React.useState("");

  // Delete confirm
  const [deleteId, setDeleteId] = React.useState<number | null>(null);

  // Find-missing results
  const [missing, setMissing] = React.useState<MissingDetails | null>(null);
  const [missingOpen, setMissingOpen] = React.useState(false);

  const loadLanguages = React.useCallback(async () => {
    try {
      const res = await fetch("/api/languages?enabled", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { languages: { name: string }[] };
      setLanguages(data.languages.map((l) => l.name).filter((n) => n !== "English"));
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
      setSelected(new Set());
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

  const toggleSelect = (id: number, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const toggleSelectAll = (checked: boolean) =>
    setSelected(checked ? new Set(rows.map((r) => r.id)) : new Set());

  const runAdd = async () => {
    if (!addText.trim() || !addLanguage) {
      toast.error("Enter text and pick a language.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/translations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalText: addText.trim(), language: addLanguage, type: "custom" }),
      });
      const data = (await res.json().catch(() => ({}))) as { warning?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Unable to add the translation.");
      toast[data.warning ? "warning" : "success"](data.warning ?? "Translation added.");
      setAddOpen(false);
      setAddText("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add the translation.");
    } finally {
      setBusy(false);
    }
  };

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

  const runRetry = async (id: number) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/translations/${id}/retry`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Unable to retry.");
      toast.success("Retried.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to retry.");
    } finally {
      setBusy(false);
    }
  };

  const runDelete = async () => {
    if (deleteId === null) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/translations/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Unable to delete.");
      toast.success("Deleted.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete.");
    } finally {
      setDeleteId(null);
      setBusy(false);
    }
  };

  const bulkRetry = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBusy(true);
    try {
      const res = await fetch("/api/translations/bulk-retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; translated?: number; failed?: number };
      if (!res.ok) throw new Error(data.error ?? "Unable to retry.");
      toast.success(`Retried ${data.translated ?? 0}, ${data.failed ?? 0} failed.`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to retry.");
    } finally {
      setBusy(false);
    }
  };

  const bulkDelete = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBusy(true);
    try {
      const res = await fetch("/api/translations/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error("Unable to delete.");
      toast.success("Deleted selected.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete.");
    } finally {
      setBusy(false);
    }
  };

  const scanMissing = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/translations/find-missing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ process: false }),
      });
      const data = (await res.json().catch(() => ({}))) as { details?: MissingDetails; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Scan failed.");
      setMissing(data.details ?? null);
      setMissingOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Scan failed.");
    } finally {
      setBusy(false);
    }
  };

  const queueMissing = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/translations/find-missing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ process: true }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        processed?: { translated: number; failed: number };
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Unable to queue translations.");
      toast.success(`Translated ${data.processed?.translated ?? 0}, ${data.processed?.failed ?? 0} failed.`);
      setMissingOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to queue translations.");
    } finally {
      setBusy(false);
    }
  };

  const recoverStuck = async () => {
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
  };

  const allSelected = rows.length > 0 && selected.size === rows.length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Review, correct, retry, and find missing translations for the enabled
        languages. Translations cover UI strings, the active announcement, and any
        custom strings you add.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={scanMissing} disabled={busy}>
          <Search className="mr-1 size-4" aria-hidden="true" />
          Find missing
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setAddOpen(true)} disabled={busy}>
          <Plus className="mr-1 size-4" aria-hidden="true" />
          Add translation
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={recoverStuck} disabled={busy}>
          <RotateCcw className="mr-1 size-4" aria-hidden="true" />
          Recover stuck
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={load} disabled={busy} className="ml-auto">
          <RefreshCw className="mr-1 size-4" aria-hidden="true" />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterLanguage} onValueChange={setFilterLanguage}>
          <SelectTrigger className="w-40">
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
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            {TRANSLATION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {TRANSLATION_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected.size > 0 ? (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <span className="tabular-nums text-muted-foreground">{selected.size} selected</span>
          <Button type="button" variant="outline" size="sm" onClick={bulkRetry} disabled={busy}>
            Retry selected
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={bulkDelete} disabled={busy}>
            Delete selected
          </Button>
        </div>
      ) : null}

      <div className="rounded-md border bg-card">
        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No translations yet. Use “Find missing” to scan content for enabled languages.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(c) => toggleSelectAll(c === true)}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Original</TableHead>
                <TableHead>Translation</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(row.id)}
                      onCheckedChange={(c) => toggleSelect(row.id, c === true)}
                      aria-label={`Select ${row.id}`}
                    />
                  </TableCell>
                  <TableCell className="max-w-[14rem] truncate" title={row.originalText}>
                    {row.originalText}
                  </TableCell>
                  <TableCell className="max-w-[14rem] truncate text-muted-foreground" title={row.translatedText ?? ""}>
                    {row.translatedText ?? "—"}
                  </TableCell>
                  <TableCell>{row.language}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{row.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditRow(row);
                          setEditText(row.translatedText ?? "");
                        }}
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => runRetry(row.id)} disabled={busy}>
                        <RefreshCw className="size-4" aria-hidden="true" />
                        <span className="sr-only">Retry</span>
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteId(row.id)}>
                        <Trash2 className="size-4 text-destructive" aria-hidden="true" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add translation</DialogTitle>
            <DialogDescription>Add a custom string and translate it into a language.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="tm-add-text">Original text (English)</Label>
              <Textarea id="tm-add-text" value={addText} onChange={(e) => setAddText(e.target.value)} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tm-add-lang">Language</Label>
              <Select value={addLanguage} onValueChange={setAddLanguage}>
                <SelectTrigger id="tm-add-lang">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setAddOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" onClick={runAdd} disabled={busy}>
              Add &amp; translate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
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
              <Textarea id="tm-edit-text" value={editText} onChange={(e) => setEditText(e.target.value)} rows={4} />
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

      {/* Find-missing results */}
      <Dialog open={missingOpen} onOpenChange={setMissingOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Missing translations</DialogTitle>
            <DialogDescription>
              {missing
                ? missing.count === 0
                  ? "Everything is translated for the enabled languages."
                  : `${missing.count} item(s) need translation.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {missing && missing.count > 0 ? (
            <div className="space-y-3 text-sm">
              <div>
                <p className="mb-1 font-medium">By language</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(missing.byLanguage).map(([lang, n]) => (
                    <Badge key={lang} variant="outline">
                      {lang}: {n}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 font-medium">By type</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(missing.byType).map(([t, n]) => (
                    <Badge key={t} variant="secondary">
                      {t}: {n}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setMissingOpen(false)} disabled={busy}>
              Close
            </Button>
            {missing && missing.count > 0 ? (
              <Button type="button" onClick={queueMissing} disabled={busy}>
                {busy ? "Translating…" : "Queue & translate"}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete translation?</AlertDialogTitle>
            <AlertDialogDescription>This removes the translation row. This cannot be undone.</AlertDialogDescription>
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
