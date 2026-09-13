import type { DecimalString, LedgerCurrency } from "@/lib/dashboard/contracts";
import { formatAmount, formatSignedAmount, type FormattedAmount } from "@/lib/dashboard/format";
import { cn } from "@/lib/utils";

/** Type role for an amount. */
export type AmountRole = "main" | "metric" | "body" | "id";

const ROLE_CLASS: Record<AmountRole, string> = {
  main: "ca-value-main",
  metric: "ca-metric",
  body: "ca-body",
  id: "ca-id",
};

export interface AmountProps {
  /** Exact decimal string, or `null` for unknown (renders "—" with a reason). */
  value: DecimalString | null;
  /** Ledger currency; drives precision and the unit label. */
  unit: LedgerCurrency;
  /** Fraction digits to show; defaults to the currency's display precision. */
  precision?: number;
  role?: AmountRole;
  /** Prefix positive values with "+" (recorded outcomes). */
  sign?: boolean;
  /**
   * Credit/debit direction for cash flows: "+" for credits, "-" for debits.
   * Overrides `sign`.
   */
  direction?: "credit" | "debit";
  /** Show every supplied digit instead of the display precision. */
  exact?: boolean;
  /** Reason shown (title + visually hidden) when `value` is `null`. */
  unavailableReason?: string;
  className?: string;
}

/**
 * Money display. Formats through `lib/dashboard/format.ts` (never
 * `parseFloat`), keeps tabular figures, wraps at the unit boundary for long
 * values and renders unknown values as "—" with a specific reason. When the
 * shown value was rounded, the exact value is available in `title`.
 */
export function Amount({
  value,
  unit,
  precision,
  role = "body",
  sign,
  direction,
  exact,
  unavailableReason,
  className,
}: AmountProps) {
  const formatted: FormattedAmount = direction
    ? formatSignedAmount(value, unit, direction, { precision, exact, unavailableReason })
    : formatAmount(value, unit, { precision, exact, sign, unavailableReason });

  if (formatted.unavailable) {
    return (
      <span
        className={cn("ca-amount", ROLE_CLASS[role], className)}
        data-slot="amount"
        data-unavailable="true"
        title={formatted.reason}
      >
        <span aria-hidden="true">—</span>
        <span className="ca-sr-only">Not available: {formatted.reason}</span>
      </span>
    );
  }

  const rounded = formatted.rounded && !exact;
  return (
    <span
      className={cn("ca-amount", ROLE_CLASS[role], className)}
      data-slot="amount"
      title={rounded ? `Exact: ${formatted.exact}` : undefined}
    >
      <span className="ca-amount-number">{formatted.text}</span>
      <span className="ca-amount-unit">{formatted.unit}</span>
      {rounded ? <span className="ca-sr-only">, exact {formatted.exact}</span> : null}
    </span>
  );
}
