import "server-only";
import { requireAdmin } from "@/lib/admin/access.server";
import { getAdminTradersAction } from "@/lib/admin/traders.server";
import type { AdminState } from "@/lib/admin/model";
import { AdminProvider } from "./provider";
import { AdminScreen } from "./screen";

export async function AdminLivePage() {
  await requireAdmin();
  return <AdminScreen />;
}

/** Secured live state for trader management; no fixture account or finance data crosses into production. */
export async function AdminTradersLivePage() {
  const admin = await requireAdmin();
  const traders = await getAdminTradersAction();
  const initial: AdminState = {
    account: {
      name: admin.email,
      email: admin.email,
      phone: "",
      jobTitle: "Administrator",
      density: "compact",
      reviewAlerts: true,
      twoFactorDemo: false,
    },
    users: [],
    wallets: [],
    traders,
    requests: [],
    audit: [],
    credits: [],
    receipts: {},
    notifications: [],
    signals: [],
    addresses: [],
  };

  return (
    <AdminProvider initial={initial} preview={false}>
      <AdminScreen />
    </AdminProvider>
  );
}
