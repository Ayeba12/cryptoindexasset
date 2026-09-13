"use client";

import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AuthPasswordField } from "@/components/auth-password-field";

type LoginFormProps = ComponentProps<"form"> & {
  admin?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  message?: ReactNode;
};

// Adapted from the installed shadcn login-02 block. Authentication is supplied
// by the page controller; unsupported social sign-in is deliberately omitted.
export function LoginForm({ className, admin = false, disabled = true, loading = false, error, message, ...props }: LoginFormProps) {
  return <form className={cn("pp-account-form", className)} aria-busy={loading} {...props}>
    <FieldGroup>
      <div className="pp-auth-heading">
        <h1 id="account-entry-title" className="pp-h2">{admin ? "Admin sign in." : "Welcome back."}</h1>
        <p>{admin ? "For authorised administrators. A user account does not grant back-office access." : "Sign in to view your balances and account activity."}</p>
      </div>
      {message}
      <FieldSet disabled={disabled || loading}>
        <legend className="pp-sr-only">Sign-in details</legend>
        <Field className="pp-field">
          <FieldLabel htmlFor="account-email">{admin ? "Administrator email" : "Email address"}</FieldLabel>
          <Input className="pp-input" id="account-email" name="email" type="email" autoComplete="username" required aria-describedby={error ? "account-error" : undefined} />
        </Field>
        <AuthPasswordField error={error} />
        <Field><Button className="pp-auth-submit" type="submit" disabled={disabled || loading}>{loading ? "Signing in..." : admin ? "Sign in as administrator" : "Sign in"}</Button></Field>
      </FieldSet>
      <Field className="pp-account-links">
        {!admin ? (
          <>
            <FieldDescription>
              New here? <Link href="/register" prefetch={false}>Create an account</Link>
            </FieldDescription>
            <FieldDescription>
              <Link href="/forgot-password" prefetch={false}>Forgot your password?</Link>
            </FieldDescription>
          </>
        ) : null}
        <FieldDescription><Link href="/contact" prefetch={false}>Need help with account access?</Link></FieldDescription>
        <FieldDescription>Read the <Link href="/terms">terms draft</Link>, <Link href="/policy">privacy draft</Link> and <Link href="/cookie-policy">cookie policy</Link>. No agreement is accepted by viewing this form.</FieldDescription>
      </Field>
    </FieldGroup>
  </form>;
}
