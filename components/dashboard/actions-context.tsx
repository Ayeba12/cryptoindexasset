"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

import type { DashboardActions, DashboardMode } from "@/lib/dashboard/data-source";
import { DASHBOARD_ROOT, normalizePathname } from "@/lib/dashboard/navigation";

/** Path prefix of the dashboard design review. */
export const PREVIEW_ROOT = "/design-preview/dashboard";

interface DashboardActionsContextValue {
  mode: DashboardMode;
  actions: DashboardActions;
}

const DashboardActionsContext = createContext<DashboardActionsContextValue | null>(null);

/**
 * Provides the write boundary to every view. Live routes pass the server
 * actions object (`liveActions`); the design preview passes fixture actions
 * that mutate the in-memory store.
 */
export function DashboardActionsProvider({
  mode,
  actions,
  children,
}: {
  mode: DashboardMode;
  actions: DashboardActions;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ mode, actions }), [mode, actions]);
  return <DashboardActionsContext.Provider value={value}>{children}</DashboardActionsContext.Provider>;
}

/** The current mode and actions. Throws outside the provider. */
export function useDashboardActions(): DashboardActionsContextValue {
  const context = useContext(DashboardActionsContext);
  if (!context) {
    throw new Error("useDashboardActions must be used inside DashboardActionsProvider.");
  }
  return context;
}

/** The current mode, or "live" outside a provider (server-rendered shells default to live). */
export function useDashboardMode(): DashboardMode {
  return useContext(DashboardActionsContext)?.mode ?? "live";
}

/**
 * Returns a function to call after a successful mutation: in live mode it
 * refreshes the route segment so server data is re-read; in preview the
 * fixture store already notified its subscribers, so it does nothing.
 */
export function useAfterMutation(): () => void {
  const { mode } = useDashboardActions();
  const router = useRouter();
  return useCallback(() => {
    if (mode === "live") router.refresh();
  }, [mode, router]);
}

/**
 * Map a canonical dashboard href (`/dashboard/deposit`) to the current mode:
 * unchanged in live mode; rewritten under `/design-preview/dashboard` in
 * preview, keeping the active `?scenario=` parameter.
 */
export function toModeHref(href: string, mode: DashboardMode, scenario?: string | null): string {
  if (mode !== "preview") return href;
  if (!href.startsWith(DASHBOARD_ROOT)) return href;
  const [pathAndQuery, hash] = href.split("#", 2);
  const [path, query] = pathAndQuery.split("?", 2);
  const rewritten = `${PREVIEW_ROOT}${path.slice(DASHBOARD_ROOT.length)}`;
  const params = new URLSearchParams(query ?? "");
  if (scenario && !params.has("scenario")) params.set("scenario", scenario);
  const search = params.toString();
  return `${rewritten}${search ? `?${search}` : ""}${hash ? `#${hash}` : ""}`;
}

/**
 * The canonical dashboard pathname for the current URL: preview paths are
 * mapped back to `/dashboard/...` so navigation matching and breadcrumbs work
 * in both modes.
 */
export function useDashboardPathname(): string {
  const pathname = usePathname() ?? DASHBOARD_ROOT;
  return useMemo(() => toDashboardPathname(pathname), [pathname]);
}

/** Pure form of {@link useDashboardPathname}. */
export function toDashboardPathname(pathname: string): string {
  const path = normalizePathname(pathname);
  if (path === PREVIEW_ROOT) return DASHBOARD_ROOT;
  if (path.startsWith(`${PREVIEW_ROOT}/`)) return `${DASHBOARD_ROOT}${path.slice(PREVIEW_ROOT.length)}`;
  return path;
}
