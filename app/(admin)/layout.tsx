import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/access.server";
import { AdminProvider } from "@/components/admin/provider";
import { AdminShell } from "@/components/admin/shell";
import { DashboardThemeProvider } from "@/components/dashboard/theme-provider";

export const metadata: Metadata = {
  title: "Administration | Crypto Index Asset",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <DashboardThemeProvider>
      <AdminProvider initial={null}>
        <AdminShell>{children}</AdminShell>
      </AdminProvider>
    </DashboardThemeProvider>
  );
}
