// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

// Multi-step AI configuration wizard. Reproduces FEED's BaseAIConfigDialog
// layout (per-step icon/title/description in a fixed-height scroll area, with
// Back / Next / Create-or-Save navigation) using LOTTO's shadcn primitives.

"use client";

import * as React from "react";
import { Bot, DollarSign, Gauge, KeyRound, Settings, type LucideIcon } from "lucide-react";
import { toast } from "sonner";

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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  CUSTOM_MODEL,
  getModelNames,
  getModelSpec,
  getModelSpecByModel,
  getModelSpecsForService,
  type ModelSpec,
} from "@/lib/ai/model-specs";
import {
  AI_SERVICE_TYPES,
  type AiConfigInput,
  type AiConfigPublic,
  type AiServiceType,
} from "@/lib/ai/types";

export type AiConfigDialogMode = "add" | "edit";

type FormState = {
  name: string;
  serviceType: AiServiceType;
  /** Dropdown selection: a preset model name or "Custom". */
  modelName: string;
  /** API model id sent to the provider (preset's `model`, or the custom value). */
  model: string;
  apiKey: string;
  inputCost: string;
  outputCost: string;
  unitPrice: "per_1m" | "per_1k";
  inputTokenLimit: string;
  outputTokenLimit: string;
  maxTokens: string;
  isActive: boolean;
};

// Fill cost/token fields from a preset spec (prices are USD per 1M tokens).
const applySpec = (form: FormState, spec: ModelSpec): FormState => ({
  ...form,
  model: spec.model,
  inputCost: String(spec.inputPrice),
  outputCost: String(spec.outputPrice),
  unitPrice: "per_1m",
  inputTokenLimit: String(spec.inputTokenLimit),
  outputTokenLimit: spec.outputTokenLimit ? String(spec.outputTokenLimit) : "",
  maxTokens: spec.outputTokenLimit ? String(spec.outputTokenLimit) : "",
});

const defaultsForService = (serviceType: AiServiceType): FormState => {
  const base: FormState = {
    name: "",
    serviceType,
    modelName: CUSTOM_MODEL,
    model: "",
    apiKey: "",
    inputCost: "",
    outputCost: "",
    unitPrice: "per_1m",
    inputTokenLimit: "",
    outputTokenLimit: "",
    maxTokens: "",
    isActive: true,
  };
  const first = getModelSpecsForService(serviceType)[0];
  if (!first) return base;
  return applySpec({ ...base, modelName: first.name }, first);
};

const emptyForm = (): FormState => defaultsForService("Anthropic");

const fromConfig = (config: AiConfigPublic): FormState => {
  const spec = getModelSpecByModel(config.model);
  return {
    name: config.name,
    serviceType: config.serviceType,
    modelName: spec?.name ?? CUSTOM_MODEL,
    model: config.model,
    apiKey: "",
    inputCost: config.inputCost ? String(config.inputCost) : "",
    outputCost: config.outputCost ? String(config.outputCost) : "",
    unitPrice: config.unitPrice,
    inputTokenLimit: config.inputTokenLimit ? String(config.inputTokenLimit) : "",
    outputTokenLimit: config.outputTokenLimit ? String(config.outputTokenLimit) : "",
    maxTokens: config.maxTokens ? String(config.maxTokens) : "",
    isActive: config.isActive,
  };
};

