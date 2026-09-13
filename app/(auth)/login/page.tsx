import type { Metadata } from "next";
import { AccountEntry } from "@/components/public-site/account-entry";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "User sign in", description: "Sign in to your Crypto Index Asset account." };
export default function Page() { return <AccountEntry mode="login" configured={Boolean(getSupabaseConfig())} />; }
