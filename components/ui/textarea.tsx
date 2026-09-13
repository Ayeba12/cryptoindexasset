import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Textarea: multi-line text input. 64px minimum height, 8px inline and 4px
 * block padding, vertical resize only. Same border, focus and invalid
 * treatment as `Input`; the `.ca-touch` wrapper grows it to 44px minimum
 * with 16px text below 768px.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-16 w-full min-w-0 resize-y rounded-md border border-input bg-transparent px-2 py-1 text-sm leading-5 transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-xs md:leading-5",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
