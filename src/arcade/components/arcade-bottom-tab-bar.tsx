// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Matt Geiger, Temple Consulting, LLC.
//
// LOTTO — Line Order Transparency & Ticketing Organizer. Application code
// licensed under AGPL-3.0-or-later; see LICENSE. William Temple House branding
// is not covered by this license; see TRADEMARKS.md.

"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AdminIcon } from "@/arcade/components/icons/admin-icon";
import { DashboardIcon } from "@/arcade/components/icons/dashboard-icon";
import { GamingIcon } from "@/arcade/components/icons/gaming-icon";
import { ReceiptIcon } from "@/arcade/components/icons/receipt-icon";
import { ShoppingCartIcon } from "@/arcade/components/icons/shopping-cart-icon";
import { useStaffAuthenticated } from "@/components/staff-auth-context";
import { useLanguage } from "@/contexts/language-context";
import { isRTL } from "@/lib/rtl-utils";
import { cn } from "@/lib/utils";

type ArcadeNavItem = {
  id: string;
  labelKey: string;
  href: string;
  Icon: React.ComponentType<React.ComponentPropsWithoutRef<"svg">>;
  isActive: (pathname: string) => boolean;
};

// Same public destinations and shared `nav*` labels as the core bar, but with
// arcade pixel icons and arcade styling. See docs/NAVIGATION.md.
const ARCADE_NAV_ITEMS: ArcadeNavItem[] = [
  { id: "ticket", labelKey: "navTicket", href: "/", Icon: ReceiptIcon, isActive: (p) => p === "/" },
  {
    id: "dashboard",
    labelKey: "navDashboard",
    href: "/display",
    Icon: DashboardIcon,
    isActive: (p) => p === "/display",
  },
  {
    id: "inventory",
    labelKey: "navInventory",
    href: "/inventory",
    Icon: ShoppingCartIcon,
    isActive: (p) => p === "/inventory",
  },
  {
    id: "games",
    labelKey: "navGames",
    href: "/arcade",
    Icon: GamingIcon,
    isActive: (p) => p === "/arcade" || p.startsWith("/arcade/"),
  },
];

// Authenticated staff variant: Admin · Dashboard · What's in stock · Games,
// mirroring the core bar's auth variant in arcade pixel style.
const ARCADE_AUTH_NAV_ITEMS: ArcadeNavItem[] = [
  {
    id: "admin",
    labelKey: "navAdmin",
    href: "/admin",
    Icon: AdminIcon,
    isActive: (p) => p === "/admin" || p.startsWith("/admin/"),
  },
  ARCADE_NAV_ITEMS[1],
  ARCADE_NAV_ITEMS[2],
  ARCADE_NAV_ITEMS[3],
];

/**
 * Arcade-styled bottom tab bar. Rendered only on the arcade index (`/arcade`),
 * never on the game routes — those keep their own Back control. Inherits the
 * arcade CSS variables and pixel font from the enclosing `.arcade-scope`.
 */
export function ArcadeBottomTabBar() {
  const pathname = usePathname() ?? "";
  const { language, t } = useLanguage();
  const isStaff = useStaffAuthenticated();
  const items = isStaff ? ARCADE_AUTH_NAV_ITEMS : ARCADE_NAV_ITEMS;

  return (
    <nav
      aria-label={t("navPrimaryLabel")}
      dir={isRTL(language) ? "rtl" : "ltr"}
      // Full-width wrapper centers the pill, but on desktop the pill is only
      // `sm:w-auto`; `pointer-events-none` keeps the transparent flanks from
      // intercepting clicks on content sharing this row (the `<ul>` re-enables
      // events with `pointer-events-auto`). See docs/NAVIGATION.md.
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center sm:bottom-6 sm:px-4"
    >
      <ul
        className={cn(
          "pointer-events-auto flex w-full items-stretch border-t-2 border-[var(--arcade-wall)] bg-[var(--arcade-menu-card-bg)] px-2 pt-2 pb-[max(env(safe-area-inset-bottom),0.6rem)] backdrop-blur-sm",
          "sm:w-auto sm:gap-2 sm:border-2 sm:px-3 sm:pb-2 sm:shadow-[0_0_0_2px_rgba(255,109,232,0.3)]"
        )}
      >
        {items.map(({ id, labelKey, href, Icon, isActive }) => {
          const active = isActive(pathname);
          return (
            <li key={id} className="flex flex-1 sm:flex-initial">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex flex-1 flex-col items-center justify-start gap-1.5 px-3 py-2 text-center outline-none transition-transform active:translate-y-0.5",
                  "focus-visible:ring-2 focus-visible:ring-[var(--arcade-ghost)]",
                  "sm:min-w-[6rem]",
                  active
                    ? "text-[var(--arcade-dot)]"
                    : "text-[var(--arcade-text)] opacity-65 hover:text-[var(--arcade-ghost)] hover:opacity-100"
                )}
              >
                {active ? (
                  <span aria-hidden="true" className="absolute inset-x-2 top-0 h-1 bg-[var(--arcade-dot)]" />
                ) : null}
                <Icon className="size-6 shrink-0" />
                <span className="text-[0.6rem] uppercase leading-tight tracking-[0.12em]">{t(labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
