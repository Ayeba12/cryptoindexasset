"use client"

import * as React from "react"
import { SpinnerGapIcon } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"

/**
 * Spinner: short indeterminate wait inside a control or region. 16px icon,
 * `role="status"` with a visually hidden label (default "Loading"). Reduced
 * motion slows the rotation through `components/dashboard/dashboard.css`.
 */
function Spinner({
  className,
  label = "Loading",
  ...props
}: React.ComponentProps<"span"> & { label?: string }) {
  return (
    <span
      data-slot="spinner"
      role="status"
      className={cn("inline-flex size-4 shrink-0 items-center justify-center", className)}
      {...props}
    >
      <SpinnerGapIcon aria-hidden="true" className="size-4 animate-spin" />
      <span className="sr-only">{label}</span>
    </span>
  )
}

export { Spinner }
