"use client";

import * as React from "react";

import { useAppHaptics } from "@/components/haptics-provider";
import { MarkdownGuideContent } from "@/components/help/markdown-guide";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

type ReleaseNotesDialogProps = {
  version: string;
  content: string;
};

/**
 * Clickable version number that opens a release-notes modal. Ported from FEED's
 * sidebar version trigger + ReleaseNotesCard; content is the plain-language
 * `docs/release-notes.md`, passed in from the Staff (server) page and rendered
 * with the shared markdown renderer.
 */
export function ReleaseNotesDialog({ version, content }: ReleaseNotesDialogProps) {
  const { trigger } = useAppHaptics();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          onClick={() => trigger("uiToggle")}
          aria-label={`Open release notes for version ${version}`}
          className="rounded-sm font-semibold text-foreground underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          v{version}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Release notes</DialogTitle>
          <DialogDescription>What&apos;s new in LOTTO, newest first.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[min(70vh,640px)] pr-4">
          <div className="space-y-5">
            <MarkdownGuideContent content={content} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
