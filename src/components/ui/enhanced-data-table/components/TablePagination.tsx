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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

interface TablePaginationProps<TData> {
  table: Table<TData>;
  onPageSizeChange?: (pageSize: number) => void;
}

export function TablePagination<TData>({
  table,
  onPageSizeChange,
}: TablePaginationProps<TData>) {
  const totalRows = table.getFilteredRowModel().rows.length;
  const currentPage = table.getState().pagination.pageIndex + 1;
  const currentPageSize = table.getState().pagination.pageSize;
  const totalPages = Math.max(1, table.getPageCount());
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  const handlePageSizeChange = React.useCallback(
    (value: string) => {
      const nextSize = Number.parseInt(value, 10);
      table.setPageSize(nextSize);
      onPageSizeChange?.(nextSize);
    },
    [onPageSizeChange, table],
  );

  const getPageRange = React.useCallback(() => {
    const range: (number | "ellipsis")[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    range.push(1);

    if (currentPage > 3) {
      range.push("ellipsis");
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let page = start; page <= end; page += 1) {
      range.push(page);
    }

    if (currentPage < totalPages - 2) {
      range.push("ellipsis");
    }

    if (totalPages > 1) {
      range.push(totalPages);
    }

    return range;
  }, [currentPage, totalPages]);

  return (
    <div className="flex flex-col gap-4" data-testid="pagination-controls">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm tabular-nums text-muted-foreground">
          {selectedCount} of {totalRows} row(s) selected.
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <AnimateIcon asChild animateOnView animateOnViewOnce animateOnHover animateOnTap>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-fit"
                data-testid="rows-per-page-selector"
              >
                {currentPageSize} rows
                <ChevronDown className="ml-1 size-4" size={16} />
              </Button>
            </AnimateIcon>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuLabel>Rows per page</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={String(currentPageSize)}
              onValueChange={handlePageSizeChange}
            >
              {PAGE_SIZE_OPTIONS.map((pageSize) => (
                <DropdownMenuRadioItem key={pageSize} value={String(pageSize)}>
                  {pageSize} rows
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              aria-disabled={!table.getCanPreviousPage()}
              className={!table.getCanPreviousPage() ? "pointer-events-none opacity-50" : ""}
              onClick={(event) => {
                event.preventDefault();
                table.previousPage();
              }}
            />
          </PaginationItem>

          {getPageRange().map((page, index) => (
            <PaginationItem key={`${page}-${index}`}>
              {page === "ellipsis" ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  href="#"
                  isActive={currentPage === page}
                  onClick={(event) => {
                    event.preventDefault();
                    table.setPageIndex(page - 1);
                  }}
                >
                  {page}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              href="#"
              aria-disabled={!table.getCanNextPage()}
              className={!table.getCanNextPage() ? "pointer-events-none opacity-50" : ""}
              onClick={(event) => {
                event.preventDefault();
                table.nextPage();
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
