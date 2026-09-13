"use client";

import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useStatusAnnouncer } from "./status-announcer";

/**
 * Copies exact text to the clipboard. "Copied" is announced through the
 * status region only after `writeText` resolves; on failure an inline message
 * appears with the value rendered selectable (`user-select: all`) so it can
 * be copied by hand.
 */
export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  describe,
  size = "lg",
  variant = "outline",
  className,
}: {
  /** Exact text to copy. */
  value: string;
  label?: string;
  copiedLabel?: string;
  /** What is being copied, for the accessible name ("Copy deposit address"). */
  describe?: string;
  size?: "sm" | "default" | "lg";
  variant?: "outline" | "ghost" | "secondary";
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const { announce } = useStatusAnnouncer();
  const errorId = useId();
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(value);
      setState("copied");
      announce(copiedLabel);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("failed");
    }
  };

  const failed = state === "failed";
  return (
    <span className={cn("inline-flex flex-col items-start gap-2", className)} data-slot="copy-button">
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={copy}
        aria-label={describe ? `${label} ${describe}` : undefined}
        aria-describedby={failed ? errorId : undefined}
      >
        {state === "copied" ? (
          <CheckIcon size={16} aria-hidden="true" data-icon="inline-start" />
        ) : (
          <CopyIcon size={16} aria-hidden="true" data-icon="inline-start" />
        )}
        {state === "copied" ? copiedLabel : label}
      </Button>
      {failed ? (
        <span id={errorId} className="ca-help text-destructive" role="alert">
          Copy failed. Select the text to copy it manually.{" "}
          <code className="ca-id select-all text-foreground">{value}</code>
        </span>
      ) : null}
    </span>
  );
}
