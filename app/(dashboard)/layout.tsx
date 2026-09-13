import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { DashboardActionsProvider } from "@/components/dashboard/actions-context";
import { UnavailableState } from "@/components/dashboard/data-state";
import { PageHeading } from "@/components/dashboard/page-heading";
import { DashboardShell } from "@/components/dashboard/shell";
import { DashboardThemeProvider } from "@/components/dashboard/theme-provider";
import { liveActions } from "@/lib/dashboard/live-actions";
import { getDashboardData, getSessionAccount } from "@/lib/dashboard/queries.server";

/**
 * Authenticated dashboard layout. Resolves the session on the server:
 * unauthenticated → `/login`; unprovisioned or restricted → the shell with an
 * explanation and no data queries; otherwise the live shell with server
 * actions and the truthful unread count.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const account = await getSessionAccount();
  if (account.state === "unauthenticated") redirect("/login");

  const cookieStore = await cookies();
  const defaultSidebarOpen = cookieStore.get("sidebar_state")?.value !== "false";

  if (account.state !== "authenticated") {
    const reason =
      account.state === "restricted"
        ? account.reason
        : "Your sign-in is valid but no customer account is linked to it yet. Contact support to complete provisioning.";
    return (
      <DashboardThemeProvider>
        <DashboardActionsProvider mode="live" actions={liveActions}>
          <DashboardShell account={account} mode="live" unreadCount={0} defaultSidebarOpen={defaultSidebarOpen}>
            <PageHeading title="Account unavailable" />
            <UnavailableState
              region="Account"
              headingLevel={2}
              title={account.state === "restricted" ? "This account is restricted" : "Account not provisioned"}
              reason={reason}
              alternative={{ label: "Get help", href: "/contact" }}
            />
          </DashboardShell>
        </DashboardActionsProvider>
      </DashboardThemeProvider>
    );
  }

  const data = await getDashboardData();
  const unreadCount = await data.getUnreadCount();

  return (
    <DashboardThemeProvider>
      <DashboardActionsProvider mode="live" actions={liveActions}>
        <DashboardShell account={account} mode="live" unreadCount={unreadCount} defaultSidebarOpen={defaultSidebarOpen}>
          {children}
        </DashboardShell>
      </DashboardActionsProvider>
    </DashboardThemeProvider>
  );
}
