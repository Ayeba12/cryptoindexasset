"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import {
  SquaresFourIcon,
  UsersIcon,
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  IdentificationCardIcon,
  BroadcastIcon,
  BellIcon,
  HeadsetIcon,
  WalletIcon,
  ClockCounterClockwiseIcon,
  GearSixIcon,
} from "@phosphor-icons/react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Choice } from "@/components/dashboard/views/shared";
import { useRailPolicy } from "@/components/dashboard/shell";
import { ADMIN_SECTIONS } from "@/lib/admin/model";
import { useAdmin } from "./provider";
import { AdminAccountMenu } from "./account-menu";
import "@/components/dashboard/dashboard.css";
import "./admin.css";
import { AttentionProvider, AttentionSummary, useAttention } from "./attention";

const icons = [
  SquaresFourIcon,
  UsersIcon,
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  UsersIcon,
  IdentificationCardIcon,
  BroadcastIcon,
  BellIcon,
  HeadsetIcon,
  WalletIcon,
  ClockCounterClockwiseIcon,
  GearSixIcon,
];
export function useAdminRoute() {
  const { preview } = useAdmin();
  const base = preview ? "/design-preview/admin" : "/admin";
  const pathname = usePathname() ?? base;
  return {
    base,
    path: pathname.slice(base.length).replace(/^\//, ""),
    href: (path = "") => `${base}${path ? `/${path}` : ""}`,
  };
}
function Navigation({ onNavigate }: { onNavigate: () => void }) {
  const { counts } = useAttention();
  const { href, path } = useAdminRoute();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const rail = state === "collapsed" && !isMobile;
  function close() {
    setOpenMobile(false);
    onNavigate();
  }
  return (
    <Sidebar collapsible="icon" aria-label="Administration">
      <SidebarHeader>
        <Link
          href={href()}
          onClick={close}
          className="ca-brand"
          aria-label="CA admin overview"
        >
          <img
            src={rail ? "/brand/favicon-light.svg" : "/brand/ca-on-light.svg"}
            className="ca-logo-light"
            width={rail ? 28 : 64}
            height={42}
            alt=""
          />
          <img
            src={rail ? "/brand/favicon-dark.svg" : "/brand/ca-on-dark.svg"}
            className="ca-logo-dark"
            width={rail ? 28 : 64}
            height={42}
            alt=""
          />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label="Admin sections">
          {[ADMIN_SECTIONS.slice(0, 5), ADMIN_SECTIONS.slice(5)].map(
            (group, groupIndex) => (
              <SidebarGroup key={groupIndex}>
                <SidebarGroupLabel>
                  {groupIndex ? "Platform" : "Operations"}
                </SidebarGroupLabel>
                <SidebarMenu>
                  {group.map(([slug, label]) => {
                    const index = ADMIN_SECTIONS.findIndex(
                      (item) => item[0] === slug,
                    );
                    const Icon = icons[index];
                    const pending = counts?.[slug as keyof typeof counts] ?? 0;
                    const active = slug
                      ? path === slug || path.startsWith(`${slug}/`)
                      : path === "";
                    return (
                      <SidebarMenuItem key={slug}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={label}
                          className="ca-nav-item"
                        >
                          <Link
                            href={href(slug)}
                            aria-label={`${label}${pending ? `, ${pending} awaiting review` : ""}`}
                            onClick={close}
                            aria-current={active ? "page" : undefined}
                          >
                            <Icon
                              size={20}
                              weight={active ? "fill" : "regular"}
                              aria-hidden="true"
                            />
                            <span>{label}</span>
                            {pending > 0 && <span aria-hidden="true" className={`rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground ${rail ? "absolute right-0 top-0" : "ml-auto"}`}>{pending > 99 ? "99+" : pending}</span>}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroup>
            ),
          )}
        </nav>
      </SidebarContent>
      <SidebarFooter>
        <AdminAccountMenu expanded />
      </SidebarFooter>
    </Sidebar>
  );
}
function Header() {
  const { counts } = useAttention();
  const pending = counts ? counts.deposits + counts.withdrawals + counts.verification : 0;
  const { path, href } = useAdminRoute();
  const { preview } = useAdmin();
  const { open, isMobile, openMobile } = useSidebar();
  const toggle = useRef<HTMLButtonElement>(null);
  const prior = useRef(false);
  useEffect(() => {
    if (prior.current && !openMobile) toggle.current?.focus();
    prior.current = openMobile;
  }, [openMobile]);
  const section = ADMIN_SECTIONS.find(([slug]) => slug === path.split("/")[0]);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <header className="ca-header">
      <SidebarTrigger
        ref={toggle}
        size="icon-lg"
        aria-label="Toggle navigation"
        aria-expanded={isMobile ? openMobile : open}
      />
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 flex-1 items-center gap-2 ca-body"
      >
        <Link
          href={href()}
          className="hidden sm:inline text-muted-foreground underline-offset-4 hover:underline"
        >
          Admin
        </Link>
        <span aria-hidden="true" className="hidden sm:inline">
          /
        </span>
        <span aria-current="page" className="truncate">
          {section?.[1] ?? "Overview"}
        </span>
      </nav>
      <div className="admin-theme">
        <Choice
          label="Theme"
          value={mounted ? (theme ?? "system") : "system"}
          onChange={setTheme}
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
      </div>
      <Button asChild variant="ghost" size="icon-lg">
        <Link href="#admin-attention" className="relative" aria-label={`Needs attention${pending ? `, ${pending} pending reviews` : ""}`}>
          <BellIcon size={20} aria-hidden="true" />
          {pending > 0 && <span aria-hidden="true" className="absolute -right-1 -top-1 rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground">{pending > 99 ? "99+" : pending}</span>}
        </Link>
      </Button>
      <Badge variant="outline" className="hidden lg:inline-flex">
        {preview ? "Preview" : "Admin"}
      </Badge>
      <AdminAccountMenu />
    </header>
  );
}
export function AdminShell({ children }: { children: ReactNode }) {
  return <AttentionProvider><AdminShellContent>{children}</AdminShellContent></AttentionProvider>;
}
function AdminShellContent({ children }: { children: ReactNode }) {
  const { preview, fault, setFault, reset, state } = useAdmin();
  const policy = useRailPolicy();
  const [open, setOpen] = useState(true);
  useEffect(() => setOpen(policy === "desktop"), [policy]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape" && policy === "tablet") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [policy]);
  return (
    <div
      className="ca-dashboard ca-admin"
      data-rail-policy={policy}
      data-mode={preview ? "preview" : "live"}
      data-density={state?.account.density ?? "compact"}
    >
      <a className="ca-skip" href="#main-content">
        Skip to main content
      </a>
      <SidebarProvider open={open} onOpenChange={setOpen}>
        <Navigation
          onNavigate={() => {
            if (policy === "tablet") setOpen(false);
          }}
        />
        <SidebarInset className="ca-workspace">
          {preview && (
            <div className="admin-preview-bar">
              <div>
                <p className="ca-label">Admin design review</p>
                <p className="ca-help">
                  Fictional records. Changes last until reload. No real
                  transactions or publishing.
                </p>
              </div>
              <Choice
                label="Test state"
                value={fault}
                onChange={setFault}
                options={[
                  { value: "none", label: "Ready" },
                  { value: "empty", label: "Empty" },
                  { value: "read-error", label: "Read error" },
                  { value: "write-error", label: "Save failure" },
                  { value: "denied", label: "Read-only role" },
                ]}
              />
              <Button variant="outline" onClick={reset}>
                Reset preview
              </Button>
            </div>
          )}
          <Header />
          <div id="main-content" tabIndex={-1} className="ca-page">
            <AttentionSummary />
            {children}
          </div>
        </SidebarInset>
        {policy === "tablet" && open && (
          <div
            className="ca-scrim"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
        )}
      </SidebarProvider>
    </div>
  );
}
