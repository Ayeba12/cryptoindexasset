import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Set new password",
  description: "Set a new password for your Crypto Index Asset account.",
};

export default async function ResetPasswordPage() {
  const configured = Boolean(getSupabaseConfig());
  let authenticated = false;

  if (configured) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      authenticated = Boolean(user);
    } catch {
      authenticated = false;
    }
  }

  return <ResetPasswordForm configured={configured} authenticated={authenticated} />;
}
