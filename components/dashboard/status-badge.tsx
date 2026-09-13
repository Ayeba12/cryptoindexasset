import { SemanticBadge } from "./semantic-status";
import {
  statusPresentation,
  type StatusDomain,
  type StatusValue,
} from "@/lib/dashboard/format";
import { cn } from "@/lib/utils";

/**
 * Domain-specific label with shared semantic colour and a decorative icon.
 * Pass `domain` for values shared between families ("PENDING").
 */
export function StatusBadge({
  status,
  domain,
  className,
}: {
  status: StatusValue | string;
  domain?: StatusDomain;
  className?: string;
}) {
  const { label } = statusPresentation(status, domain);
  return (
    <SemanticBadge
      label={label}
      status={status}
      className={cn("text-xs leading-4 font-medium", className)}
    />
  );
}
