"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

/** Storage key for the dashboard-only theme preference. The public site keeps its own. */
export const DASHBOARD_THEME_STORAGE_KEY = "ca-dashboard-theme";

/**
 * Dashboard theme boundary. Mounted by `app/(dashboard)/layout.tsx` and by
 * the dashboard design-preview layout only. It sets `light` or `dark` on
 * `<html>`; the explicit `:root.light` token block in `app/globals.css` lets
 * Light win on a dark OS. Radix portals render into `<body>` and therefore
 * inherit the resolved tokens.
 */
export function DashboardThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      enableColorScheme
      disableTransitionOnChange
      storageKey={DASHBOARD_THEME_STORAGE_KEY}
      themes={["light", "dark"]}
    >
      {children}
    </NextThemesProvider>
  );
}
