// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";

import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { MoreHorizontalIcon } from "@/components/animate-ui/icons/more-horizontal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { TableActionMenuProps } from "@/types/table";

const ANIMATE_RESET_DELAY_MS = 800;

export function TableActionMenu({
  actions,
  triggerLabel = "Open menu",
  isLoading = false,
  size = "default",
  align = "end",
}: TableActionMenuProps) {
  const [animateMount, setAnimateMount] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonSize = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const hasDestructiveActions = actions.some((action) => action.variant === "destructive");

  const handleOpenChange = React.useCallback((isOpen: boolean) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (isOpen) {
      setAnimateMount(true);
      timerRef.current = setTimeout(() => {
        setAnimateMount(false);
        timerRef.current = null;
      }, ANIMATE_RESET_DELAY_MS);
    } else {
      setAnimateMount(false);
    }
  }, []);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(buttonSize, "p-0")}
          disabled={isLoading}
        >
          <span className="sr-only">{triggerLabel}</span>
          <AnimateIcon animateOnView animateOnViewOnce animateOnHover animateOnTap>
            <MoreHorizontalIcon className="size-4" aria-hidden="true" />
          </AnimateIcon>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        {actions.map((action, index) => {
          const Icon = action.icon;
          const isDestructive = action.variant === "destructive";
          const nextIsDestructive = actions[index + 1]?.variant === "destructive";
          const shouldAddSeparator =
            (isDestructive && index !== actions.length - 1) ||
            (hasDestructiveActions && !isDestructive && nextIsDestructive);

          return (
            <React.Fragment key={action.label}>
              <AnimateIcon asChild animate={animateMount} animateOnHover animateOnTap>
                <DropdownMenuItem
                  onClick={action.onClick}
                  disabled={action.disabled || isLoading}
                  title={action.title}
                  variant={isDestructive ? "destructive" : "default"}
                  className={cn("flex items-center", action.className)}
                >
                  {Icon ? <Icon className="mr-2 size-4" size={16} /> : null}
                  {action.label}
                </DropdownMenuItem>
              </AnimateIcon>
              {shouldAddSeparator ? <DropdownMenuSeparator /> : null}
            </React.Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
