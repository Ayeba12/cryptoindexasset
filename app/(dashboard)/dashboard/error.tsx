"use client";
import { ErrorState } from "@/components/dashboard/data-state";
import { PageHeading } from "@/components/dashboard/page-heading";

export default function DashboardError({ reset }: { reset: () => void }) {
  return <><PageHeading title="Dashboard unavailable" /><ErrorState region="Dashboard" message="We could not load this page. Your account data has not been changed." onRetry={reset} /></>;
}
