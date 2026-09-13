"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { createClient } from "@/lib/supabase/client";
import { ProductImage } from "@/components/public-site/product-image";
import { ConceptCaption } from "@/components/public-site/product-blocks";

export function ForgotPasswordForm({ configured }: { configured: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || loading) return;
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "").trim();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const supabase = createClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
      });

      if (resetError) {
        throw new Error("We could not send the reset link. Please wait a moment and try again.");
      }

      setSuccess("If an account exists with this email address, a password reset link has been sent. Please check your inbox.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password recovery is temporarily unavailable.");
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setLoading(false);
    }
  }

  return (
    <main id="main-content" tabIndex={-1} className="pp-auth-layout">
      <div className="pp-auth-column">
        <Breadcrumb className="pp-auth-breadcrumb" aria-label="Breadcrumb">
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink asChild><Link href="/">Home</Link></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink asChild><Link href="/login">User sign in</Link></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Password recovery</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="pp-auth-form-position">
          <form className="pp-account-form" onSubmit={handleSubmit} aria-busy={loading}>
            <FieldGroup>
              <div className="pp-auth-heading">
                <h1 id="forgot-password-title" className="pp-h2">Reset your password.</h1>
                <p>Enter your registered email address to receive password reset instructions.</p>
              </div>

              {!configured && (
                <p className="pp-document-notice" id="auth-unavailable">
                  Authentication is not configured in this environment. Password recovery is unavailable.
                </p>
              )}

              {error && (
                <p className="pp-form-error" role="alert" tabIndex={-1} ref={errorRef} id="forgot-error">
                  {error}
                </p>
              )}

              {success && (
                <p className="pp-document-notice" role="status">
                  {success}
                </p>
              )}

              <FieldSet disabled={!configured || loading}>
                <legend className="pp-sr-only">Password recovery details</legend>
                <Field className="pp-field">
                  <FieldLabel htmlFor="recovery-email">Email address</FieldLabel>
                  <Input
                    className="pp-input"
                    id="recovery-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "forgot-error" : undefined}
                  />
                </Field>
                <Field>
                  <Button className="pp-auth-submit" type="submit" disabled={!configured || loading}>
                    {loading ? "Sending reset link..." : "Send password reset link"}
                  </Button>
                </Field>
              </FieldSet>

              <Field className="pp-account-links">
                <FieldDescription>
                  Remembered your password? <Link href="/login" prefetch={false}>Sign in</Link>
                </FieldDescription>
                <FieldDescription>
                  <Link href="/contact" prefetch={false}>Need help with account access?</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </div>
      </div>
      <aside className="pp-auth-art" aria-label="Product concept">
        <div className="pp-auth-art-content">
          <div>
            <h2 className="pp-h2">Your account.<br />In perspective.</h2>
            <p>Balances, activity and strategy details in the same view.</p>
          </div>
          <figure>
            <ProductImage
              scene="08-closing-mockup"
              sizes="(min-width: 1024px) 50vw, 1px"
              alt="Illustrative account dashboard on a tablet."
            />
            <ConceptCaption performance />
          </figure>
          <p className="pp-small">Crypto assets can lose value. Past performance does not guarantee future results.</p>
        </div>
      </aside>
    </main>
  );
}
