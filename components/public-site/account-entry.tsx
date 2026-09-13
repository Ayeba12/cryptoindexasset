"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { SignupForm } from "@/components/signup-form";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { createClient } from "@/lib/supabase/client";
import { sanitizeAdminReturnPath, sanitizeCustomerReturnPath } from "@/lib/auth/redirects";
import { ProductImage } from "./product-image";
import { ConceptCaption } from "./product-blocks";

// Registration is ready with approved Terms, Privacy, and KYC onboarding.
const registrationReady = process.env.NEXT_PUBLIC_ENABLE_REGISTRATION !== "false";

function getDestination(admin: boolean): string {
  if (typeof window === "undefined") return admin ? "/admin" : "/dashboard";
  const params = new URLSearchParams(window.location.search);
  return admin
    ? sanitizeAdminReturnPath(params.get("returnUrl"))
    : sanitizeCustomerReturnPath(params.get("returnUrl"));
}

export function AccountEntry({ mode, configured }: { mode: "login" | "register" | "admin"; configured: boolean }) {
  const router = useRouter();
  const registering = mode === "register";
  const admin = mode === "admin";
  const unavailable = !configured || (registering && !registrationReady);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);
  const breadcrumb = registering ? "Create account" : admin ? "Admin sign in" : "User sign in";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err === "auth_code_error") {
      setError("The verification link is invalid, has expired, or was already used. Please request a new link.");
      requestAnimationFrame(() => errorRef.current?.focus());
    } else if (err) {
      setError("Authentication failed. Please check your credentials and try again.");
      requestAnimationFrame(() => errorRef.current?.focus());
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (unavailable || loading) return;
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    setError(""); setSuccess(""); setLoading(true);
    try {
      const supabase = createClient();
      if (registering) {
        if (password.length < 10) throw new Error("Password must be at least 10 characters long.");
        if (password !== data.get("confirm-password")) throw new Error("Passwords do not match.");
        const termsAccepted = Boolean(data.get("terms"));
        if (!termsAccepted) throw new Error("You must accept the Terms and Conditions and Privacy Policy to proceed.");

        const callbackUrl = new URL("/auth/callback", window.location.origin);
        callbackUrl.searchParams.set("next", "/dashboard/settings/verification");
        const acceptedAt = new Date().toISOString();
        const result = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: callbackUrl.toString(),
            data: {
              full_name: String(data.get("name") || "").trim(),
              terms_accepted_at: acceptedAt,
              terms_version: "2026-09-13",
              privacy_accepted_at: acceptedAt,
              eligibility_confirmed: true,
            },
          },
        });
        if (result.error) throw new Error("We could not create the account. Please try again later.");
        if (result.data.session) {
          router.replace("/dashboard/settings/verification");
          router.refresh();
        } else {
          router.push(`/confirm-email?email=${encodeURIComponent(email)}`);
        }
      } else {
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw new Error("We could not sign you in. Check your email and password, then try again.");
        // Middleware repeats this role check on every protected admin request.
        // If an ordinary user signed in through the admin portal, revoke the session immediately.
        if (admin && result.data.user?.app_metadata?.role !== "admin") {
          await supabase.auth.signOut();
          throw new Error("This account does not have administrator access. Use User sign in.");
        }
        const destination = getDestination(admin);
        router.replace(destination);
        router.refresh();
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Account access is unavailable. Please try again later.");
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally { setLoading(false); }
  }

  const message = <>
    {unavailable && <p id="account-unavailable" className="pp-document-notice">
      {registering
        ? "Registration is currently paused for scheduled maintenance. Please check back shortly."
        : "Authentication is temporarily unavailable. Please check back shortly."}
    </p>}
    {error && <p className="pp-form-error" role="alert" tabIndex={-1} ref={errorRef} id="account-error">{error}</p>}
    {success && <p className="pp-document-notice" role="status">{success}</p>}
  </>;
  const formProps = {
    onSubmit: submit, disabled: unavailable, loading, error, message,
    "aria-describedby": unavailable ? "account-unavailable" : undefined,
    "aria-labelledby": "account-entry-title",
  };

  return (
    <main id="main-content" tabIndex={-1} className="pp-auth-layout">
      <div className="pp-auth-column">
        <Breadcrumb className="pp-auth-breadcrumb" aria-label="Breadcrumb">
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink asChild><Link href="/">Home</Link></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>{breadcrumb}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="pp-auth-form-position">
          {registering ? <SignupForm {...formProps} /> : <LoginForm {...formProps} admin={admin} />}
        </div>
      </div>
      <aside className="pp-auth-art" aria-label="Product concept">
        <div className="pp-auth-art-content">
          <div>
            <h2 className="pp-h2">Your account.<br />In perspective.</h2>
            <p>Balances, activity and strategy details in the same view.</p>
          </div>
          <figure>
            <ProductImage scene="08-closing-mockup" sizes="(min-width: 1024px) 50vw, 1px"
              alt="Illustrative account dashboard on a tablet. Figures and strategies are fictional demo data." />
            <ConceptCaption performance />
          </figure>
          <p className="pp-small">Crypto assets can lose value. Past performance does not guarantee future results.</p>
        </div>
      </aside>
    </main>
  );
}
