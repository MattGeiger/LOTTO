// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ViewTextDialog } from "@/components/ui/view-text-dialog";
import { getTruncationClasses } from "@/lib/table";
import { cn } from "@/lib/utils";

interface ResponsiveTruncatedTextProps {
  text: string;
  title?: string;
  className?: string;
  showExpandButton?: boolean;
}

export function ResponsiveTruncatedText({
  text,
  title = "View full text",
  className,
  showExpandButton = true,
}: ResponsiveTruncatedTextProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isTruncated, setIsTruncated] = React.useState(false);
  const textRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    const element = textRef.current;
    if (!element) return;
    setIsTruncated(element.scrollWidth > element.clientWidth);
  }, [text]);

  if (!text) return <span className={className}>{text}</span>;

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <span ref={textRef} className={cn(getTruncationClasses(), "flex-1")} title={text}>
        {text}
      </span>
      {showExpandButton && isTruncated ? (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 shrink-0 px-2 text-xs"
                onClick={() => setDialogOpen(true)}
              >
                View
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{title}</p>
            </TooltipContent>
          </Tooltip>
          <ViewTextDialog
            title={title}
            text={text}
            open={dialogOpen}
            onOpenChange={setDialogOpen}
          />
        </>
      ) : null}
    </div>
  );
}
