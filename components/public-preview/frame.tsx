"use client";

import { PublicFrame } from "@/components/public-site/frame";
export { PublicDestination as PreviewDestination, usePublicSite as usePreview } from "@/components/public-site/frame";

export function PreviewFrame({ children }: { children: React.ReactNode }) {
  return <PublicFrame preview>{children}</PublicFrame>;
}
