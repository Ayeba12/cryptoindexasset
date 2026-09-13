import type { Metadata } from "next";

import { ComponentReference } from "@/components/dashboard/preview/component-reference";

export const metadata: Metadata = {
  title: "Dashboard component reference | Crypto Index Asset",
  robots: { index: false, follow: false },
};

/** Component reference inside the dashboard preview shell. */
export default function DashboardComponentsPage() {
  return <ComponentReference />;
}
