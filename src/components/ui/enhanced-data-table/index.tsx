// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";
import { flexRender, type ColumnDef, type VisibilityState } from "@tanstack/react-table";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { TableSelectionOptions } from "@/types/table";
import { TableFeatureBar, type ToolbarAction } from "./components/TableFeatureBar";
import { TablePagination } from "./components/TablePagination";
import { useTableFeatures } from "./hooks/useTableFeatures";

const DEFAULT_MOBILE_HIDDEN_COLUMN_IDS = [
  "language",
  "type",
  "status",
  "model",
  "provider",
  "serviceType",
  "updatedAt",
];

type ColumnMeta = {
  style?: React.CSSProperties;
  headerClassName?: string;
  cellClassName?: string;
};

interface EnhancedDataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  isLoading?: boolean;
  filterColumn?: string;
  filterPlaceholder?: string;
  enableColumnVisibility?: boolean;
  enableFiltering?: boolean;
  className?: string;
  tableClassName?: string;
  bodyMaxHeight?: string;
  minTableWidth?: string;
  selection?: TableSelectionOptions<TData>;
  toolbarActions?: ToolbarAction[];
  toolbarControls?: React.ReactNode;
  mobileHiddenColumnIds?: string[];
  defaultPageSize?: number;
  preservePageOnDataChange?: boolean;
  enablePagination?: boolean;
  getRowId?: (row: TData, index: number) => string;
}

function getColumnId<TData>(column: ColumnDef<TData>, index: number) {
  if (typeof column.id === "string") return column.id;
  if ("accessorKey" in column && typeof column.accessorKey === "string") {
    return column.accessorKey;
  }
  return `col-${index}`;
}

function getColumnMeta<TData, TValue>(columnDef: ColumnDef<TData, TValue>): ColumnMeta {
  return (columnDef.meta ?? {}) as ColumnMeta;
}

function EnhancedDataTableInner<TData>(
  {
    columns,
    data,
    isLoading = false,
    filterColumn,
    filterPlaceholder,
    enableColumnVisibility = true,
    enableFiltering = true,
    className,
    tableClassName,
    bodyMaxHeight,
    minTableWidth,
    selection,
    toolbarActions,
    toolbarControls,
    mobileHiddenColumnIds = DEFAULT_MOBILE_HIDDEN_COLUMN_IDS,
    defaultPageSize = 25,
    preservePageOnDataChange = true,
    enablePagination = true,
    getRowId,
  }: EnhancedDataTableProps<TData>,
  ref: React.ForwardedRef<{ clearSelection?: () => void }>,
) {
  const isMobile = useIsMobile();
  const responsiveColumnVisibility = React.useMemo<VisibilityState>(() => {
    const availableColumnIds = new Set(columns.map(getColumnId));
    return Object.fromEntries(
      mobileHiddenColumnIds
        .filter((columnId) => availableColumnIds.has(columnId))
        .map((columnId) => [columnId, !isMobile]),
    );
  }, [columns, isMobile, mobileHiddenColumnIds]);

  const { table, selection: tableSelection } = useTableFeatures({
    ref,
    data,
    columns,
    selection,
    getRowId,
    defaultPageSize,
    autoResetPageIndex: preservePageOnDataChange ? false : undefined,
    initialState: {
      columnVisibility: responsiveColumnVisibility,
    },
  });

  const handlePageSizeChange = React.useCallback(
    (newPageSize: number) => {
      const filteredRowCount = table.getFilteredRowModel().rows.length;
      const maxPageIndex = Math.max(0, Math.ceil(filteredRowCount / newPageSize) - 1);
      if (table.getState().pagination.pageIndex > maxPageIndex) {
        table.setPageIndex(maxPageIndex);
      }
    },
    [table],
  );

  React.useEffect(() => {
    for (const [columnId, visible] of Object.entries(responsiveColumnVisibility)) {
      table.getColumn(columnId)?.toggleVisibility(visible);
    }
  }, [responsiveColumnVisibility, table]);

  const visibleColumns = table.getVisibleLeafColumns();
  const tableMarkup = (
    <div className="min-w-full" style={minTableWidth ? { minWidth: minTableWidth } : undefined}>
      <table className={cn("w-full caption-bottom text-sm", tableClassName)}>
        <TableHeader className="[&_tr]:border-b">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header, index) => {
                const meta = getColumnMeta(header.column.columnDef);
                return (
                  <TableHead
                    key={header.id}
                    style={meta.style}
                    className={cn(
                      "whitespace-nowrap bg-card",
                      bodyMaxHeight && "sticky top-0 z-20 shadow-sm",
                      bodyMaxHeight && index === 0 && "rounded-tl-md",
                      bodyMaxHeight && index === headerGroup.headers.length - 1 && "rounded-tr-md",
                      meta.headerClassName,
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, rowIndex) => (
              <TableRow key={`loading-${rowIndex}`}>
                {visibleColumns.map((column) => {
                  const meta = getColumnMeta(column.columnDef);
                  return (
                    <TableCell key={column.id} style={meta.style} className={meta.cellClassName}>
                      <div className="h-5 w-full max-w-32 animate-pulse rounded bg-muted" />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          ) : table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? "selected" : undefined}
                className={cn(row.getIsSelected() && "bg-muted/50")}
              >
                {row.getVisibleCells().map((cell) => {
                  const meta = getColumnMeta(cell.column.columnDef);
                  return (
                    <TableCell
                      key={cell.id}
                      style={meta.style}
                      className={cn("min-w-0", meta.cellClassName)}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={visibleColumns.length} className="h-24 text-center">
                No results found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </table>
    </div>
  );

  return (
    <div className={cn("space-y-4", className)}>
      <TableFeatureBar
        table={table}
        filterColumn={filterColumn}
        filterPlaceholder={filterPlaceholder}
        enableColumnVisibility={enableColumnVisibility}
        enableFiltering={enableFiltering}
        bulkActions={selection?.bulkActions}
        toolbarActions={toolbarActions}
        toolbarControls={toolbarControls}
        selectedRows={tableSelection?.selectedRows}
        onClearSelection={tableSelection?.clearSelection}
      />
      <div
        className="rounded-md border bg-card shadow-sm"
        data-testid={bodyMaxHeight ? "enhanced-table-scroll-shell" : "enhanced-table-shell"}
      >
        {bodyMaxHeight ? (
          <ScrollArea className="rounded-md" style={{ height: bodyMaxHeight }}>
            {tableMarkup}
          </ScrollArea>
        ) : (
          <div className="overflow-hidden rounded-md">{tableMarkup}</div>
        )}
      </div>
      {enablePagination ? (
        <TablePagination table={table} onPageSizeChange={handlePageSizeChange} />
      ) : null}
    </div>
  );
}

export const EnhancedDataTable = React.forwardRef(EnhancedDataTableInner) as <TData>(
  props: EnhancedDataTableProps<TData> &
    React.RefAttributes<{ clearSelection?: () => void }>,
) => React.ReactElement;
