// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";
import type { Table } from "@tanstack/react-table";

import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { ChevronDown } from "@/components/animate-ui/icons/chevron-down";
import { SearchIcon } from "@/components/animate-ui/icons/search";
import { XIcon } from "@/components/animate-ui/icons/x";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TableBulkAction } from "@/types/table";

type ToolbarIcon = React.ComponentType<{ className?: string; size?: number }>;

export interface ToolbarAction {
  label: string;
  icon?: ToolbarIcon;
  variant: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  action: () => void;
  disabled?: boolean;
}

interface TableFeatureBarProps<TData> {
  table: Table<TData>;
  filterColumn?: string;
  filterPlaceholder?: string;
  enableColumnVisibility?: boolean;
  enableFiltering?: boolean;
  className?: string;
  bulkActions?: TableBulkAction<TData>[];
  toolbarActions?: ToolbarAction[];
  toolbarControls?: React.ReactNode;
  selectedRows?: TData[];
  onClearSelection?: () => void;
}

function humanizeString(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function TableFeatureBar<TData>({
  table,
  filterColumn,
  filterPlaceholder,
  enableColumnVisibility = true,
  enableFiltering = true,
  className,
  bulkActions,
  toolbarActions = [],
  toolbarControls,
  selectedRows = [],
  onClearSelection,
}: TableFeatureBarProps<TData>) {
  const hasSelection = selectedRows.length > 0;

  const handleBulkAction = React.useCallback(
    async (action: TableBulkAction<TData>) => {
      if (!selectedRows.length) return;
      await action.action(selectedRows);
    },
    [selectedRows],
  );

  return (
    <div className={cn("flex flex-col gap-4", className)} data-testid="table-feature-bar">
      {toolbarActions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {toolbarActions.map((action) => {
            const Icon = action.icon;
            return (
              <AnimateIcon
                key={action.label}
                asChild
                animateOnView
                animateOnViewOnce
                animateOnHover
                animateOnTap
              >
                <Button
                  type="button"
                  variant={action.variant}
                  size="sm"
                  onClick={action.action}
                  disabled={action.disabled}
                >
                  {Icon ? <Icon className="mr-2 size-4" size={16} /> : null}
                  {action.label}
                </Button>
              </AnimateIcon>
            );
          })}
        </div>
      ) : null}

      <div className="flex w-full flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {enableFiltering && filterColumn ? (
            <AnimateIcon
              asChild
              animateOnView
              animateOnViewOnce
              animateOnHover
              animateOnTap
            >
              <div className="relative min-w-0 flex-1 px-px sm:max-w-sm">
                <SearchIcon
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  size={16}
                  aria-hidden="true"
                />
                <Input
                  placeholder={filterPlaceholder || `Filter ${humanizeString(filterColumn)}...`}
                  value={(table.getColumn(filterColumn)?.getFilterValue() as string) ?? ""}
                  onChange={(event) =>
                    table.getColumn(filterColumn)?.setFilterValue(event.target.value)
                  }
                  className="w-full pl-9"
                />
              </div>
            </AnimateIcon>
          ) : null}

          {hasSelection && bulkActions && bulkActions.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm tabular-nums text-muted-foreground">
                {selectedRows.length} selected
              </span>
              <AnimateIcon asChild animateOnView animateOnViewOnce animateOnHover animateOnTap>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClearSelection}
                  className="h-8 px-2"
                >
                  <XIcon className="size-4" size={16} />
                  <span className="sr-only">Clear selection</span>
                </Button>
              </AnimateIcon>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" size="sm" className="h-8 whitespace-nowrap">
                    Actions <ChevronDown className="ml-2 size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {bulkActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <DropdownMenuItem
                        key={action.label}
                        onClick={() => void handleBulkAction(action)}
                        disabled={action.disabled}
                        variant={action.variant === "destructive" ? "destructive" : "default"}
                      >
                        {Icon ? <Icon className="mr-2 size-4" size={16} /> : null}
                        {action.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {toolbarControls}
          {enableColumnVisibility ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-8">
                  Columns <ChevronDown className="ml-2 size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}
                      className="normal-case"
                    >
                      {humanizeString(column.id)}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    </div>
  );
}
