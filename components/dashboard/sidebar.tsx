"use client";

import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  BellIcon,
  BroadcastIcon,
  CaretDownIcon,
  CaretUpDownIcon,
  ChartLineUpIcon,
  ClockCounterClockwiseIcon,
  GearSixIcon,
  QuestionIcon,
  SquaresFourIcon,
  UsersIcon,
  WalletIcon,
  type IconProps,
} from "@phosphor-icons/react";
import { useEffect, useState, type ComponentType } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { SessionAccount } from "@/lib/dashboard/contracts";
import type { DashboardMode } from "@/lib/dashboard/data-source";
import { NAV_GROUPS, matchActiveRoute, type NavIconName } from "@/lib/dashboard/navigation";

import { useDashboardPathname } from "./actions-context";
import { DashboardLink } from "./dashboard-link";
import { UserMenu, accountIdentity } from "./user-menu";

const NAV_ICONS: Record<NavIconName, ComponentType<IconProps>> = {
  SquaresFour: SquaresFourIcon,
  Wallet: WalletIcon,
  ArrowDownLeft: ArrowDownLeftIcon,
  ArrowUpRight: ArrowUpRightIcon,
  ClockCounterClockwise: ClockCounterClockwiseIcon,
  Users: UsersIcon,
  ChartLineUp: ChartLineUpIcon,
  Broadcast: BroadcastIcon,
  Bell: BellIcon,
  GearSix: GearSixIcon,
  Question: QuestionIcon,
};

/**
 * Customer navigation. Groups come from `lib/dashboard/navigation.ts`; the
 * active item is matched from the current route including detail
 * descendants and carries `aria-current="page"` and a filled icon. The
 * account-tools group is collapsed by default (open when it owns the route).
 * Expanded header: theme-matched monogram; rail: 28px fixed-theme favicon.
 * Footer: the account menu trigger.
 */
export function DashboardSidebar({
  account,
  mode,
  onNavigate,
}: {
  account: SessionAccount | null;
  mode: DashboardMode;
  /** Called when a navigation link is activated (closes overlays). */
  onNavigate?: () => void;
}) {
  const pathname = useDashboardPathname();
  const active = matchActiveRoute(pathname);
  const { state, isMobile, setOpenMobile } = useSidebar();
  const rail = state === "collapsed" && !isMobile;
  const identity = accountIdentity(account);

  const navigate = () => {
    if (isMobile) setOpenMobile(false);
    onNavigate?.();
  };

  return (
    <Sidebar collapsible="icon" aria-label="Dashboard">
      <SidebarHeader className="p-2">
        <DashboardLink
          href="/dashboard"
          className="ca-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          aria-label="Crypto Index Asset, dashboard overview"
          onClick={navigate}
        >
          {rail ? (
            <>
              <img src="/brand/favicon-light.svg" alt="" width={28} height={28} className="ca-favicon-light" />
              <img src="/brand/favicon-dark.svg" alt="" width={28} height={28} className="ca-favicon-dark" />
            </>
          ) : (
            <>
              <img src="/brand/ca-on-light.svg" alt="" width={64} height={42} className="ca-logo-light" />
              <img src="/brand/ca-on-dark.svg" alt="" width={64} height={42} className="ca-logo-dark" />
            </>
          )}
        </DashboardLink>
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label="Dashboard sections" className="flex flex-col">
          {NAV_GROUPS.map((group) => {
            const ownsActive = active?.group.id === group.id;
            const items = (
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = active?.item.id === item.id;
                  const IconComponent = NAV_ICONS[item.icon];
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                        className="ca-nav-item"
                      >
                        <DashboardLink
                          href={item.href}
                          aria-current={isActive ? "page" : undefined}
                          onClick={navigate}
                        >
                          <IconComponent size={20} weight={isActive ? "fill" : "regular"} aria-hidden="true" />
                          <span>{item.label}</span>
                        </DashboardLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            );

            if (group.collapsed) {
              return (
                <CollapsibleGroup key={group.id} label={group.label} forceOpen={rail} defaultOpen={ownsActive}>
                  {items}
                </CollapsibleGroup>
              );
            }

            return (
              <SidebarGroup key={group.id}>
                {group.id === "overview" ? (
                  <span className="ca-sr-only">{group.label}</span>
                ) : (
                  <SidebarGroupLabel className="ca-label h-8 px-2 text-muted-foreground">{group.label}</SidebarGroupLabel>
                )}
                <SidebarGroupContent>{items}</SidebarGroupContent>
              </SidebarGroup>
            );
          })}
        </nav>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <UserMenu account={account} mode={mode} align="start" side={rail ? "right" : "top"}>
          <button type="button" className="ca-user-trigger" aria-label={`Account menu, ${identity.name}`}>
            <Avatar size="default">
              <AvatarFallback className="text-xs font-medium">{identity.initials || "?"}</AvatarFallback>
            </Avatar>
            <span className="ca-user-text">
              <span className="ca-body font-medium">{identity.name}</span>
              {identity.email ? <span className="ca-help">{identity.email}</span> : null}
            </span>
            <CaretUpDownIcon size={16} aria-hidden="true" className="ca-user-caret shrink-0 text-muted-foreground" />
          </button>
        </UserMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function CollapsibleGroup({
  label,
  defaultOpen,
  forceOpen,
  children,
}: {
  label: string;
  defaultOpen: boolean;
  /** In the icon rail every item must stay reachable, so the group is forced open. */
  forceOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);
  const isOpen = forceOpen || open;
  return (
    <Collapsible open={isOpen} onOpenChange={setOpen}>
      <SidebarGroup>
        <CollapsibleTrigger asChild>
          <button type="button" className="ca-group-trigger ca-rail-hidden" aria-expanded={isOpen}>
            <span>{label}</span>
            <CaretDownIcon size={16} aria-hidden="true" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>{children}</SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}
