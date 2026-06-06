// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";
import { Bold, Code, ExternalLink, Eye, Italic, List, ListOrdered, RemoveFormatting, TypeOutline } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MarkdownGuideContent } from "@/components/help/markdown-guide";
import { cn } from "@/lib/utils";

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
};

/**
 * A small markdown editor with format-control buttons (so authors don't need to
 * know Markdown) and an Edit Code / Live Preview toggle. Stores plain Markdown;
 * the preview reuses the shared `MarkdownGuideContent` renderer.
 */
export function MarkdownEditor({ value, onChange, id, ariaLabel, placeholder, className }: MarkdownEditorProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [view, setView] = React.useState<"code" | "preview">("code");
  const [selStart, setSelStart] = React.useState(0);

  const syncSelection = () => {
    const el = textareaRef.current;
    if (el) setSelStart(el.selectionStart);
  };

  // Is the line at the caret already a heading? Drives the Title toggle icon.
  const lineStart = value.lastIndexOf("\n", selStart - 1) + 1;
  const lineEndNl = value.indexOf("\n", lineStart);
  const currentLine = value.slice(lineStart, lineEndNl === -1 ? value.length : lineEndNl);
  const currentLineIsHeading = /^#{1,6}\s/.test(currentLine);

  const applyChange = (next: string, selectionStart: number, selectionEnd: number) => {
    onChange(next);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(selectionStart, selectionEnd);
      setSelStart(selectionStart);
    });
  };

  const wrapSelection = (marker: string, placeholderText: string) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? selStart;
    const end = el?.selectionEnd ?? start;
    const selected = value.slice(start, end) || placeholderText;
    const next = value.slice(0, start) + marker + selected + marker + value.slice(end);
    applyChange(next, start + marker.length, start + marker.length + selected.length);
  };

  const prefixLines = (makePrefix: (index: number) => string) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? selStart;
    const end = el?.selectionEnd ?? start;
    const blockStart = value.lastIndexOf("\n", start - 1) + 1;
    const blockEndNl = value.indexOf("\n", end);
    const blockEnd = blockEndNl === -1 ? value.length : blockEndNl;
    const block = value.slice(blockStart, blockEnd);
    const newBlock = block
      .split("\n")
      .map((line, index) => makePrefix(index) + line)
      .join("\n");
    const next = value.slice(0, blockStart) + newBlock + value.slice(blockEnd);
    applyChange(next, blockStart, blockStart + newBlock.length);
  };

  const toggleHeading = () => {
    const blockStart = value.lastIndexOf("\n", selStart - 1) + 1;
    const blockEndNl = value.indexOf("\n", blockStart);
    const blockEnd = blockEndNl === -1 ? value.length : blockEndNl;
    const line = value.slice(blockStart, blockEnd);
    const newLine = /^#{1,6}\s/.test(line) ? line.replace(/^#{1,6}\s+/, "") : `## ${line}`;
    const next = value.slice(0, blockStart) + newLine + value.slice(blockEnd);
    applyChange(next, blockStart, blockStart + newLine.length);
  };

  const inPreview = view === "preview";
  const toolButton = "h-8 w-8";

  return (
    <div className={cn("rounded-md border bg-background", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b p-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={toolButton}
          disabled={inPreview}
          aria-pressed={currentLineIsHeading}
          aria-label={currentLineIsHeading ? "Remove title formatting" : "Make title"}
          title={currentLineIsHeading ? "Remove formatting" : "Title"}
          onClick={toggleHeading}
        >
          {currentLineIsHeading ? <RemoveFormatting className="h-4 w-4" /> : <TypeOutline className="h-4 w-4" />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={toolButton}
          disabled={inPreview}
          aria-label="Bold"
          title="Bold"
          onClick={() => wrapSelection("**", "bold text")}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={toolButton}
          disabled={inPreview}
          aria-label="Italic"
          title="Italic"
          onClick={() => wrapSelection("_", "italic text")}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={toolButton}
          disabled={inPreview}
          aria-label="Bulleted list"
          title="Bulleted list"
          onClick={() => prefixLines(() => "- ")}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={toolButton}
          disabled={inPreview}
          aria-label="Numbered list"
          title="Numbered list"
          onClick={() => prefixLines((index) => `${index + 1}. `)}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="ml-auto inline-flex items-center gap-1 rounded-md border p-0.5">
          <Button
            type="button"
            variant={inPreview ? "ghost" : "secondary"}
            size="sm"
            className="h-7 gap-1.5 px-2"
            aria-pressed={!inPreview}
            onClick={() => setView("code")}
          >
            <Code className="h-3.5 w-3.5" />
            Edit code
          </Button>
          <Button
            type="button"
            variant={inPreview ? "secondary" : "ghost"}
            size="sm"
            className="h-7 gap-1.5 px-2"
            aria-pressed={inPreview}
            onClick={() => setView("preview")}
          >
            <Eye className="h-3.5 w-3.5" />
            Live preview
          </Button>
        </div>
      </div>

      {inPreview ? (
        <div className="min-h-[180px] space-y-4 p-4">
          {value.trim() ? (
            <MarkdownGuideContent content={value} />
          ) : (
            <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
          )}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          aria-label={ariaLabel}
          placeholder={placeholder ?? "Write your announcement..."}
          onChange={(event) => {
            onChange(event.target.value);
            syncSelection();
          }}
          onSelect={syncSelection}
          onClick={syncSelection}
          onKeyUp={syncSelection}
          className="min-h-[180px] w-full resize-y rounded-b-md bg-transparent px-3 py-2 font-mono text-sm outline-none placeholder:text-muted-foreground"
        />
      )}

      <div className="border-t px-3 py-1.5 text-right">
        <a
          href="/help/markdown-formatting"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Markdown formatting help
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
