"use client"

import * as React from "react"
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/**
 * Pagination: server-backed page navigation for long tables.
 *
 * Semantic `<nav aria-label="Pagination">`; the current page is announced
 * through a polite live region ("Page 2 of 5"); Previous/Next are 32px
 * outline Buttons; the optional page-size Select (28px trigger) is rendered
 * only when `onPageSizeChange` is supplied. The `.ca-touch` wrapper grows
 * every control to 44px. Counts are plain integers, never money.
 */
interface PaginationProps extends Omit<React.ComponentProps<"nav">, "onChange"> {
  /** 1-based current page. */
  page: number
  pageSize: number
  /** Total matching records across all pages. */
  total: number
  /** Overrides the computed "has a next page" when the server supplies it. */
  hasMore?: boolean
  onPageChange: (page: number) => void
  /** Page-size choices; rendered only with `onPageSizeChange`. */
  pageSizeOptions?: readonly number[]
  onPageSizeChange?: (pageSize: number) => void
  /** Noun for the summary line, e.g. "transactions". Default "records". */
  itemLabel?: string
  /** Disables every control while a page is loading. */
  busy?: boolean
}

function formatCount(value: number): string {
  return Math.max(0, Math.trunc(value)).toLocaleString("en-US")
}

function Pagination({
  page,
  pageSize,
  total,
  hasMore,
  onPageChange,
  pageSizeOptions = [10, 25, 50],
  onPageSizeChange,
  itemLabel = "records",
  busy = false,
  className,
  "aria-label": ariaLabel = "Pagination",
  ...props
}: PaginationProps) {
  const pageSizeId = React.useId()
  const pageCount = Math.max(1, Math.ceil(total / Math.max(1, pageSize)))
  const canPrevious = page > 1 && !busy
  const canNext = (hasMore ?? page < pageCount) && !busy

  return (
    <nav
      data-slot="pagination"
      aria-label={ariaLabel}
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-2",
        className
      )}
      {...props}
    >
      <p
        data-slot="pagination-summary"
        aria-live="polite"
        className="text-xs leading-4 text-muted-foreground"
      >
        Page {formatCount(page)} of {formatCount(pageCount)}
        <span aria-hidden="true"> · </span>
        <span className="sr-only">, </span>
        {formatCount(total)} {itemLabel}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange && (
          <div
            data-slot="pagination-page-size"
            className="flex items-center gap-2 text-xs leading-4 text-muted-foreground"
          >
            <span id={pageSizeId}>Rows per page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
              disabled={busy}
            >
              <SelectTrigger aria-labelledby={pageSizeId} className="h-8 min-w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="end">
                {pageSizeOptions.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {formatCount(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={!canPrevious}
          onClick={() => onPageChange(page - 1)}
          aria-label={`Previous page${page > 1 ? `, page ${formatCount(page - 1)}` : ""}`}
        >
          <CaretLeftIcon aria-hidden="true" data-icon="inline-start" />
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
          aria-label={`Next page${canNext ? `, page ${formatCount(page + 1)}` : ""}`}
        >
          Next
          <CaretRightIcon aria-hidden="true" data-icon="inline-end" />
        </Button>
      </div>
    </nav>
  )
}

export { Pagination }
export type { PaginationProps }
