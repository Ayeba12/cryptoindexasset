import type { Metadata } from "next";
import { AccountEntry } from "@/components/public-site/account-entry";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Create account", description: "Review account registration and the information required before joining Crypto Index Asset." };
export default function Page() { return <AccountEntry mode="register" configured={Boolean(getSupabaseConfig())} />; }
