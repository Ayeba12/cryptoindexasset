import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Page introduction: the single `<h1>` of the page, an optional subtitle and
 * an actions slot (8px gap, wraps below the title under 640px). No bottom
 * border. Geometry comes from `.ca-page-intro` in `dashboard.css`.
 */
export function PageHeading({
  title,
  subtitle,
  actions,
  className,
  id = "page-title",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Buttons/links for the page; the first one is the principal action. */
  actions?: ReactNode;
  className?: string;
  /** Id of the `<h1>`, used by `aria-labelledby` on the page region. */
  id?: string;
}) {
  return (
    <div className={cn("ca-page-intro", className)} data-slot="page-heading">
      <div className="ca-page-intro-text">
        <h1 id={id} className="ca-h1">
          {title}
        </h1>
        {subtitle ? <p className="ca-body ca-prose text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="ca-page-intro-actions">{actions}</div> : null}
    </div>
  );
}
