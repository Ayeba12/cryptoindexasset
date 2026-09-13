"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActionResult, RegionResult } from "@/lib/dashboard/contracts";
import { useAfterMutation } from "../actions-context";
import { DashboardLink } from "../dashboard-link";
import { SemanticNotice } from "../semantic-status";
import {
  EmptyState,
  ErrorState,
  NotFoundState,
  RegionSkeleton,
  UnavailableState,
  type SkeletonVariant,
} from "../data-state";

export function Region<T>({
  value,
  name,
  children,
  variant = "list",
  retry,
}: {
  value?: RegionResult<T>;
  name: string;
  children: (value: T) => ReactNode;
  variant?: SkeletonVariant;
  retry?: () => void;
}) {
  if (!value) return <RegionSkeleton region={name} variant={variant} />;
  switch (value.status) {
    case "ready":
      return children(value.data);
    case "empty":
      return (
        <EmptyState
          region={name}
          title={`No ${name.toLowerCase()} yet`}
          description={value.reason}
        />
      );
    case "error":
      return (
        <ErrorState
          region={name}
          message={value.message}
          retryable={value.retryable}
          onRetry={retry}
        />
      );
    case "unavailable":
      return (
        <UnavailableState
          region={name}
          reason={value.reason}
          alternative={value.alternative}
        />
      );
    case "not-found":
      return <NotFoundState region={name} />;
  }
}

export function ActionLink({
  href,
  children,
  primary = false,
}: {
  href: string;
  children: ReactNode;
  primary?: boolean;
}) {
  return (
    <Button asChild variant={primary ? "default" : "outline"} size="lg">
      <DashboardLink href={href}>{children}</DashboardLink>
    </Button>
  );
}

export function Choice({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: { value: string; label: string; disabled?: boolean }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} className="min-w-[8rem] w-full">
          <SelectValue placeholder={`Choose ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Only non-sensitive filters go in URLs. Recipient and form values remain in component state. */
export function useFilters() {
  const q = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  return {
    q,
    change: (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(q?.toString());
      next.delete("page");
      for (const [key, value] of Object.entries(updates)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      router.replace(`${pathname}?${next}`, { scroll: false });
    },
  };
}

export function Pager({
  page,
  hasMore,
  total,
}: {
  page: number;
  hasMore: boolean;
  total: number;
}) {
  const { change } = useFilters();
  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-4"
    >
      <p className="ca-help">
        Page {page} · {total} records
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="lg"
          disabled={page <= 1}
          onClick={() => change({ page: String(page - 1) })}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="lg"
          disabled={!hasMore}
          onClick={() => change({ page: String(page + 1) })}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}

/** Prevent repeat clicks before React commits and keep errors inline, not toast-only. */
export function useOperation() {
  const refresh = useAfterMutation();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const id = useId();
  async function run<T>(
    operation: () => Promise<ActionResult<T>>,
    success: string,
    onSuccess?: (value: T) => void,
  ) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    setFieldErrors({});
    try {
      const result = await operation();
      setFailed(!result.ok);
      if (result.ok) {
        setMessage(success);
        onSuccess?.(result.data);
        refresh();
      } else {
        setMessage(result.message);
        setFieldErrors(result.fieldErrors ?? {});
      }
      return result;
    } catch {
      setFailed(true);
      setMessage(
        "The request could not be confirmed. Please check your activity before trying again.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return {
    busy,
    run,
    fieldErrors,
    errorId: id,
    feedback: message ? (
      <div id={id} tabIndex={-1} className="ca-body break-words">
        <SemanticNotice tone={failed ? "danger" : "success"}>
          {message}
          {Object.keys(fieldErrors).length > 0 && (
            <ul className="mt-2 list-disc ps-4">
              {Object.entries(fieldErrors).map(([key, value]) => (
                <li key={key}>
                  {key}: {value}
                </li>
              ))}
            </ul>
          )}
        </SemanticNotice>
      </div>
    ) : null,
  };
}
