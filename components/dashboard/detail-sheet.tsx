"use client";

import type { ReactNode } from "react";

import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * Side sheet for record details: 480px maximum on desktop, full width below
 * 768px, labelled title, scrollable body, close button always reachable.
 * An enhancement only: the detail route stays the canonical URL, so pass the
 * route in `href` if a "Open full page" link is wanted.
 */
export function DetailSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={cn("ca-detail-sheet gap-0 p-0", className)} data-detail-sheet="true">
        <SheetHeader className="gap-2 pr-16">
          <SheetTitle className="ca-h3">{title}</SheetTitle>
          {description ? (
            <SheetDescription className="ca-body text-muted-foreground">{description}</SheetDescription>
          ) : (
            <SheetDescription className="ca-sr-only">Record details</SheetDescription>
          )}
        </SheetHeader>
        <div className="ca-detail-sheet-body flex flex-col gap-4">{children}</div>
        {footer ? <SheetFooter className="border-t border-border">{footer}</SheetFooter> : null}
      </SheetContent>
    </Sheet>
  );
}
