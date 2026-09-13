import type { Metadata } from "next";
import { PublicHome } from "@/components/public-site/home";
import { getPublicFeaturedTraders } from "@/lib/traders/public";

export const metadata: Metadata = {
  title: "Crypto accounts and copy trading | Crypto Index Asset",
  description: "Bring balances, account activity and copy-trading information into view. Understand the service and its risks before deciding to invest.",
};

export const revalidate = 60; // revalidate every minute, or on demand when published/archived

export default async function MarketingHomePage() {
  const traders = await getPublicFeaturedTraders();
  return <PublicHome traders={traders} />;
}
