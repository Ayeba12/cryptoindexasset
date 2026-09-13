import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminProvider } from "@/components/admin/provider";
import { AdminShell } from "@/components/admin/shell";
import { DashboardThemeProvider } from "@/components/dashboard/theme-provider";
import { createAdminFixture } from "@/lib/admin/fixtures";

export const metadata: Metadata = {
  title: "Admin design review | Crypto Index Asset",
  robots: { index: false, follow: false },
};
export default function AdminPreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <DashboardThemeProvider>
      <AdminProvider initial={createAdminFixture()}>
        <AdminShell>{children}</AdminShell>
      </AdminProvider>
    </DashboardThemeProvider>
  );
}
