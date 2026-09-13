"use client";

import { useRef, type ReactNode, type RefObject } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";

import { KeyValueList, type KeyValueItem } from "./panel";

/**
 * Confirmation for consequential actions. Names the asset, amount,
 * destination and consequence through `details`; Cancel comes first in DOM
 * order; the confirm button keeps its width while busy; `destructive` only
 * for actions that destroy or cancel something.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  details,
  confirmLabel,
  cancelLabel = "Cancel",
  busy = false,
  confirmDisabled = false,
  busyLabel = "Submitting",
  destructive = false,
  onConfirm,
  children,
  returnFocusRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  /** Asset, amount, destination, consequence rows. */
  details?: KeyValueItem[];
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  confirmDisabled?: boolean;
  busyLabel?: string;
  destructive?: boolean;
  /** Called on confirm; the dialog stays open until the caller closes it. */
  onConfirm: () => void | Promise<void>;
  /** Extra content between details and footer (an inline error, for example). */
  children?: ReactNode;
  /** Explicit return target when opened from a menu that unmounts. */
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const previousFocus = useRef<HTMLElement | null>(null);
  return (
    <AlertDialog open={open} onOpenChange={busy ? () => {} : onOpenChange}>
      <AlertDialogContent
        className="ca-touch"
        onOpenAutoFocus={() => {
          previousFocus.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const target = returnFocusRef?.current ?? previousFocus.current;
          if (
            target?.isConnected &&
            target !== document.body &&
            !target.matches(":disabled")
          )
            target.focus();
          else document.getElementById("main-content")?.focus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="ca-h3">{title}</AlertDialogTitle>
          <AlertDialogDescription className="ca-body ca-form-prose text-muted-foreground">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {details && details.length > 0 ? (
          <KeyValueList items={details} layout="inline" />
        ) : null}
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? "destructive" : "default"}
            disabled={busy || confirmDisabled}
            aria-busy={busy}
            className="grid"
            onClick={(event) => {
              event.preventDefault();
              void onConfirm();
            }}
          >
            <span
              className="col-start-1 row-start-1 inline-flex items-center justify-center gap-2"
              aria-hidden={busy}
            >
              {confirmLabel}
            </span>
            <span
              className="col-start-1 row-start-1 inline-flex items-center justify-center gap-2"
              style={{ visibility: busy ? "visible" : "hidden" }}
              aria-hidden={!busy}
            >
              {busy ? <Spinner label="" /> : null}
              {busyLabel}
            </span>
            <span className="ca-sr-only">{busy ? busyLabel : ""}</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
