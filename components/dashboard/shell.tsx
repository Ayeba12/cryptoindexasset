"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import type { SessionAccount } from "@/lib/dashboard/contracts";
import type { DashboardMode } from "@/lib/dashboard/data-source";

import "./dashboard.css";
import { DashboardHeader } from "./header";
import { DashboardSidebar } from "./sidebar";
import { StatusAnnouncerProvider } from "./status-announcer";
import { TraderDirectorySync } from "./trader-directory-sync";

/** Rail policy by viewport: sheet < 768, overlay rail 768–1199, push sidebar ≥ 1200. */
export type RailPolicy = "mobile" | "tablet" | "desktop";

const SIDEBAR_COOKIE = "sidebar_state";

function subscribeViewport(callback: () => void) {
  const queries = [window.matchMedia("(min-width: 768px)"), window.matchMedia("(min-width: 1200px)")];
  for (const query of queries) query.addEventListener("change", callback);
  return () => {
    for (const query of queries) query.removeEventListener("change", callback);
  };
}

function readRailPolicy(): RailPolicy {
  if (window.matchMedia("(min-width: 1200px)").matches) return "desktop";
  if (window.matchMedia("(min-width: 768px)").matches) return "tablet";
  return "mobile";
}

/** Current rail policy; "desktop" during SSR and hydration. */
export function useRailPolicy(): RailPolicy {
  return useSyncExternalStore(subscribeViewport, readRailPolicy, () => "desktop");
}

function readSidebarCookie(): boolean | null {
  const match = document.cookie.split("; ").find((entry) => entry.startsWith(`${SIDEBAR_COOKIE}=`));
  if (!match) return null;
  return match.slice(SIDEBAR_COOKIE.length + 1) !== "false";
}

/**
 * The customer dashboard shell: skip link, sidebar, header, `<main
 * id="main-content">` with `.ca-page`, polite status region and one Sonner
 * toaster. Sidebar state is controlled here: open by default at ≥1200px
 * from the `sidebar_state` cookie, collapsed to the rail at 768–1199px where
 * an expanded sidebar overlays the workspace behind a scrim, and the
 * primitive's sheet below 768px.
 */
export function DashboardShell({
  account,
  unreadCount,
  mode,
  children,
  toolbar,
  defaultSidebarOpen = true,
}: {
  /** Server-provided session; `null` renders a neutral placeholder. */
  account: SessionAccount | null;
  unreadCount: number;
  mode: DashboardMode;
  children: ReactNode;
  /** Rendered above the header (the design-review toolbar). */
  toolbar?: ReactNode;
  /** Initial desktop state from the `sidebar_state` cookie, read by the server layout. */
  defaultSidebarOpen?: boolean;
}) {
  const policy = useRailPolicy();
  const [open, setOpen] = useState(defaultSidebarOpen);
  const previousPolicy = useRef<RailPolicy | null>(null);

  useEffect(() => {
    if (previousPolicy.current === policy) return;
    const first = previousPolicy.current === null;
    previousPolicy.current = policy;
    if (policy === "tablet") setOpen(false);
    else if (policy === "desktop" && !first) setOpen(readSidebarCookie() ?? defaultSidebarOpen);
  }, [policy, defaultSidebarOpen]);

  const overlayOpen = policy === "tablet" && open;

  useEffect(() => {
    if (!overlayOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [overlayOpen]);

  const closeOverlay = useCallback(() => {
    if (policy === "tablet") setOpen(false);
  }, [policy]);

  return (
    <div className="ca-dashboard" data-rail-policy={policy} data-mode={mode} data-slot="dashboard-shell">
      {mode === "live" ? <TraderDirectorySync /> : null}
      <a href="#main-content" className="ca-skip">
        Skip to main content
      </a>
      <StatusAnnouncerProvider>
        <SidebarProvider open={open} onOpenChange={setOpen} className="min-h-dvh">
          <DashboardSidebar account={account} mode={mode} onNavigate={closeOverlay} />
          <SidebarInset className="ca-workspace" data-slot="dashboard-workspace">
            {toolbar}
            <DashboardHeader account={account} mode={mode} unreadCount={unreadCount} />
            <div id="main-content" tabIndex={-1} className="ca-page" data-slot="dashboard-main">
              {children}
            </div>
          </SidebarInset>
          {overlayOpen ? <div className="ca-scrim" aria-hidden="true" onClick={() => setOpen(false)} /> : null}
        </SidebarProvider>
        <Toaster position="bottom-right" />
      </StatusAnnouncerProvider>
    </div>
  );
}
