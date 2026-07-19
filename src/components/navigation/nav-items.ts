// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

import type { ForwardRefExoticComponent, HTMLAttributes, RefAttributes } from "react";

import { CartIcon } from "@/components/lucide-animated/cart";
import { Gamepad2Icon } from "@/components/lucide-animated/gamepad-2";
import { GripIcon } from "@/components/lucide-animated/grip";
import { LayoutPanelTopIcon } from "@/components/lucide-animated/layout-panel-top";
import { TicketIcon } from "@/components/lucide-animated/ticket";
import { inventoryIntegration } from "@/config/brand";

// Shared imperative handle exposed by every nav icon. Core nav icons in
// `@/components/lucide-animated` implement this exact shape, so they are
// structurally assignable to `NavIconComponent` without a cast.
export type NavIconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};

export type NavIconComponent = ForwardRefExoticComponent<
  HTMLAttributes<HTMLDivElement> & { size?: number } & RefAttributes<NavIconHandle>
>;

export type NavItemId = "ticket" | "dashboard" | "inventory" | "games" | "admin";

export type NavItem = {
  id: NavItemId;
  /** Key into the shared language map (see `src/contexts/language-context.tsx`). */
  labelKey: string;
  href: string;
  icon: NavIconComponent;
  /** Whether this tab is active for the current pathname. */
  isActive: (pathname: string) => boolean;
};

// Fixed order: Your ticket · Dashboard · What's in stock · Games. See docs/NAVIGATION.md.
const allNavItems: NavItem[] = [
  {
    id: "ticket",
    labelKey: "navTicket",
    href: "/",
    icon: TicketIcon,
    isActive: (pathname) => pathname === "/",
  },
  {
    id: "dashboard",
    labelKey: "navDashboard",
    href: "/display",
    icon: GripIcon,
    isActive: (pathname) => pathname === "/display",
  },
  {
    id: "inventory",
    labelKey: "navInventory",
    href: "/inventory",
    icon: CartIcon,
    isActive: (pathname) => pathname === "/inventory",
  },
  {
    id: "games",
    labelKey: "navGames",
    href: "/arcade",
    // Prefix match so deep arcade routes still light the Games tab.
    isActive: (pathname) => pathname === "/arcade" || pathname.startsWith("/arcade/"),
    icon: Gamepad2Icon,
  },
];

export const navItems: NavItem[] = inventoryIntegration.enabled
  ? allNavItems
  : allNavItems.filter((item) => item.id !== "inventory");

// Authenticated staff variant: Admin · Dashboard · What's in stock · Games.
// Same component + animation rules as the public bar (see docs/NAVIGATION.md);
// only the destinations differ. Rendered when the viewer is signed in.
const allAuthNavItems: NavItem[] = [
  {
    id: "admin",
    labelKey: "navAdmin",
    href: "/admin",
    icon: LayoutPanelTopIcon,
    isActive: (pathname) => pathname === "/admin" || pathname.startsWith("/admin/"),
  },
  {
    id: "dashboard",
    labelKey: "navDashboard",
    href: "/display",
    icon: GripIcon,
    isActive: (pathname) => pathname === "/display",
  },
  {
    id: "inventory",
    labelKey: "navInventory",
    href: "/inventory",
    icon: CartIcon,
    isActive: (pathname) => pathname === "/inventory",
  },
  {
    id: "games",
    labelKey: "navGames",
    href: "/arcade",
    isActive: (pathname) => pathname === "/arcade" || pathname.startsWith("/arcade/"),
    icon: Gamepad2Icon,
  },
];

export const authNavItems: NavItem[] = inventoryIntegration.enabled
  ? allAuthNavItems
  : allAuthNavItems.filter((item) => item.id !== "inventory");
