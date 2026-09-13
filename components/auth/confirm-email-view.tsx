"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { EnvelopeSimpleIcon, ArrowClockwiseIcon, CheckCircleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

export function ConfirmEmailView() {
  const [email, setEmail] = useState("");
  const [cooldown, setCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const queryEmail = params.get("email");
      if (queryEmail) setEmail(queryEmail);
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleResend() {
    if (!email || !canResend) return;
    setError(null);
    setResendStatus(null);

    startTransition(async () => {
      try {
        const supabase = createClient();
        const callbackUrl = new URL("/auth/callback", window.location.origin);
        callbackUrl.searchParams.set("next", "/dashboard/settings/verification");

        const { error: resendError } = await supabase.auth.resend({
          type: "signup",
          email,
          options: {
            emailRedirectTo: callbackUrl.toString(),
          },
        });

        if (resendError) {
          setError(resendError.message || "Failed to resend confirmation email. Please try again later.");
        } else {
          setResendStatus(`A new confirmation email has been dispatched to ${email}.`);
          setCanResend(false);
          setCooldown(60);
        }
      } catch (err) {
        setError("Network error while attempting to resend verification email.");
      }
    });
  }

  return (
    <main id="main-content" tabIndex={-1} className="pp-auth-layout">
      <div className="pp-auth-column">
        <Breadcrumb className="pp-auth-breadcrumb" aria-label="Breadcrumb">
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink asChild><Link href="/">Home</Link></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Email confirmation</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="pp-auth-form-position">
          <div className="pp-account-form space-y-6">
            <div className="pp-auth-heading">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                <EnvelopeSimpleIcon size={28} weight="duotone" />
              </div>
              <h1 id="confirm-email-title" className="pp-h2">Confirm your email address</h1>
              <p className="text-sm text-muted-foreground mt-2">
                We have transmitted a secure activation link to:
              </p>
              <p className="font-semibold text-foreground text-base mt-1 break-all">
                {email || "your registered email"}
              </p>
            </div>

            {resendStatus && (
              <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2" role="status">
                <CheckCircleIcon size={18} weight="fill" />
                <span>{resendStatus}</span>
              </div>
            )}

            {error && (
              <p className="pp-form-error" role="alert">
                {error}
              </p>
            )}

            <div className="p-4 rounded-md bg-muted/40 border text-xs space-y-2 text-muted-foreground">
              <p className="font-medium text-foreground">Next steps:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Check your inbox and click <strong>&ldquo;Confirm your email&rdquo;</strong>.</li>
                <li>Upon confirmation, you will be guided directly to the account verification checklist.</li>
                <li>Check your spam or promotions folder if the email does not arrive within two minutes.</li>
              </ul>
            </div>

            <div className="pt-2 space-y-3">
              <Button
                type="button"
                onClick={handleResend}
                disabled={!canResend || isPending || !email}
                className="w-full ca-button-primary flex items-center justify-center gap-2"
              >
                <ArrowClockwiseIcon size={16} className={isPending ? "animate-spin" : ""} />
                {isPending
                  ? "Transmitting email..."
                  : canResend
                  ? "Resend confirmation link"
                  : `Resend link available in ${cooldown}s`}
              </Button>

              <div className="text-center text-xs text-muted-foreground pt-2 space-y-2">
                <p>
                  Entered the wrong address?{" "}
                  <Link href="/register" className="text-foreground underline underline-offset-2">
                    Create account with another email
                  </Link>
                </p>
                <p>
                  Already verified?{" "}
                  <Link href="/login" className="text-foreground underline underline-offset-2">
                    Sign in to your account
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside className="pp-auth-art" aria-label="Account verification">
        <div className="pp-auth-art-content">
          <div>
            <h2 className="pp-h2">Identity &amp; Compliance.<br />Institutional standard.</h2>
            <p>Verification protects your assets and enables full account features.</p>
          </div>
          <div className="p-6 rounded-lg bg-card border space-y-4">
            <h4 className="font-semibold text-sm">Onboarding Process:</h4>
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">1</span>
                <span className="font-medium text-foreground">Email Confirmation (Current step)</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center font-bold text-xs">2</span>
                <span>Customer Due Diligence &amp; KYC Verification</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center font-bold text-xs">3</span>
                <span>Wallet Setup &amp; Copy-Trading Allocation</span>
              </div>
            </div>
          </div>
          <p className="pp-small">All identity documentation is encrypted at rest using AES-256 in private EU storage vaults.</p>
        </div>
      </aside>
    </main>
  );
}
