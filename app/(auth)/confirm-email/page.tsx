import type { Metadata } from "next";
import { ConfirmEmailView } from "@/components/auth/confirm-email-view";

export const metadata: Metadata = {
  title: "Email confirmation",
  description: "Confirm your registered email address to activate your Crypto Index Asset account.",
};

export default function Page() {
  return <ConfirmEmailView />;
}