const numOrNull = (value: string): number | null => {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

function StepShell({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-2">
      <div className="space-y-4">
        <div className="text-center">
          <Icon className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden="true" />
          <h3 className="mt-2 text-lg font-medium">{title}</h3>
          <p className="mb-4 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}

type StepId = "service" | "apikey" | "cost" | "tokens" | "name";

const STEP_ORDER: StepId[] = ["service", "apikey", "cost", "tokens", "name"];

export function AiConfigDialog({
  open,
  onOpenChange,
  mode,
  config,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: AiConfigDialogMode;
  config?: AiConfigPublic | null;
  onSave: (input: AiConfigInput) => Promise<boolean>;
}) {
  const [stepIndex, setStepIndex] = React.useState(0);
  const [form, setForm] = React.useState<FormState>(emptyForm());
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setStepIndex(0);
      setForm(mode === "edit" && config ? fromConfig(config) : emptyForm());
    }
  }, [open, mode, config]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const stepId = STEP_ORDER[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEP_ORDER.length - 1;

  const stepValid = (): boolean => {
    if (stepId === "service") return Boolean(form.serviceType && form.model.trim());
    if (stepId === "apikey") return mode === "edit" || form.apiKey.trim().length > 0;
    if (stepId === "name") return form.name.trim().length >= 3;
    return true; // cost + tokens are optional
  };

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

  const handleSave = async () => {
    setSaving(true);
    try {
      const input: AiConfigInput = {
        name: form.name.trim(),
        serviceType: form.serviceType,
        model: form.model.trim(),
        ...(form.apiKey ? { apiKey: form.apiKey } : {}),
        inputCost: numOrNull(form.inputCost) ?? 0,
        outputCost: numOrNull(form.outputCost) ?? 0,
        unitPrice: form.unitPrice,
        inputTokenLimit: numOrNull(form.inputTokenLimit),
        outputTokenLimit: numOrNull(form.outputTokenLimit),
        maxTokens: numOrNull(form.maxTokens),
        isActive: form.isActive,
      };
      const success = await onSave(input);
      if (success) onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add AI configuration" : "Edit AI configuration"}</DialogTitle>
          <DialogDescription>
            Step {stepIndex + 1} of {STEP_ORDER.length}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[360px]">
          {stepId === "service" ? (
            <StepShell icon={Bot} title="Service configuration" description="Choose the AI service and model.">
              <div className="space-y-2">
                <Label htmlFor="wiz-provider">Provider</Label>
                <Select
                  value={form.serviceType}
                  onValueChange={(v) => setForm(defaultsForService(v as AiServiceType))}
                >
                  <SelectTrigger id="wiz-provider">
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
              <div className="space-y-2">
                <Label htmlFor="wiz-model">Model</Label>
                <Select
                  value={form.modelName}
                  onValueChange={(name) => {
                    if (name === CUSTOM_MODEL) {
                      setForm((f) => ({ ...f, modelName: CUSTOM_MODEL, model: "" }));
                      return;
                    }
                    const spec = getModelSpec(name, form.serviceType);
                    setForm((f) => (spec ? applySpec({ ...f, modelName: name }, spec) : { ...f, modelName: name }));
                  }}
                >
                  <SelectTrigger id="wiz-model">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {getModelNames(form.serviceType).map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.modelName === CUSTOM_MODEL ? (
                  <Input
                    aria-label="Custom model id"
                    value={form.model}
                    onChange={(e) => set("model", e.target.value)}
                    placeholder="Enter model id (e.g. gpt-4o-mini-2024-07-18)"
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Cost and token limits are pre-filled from this model&apos;s template — adjust on the next steps if needed.
                  </p>
                )}
              </div>
            </StepShell>
          ) : null}

          {stepId === "apikey" ? (
            <StepShell
              icon={KeyRound}
              title="API credentials"
              description={mode === "add" ? "Enter your provider API key." : "API key (already configured)."}
            >
              <div className="space-y-2">
                <Label htmlFor="wiz-key">API key</Label>
                {mode === "add" ? (
                  <>
                    <div className="flex gap-2">
                      <Input
                        id="wiz-key"
                        type="password"
                        autoComplete="new-password"
                        value={form.apiKey}
                        onChange={(e) => set("apiKey", e.target.value)}
                        placeholder="Paste API key"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={testKey} disabled={testing}>
                        {testing ? "Testing…" : "Test"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Keys are encrypted at rest and never displayed again.
                    </p>
                  </>
                ) : (
                  <>
                    <Input type="password" value="••••••••••••••••" disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground">
                      The stored key is encrypted and cannot be viewed. Enter a new key below to replace it.
                    </p>
                    <div className="flex gap-2 pt-1">
                      <Input
                        type="password"
                        autoComplete="new-password"
                        value={form.apiKey}
                        onChange={(e) => set("apiKey", e.target.value)}
                        placeholder="New key (optional)"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={testKey} disabled={testing}>
                        {testing ? "Testing…" : "Test"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </StepShell>
          ) : null}

          {stepId === "cost" ? (
            <StepShell icon={DollarSign} title="Cost tracking" description="Optional pricing for cost estimates.">
              <div className="space-y-2">
                <Label htmlFor="wiz-unit">Unit price</Label>
                <Select value={form.unitPrice} onValueChange={(v) => set("unitPrice", v as "per_1m" | "per_1k")}>
                  <SelectTrigger id="wiz-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_1m">Per 1M tokens</SelectItem>
                    <SelectItem value="per_1k">Per 1K tokens</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="wiz-in-cost">Input cost</Label>
                  <Input
                    id="wiz-in-cost"
                    inputMode="decimal"
                    value={form.inputCost}
                    onChange={(e) => set("inputCost", e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wiz-out-cost">Output cost</Label>
                  <Input
                    id="wiz-out-cost"
                    inputMode="decimal"
                    value={form.outputCost}
                    onChange={(e) => set("outputCost", e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </StepShell>
          ) : null}

          {stepId === "tokens" ? (
            <StepShell icon={Gauge} title="Token limits" description="Optional input/output token limits.">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="wiz-in-tok">Input token limit</Label>
                  <Input
                    id="wiz-in-tok"
                    inputMode="numeric"
                    value={form.inputTokenLimit}
                    onChange={(e) => set("inputTokenLimit", e.target.value)}
                    placeholder="auto"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wiz-out-tok">Output token limit</Label>
                  <Input
                    id="wiz-out-tok"
                    inputMode="numeric"
                    value={form.outputTokenLimit}
                    onChange={(e) => set("outputTokenLimit", e.target.value)}
                    placeholder="auto"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wiz-max-tok">Max output tokens</Label>
                <Input
                  id="wiz-max-tok"
                  inputMode="numeric"
                  value={form.maxTokens}
                  onChange={(e) => set("maxTokens", e.target.value)}
                  placeholder="auto"
                />
              </div>
            </StepShell>
          ) : null}

          {stepId === "name" ? (
            <StepShell icon={Settings} title="Configuration details" description="Name this configuration.">
              <div className="space-y-2">
                <Label htmlFor="wiz-name">Name</Label>
                <Input
                  id="wiz-name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Primary translator"
                />
                <p className="text-xs text-muted-foreground">At least 3 characters.</p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.isActive} onCheckedChange={(c) => set("isActive", c)} />
                Active
              </label>
            </StepShell>
          ) : null}
        </ScrollArea>

        <div className="flex justify-between pt-4">
          {isFirst ? (
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setStepIndex((i) => i - 1)} disabled={saving}>
              Back
            </Button>
          )}
          {isLast ? (
            <Button onClick={handleSave} disabled={!stepValid() || saving}>
              {saving ? (mode === "add" ? "Creating…" : "Saving…") : mode === "add" ? "Create" : "Save changes"}
            </Button>
          ) : (
            <Button
              onClick={() => {
                if (!stepValid()) {
                  toast.error("Please complete this step before continuing.");
                  return;
                }
                setStepIndex((i) => i + 1);
              }}
            >
              Next
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
