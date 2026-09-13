import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Alert: persistent, in-place notice (recoverable errors, warnings, system
 * notices). Geometry: 16px inline / 12px block inset, 4px title→description
 * gap, optional leading 16px icon with a 12px gap. `role="alert"` is applied
 * only to the destructive variant; pass `role` explicitly to override.
 */
const alertVariants = cva(
  "relative grid w-full grid-cols-[auto_1fr] items-start gap-x-3 gap-y-1 rounded-lg border px-4 py-3 text-sm leading-5 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-card-foreground",
        destructive:
          "border-destructive text-destructive [&_[data-slot=alert-description]]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant = "default",
  role,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      data-variant={variant}
      role={role ?? (variant === "destructive" ? "alert" : undefined)}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("col-start-2 font-medium", className)}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-2 grid justify-items-start gap-1 text-sm leading-5 text-muted-foreground [&_p]:leading-5",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, alertVariants }
