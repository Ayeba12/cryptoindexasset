"use client";

import { useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import type { RegionResult, SessionAccount } from "@/lib/dashboard/contracts";
import { regionError, type DashboardData } from "@/lib/dashboard/data-source";
import { createFixtureActions, createFixtureStore, type FixtureStore } from "@/lib/dashboard/fixtures";
import { DEFAULT_SCENARIO_ID, isScenarioId, type ScenarioId } from "@/lib/dashboard/fixtures/scenarios";

import { DashboardActionsProvider } from "../actions-context";
import { DashboardShell } from "../shell";
import { PreviewToolbar } from "./toolbar";

interface PreviewContextValue {
  /** Reads, wrapped by the toolbar toggles (pending forever while "Show loading skeletons", `error` while "Show read error"). */
  data: DashboardData;
  store: FixtureStore;
  scenarioId: ScenarioId;
  /** Increments on every fixture mutation; include it in effect dependencies to re-read. */
  version: number;
  showLoading: boolean;
  showReadError: boolean;
  setShowLoading: (value: boolean) => void;
  setShowReadError: (value: boolean) => void;
}

const PreviewContext = createContext<PreviewContextValue | null>(null);

const META_METHODS = new Set<keyof DashboardData>(["getSession", "getCapabilities", "getUnreadCount"]);

function wrapData(data: DashboardData, showLoading: boolean, showReadError: boolean): DashboardData {
  if (!showLoading && !showReadError) return data;
  return new Proxy(data, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (typeof value !== "function") return value;
      const name = property as keyof DashboardData;
      return (...args: unknown[]) => {
        if (META_METHODS.has(name)) return (value as (...a: unknown[]) => unknown).apply(target, args);
        if (showLoading) return new Promise(() => {});
        if (showReadError) return Promise.resolve(regionError("Simulated read error from the design review toolbar", true));
        return (value as (...a: unknown[]) => unknown).apply(target, args);
      };
    },
  });
}

/**
 * Design-review boundary. Reads `?scenario=` (default `funded`), builds the
 * in-memory fixture store, provides preview actions and renders the shell
 * with the review toolbar above the header. Never used by live routes.
 */
export function DashboardPreviewProvider({
  children,
  defaultSidebarOpen,
}: {
  children: ReactNode;
  defaultSidebarOpen?: boolean;
}) {
  const params = useSearchParams();
  const requested = params?.get("scenario");
  const scenarioId: ScenarioId = isScenarioId(requested) ? requested : DEFAULT_SCENARIO_ID;

  const store = useMemo(() => createFixtureStore(scenarioId), [scenarioId]);
  const subscribe = useCallback((listener: () => void) => store.subscribe(listener), [store]);
  const version = useSyncExternalStore(
    subscribe,
    () => store.version,
    () => 0,
  );
  const actions = useMemo(() => createFixtureActions(store), [store]);

  const [showLoading, setShowLoading] = useState(false);
  const [showReadError, setShowReadError] = useState(false);
  const data = useMemo(() => wrapData(store.data, showLoading, showReadError), [store, showLoading, showReadError]);

  const [account, setAccount] = useState<SessionAccount | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let live = true;
    void store.data.getSession().then((session) => {
      if (live) setAccount(session);
    });
    void store.data.getUnreadCount().then((count) => {
      if (live) setUnreadCount(count);
    });
    return () => {
      live = false;
    };
  }, [store, version]);

  const value = useMemo<PreviewContextValue>(
    () => ({ data, store, scenarioId, version, showLoading, showReadError, setShowLoading, setShowReadError }),
    [data, store, scenarioId, version, showLoading, showReadError],
  );

  return (
    <PreviewContext.Provider value={value}>
      <DashboardActionsProvider mode="preview" actions={actions}>
        <DashboardShell
          account={account}
          unreadCount={unreadCount}
          mode="preview"
          toolbar={<PreviewToolbar />}
          defaultSidebarOpen={defaultSidebarOpen}
        >
          {children}
        </DashboardShell>
      </DashboardActionsProvider>
    </PreviewContext.Provider>
  );
}

/** Fixture reads and review toggles. Throws outside the preview provider. */
export function usePreviewData(): PreviewContextValue {
  const context = useContext(PreviewContext);
  if (!context) throw new Error("usePreviewData must be used inside DashboardPreviewProvider.");
  return context;
}

/** A region read in progress. */
export type LoadingRegion = { status: "loading" };

/**
 * Run one region read against the preview data and re-run it whenever the
 * fixture store changes or a toolbar toggle flips. Returns `{ status:
 * "loading" }` until the promise settles.
 */
export function useRegion<T>(read: (data: DashboardData) => Promise<RegionResult<T>>): RegionResult<T> | LoadingRegion {
  const { data, version } = usePreviewData();
  const [result, setResult] = useState<RegionResult<T> | LoadingRegion>({ status: "loading" });

  useEffect(() => {
    let live = true;
    setResult({ status: "loading" });
    read(data).then(
      (value) => {
        if (live) setResult(value);
      },
      () => {
        if (live) setResult(regionError<T>("The fixture read threw", true));
      },
    );
    return () => {
      live = false;
    };
    // `read` is expected to be stable or inline; re-run on data/version changes only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, version]);

  return result;
}
