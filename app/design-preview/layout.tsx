import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PreviewFrameSwitch } from "@/components/dashboard/preview/frame-switch";
import "@/components/public-site/public.css";

export const metadata: Metadata = {
  title: "Public portal design review | Crypto Index Asset",
  description: "Local design review. Illustrative content, no live account actions.",
  robots: { index: false, follow: false },
  icons: { icon: [{ url: "/brand/favicon.svg", type: "image/svg+xml" }] },
};

export default function DesignPreviewLayout({ children }: { children: React.ReactNode }) {
  // The review must not become an accidentally published financial service.
  if (process.env.NODE_ENV === "production") notFound();
  return <PreviewFrameSwitch>{children}</PreviewFrameSwitch>;
}
