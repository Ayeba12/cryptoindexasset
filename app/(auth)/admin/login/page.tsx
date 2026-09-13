import type { Metadata } from "next";
import { AccountEntry } from "@/components/public-site/account-entry";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Admin sign in", description: "Account access for authorised Crypto Index Asset administrators." };
export default function AdminLoginPage() { return <AccountEntry mode="admin" configured={Boolean(getSupabaseConfig())} />; }
