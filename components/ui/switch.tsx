"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Switch: binary setting. 32×20px track with a 16px thumb that travels 14px;
 * invisible 48×44px hit area. Checked state uses the primary token (current
 * selection), unchecked uses the muted surface with a border so the control
 * stays visible in both themes.
 */
function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer relative inline-flex h-5 w-8 shrink-0 items-center rounded-full border border-border bg-muted transition-colors outline-none after:absolute after:-inset-x-2 after:-inset-y-3 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-4 rounded-full bg-background ring-1 ring-border transition-transform data-[state=checked]:translate-x-3.5 data-[state=checked]:bg-primary-foreground data-[state=checked]:ring-primary data-[state=unchecked]:translate-x-0"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
