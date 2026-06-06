// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";

import { HighlightOnArrival } from "./highlight-on-arrival";
import { MarkdownGuide } from "./markdown-guide";

type GuideArticleProps = {
  content: string;
};

/**
 * Client wrapper that renders a guide's markdown and runs the search-term
 * highlighter. `HighlightOnArrival` reads `?q=` via `useSearchParams`, which Next
 * requires inside a Suspense boundary on statically generated routes, so it is
 * wrapped here. This keeps the detail route itself a Server Component.
 */
export function GuideArticle({ content }: GuideArticleProps) {
  return (
    <>
      <MarkdownGuide content={content} />
      <React.Suspense fallback={null}>
        <HighlightOnArrival />
      </React.Suspense>
    </>
  );
}
