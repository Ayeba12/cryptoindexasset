import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Password recovery",
  description: "Reset your Crypto Index Asset account password.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm configured={Boolean(getSupabaseConfig())} />;
}
