"use client";

import { ArrowClockwiseIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useId, useTransition, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { DashboardLink } from "./dashboard-link";

/** Skeleton geometries. Each preserves the layout of the region it replaces. */
export type SkeletonVariant = "summary" | "table" | "chart" | "list" | "form" | "text";

export function RegionSkeleton({
  variant = "text",
  region,
  rows = 5,
  className,
}: {
  variant?: SkeletonVariant;
  /** Region name for the loading announcement ("Assets"). */
  region: string;
  /** Row count for table/list variants. */
  rows?: number;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={`Loading ${region}`}
      data-slot="region-skeleton"
      data-variant={variant}
      className={cn("w-full", className)}
    >
      {variant === "summary" ? (
        <div className="ca-grid-summary">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex min-h-[7rem] flex-col gap-2 rounded-lg bg-card p-4 ring-1 ring-border">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      ) : null}
      {variant === "table" ? (
        <div className="flex flex-col">
          <div className="flex h-10 items-center gap-4 border-b border-border px-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="ml-auto h-4 w-16" />
          </div>
          {Array.from({ length: rows }, (_, index) => (
            <div key={index} className="flex h-12 items-center gap-4 border-b border-border px-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="ml-auto h-5 w-20" />
            </div>
          ))}
        </div>
      ) : null}
      {variant === "chart" ? (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-8 w-12" />
          </div>
          <Skeleton className="h-56 w-full md:h-80" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : null}
      {variant === "list" ? (
        <div className="flex flex-col">
          {Array.from({ length: rows }, (_, index) => (
            <div key={index} className="flex min-h-14 items-center gap-3 border-b border-border py-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      ) : null}
      {variant === "form" ? (
        <div className="flex max-w-[32rem] flex-col gap-6">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-3 w-48" />
            </div>
          ))}
          <Skeleton className="h-11 w-32" />
        </div>
      ) : null}
      {variant === "text" ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : null}
      <span className="ca-sr-only">Loading {region}</span>
    </div>
  );
}

interface StateFrameProps {
  /** Region name; read before the title by assistive technology. */
  region: string;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  kind: "empty" | "error" | "unavailable" | "not-found";
  className?: string;
  /** Heading level of the title; 3 inside a panel (default), 2 at page level. */
  headingLevel?: 2 | 3;
}

function StateFrame({ region, title, description, children, kind, className, headingLevel = 3 }: StateFrameProps) {
  const id = useId();
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <section
      aria-labelledby={id}
      data-slot="data-state"
      data-kind={kind}
      className={cn("flex flex-col items-start gap-2 py-4", className)}
    >
      <Heading id={id} className="ca-h3">
        <span className="ca-sr-only">{region}: </span>
        {title}
      </Heading>
      {description ? <p className="ca-body ca-prose text-muted-foreground">{description}</p> : null}
      {children ? <div className="mt-2 flex flex-wrap items-center gap-2">{children}</div> : null}
    </section>
  );
}

/** The account has no records here. One named action at most. */
export function EmptyState({
  region,
  title,
  description,
  action,
  className,
  headingLevel,
}: {
  region: string;
  title: ReactNode;
  description?: ReactNode;
  /** One named action (a Button or DashboardLink). */
  action?: ReactNode;
  className?: string;
  headingLevel?: 2 | 3;
}) {
  return (
    <StateFrame region={region} title={title} description={description} kind="empty" className={className} headingLevel={headingLevel}>
      {action}
    </StateFrame>
  );
}

/** A read failed. Retry calls `onRetry` or refreshes the route segment. */
export function ErrorState({
  region,
  message,
  retryable = true,
  onRetry,
  title = "Could not load this section",
  className,
  headingLevel,
}: {
  region: string;
  /** Reason from the region result. */
  message: ReactNode;
  retryable?: boolean;
  /** Custom retry; defaults to `router.refresh()`. */
  onRetry?: () => void | Promise<void>;
  title?: ReactNode;
  className?: string;
  headingLevel?: 2 | 3;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const retry = () => {
    startTransition(async () => {
      if (onRetry) await onRetry();
      else router.refresh();
    });
  };
  return (
    <StateFrame region={region} title={title} description={message} kind="error" className={className} headingLevel={headingLevel}>
      {retryable ? (
        <Button type="button" variant="outline" size="lg" onClick={retry} disabled={pending} aria-busy={pending}>
          <ArrowClockwiseIcon size={16} aria-hidden="true" data-icon="inline-start" />
          {pending ? "Retrying" : "Retry"}
        </Button>
      ) : null}
    </StateFrame>
  );
}

/** The service or entitlement is missing. Plain explanation plus an alternative when one exists. */
export function UnavailableState({
  region,
  reason,
  alternative,
  title = "Not available",
  className,
  headingLevel,
}: {
  region: string;
  reason: ReactNode;
  alternative?: { label: string; href: string };
  title?: ReactNode;
  className?: string;
  headingLevel?: 2 | 3;
}) {
  return (
    <StateFrame region={region} title={title} description={reason} kind="unavailable" className={className} headingLevel={headingLevel}>
      {alternative ? (
        <Button asChild variant="outline" size="lg">
          <DashboardLink href={alternative.href}>{alternative.label}</DashboardLink>
        </Button>
      ) : null}
    </StateFrame>
  );
}

/** Unknown or foreign record. Reveals nothing about other accounts. */
export function NotFoundState({
  region,
  title = "Record not found",
  description = "This record is not available on your account.",
  backHref = "/dashboard",
  backLabel = "Back to overview",
  className,
  headingLevel,
}: {
  region: string;
  title?: ReactNode;
  description?: ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
  headingLevel?: 2 | 3;
}) {
  return (
    <StateFrame region={region} title={title} description={description} kind="not-found" className={className} headingLevel={headingLevel}>
      <Button asChild variant="outline" size="lg">
        <DashboardLink href={backHref}>{backLabel}</DashboardLink>
      </Button>
    </StateFrame>
  );
}
