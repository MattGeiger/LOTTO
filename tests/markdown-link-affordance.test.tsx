// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE.

/*
 * Links in rendered Markdown must carry the conventional affordance — blue and
 * underlined — so a reader can tell they are interactive. Announcements, Help
 * articles and Release Notes all render through MarkdownGuideContent, so this
 * covers every surface at once.
 *
 * Colour comes from the brand-independent `--link` token in
 * `src/app/styles/shared/links.css`, not from the active brand: a link is a
 * universal affordance, and a green link inside Lift Up's green body copy
 * would carry no signal. Asserting the class rather than a computed colour
 * keeps this meaningful in jsdom, which does not load the stylesheet.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MarkdownGuideContent } from "@/components/help/markdown-guide";

const linkFor = (markdown: string, name: string) => {
  render(<MarkdownGuideContent content={markdown} />);
  return screen.getByRole("link", { name });
};

describe("rendered Markdown link affordance", () => {
  it("gives external links the link colour and an underline", () => {
    const link = linkFor("[the schedule](https://example.org/schedule)", "the schedule");
    expect(link.className).toContain("text-link");
    expect(link.className).toContain("underline");
  });

  it("gives internal links the same treatment", () => {
    const link = linkFor("[Help](/help)", "Help");
    expect(link.className).toContain("text-link");
    expect(link.className).toContain("underline");
  });

  it("underlines without requiring the legacy title=\"underline\" opt-in", () => {
    // Before this change the renderer underlined only when the Markdown carried
    // `title="underline"`, so ordinary links rendered as plain body text.
    const plain = linkFor("[plain](https://example.org)", "plain");
    expect(plain.className).toContain("underline");
  });

  it("styles the angle-bracket autolink the announcement editor produces", () => {
    // This is the real-world shape. Typing a bare URL in the editor creates a
    // link mark, which tiptap-markdown serializes as CommonMark `<url>`. That
    // is a different feature from GFM autolink-literal, which remarkGfmSafe
    // intentionally drops (see docs/BROWSER_SUPPORT.md and ISSUES.md Issue 5),
    // so `<url>` renders as a real anchor and must carry the affordance.
    const link = linkFor(
      "Looking for food? Click below:\n\n<https://foodfinder.oregonfoodbank.org>",
      "https://foodfinder.oregonfoodbank.org",
    );
    expect(link).toHaveAttribute("href", "https://foodfinder.oregonfoodbank.org");
    expect(link.className).toContain("text-link");
    expect(link.className).toContain("underline");
  });

  it("still honours content that passes the legacy title attribute", () => {
    const link = linkFor('[legacy](https://example.org "underline")', "legacy");
    expect(link.className).toContain("underline");
    expect(link.className).toContain("text-link");
  });
});
