// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type RowSelectionState,
  type SortingState,
  type TableMeta,
  type VisibilityState,
  useReactTable,
} from "@tanstack/react-table";

import type { TableSelectionOptions } from "@/types/table";

interface TableFeatureProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  selection?: TableSelectionOptions<TData>;
  ref?: React.ForwardedRef<{ clearSelection?: () => void }>;
  initialState?: {
    sorting?: SortingState;
    columnVisibility?: VisibilityState;
    columnFilters?: ColumnFiltersState;
  };
  autoResetPageIndex?: boolean;
  getRowId?: (row: TData, index: number) => string;
  meta?: TableMeta<TData>;
}

export function useTableFeatures<TData>({
  data,
  columns,
  selection,
  ref,
  initialState,
  getRowId,
  meta,
}: TableFeatureProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>(initialState?.sorting || []);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
    initialState?.columnVisibility || {},
  );
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    initialState?.columnFilters || [],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    getRowId,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    enableRowSelection: Boolean(selection?.enabled),
    meta,
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows.map((row) => row.original);

  const clearSelection = React.useCallback(() => {
    table.resetRowSelection();
  }, [table]);

  React.useImperativeHandle(
    ref,
    () => ({
      clearSelection,
    }),
    [clearSelection],
  );

  return {
    table,
    selection: selection?.enabled
      ? {
          selectedRows,
          clearSelection,
        }
      : undefined,
  };
}
