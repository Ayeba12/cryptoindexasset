import type { Metadata } from "next";
import { PublicFrame } from "@/components/public-site/frame";
import { PublicHeader } from "@/components/public-site/header";
import { PublicFooter } from "@/components/public-site/footer";
import { CookieNotice } from "@/components/public-site/cookie-notice";
import "@/components/public-site/public.css";

export const metadata: Metadata = {
  title: { default: "Crypto Index Asset", template: "%s | Crypto Index Asset" },
  description: "Explore crypto account guides, copy-trading considerations and the details to check before investing.",
  // Local implementation is not publication approval. Remove only after the release checklist is closed.
  robots: { index: false, follow: false },
  icons: { icon: [{ url: "/brand/favicon.svg", type: "image/svg+xml" }] },
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <PublicFrame><PublicHeader /><CookieNotice />{children}<PublicFooter /></PublicFrame>;
}
