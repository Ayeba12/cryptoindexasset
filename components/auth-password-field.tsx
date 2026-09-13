"use client";

import { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function AuthPasswordField({
  registering = false,
  error,
  errorId = "account-error",
  minLength = 10,
}: {
  registering?: boolean;
  error?: string;
  errorId?: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  return <Field className="pp-field">
    <FieldLabel htmlFor="account-password">Password</FieldLabel>
    <div className="pp-password-field">
      <Input className="pp-input" id="account-password" name="password" type={visible ? "text" : "password"}
        autoComplete={registering ? "new-password" : "current-password"} required minLength={registering ? minLength : undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={[registering ? "password-hint" : "", error ? errorId : ""].filter(Boolean).join(" ") || undefined} />
      <Button variant="ghost" className="pp-icon-button" type="button" aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible} onClick={() => setVisible(!visible)}>
        {visible ? <EyeSlashIcon size={20} aria-hidden="true" /> : <EyeIcon size={20} aria-hidden="true" />}
      </Button>
    </div>
    {registering && <FieldDescription className="pp-small" id="password-hint">Use at least {minLength} characters and a password you do not use elsewhere.</FieldDescription>}
  </Field>;
}
