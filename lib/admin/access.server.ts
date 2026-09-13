import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

/** Re-check the authoritative auth user in each server entry point, not only middleware. */
export const requireAdmin = cache(async (): Promise<{ id: string; email: string }> => {
  if (!getSupabaseConfig()) redirect("/admin/login");
  let user: { id: string; email: string } | null = null;
  try {
    const client = await createClient();
    const { data, error } = await client.auth.getUser();
    const role = (data.user?.app_metadata?.role as string | undefined)?.toLowerCase();
    if (!error && data.user && (role === "admin" || role === "superadmin")) {
      user = { id: data.user.id, email: data.user.email || data.user.id };
    }
  } catch {
    console.error("[admin] Session verification unavailable");
  }
  if (!user) redirect("/admin/login");
  return user;
});
