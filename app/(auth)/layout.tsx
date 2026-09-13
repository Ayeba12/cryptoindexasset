import type { Metadata } from "next";
import { PublicFrame } from "@/components/public-site/frame";
import "@/components/public-site/public.css";

export const metadata: Metadata = {
  title: { default: "Account access", template: "%s | Crypto Index Asset" },
  robots: { index: false, follow: false },
  icons: { icon: [{ url: "/brand/favicon.svg", type: "image/svg+xml" }] },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <PublicFrame compact>{children}</PublicFrame>;
}
