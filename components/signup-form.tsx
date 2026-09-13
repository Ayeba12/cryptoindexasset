"use client";

import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AuthPasswordField } from "@/components/auth-password-field";

type SignupFormProps = ComponentProps<"form"> & {
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  message?: ReactNode;
};

// The installed shadcn signup-02 form, using the existing brand tokens and real
// destinations instead of the registry's placeholder links and GitHub action.
export function SignupForm({ className, disabled = true, loading = false, error, message, ...props }: SignupFormProps) {
  return <form className={cn("pp-account-form", className)} aria-busy={loading} {...props}>
    <FieldGroup>
      <div className="pp-auth-heading">
        <h1 id="account-entry-title" className="pp-h2">Create your account.</h1>
        <p>Enter your details to register your secure account.</p>
      </div>
      {message}
      <FieldSet disabled={disabled || loading}>
        <legend className="pp-sr-only">Registration details</legend>
        <Field className="pp-field">
          <FieldLabel htmlFor="account-name">Full name</FieldLabel>
          <Input className="pp-input" id="account-name" name="name" autoComplete="name" required maxLength={120} />
        </Field>
        <Field className="pp-field">
          <FieldLabel htmlFor="account-email">Email address</FieldLabel>
          <Input className="pp-input" id="account-email" name="email" type="email" autoComplete="email" required aria-describedby={error ? "account-error" : undefined} />
        </Field>
        <AuthPasswordField registering error={error} />
        <Field className="pp-field">
          <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
          <Input className="pp-input" id="confirm-password" name="confirm-password" type="password" autoComplete="new-password" required minLength={10} aria-describedby={error ? "account-error" : undefined} />
        </Field>
        <div className="flex items-start gap-3 my-2">
          <input
            type="checkbox"
            id="accept-terms"
            name="terms"
            required
            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
          />
          <label htmlFor="accept-terms" className="text-xs text-muted-foreground leading-snug cursor-pointer">
            I confirm that I am at least 18 years of age, legally eligible, and I agree to the{" "}
            <Link href="/terms" target="_blank" className="text-foreground underline underline-offset-2">Terms &amp; Conditions</Link>,{" "}
            <Link href="/policy" target="_blank" className="text-foreground underline underline-offset-2">Privacy Policy</Link>, and{" "}
            <Link href="/risk-disclosure" target="_blank" className="text-foreground underline underline-offset-2">Risk Disclosure</Link>.
          </label>
        </div>
        <Field><Button className="pp-auth-submit" type="submit" disabled={disabled || loading}>{loading ? "Creating account..." : "Create account"}</Button></Field>
      </FieldSet>
      <Field className="pp-account-links">
        <FieldDescription>Already have an account? <Link href="/login" prefetch={false}>Sign in</Link></FieldDescription>
        <FieldDescription>By creating an account, you accept our <Link href="/terms">Terms and Conditions</Link>, <Link href="/policy">Privacy Policy</Link> and <Link href="/cookie-policy">Cookie Policy</Link>.</FieldDescription>
      </Field>
    </FieldGroup>
  </form>;
}
