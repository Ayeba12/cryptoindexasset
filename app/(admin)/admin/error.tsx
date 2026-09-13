"use client";
import { Button } from "@/components/ui/button";
export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section role="alert" className="space-y-4">
      <h1 className="ca-h1">Admin screen unavailable</h1>
      <p className="ca-body">
        The screen could not load. No action has been confirmed. Check its
        recorded status before resubmitting a financial change.
      </p>
      <Button variant="outline" onClick={reset}>
        Try loading again
      </Button>
    </section>
  );
}
