import type { ForwardRefExoticComponent, HTMLAttributes, RefAttributes } from "react";

import { CartIcon } from "@/components/lucide-animated/cart";
import { Gamepad2Icon } from "@/components/lucide-animated/gamepad-2";
import { LayoutDashboardIcon } from "@/components/lucide-animated/layout-dashboard";
import { TicketIcon } from "@/components/lucide-animated/ticket";

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

export type NavItemId = "ticket" | "dashboard" | "inventory" | "games";

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
export const navItems: NavItem[] = [
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
    icon: LayoutDashboardIcon,
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
