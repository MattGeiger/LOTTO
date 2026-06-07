// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";
import { AlertTriangle, KeyRound, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { MODEL_SUGGESTIONS } from "@/lib/ai/model-specs";
import { AI_SERVICE_TYPES, type AiConfigPublic, type AiServiceType } from "@/lib/ai/types";

type FormState = {
  name: string;
  serviceType: AiServiceType;
  model: string;
  apiKey: string;
  inputCost: string;
  outputCost: string;
  unitPrice: "per_1m" | "per_1k";
  maxTokens: string;
  isActive: boolean;
};

const emptyForm = (): FormState => ({
  name: "",
  serviceType: "Anthropic",
  model: "",
  apiKey: "",
  inputCost: "",
  outputCost: "",
  unitPrice: "per_1m",
  maxTokens: "",
  isActive: true,
});

const numOrUndef = (value: string): number | undefined => {
  if (value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

export function AiConfigTab() {
  const [configs, setConfigs] = React.useState<AiConfigPublic[]>([]);
  const [encryptionConfigured, setEncryptionConfigured] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [form, setForm] = React.useState<FormState>(emptyForm());
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
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
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (config: AiConfigPublic) => {
    setEditingId(config.id);
    setForm({
      name: config.name,
      serviceType: config.serviceType,
      model: config.model,
      apiKey: "",
      inputCost: config.inputCost ? String(config.inputCost) : "",
      outputCost: config.outputCost ? String(config.outputCost) : "",
      unitPrice: config.unitPrice,
      maxTokens: config.maxTokens ? String(config.maxTokens) : "",
      isActive: config.isActive,
    });
    setDialogOpen(true);
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    serviceType: form.serviceType,
    model: form.model.trim(),
    ...(form.apiKey ? { apiKey: form.apiKey } : {}),
    inputCost: numOrUndef(form.inputCost),
    outputCost: numOrUndef(form.outputCost),
    unitPrice: form.unitPrice,
    maxTokens: numOrUndef(form.maxTokens) ?? null,
    isActive: form.isActive,
  });

  const testKey = async () => {
    if (!form.apiKey) {
      toast.error("Enter an API key to test.");
      return;
    }
    setTesting(true);
    try {
      const res = await fetch("/api/ai-config/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceType: form.serviceType, apiKey: form.apiKey }),
      });
      const data = (await res.json()) as { result?: { ok: boolean; message: string } };
      if (data.result?.ok) toast.success(data.result.message);
      else toast.error(data.result?.message ?? "Validation failed.");
    } catch {
      toast.error("Unable to validate the API key.");
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    if (!form.name.trim() || !form.model.trim()) {
      toast.error("Name and model are required.");
      return;
    }
    if (editingId === null && !form.apiKey) {
      toast.error("An API key is required.");
      return;
    }
    setSaving(true);
    try {
      const url = editingId === null ? "/api/ai-config" : `/api/ai-config/${editingId}`;
      const method = editingId === null ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Unable to save the configuration.");
      }
      toast.success(editingId === null ? "Configuration added." : "Configuration updated.");
      setDialogOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save the configuration.");
    } finally {
      setSaving(false);
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
          <ul className="divide-y">
            {configs.map((config) => (
              <li key={config.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{config.name}</span>
                    <Badge variant="secondary">{config.serviceType}</Badge>
                    {!config.isActive ? <Badge variant="outline">inactive</Badge> : null}
                    {config.hasApiKey ? (
                      <Badge variant="outline" className="text-muted-foreground">
                        <KeyRound className="size-3" aria-hidden="true" /> key set
                      </Badge>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{config.model}</p>
                </div>
                <div className="flex items-center gap-1">
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteId(config.id)}
                  >
                    <Trash2 className="size-4 text-destructive" aria-hidden="true" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId === null ? "Add configuration" : "Edit configuration"}</DialogTitle>
            <DialogDescription>
              {editingId === null
                ? "Add an AI provider and API key for translation."
                : "Update this configuration. Leave the API key blank to keep the stored one."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ai-name">Name</Label>
              <Input
                id="ai-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Primary translator"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ai-provider">Provider</Label>
                <Select
                  value={form.serviceType}
                  onValueChange={(v) => setForm((f) => ({ ...f, serviceType: v as AiServiceType }))}
                >
                  <SelectTrigger id="ai-provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_SERVICE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ai-model">Model</Label>
                <Input
                  id="ai-model"
                  list="ai-model-suggestions"
                  value={form.model}
                  onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                  placeholder="model id"
                />
                <datalist id="ai-model-suggestions">
                  {MODEL_SUGGESTIONS[form.serviceType].map((model) => (
                    <option key={model} value={model} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ai-key">API key</Label>
              <div className="flex gap-2">
                <Input
                  id="ai-key"
                  type="password"
                  autoComplete="off"
                  value={form.apiKey}
                  onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                  placeholder={editingId === null ? "Paste API key" : "Leave blank to keep"}
                />
                <Button type="button" variant="outline" size="sm" onClick={testKey} disabled={testing}>
                  {testing ? "Testing…" : "Test"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ai-in-cost">Input cost</Label>
                <Input
                  id="ai-in-cost"
                  inputMode="decimal"
                  value={form.inputCost}
                  onChange={(e) => setForm((f) => ({ ...f, inputCost: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ai-out-cost">Output cost</Label>
                <Input
                  id="ai-out-cost"
                  inputMode="decimal"
                  value={form.outputCost}
                  onChange={(e) => setForm((f) => ({ ...f, outputCost: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ai-unit">Per</Label>
                <Select
                  value={form.unitPrice}
                  onValueChange={(v) => setForm((f) => ({ ...f, unitPrice: v as "per_1m" | "per_1k" }))}
                >
                  <SelectTrigger id="ai-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_1m">1M tokens</SelectItem>
                    <SelectItem value="per_1k">1K tokens</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <Label htmlFor="ai-max-tokens">Max output tokens (optional)</Label>
                <Input
                  id="ai-max-tokens"
                  inputMode="numeric"
                  value={form.maxTokens}
                  onChange={(e) => setForm((f) => ({ ...f, maxTokens: e.target.value }))}
                  placeholder="auto"
                  className="w-32"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
                />
                Active
              </label>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
