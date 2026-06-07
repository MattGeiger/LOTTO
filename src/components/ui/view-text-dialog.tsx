// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ViewTextDialogProps {
  title: string;
  text: string;
  subtitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewTextDialog({
  title,
  text,
  subtitle,
  open,
  onOpenChange,
}: ViewTextDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {subtitle ? <DialogDescription>{subtitle}</DialogDescription> : null}
        </DialogHeader>
        <div className="mt-4 max-h-[400px] overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-muted p-4 text-sm">
          {text}
        </div>
      </DialogContent>
    </Dialog>
  );
}
