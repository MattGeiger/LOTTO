// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import type { CSSProperties } from "react";
import type { ColumnDef } from "@tanstack/react-table";

export interface ColumnSizeConfig {
  id: string;
  size: number;
  isFixed?: boolean;
}

export interface CalculatedWidths {
  [columnId: string]: string;
}

export const FIXED_COLUMN_WIDTHS = {
  selection: "44px",
  actions: "56px",
} as const;

export function calculateColumnWidths(columns: ColumnSizeConfig[]): CalculatedWidths {
  const widths: CalculatedWidths = {};
  const fixedColumns = columns.filter(
    (column) => column.id === "select" || column.id === "actions" || column.isFixed,
  );
  const flexibleColumns = columns.filter(
    (column) => column.id !== "select" && column.id !== "actions" && !column.isFixed,
  );

  for (const column of fixedColumns) {
    if (column.id === "select") {
      widths[column.id] = FIXED_COLUMN_WIDTHS.selection;
    } else if (column.id === "actions") {
      widths[column.id] = FIXED_COLUMN_WIDTHS.actions;
    } else {
      widths[column.id] = `${column.size}px`;
    }
  }

  const totalFlexibleSize = flexibleColumns.reduce((sum, column) => sum + column.size, 0);
  if (totalFlexibleSize > 0) {
    for (const column of flexibleColumns) {
      widths[column.id] = `${((column.size / totalFlexibleSize) * 100).toFixed(2)}%`;
    }
  }

  return widths;
}

export function extractColumnSizes<TData>(columns: ColumnDef<TData>[]): ColumnSizeConfig[] {
  return columns.map((column) => ({
    id:
      column.id ||
      ("accessorKey" in column && typeof column.accessorKey === "string"
        ? column.accessorKey
        : "unknown"),
    size: column.size || 100,
    isFixed: column.id === "select" || column.id === "actions",
  }));
}

export function getColumnWidthStyle(width: string): CSSProperties {
  return {
    width,
    minWidth: width,
    maxWidth: width,
  };
}

export function getTruncationClasses(): string {
  return "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap";
}
