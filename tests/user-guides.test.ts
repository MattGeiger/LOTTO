import { describe, expect, it } from "vitest";

import {
  buildUserGuidesFromModules,
  cleanHeadingText,
  getGuideSearchEntries,
  getGuideToc,
  markdownToPlainText,
  parseFilename,
  rewriteGuideLink,
} from "@/lib/user-guides";

const SAMPLE = `# Getting Started

A quick tour of LOTTO and where to go.

## What LOTTO Does

LOTTO runs a fair, transparent ticket queue.

## Setup

First setup section.

## Setup

Duplicate heading should get a unique id.

\`\`\`
## Not A Heading (inside a fence)
\`\`\`
`;

describe("parseFilename", () => {
  it("extracts order and slug from an NN-slug.md filename", () => {
    expect(parseFilename("03-display-board.md")).toEqual({ order: 3, slug: "display-board" });
  });

  it("returns null for non-conforming names", () => {
    expect(parseFilename("notes.md")).toBeNull();
    expect(parseFilename("readme.txt")).toBeNull();
  });
});

describe("buildUserGuidesFromModules", () => {
  it("parses, titles, describes, and sorts guides by order", () => {
    const guides = buildUserGuidesFromModules({
      "/x/02-second.md": "# Second\n\nSecond intro.\n",
      "/x/01-first.md": "# First\n\nFirst intro.\n",
      "/x/skip-me.md": "# Skipped\n",
    });

    expect(guides.map((g) => g.slug)).toEqual(["first", "second"]);
    expect(guides[0]).toMatchObject({ order: 1, title: "First", description: "First intro." });
  });
});

describe("getGuideToc", () => {
  it("collects H2/H3 headings, de-duplicates ids, and ignores fenced lines", () => {
    const toc = getGuideToc(SAMPLE);
    expect(toc.map((item) => item.id)).toEqual(["what-lotto-does", "setup", "setup-1"]);
    expect(toc.every((item) => item.depth === 2)).toBe(true);
    expect(toc.some((item) => item.title.includes("Not A Heading"))).toBe(false);
  });
});

describe("getGuideSearchEntries", () => {
  it("creates one entry per section with plain-text content", () => {
    const [guide] = buildUserGuidesFromModules({ "/x/01-getting-started.md": SAMPLE });
    const entries = getGuideSearchEntries(guide);

    expect(entries.map((e) => e.sectionId)).toEqual(["what-lotto-does", "setup", "setup-1"]);
    const first = entries[0];
    expect(first.id).toBe("getting-started:what-lotto-does");
    expect(first.guideTitle).toBe("Getting Started");
    expect(first.content).toContain("fair, transparent ticket queue");
  });
});

describe("rewriteGuideLink", () => {
  it("rewrites relative guide links to /help routes and preserves hashes", () => {
    expect(rewriteGuideLink("02-staff-controls.md")).toBe("/help/staff-controls");
    expect(rewriteGuideLink("03-display-board.md#languages")).toBe("/help/display-board#languages");
  });

  it("leaves external, mailto, and hash links untouched", () => {
    expect(rewriteGuideLink("https://example.com")).toBe("https://example.com");
    expect(rewriteGuideLink("mailto:a@b.com")).toBe("mailto:a@b.com");
    expect(rewriteGuideLink("#section")).toBe("#section");
  });
});

describe("markdown helpers", () => {
  it("strips inline markdown to plain text", () => {
    expect(markdownToPlainText("**bold** and `code` and [link](http://x)")).toBe("bold and code and link");
  });

  it("cleans heading decorations", () => {
    expect(cleanHeadingText("Setup `now` *please*")).toBe("Setup now please");
  });
});
