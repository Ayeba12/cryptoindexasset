"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { AuthPasswordField } from "@/components/auth-password-field";
import { createClient } from "@/lib/supabase/client";
import { ProductImage } from "@/components/public-site/product-image";
import { ConceptCaption } from "@/components/public-site/product-blocks";

export function ResetPasswordForm({ configured, authenticated }: { configured: boolean; authenticated: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || !authenticated || loading) return;
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") || "");
    const confirmPassword = String(data.get("confirm-password") || "");
    setError("");
    setSuccess("");

    if (password.length < 10) {
      setError("Password must be at least 10 characters long.");
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter your password.");
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        throw new Error("We could not update the password. The recovery link may have expired. Request a new link and try again.");
      }

      setSuccess("Your password has been reset successfully. Redirecting to dashboard...");
      setTimeout(() => {
        router.replace("/dashboard");
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset password. Please request a new link.");
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
            <BreadcrumbItem><BreadcrumbPage>Set new password</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="pp-auth-form-position">
          {!configured || !authenticated ? (
            <div className="pp-account-form">
              <div className="pp-auth-heading">
                <h1 id="reset-password-title" className="pp-h2">
                  {configured ? "Recovery link expired." : "Password recovery unavailable."}
                </h1>
                <p>
                  {configured
                    ? "This password reset link is invalid, has expired, or was already used."
                    : "Authentication is not configured in this environment."}
                </p>
              </div>
              <p className="pp-document-notice" id="reset-expired-notice">
                {configured
                  ? "For your account security, password recovery links are single-use and expire after a short period. Please request a new reset link."
                  : "No password will be sent or changed from this page."}
              </p>
              <div className="pp-actions" style={{ marginTop: "1rem" }}>
                <Button asChild className="pp-button" variant="default">
                  <Link href="/forgot-password">Request new reset link</Link>
                </Button>
                <Button asChild className="pp-button" variant="outline">
                  <Link href="/login">Return to sign in</Link>
                </Button>
              </div>
            </div>
          ) : (
            <form className="pp-account-form" onSubmit={handleSubmit} aria-busy={loading}>
              <FieldGroup>
                <div className="pp-auth-heading">
                  <h1 id="reset-password-title" className="pp-h2">Set new password.</h1>
                  <p>Choose a strong password with at least 10 characters.</p>
                </div>

                {error && (
                  <p className="pp-form-error" role="alert" tabIndex={-1} ref={errorRef} id="reset-error">
                    {error}
                  </p>
                )}

                {success && (
                  <p className="pp-document-notice" role="status">
                    {success}
                  </p>
                )}

                <FieldSet disabled={loading || Boolean(success)}>
                  <legend className="pp-sr-only">New password details</legend>
                  <AuthPasswordField registering={true} error={error} errorId="reset-error" minLength={10} />
                  <Field className="pp-field">
                    <FieldLabel htmlFor="reset-confirm-password">Confirm new password</FieldLabel>
                    <Input
                      className="pp-input"
                      id="reset-confirm-password"
                      name="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={10}
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? "reset-error" : undefined}
                    />
                  </Field>
                  <Field>
                    <Button className="pp-auth-submit" type="submit" disabled={loading || Boolean(success)}>
                      {loading ? "Updating password..." : "Save new password"}
                    </Button>
                  </Field>
                </FieldSet>

              <Field className="pp-account-links">
                <FieldDescription>
                  <Link href="/login" prefetch={false}>Return to sign in</Link>
                </FieldDescription>
                <FieldDescription>
                  <Link href="/contact" prefetch={false}>Need help with account access?</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        )}
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
