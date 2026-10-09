import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FOODS } from "@/arcade/game/memory-grid/engine";

describe("Memory Grid artwork provenance", () => {
  it("ships every engine food as an unchanged 16x16 PNG with a matching credit manifest", () => {
    const root = path.join(process.cwd(), "public/arcade/memory-grid");
    const manifest = JSON.parse(readFileSync(path.join(root, "asset-manifest.json"), "utf8")) as {
      license: string; creator: string; files: Array<{file: string; sha256: string}>;
    };
    expect(manifest.license).toBe("CC0-1.0");
    expect(manifest.creator).toBe("Henry Software");
    expect(manifest.files).toHaveLength(FOODS.length);
    for (const food of FOODS) {
      const file = `food/${food.file}.png`;
      const bytes = readFileSync(path.join(root, file));
      expect(bytes.subarray(1, 4).toString()).toBe("PNG");
      expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([16, 16]);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(manifest.files.find(entry => entry.file === file)?.sha256);
    }
  });
});
