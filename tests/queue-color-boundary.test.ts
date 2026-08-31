// SPDX-License-Identifier: AGPL-3.0-or-later

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const adminSource = readFileSync(
  path.join(process.cwd(), "src/app/admin/admin-page-client.tsx"),
  "utf8",
);

describe("queue color boundary", () => {
  it("uses Primary for Live State values and the complete Next up treatment", () => {
    const liveState = adminSource.slice(
      adminSource.indexOf("Live State"),
      adminSource.indexOf("{/* Row 5: full width */}"),
    );

    expect(liveState.match(/text-lg font-semibold text-primary/g)).toHaveLength(7);
    expect(liveState).toContain('className="ticket-serving');
    expect(liveState).toContain("border-current bg-transparent");
    expect(liveState).not.toMatch(/status-success|gradient-status-success|variant="success"/);
  });

  it("keeps Returned and Unclaimed on their protected canonical tokens", () => {
    const protectedStatuses = adminSource.slice(
      adminSource.indexOf("{/* Row 5: full width */}"),
      adminSource.indexOf("{/* Row 7: full width */}"),
    );

    expect(protectedStatuses).toContain("--status-danger-border");
    expect(protectedStatuses).toContain("--ticket-returned-text");
    expect(protectedStatuses).toContain("bg-gradient-status-danger");
    expect(protectedStatuses).toContain("--status-warning-border");
    expect(protectedStatuses).toContain("--ticket-unclaimed-text");
    expect(protectedStatuses).toContain("bg-gradient-status-warning");

    expect(protectedStatuses.indexOf("Unclaimed tickets")).toBeLessThan(
      protectedStatuses.indexOf("Returned tickets"),
    );
  });
});
