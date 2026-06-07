// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import * as React from "react";

export interface TableRowAction {
  label: string;
  icon?: React.ComponentType<{ className?: string; size?: number }>;
  onClick: () => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
  className?: string;
  title?: string;
}

export interface TableActionMenuProps {
  actions: TableRowAction[];
  triggerLabel?: string;
  isLoading?: boolean;
  size?: "default" | "sm";
  align?: "start" | "end";
}

export interface TableBulkAction<TData = unknown> {
  label: string;
  icon?: React.ComponentType<{ className?: string; size?: number }>;
  action: (selected: TData[]) => Promise<void> | void;
  variant?: "default" | "destructive";
  disabled?: boolean;
}

export interface TableSelectionOptions<TData> {
  enabled?: boolean;
  bulkActions?: TableBulkAction<TData>[];
}
