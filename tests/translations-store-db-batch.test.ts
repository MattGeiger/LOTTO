// SPDX-License-Identifier: AGPL-3.0-or-later

import { describe, expect, it, vi } from "vitest";

import { bulkUpdate } from "@/lib/translation/translations-store-db";

describe("Postgres translation batch updates", () => {
  it("sends every patch through one jsonb_to_recordset update", async () => {
    const now = new Date().toISOString();
    const sql = vi.fn(async () => [
      {
        id: 1,
        original_text: "Hello",
        translated_text: "Zdravo",
        status: "completed",
        language: "Bosnian",
        type: "ui_string",
        metadata: { batchId: "batch-1" },
        prompt_tokens: 5,
        completion_tokens: 3,
        total_cost: 0.0000017,
        created_at: now,
        updated_at: now,
      },
      {
        id: 2,
        original_text: "Continue",
        translated_text: "Nastavi",
        status: "completed",
        language: "Bosnian",
        type: "ui_string",
        metadata: { batchId: "batch-1" },
        prompt_tokens: 6,
        completion_tokens: 4,
        total_cost: 0.0000022,
        created_at: now,
        updated_at: now,
      },
    ]);

    const result = await bulkUpdate(
      [
        {
          id: 1,
          translatedText: "Zdravo",
          status: "completed",
          metadata: { batchId: "batch-1" },
          promptTokens: 5,
          completionTokens: 3,
          totalCost: 0.0000017,
        },
        {
          id: 2,
          translatedText: "Nastavi",
          status: "completed",
          metadata: { batchId: "batch-1" },
          promptTokens: 6,
          completionTokens: 4,
          totalCost: 0.0000022,
        },
      ],
      sql as never,
    );

    expect(sql).toHaveBeenCalledTimes(1);
    const [strings, payload] = sql.mock.calls[0];
    expect(String(strings)).toContain("jsonb_to_recordset");
    expect(JSON.parse(String(payload))).toHaveLength(2);
    expect(result.map((record) => record.id)).toEqual([1, 2]);
    expect(result[0].translatedText).toBe("Zdravo");
  });
});
