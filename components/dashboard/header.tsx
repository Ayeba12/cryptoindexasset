"use client";

import { BellIcon } from "@phosphor-icons/react";
import { Fragment, useEffect, useRef } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import type { SessionAccount } from "@/lib/dashboard/contracts";
import type { DashboardMode } from "@/lib/dashboard/data-source";
import { breadcrumbsFor } from "@/lib/dashboard/navigation";
import { cn } from "@/lib/utils";

import { useDashboardPathname } from "./actions-context";
import { DashboardLink } from "./dashboard-link";
import { UserMenu, accountIdentity } from "./user-menu";

/**
 * Sticky 64px header: navigation toggle, breadcrumb (Dashboard / Section /
 * Page; only the current page below 640px), notifications link with a
 * numeric badge when `unreadCount > 0`, and the account menu.
 */
export function DashboardHeader({
  account,
  mode,
  unreadCount,
}: {
  account: SessionAccount | null;
  mode: DashboardMode;
  unreadCount: number;
}) {
  const pathname = useDashboardPathname();
  const crumbs = breadcrumbsFor(pathname);
  const { open, openMobile, isMobile } = useSidebar();
  const identity = accountIdentity(account);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasMobileOpen = useRef(false);

  // The primitive opens its mobile sheet without a SheetTrigger, so Radix has
  // nothing to restore focus to; return it to the toggle ourselves.
  useEffect(() => {
    if (wasMobileOpen.current && !openMobile && isMobile) triggerRef.current?.focus();
    wasMobileOpen.current = openMobile;
  }, [openMobile, isMobile]);
  const unread = Math.max(0, Math.trunc(unreadCount));
  const notificationsLabel = unread > 0 ? `Notifications, ${unread} unread` : "Notifications";

  return (
    <header className="ca-header" data-slot="dashboard-header">
      <SidebarTrigger
        ref={triggerRef}
        aria-label="Toggle navigation"
        aria-expanded={isMobile ? openMobile : open}
        size="icon-lg"
        className="shrink-0"
      />
      <div className="ca-header-crumbs">
        <Breadcrumb aria-label="Breadcrumb">
          <BreadcrumbList className="ca-body flex-nowrap gap-1">
            {crumbs.map((crumb, index) => {
              const last = index === crumbs.length - 1;
              return (
                <Fragment key={`${crumb.label}-${index}`}>
                  <BreadcrumbItem className={cn("min-w-0", !last && "hidden sm:inline-flex")}>
                    {last ? (
                      <BreadcrumbPage className="truncate font-medium">{crumb.label}</BreadcrumbPage>
                    ) : crumb.href ? (
                      <BreadcrumbLink asChild className="truncate">
                        <DashboardLink href={crumb.href}>{crumb.label}</DashboardLink>
                      </BreadcrumbLink>
                    ) : (
                      <span className="truncate">{crumb.label}</span>
                    )}
                  </BreadcrumbItem>
                  {!last ? <BreadcrumbSeparator className="hidden sm:block" /> : null}
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="ca-header-actions">
        <Button asChild variant="ghost" size="icon-lg" className="relative">
          <DashboardLink href="/dashboard/notifications" aria-label={notificationsLabel}>
            <BellIcon size={16} aria-hidden="true" />
            {unread > 0 ? (
              <span className="ca-badge-count" aria-hidden="true">
                {unread > 99 ? "99+" : unread}
              </span>
            ) : null}
          </DashboardLink>
        </Button>
        <UserMenu account={account} mode={mode} align="end">
          <Button variant="ghost" size="icon-lg" aria-label={`Account menu, ${identity.name}`} className="rounded-full">
            <Avatar size="default" className="size-7">
              <AvatarFallback className="text-xs font-medium">{identity.initials || "?"}</AvatarFallback>
            </Avatar>
          </Button>
        </UserMenu>
      </div>
    </header>
  );
}
