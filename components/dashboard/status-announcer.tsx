"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

interface StatusAnnouncerValue {
  /** Announce a short message through the polite live region (clipboard, submitted requests). */
  announce: (message: string) => void;
}

const StatusAnnouncerContext = createContext<StatusAnnouncerValue | null>(null);

/**
 * Mounts one polite `role="status"` live region for the shell and provides
 * `announce()` to descendants. Repeated identical messages are re-announced
 * by clearing the region first. Never used for quote refreshes or other
 * continuous updates.
 */
export function StatusAnnouncerProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const timer = useRef<number | null>(null);

  const announce = useCallback((next: string) => {
    setMessage("");
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setMessage(next);
      timer.current = null;
    }, 50);
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const value = useMemo(() => ({ announce }), [announce]);

  return (
    <StatusAnnouncerContext.Provider value={value}>
      {children}
      <div role="status" aria-live="polite" aria-atomic="true" className="ca-sr-only" data-slot="status-region">
        {message}
      </div>
    </StatusAnnouncerContext.Provider>
  );
}

/** `announce(message)` for clipboard and submission feedback. No-op outside the shell. */
export function useStatusAnnouncer(): StatusAnnouncerValue {
  const context = useContext(StatusAnnouncerContext);
  return context ?? NOOP;
}

const NOOP: StatusAnnouncerValue = { announce: () => {} };
