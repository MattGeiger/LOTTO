// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";
import { AlertTriangle, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AiConfigDialog, type AiConfigDialogMode } from "@/components/translation/ai-config/ai-config-dialog";
import type { AiConfigInput, AiConfigPublic } from "@/lib/ai/types";

export function AiConfigTab() {
  const [configs, setConfigs] = React.useState<AiConfigPublic[]>([]);
  const [encryptionConfigured, setEncryptionConfigured] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<AiConfigDialogMode>("add");
  const [editing, setEditing] = React.useState<AiConfigPublic | null>(null);
  const [deleteId, setDeleteId] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai-config", { cache: "no-store" });
      if (!res.ok) throw new Error("Unable to load AI configurations.");
      const data = (await res.json()) as { configs: AiConfigPublic[]; encryptionConfigured: boolean };
      setConfigs(data.configs);
      setEncryptionConfigured(data.encryptionConfigured);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load AI configurations.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const openAdd = () => {
    setDialogMode("add");
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (config: AiConfigPublic) => {
    setDialogMode("edit");
    setEditing(config);
    setDialogOpen(true);
  };

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

  const validateExisting = async (id: number) => {
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
  };

  const confirmDelete = async () => {
    if (deleteId === null) return;
    try {
      const res = await fetch(`/api/ai-config/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Unable to delete the configuration.");
      toast.success("Configuration deleted.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete the configuration.");
    } finally {
      setDeleteId(null);
    }
  };

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

      <div className="flex items-center justify-between">
        <span className="text-sm tabular-nums text-muted-foreground">
          {configs.length} configuration{configs.length === 1 ? "" : "s"}
        </span>
        <Button type="button" size="sm" onClick={openAdd} disabled={loading || !encryptionConfigured}>
          <Plus className="mr-1 size-4" aria-hidden="true" />
          Add configuration
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        ) : configs.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No AI configurations yet. Add one to enable translation.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell className="font-medium">{config.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{config.serviceType}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{config.model}</TableCell>
                  <TableCell>
                    {config.isActive ? (
                      <Badge variant="outline" className="border-status-success-border text-status-success-text">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => validateExisting(config.id)}
                        title="Test the stored API key"
                      >
                        <ShieldCheck className="size-4" aria-hidden="true" />
                        <span className="sr-only">Test key</span>
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(config)}>
                        <Pencil className="size-4" aria-hidden="true" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteId(config.id)}>
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

      <AiConfigDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        config={editing}
        onSave={handleSave}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
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
