import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { DashboardPreviewProvider } from "@/components/dashboard/preview/provider";
import { DashboardThemeProvider } from "@/components/dashboard/theme-provider";

export const metadata: Metadata = {
  title: "Customer dashboard design review | Crypto Index Asset",
  description: "Fixture-driven review of the customer dashboard. No live account.",
  robots: { index: false, follow: false },
};

/**
 * Dashboard design review. Development only: production returns 404 before
 * any fixture is built, so no production route can select demo data.
 */
export default async function DashboardPreviewLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  const cookieStore = await cookies();
  const defaultSidebarOpen = cookieStore.get("sidebar_state")?.value !== "false";
  return (
    <DashboardThemeProvider>
      <Suspense fallback={null}>
        <DashboardPreviewProvider defaultSidebarOpen={defaultSidebarOpen}>{children}</DashboardPreviewProvider>
      </Suspense>
    </DashboardThemeProvider>
  );
}
