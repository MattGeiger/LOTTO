// SPDX-License-Identifier: AGPL-3.0-or-later
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiConfigDialog } from "@/components/translation/ai-config/ai-config-dialog";
import type { AiConfigPublic } from "@/lib/ai/types";
import { validateApiKeyForService } from "@/components/translation/ai-config/shared/validation";

afterEach(cleanup);
const next = () => fireEvent.click(screen.getByRole("button", { name: /^Next$/ }));
const oldConfig: AiConfigPublic = {
  id: 9, name: "Existing provider", serviceType: "OpenAI", model: "gpt-4o-mini-2024-07-18",
  inputCost: 0.123, outputCost: 0.456, unitPrice: "per_1k", temperature: 0, topP: 0,
  thinkingLevel: "high", maxTokens: 8192, inputTokenLimit: 128000, outputTokenLimit: 16384,
  isActive: false, hasApiKey: true, createdAt: 1, updatedAt: 2,
};

describe("simplified model wizard compatibility", () => {
  it("preserves a legacy model, custom prices, zero settings and the stored key through all six steps", async () => {
    const save = vi.fn().mockResolvedValue(true);
    render(<AiConfigDialog open mode="edit" config={oldConfig} onOpenChange={vi.fn()} onSave={save} />);
    expect(screen.getByLabelText("Model ID")).toHaveValue(oldConfig.model);
    expect(screen.getByRole("note")).toHaveTextContent(/retained for existing configurations/i);
    next();
    expect(screen.getByPlaceholderText("New API key (optional)")).toHaveValue("");
    next();
    expect(screen.getByLabelText("Input Rate")).toHaveValue("0.123");
    expect(screen.getByText(/LOTTO does not track spending/)).toBeInTheDocument();
    next();
    next();
    expect(screen.getAllByRole("slider").map((el) => el.getAttribute("aria-valuenow"))).toEqual(["0", "0"]);
    next();
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    const input = save.mock.calls[0][0];
    expect(input).toMatchObject({ model: oldConfig.model, inputCost: 0.123, outputCost: 0.456, unitPrice: "per_1k", temperature: 0, topP: 0, isActive: false });
    expect(input).not.toHaveProperty("apiKey");
  });

  it("keeps unsupported sampling out of the existing Parameters step", () => {
    render(<AiConfigDialog open mode="edit" config={{ ...oldConfig, model: "gpt-5.6-luna" }} onOpenChange={vi.fn()} onSave={vi.fn()} />);
    next(); next(); next(); next();
    expect(screen.queryAllByRole("slider")).toHaveLength(0);
    expect(screen.getByText(/does not accept temperature/)).toBeInTheDocument();
    next();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeEnabled();
  });

  it("accepts provider key formats without warning on underscores or the Google AQ prefix", () => {
    expect(validateApiKeyForService(`AQ.${"a".repeat(40)}`, "Google")).toEqual({});
    expect(validateApiKeyForService(`sk-ant-api03-${"a_".repeat(20)}`, "Anthropic")).toEqual({});
  });
});
