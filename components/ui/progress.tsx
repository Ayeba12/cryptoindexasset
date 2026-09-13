"use client"

import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Progress: determinate progress for uploads and multi-step tasks. 8px track
 * on the muted surface, foreground indicator (progress is not an action, so
 * it does not use the primary token). Radix supplies `role="progressbar"`
 * and the `aria-valuenow` attributes; always pass an `aria-label` or
 * `aria-labelledby`.
 */
function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  const clamped = Math.min(100, Math.max(0, value ?? 0))
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-muted",
        className
      )}
      value={value}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="h-full w-full bg-foreground transition-transform"
        style={{ transform: `translateX(-${100 - clamped}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
