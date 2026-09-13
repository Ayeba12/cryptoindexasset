"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { PublicFrame } from "@/components/public-site/frame";

import { PREVIEW_ROOT } from "../actions-context";

/**
 * Chooses the review frame by route: the public portal review
 * (`/design-preview`, `/design-preview/home`) keeps `PublicFrame preview`
 * exactly as before; the dashboard review (`/design-preview/dashboard*`)
 * renders its children directly so the dashboard shell owns the page.
 */
export function PreviewFrameSwitch({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const isDashboard = pathname === PREVIEW_ROOT || pathname.startsWith(`${PREVIEW_ROOT}/`);
  const isAdmin = pathname === "/design-preview/admin" || pathname.startsWith("/design-preview/admin/");
  if (isDashboard || isAdmin) return <>{children}</>;
  return <PublicFrame preview>{children}</PublicFrame>;
}
