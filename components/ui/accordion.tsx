"use client";

import type { ComponentProps } from "react";
import { Accordion as Primitive } from "radix-ui";
import { CaretDownIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function Accordion(props: ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root data-slot="accordion" {...props} />;
}

export function AccordionItem({
  className,
  ...props
}: ComponentProps<typeof Primitive.Item>) {
  return (
    <Primitive.Item
      data-slot="accordion-item"
      className={cn("border-b border-border last:border-0", className)}
      {...props}
    />
  );
}

export function AccordionTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof Primitive.Trigger>) {
  return (
    <Primitive.Header className="flex">
      <Primitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "flex min-h-11 flex-1 items-center justify-between gap-4 rounded-sm py-4 text-start text-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring [&[data-state=open]>svg]:rotate-180",
          className,
        )}
        {...props}
      >
        {children}
        <CaretDownIcon size={16} aria-hidden="true" className="shrink-0" />
      </Primitive.Trigger>
    </Primitive.Header>
  );
}

export function AccordionContent({
  className,
  children,
  ...props
}: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Content data-slot="accordion-content" {...props}>
      <div
        className={cn(
          "pb-4 text-sm leading-5 text-muted-foreground",
          className,
        )}
      >
        {children}
      </div>
    </Primitive.Content>
  );
}
