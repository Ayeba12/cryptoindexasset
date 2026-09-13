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

/** Live admin screens rely on the unified AdminProvider supplied by AdminLayout. */
export async function AdminTradersLivePage() {
  await requireAdmin();
  return <AdminScreen />;
}
