import { useId, type ReactNode } from "react";

import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Panel: one labelled region on a Card with a 24px inset on tablet/desktop and
 * 16px on mobile (`.ca-panel`). Title is an `<h2 class="ca-h2">` (pass
 * `headingLevel={3}` for a subsection). `bleed` removes the inline padding of
 * the content so a table can run edge to edge inside `.ca-table-region`.
 * Do not nest cards inside a panel; use `PanelRow`.
 */
export function Panel({
  title,
  description,
  action,
  bleed = false,
  children,
  footer,
  className,
  contentClassName,
  headingLevel = 2,
  summary = false,
  id,
  ...props
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Secondary action shown at the trailing edge of the header. */
  action?: ReactNode;
  bleed?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
  headingLevel?: 2 | 3;
  /** Summary card density: 16px inset at every width. */
  summary?: boolean;
  id?: string;
} & Omit<React.ComponentProps<"div">, "title" | "children" | "id">) {
  const generated = useId();
  const titleId = id ?? `panel-${generated}`;
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <Card
      role="region"
      aria-labelledby={titleId}
      data-slot="panel"
      className={cn("ca-panel ring-border", summary && "ca-panel-summary", className)}
      {...props}
    >
      <CardHeader className="gap-2">
        <Heading id={titleId} className={headingLevel === 2 ? "ca-h2" : "ca-h3"} data-slot="panel-title">
          {title}
        </Heading>
        {description ? <CardDescription className="ca-body text-muted-foreground">{description}</CardDescription> : null}
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent data-bleed={bleed ? "true" : undefined} className={cn("flex flex-col gap-4", contentClassName)}>
        {children}
      </CardContent>
      {footer ? <CardFooter className="gap-2">{footer}</CardFooter> : null}
    </Card>
  );
}

/** Container for open rows inside one panel (no nested cards). */
export function PanelRows({ children, className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("ca-panel-rows", className)} data-slot="panel-rows" {...props}>
      {children}
    </div>
  );
}

/**
 * One open row: leading content, optional trailing value/action. 12px block
 * padding, 1px separator between rows, wraps on narrow widths.
 */
export function PanelRow({
  children,
  trailing,
  className,
  ...props
}: React.ComponentProps<"div"> & { trailing?: ReactNode }) {
  return (
    <div className={cn("ca-panel-row", className)} data-slot="panel-row" {...props}>
      <div className="flex min-w-0 flex-1 flex-col gap-1">{children}</div>
      {trailing ? <div className="flex shrink-0 items-center gap-2">{trailing}</div> : null}
    </div>
  );
}

/** One item of {@link KeyValueList}. */
export interface KeyValueItem {
  label: ReactNode;
  value: ReactNode;
  /** Small muted explanation under the value. */
  help?: ReactNode;
  key?: string;
}

/**
 * `<dl>` of label/value rows: 8px label → value, 12px row gap, tabular
 * figures. `layout="inline"` places the value at the trailing edge from
 * 640px.
 */
export function KeyValueList({
  items,
  layout = "stack",
  className,
}: {
  items: KeyValueItem[];
  layout?: "stack" | "inline";
  className?: string;
}) {
  return (
    <dl className={cn("ca-kv", className)} data-layout={layout} data-slot="key-value-list">
      {items.map((item, index) => (
        <div key={item.key ?? index}>
          <dt>{item.label}</dt>
          <dd>
            {item.value}
            {item.help ? <div className="ca-help mt-1">{item.help}</div> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
