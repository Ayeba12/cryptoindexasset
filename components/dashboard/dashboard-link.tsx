"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { forwardRef, type ComponentProps } from "react";

import { toModeHref, useDashboardMode } from "./actions-context";

/**
 * `next/link` for dashboard routes. Pass the canonical live href
 * (`/dashboard/deposit`); in the design preview it is rewritten under
 * `/design-preview/dashboard` and keeps the active scenario, so the same view
 * code navigates correctly in both modes.
 */
export const DashboardLink = forwardRef<HTMLAnchorElement, ComponentProps<typeof Link> & { href: string }>(
  function DashboardLink({ href, ...props }, ref) {
    const mode = useDashboardMode();
    const scenario = useScenarioParam(mode === "preview");
    return <Link ref={ref} href={toModeHref(href, mode, scenario)} {...props} />;
  },
);

function useScenarioParam(enabled: boolean): string | null {
  // useSearchParams is safe to call unconditionally; it is only read in preview.
  const params = useSearchParams();
  return enabled ? params?.get("scenario") ?? null : null;
}

/** Resolve a canonical dashboard href for the current mode without rendering a link. */
export function useDashboardHref(): (href: string) => string {
  const mode = useDashboardMode();
  const scenario = useScenarioParam(mode === "preview");
  return (href: string) => toModeHref(href, mode, scenario);
}
