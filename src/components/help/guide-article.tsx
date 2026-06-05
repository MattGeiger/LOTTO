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
