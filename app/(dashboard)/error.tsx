"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/dashboard/data-state";
import { PageHeading } from "@/components/dashboard/page-heading";

/** Route segment error boundary: explains the failure without internals and offers Retry (`reset()`). */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log without the payload: the message may contain internals.
    console.error("Dashboard route error", error.digest ?? "no-digest");
  }, [error]);

  return (
    <>
      <PageHeading title="Something went wrong" />
      <ErrorState
        region="Page"
        headingLevel={2}
        title="This page could not be loaded"
        message={
          error.digest
            ? `The request did not complete. Reference ${error.digest}. Your balances and requests are unchanged.`
            : "The request did not complete. Your balances and requests are unchanged."
        }
        onRetry={reset}
      />
    </>
  );
}
