// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Column, ColumnDef } from "@tanstack/react-table";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SquarePenIcon } from "@/components/animate-ui/icons/square-pen";
import { EnhancedDataTable } from "@/components/ui/enhanced-data-table";
import { TableActionMenu } from "@/components/ui/table-action-menu";

type Row = {
  id: number;
  name: string;
  status: string;
};

const rows: Row[] = [
  { id: 1, name: "Alpha translation", status: "completed" },
  { id: 2, name: "Beta translation", status: "pending" },
];

function setMobileViewport(isMobile: boolean) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: isMobile ? 375 : 1024,
  });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: isMobile,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function SortableHeader<TData>({ column, label }: { column: Column<TData, unknown>; label: string }) {
  return (
    <button type="button" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
      {label}
    </button>
  );
}

function renderTable(options?: { mobile?: boolean; bodyMaxHeight?: string; onEdit?: () => void }) {
  setMobileViewport(Boolean(options?.mobile));
  const onEdit = options?.onEdit ?? vi.fn();
  const tableRows = Array.from({ length: 30 }, (_, index) => ({
    id: index + 1,
    name: index === 0 ? "Alpha translation" : index === 1 ? "Beta translation" : `Row ${index + 1}`,
    status: index % 2 === 0 ? "completed" : "pending",
  }));
  const columns: ColumnDef<Row>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <SortableHeader column={column} label="Name" />,
      cell: ({ row }) => row.original.name,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <SortableHeader column={column} label="Status" />,
      cell: ({ row }) => row.original.status,
    },
    {
      id: "actions",
      enableHiding: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <TableActionMenu
          size="sm"
          triggerLabel={`Open actions for ${row.original.name}`}
          actions={[
            {
              label: "Edit",
              icon: SquarePenIcon,
              onClick: onEdit,
            },
          ]}
        />
      ),
    },
  ];

  render(
    <EnhancedDataTable
      columns={columns}
      data={options?.bodyMaxHeight ? tableRows : rows}
      getRowId={(row) => String(row.id)}
      filterColumn="name"
      filterPlaceholder="Filter rows"
      bodyMaxHeight={options?.bodyMaxHeight}
      mobileHiddenColumnIds={["status"]}
    />,
  );

  return { onEdit };
}

describe("EnhancedDataTable", () => {
  beforeEach(() => {
    setMobileViewport(false);
  });

  it("hides configured lower-priority columns on mobile", async () => {
    renderTable({ mobile: true });

    expect(screen.getByRole("columnheader", { name: /name/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("columnheader", { name: /status/i })).not.toBeInTheDocument();
    });
  });

  it("renders a fixed-height scroll shell with sticky column headers", () => {
    renderTable({ bodyMaxHeight: "240px" });

    expect(screen.getByTestId("enhanced-table-scroll-shell")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /name/i })).toHaveClass("sticky");
    expect(screen.getByTestId("pagination-controls")).toBeInTheDocument();
    expect(screen.getByTestId("rows-per-page-selector")).toHaveTextContent("25 rows");
    expect(screen.getByText("Row 25")).toBeInTheDocument();
    expect(screen.queryByText("Row 26")).not.toBeInTheDocument();
  });

  it("opens stable row action menus from the compact actions button", async () => {
    const user = userEvent.setup();
    const { onEdit } = renderTable();

    await user.click(screen.getByRole("button", { name: /open actions for alpha translation/i }));
    await user.click(await screen.findByRole("menuitem", { name: /edit/i }));

    expect(onEdit).toHaveBeenCalledOnce();
  });
});
