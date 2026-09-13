"use client";
import type { ReactNode } from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  InfoIcon,
  MinusCircleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusTone, type StatusTone } from "@/lib/dashboard/status-tone";

const icons = {
  success: CheckCircleIcon,
  danger: XCircleIcon,
  warning: WarningCircleIcon,
  info: InfoIcon,
  neutral: MinusCircleIcon,
};
export function SemanticBadge({
  label,
  className,
  status,
}: {
  label: string;
  className?: string;
  status?: string;
}) {
  const tone = statusTone(label);
  const waiting = ["pending", "pending review", "in review", "stop pending", "enrollment pending", "settlement not confirmed"].includes(label.toLowerCase());
  const Icon = waiting ? ClockIcon : icons[tone];
  return (
    <Badge
      variant="outline"
      data-status={status ?? label}
      data-tone={tone}
      className={cn("ca-status", className)}
    >
      <Icon aria-hidden="true" />
      <span>{label}</span>
    </Badge>
  );
}
export function SemanticNotice({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: StatusTone;
}) {
  const Icon = icons[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      data-tone={tone}
      className="ca-notice ca-body"
    >
      <Icon aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
