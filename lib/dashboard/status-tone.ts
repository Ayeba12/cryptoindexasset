export type StatusTone = "success" | "danger" | "warning" | "info" | "neutral";

// Exact display-label mappings only. An unknown state never becomes successful.
const groups: Record<StatusTone, readonly string[]> = {
  success: [
    "success",
    "approved",
    "completed",
    "active",
    "verified",
    "enabled",
    "published",
    "enrolled · demo",
    "visible in preview",
  ],
  danger: [
    "error",
    "declined",
    "rejected",
    "failed",
    "settlement failed",
    "suspended",
    "blocked",
  ],
  warning: [
    "warning",
    "pending",
    "pending review",
    "in review",
    "review",
    "stop pending",
    "enrollment pending",
    "settlement not confirmed",
    "changes required",
    "not enabled",
    "not enrolled · demo",
  ],
  info: ["information", "processing"],
  neutral: [
    "cancelled",
    "stopped",
    "paused",
    "draft",
    "archived",
    "hidden",
    "not submitted",
    "not applicable",
    "status unavailable",
  ],
};
export function statusTone(label: string): StatusTone {
  const key = label.trim().toLowerCase();
  return (
    (Object.keys(groups) as StatusTone[]).find((tone) =>
      groups[tone].includes(key),
    ) ?? "neutral"
  );
}
