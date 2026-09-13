/**
 * Display formatting for dashboard values.
 *
 * Every formatter is pure, deterministic and identical on the server and in
 * the browser (dates are always rendered in UTC, so SSR and CSR output match).
 * Money never passes through `parseFloat`/`Number`; digits come from
 * `lib/dashboard/money.ts`.
 *
 * Unknown values (`null`) render an em dash "—" and carry a reason; zero
 * renders as a real zero at the currency precision. The two are never
 * conflated.
 */

import {
  CURRENCY_META,
  type AllocationStatus,
  type DecimalString,
  type Direction,
  type LedgerCurrency,
  type MfaState,
  type RequestStatus,
  type SettlementState,
  type TransactionType,
  type VerificationState,
} from "./contracts";
import { compare, isDecimalString, isNegative, isZero, parseDecimal, toFixed } from "./money";

/** Em dash used for every unavailable value. */
export const UNAVAILABLE_TEXT = "—";

/** Reason attached when a value is `null` and the caller gave none. */
export const DEFAULT_UNAVAILABLE_REASON = "Not available";

/** Options for {@link formatAmount}. */
export interface FormatAmountOptions {
  /** Fraction digits to show; defaults to the currency's display precision. */
  precision?: number;
  /** Show every supplied digit (at least the ledger precision) instead of the display precision. */
  exact?: boolean;
  /** Prefix positive values with "+". Negative values always carry "-". Zero has no sign. */
  sign?: boolean;
  /** Reason to attach when `value` is `null`. */
  unavailableReason?: string;
}

/** Result of {@link formatAmount}. */
export interface FormattedAmount {
  /** Number text with grouped integer part and sign, or "—". */
  text: string;
  /** Currency code to show after the number. */
  unit: string;
  /** `text` and `unit` joined, or "—". */
  full: string;
  /** True when the value was unknown (or unreadable) and "—" is shown. */
  unavailable: boolean;
  /** Why the value is unavailable; present only when `unavailable`. */
  reason?: string;
  /** The value at full precision (every supplied digit, at least ledger precision) with unit; equals `full` when nothing was rounded. */
  exact: string;
  /** True when `text` differs numerically from the exact value (non-zero digits were rounded away). */
  rounded: boolean;
}

function unavailableAmount(unit: string, reason?: string): FormattedAmount {
  return {
    text: UNAVAILABLE_TEXT,
    unit,
    full: UNAVAILABLE_TEXT,
    unavailable: true,
    reason: reason ?? DEFAULT_UNAVAILABLE_REASON,
    exact: UNAVAILABLE_TEXT,
    rounded: false,
  };
}

/** Group the integer part with thousands separators; the fraction is untouched. */
export function groupDigits(value: DecimalString): string {
  const parsed = parseDecimal(value);
  const integer = parsed.integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const body = parsed.fraction.length > 0 ? `${integer}.${parsed.fraction}` : integer;
  return parsed.sign === -1 ? `-${body}` : body;
}

function withSign(text: string, value: DecimalString, sign: boolean | undefined): string {
  if (sign && !isNegative(value) && !isZero(value)) return `+${text}`;
  return text;
}

/**
 * Format a money value for display.
 *
 * `null` → "—" with a reason. A value that is not a canonical decimal string
 * is treated as unavailable too (never displayed as money). Otherwise the
 * value is shown at the currency's display precision (or `precision` /
 * `exact`), grouped on the integer part only, with the unit after the number.
 */
export function formatAmount(
  value: DecimalString | null,
  currency: LedgerCurrency,
  options: FormatAmountOptions = {},
): FormattedAmount {
  const meta = CURRENCY_META[currency];
  const unit = currency;
  if (value === null) return unavailableAmount(unit, options.unavailableReason);
  if (!isDecimalString(value)) return unavailableAmount(unit, "Amount is not in a readable format");
  const supplied = parseDecimal(value).scale;
  const exactPrecision = Math.max(supplied, meta.precision);
  const precision = options.exact ? exactPrecision : options.precision ?? meta.displayPrecision;
  const exactValue = toFixed(value, exactPrecision, "half-up");
  const shown = toFixed(value, precision, "half-up");
  const text = withSign(groupDigits(shown), shown, options.sign);
  const exactText = withSign(groupDigits(exactValue), exactValue, options.sign);
  return {
    text,
    unit,
    full: `${text} ${unit}`,
    unavailable: false,
    exact: `${exactText} ${unit}`,
    rounded: compare(shown, exactValue) !== 0,
  };
}

/**
 * Format a transaction amount with its direction: credits get "+", debits get
 * "-". The magnitude is expected to be non-negative; a negative magnitude is
 * treated as unreadable.
 */
export function formatSignedAmount(
  amount: DecimalString | null,
  currency: LedgerCurrency,
  direction: Direction,
  options: Omit<FormatAmountOptions, "sign"> = {},
): FormattedAmount {
  if (amount === null || !isDecimalString(amount)) return formatAmount(amount, currency, options);
  if (isNegative(amount)) return unavailableAmount(currency, "Amount is not in a readable format");
  const formatted = formatAmount(amount, currency, { ...options, sign: false });
  if (isZero(amount)) return formatted;
  const prefix = direction === "credit" ? "+" : "-";
  const text = `${prefix}${formatted.text}`;
  return {
    ...formatted,
    text,
    full: `${text} ${formatted.unit}`,
    exact: `${prefix}${formatted.exact}`,
  };
}

/** Result of {@link formatUsdEstimate}. */
export interface FormattedEstimate extends FormattedAmount {
  /** Always "Estimated"; estimates are never presented as balances. */
  label: "Estimated";
  /** Quote timestamp, or `null` when unknown. */
  asOf: string | null;
  /** "Quotes as of 6 Sep 2026, 12:00 UTC", or `null`. */
  asOfText: string | null;
}

/**
 * Format a USD estimate with its quote timestamp. Missing quotes are "—", never
 * zero. When the value exists but the timestamp does not, the estimate is
 * still shown and `asOfText` is `null`.
 */
export function formatUsdEstimate(
  value: DecimalString | null,
  quotedAt: string | null,
  options: FormatAmountOptions = {},
): FormattedEstimate {
  const reason = options.unavailableReason ?? "No price quote is available";
  const base = formatAmount(value, "USD", { ...options, unavailableReason: reason });
  const asOfText = quotedAt && isValidDate(quotedAt) ? `Quotes as of ${formatDateTime(quotedAt)}` : null;
  return { ...base, label: "Estimated", asOf: asOfText ? quotedAt : null, asOfText };
}

/** Text-only formatter result. */
export interface FormattedText {
  text: string;
  unavailable: boolean;
  reason?: string;
}

/**
 * Format a percentage stored as a decimal string of percent points ("0.98"
 * → "0.98%", "-12.5" → "-12.50%"). `sign` adds "+" for positive values. `null`
 * → "—".
 */
export function formatPercent(
  value: DecimalString | null,
  options: { precision?: number; sign?: boolean; unavailableReason?: string } = {},
): FormattedText {
  if (value === null) {
    return { text: UNAVAILABLE_TEXT, unavailable: true, reason: options.unavailableReason ?? DEFAULT_UNAVAILABLE_REASON };
  }
  if (!isDecimalString(value)) {
    return { text: UNAVAILABLE_TEXT, unavailable: true, reason: "Percentage is not in a readable format" };
  }
  const fixed = toFixed(value, options.precision ?? 2, "half-up");
  return { text: `${withSign(groupDigits(fixed), fixed, options.sign)}%`, unavailable: false };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function isValidDate(value: string): boolean {
  const time = Date.parse(value);
  return Number.isFinite(time);
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

/** Date only, UTC: "6 Sep 2026". "—" for `null` or an unreadable timestamp. */
export function formatDate(at: string | null): string {
  if (at === null || !isValidDate(at)) return UNAVAILABLE_TEXT;
  const date = new Date(at);
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** Time only, UTC: "12:00 UTC". "—" for `null` or an unreadable timestamp. */
export function formatTime(at: string | null): string {
  if (at === null || !isValidDate(at)) return UNAVAILABLE_TEXT;
  const date = new Date(at);
  return `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())} UTC`;
}

/**
 * Date and time in UTC, en-GB order: "6 Sep 2026, 12:00 UTC". Always UTC so
 * server and client render the same string. "—" for `null` or an unreadable
 * timestamp.
 */
export function formatDateTime(at: string | null): string {
  if (at === null || !isValidDate(at)) return UNAVAILABLE_TEXT;
  return `${formatDate(at)}, ${formatTime(at)}`;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/**
 * Relative age of `at` seen from `now` (both ISO timestamps): "just now",
 * "5 min ago", "3 h ago", "2 days ago", "3 weeks ago"; older than 30 days
 * falls back to the absolute date. Future timestamps read "in 5 min". Never
 * reads the system clock, so output is deterministic.
 */
export function formatRelativeAge(at: string, now: string): string {
  if (!isValidDate(at) || !isValidDate(now)) return UNAVAILABLE_TEXT;
  const delta = Date.parse(now) - Date.parse(at);
  const future = delta < 0;
  const distance = Math.abs(delta);
  if (distance < 45_000) return "just now";
  let text: string;
  if (distance < HOUR) {
    text = `${Math.max(1, Math.round(distance / MINUTE))} min`;
  } else if (distance < DAY) {
    text = `${Math.round(distance / HOUR)} h`;
  } else if (distance < WEEK) {
    const days = Math.round(distance / DAY);
    text = `${days} ${days === 1 ? "day" : "days"}`;
  } else if (distance < 30 * DAY) {
    const weeks = Math.round(distance / WEEK);
    text = `${weeks} ${weeks === 1 ? "week" : "weeks"}`;
  } else {
    return formatDate(at);
  }
  return future ? `in ${text}` : `${text} ago`;
}

/** Badge variants a status may use. Text is always visible; colour never carries the state alone. */
export type StatusVariant = "outline" | "secondary" | "destructive";

/** Result of {@link statusPresentation}. */
export interface StatusPresentation {
  label: string;
  variant: StatusVariant;
}

/** Status families. Needed to disambiguate "PENDING" (request: "Pending review"; allocation: "Pending"). */
export type StatusDomain = "request" | "settlement" | "allocation" | "verification" | "mfa";

/** Any status value {@link statusPresentation} understands. */
export type StatusValue = RequestStatus | SettlementState | AllocationStatus | VerificationState | MfaState;

const REQUEST_PRESENTATION: Record<RequestStatus, StatusPresentation> = {
  PENDING: { label: "Pending review", variant: "secondary" },
  APPROVED: { label: "Approved", variant: "outline" },
  REJECTED: { label: "Declined", variant: "destructive" },
  CANCELLED: { label: "Cancelled", variant: "secondary" },
  UNKNOWN: { label: "Status unavailable", variant: "secondary" },
};

const SETTLEMENT_PRESENTATION: Record<SettlementState, StatusPresentation> = {
  "not-applicable": { label: "Not applicable", variant: "outline" },
  unconfirmed: { label: "Settlement not confirmed", variant: "secondary" },
  confirmed: { label: "Completed", variant: "outline" },
  failed: { label: "Settlement failed", variant: "destructive" },
};

const ALLOCATION_PRESENTATION: Record<AllocationStatus, StatusPresentation> = {
  ACTIVE: { label: "Active", variant: "outline" },
  PAUSED: { label: "Paused", variant: "secondary" },
  STOPPED: { label: "Stopped", variant: "secondary" },
  PENDING: { label: "Pending", variant: "secondary" },
  STOPPING: { label: "Stop pending", variant: "secondary" },
  ERROR: { label: "Error", variant: "destructive" },
};

const VERIFICATION_PRESENTATION: Record<VerificationState, StatusPresentation> = {
  "not-submitted": { label: "Not submitted", variant: "secondary" },
  "in-review": { label: "In review", variant: "secondary" },
  verified: { label: "Verified", variant: "outline" },
  "changes-required": { label: "Changes required", variant: "destructive" },
};

const MFA_PRESENTATION: Record<MfaState, StatusPresentation> = {
  "not-enabled": { label: "Not enabled", variant: "secondary" },
  "enrollment-pending": { label: "Enrollment pending", variant: "secondary" },
  enabled: { label: "Enabled", variant: "outline" },
};

/** Presentation for a status the formatter does not recognise. */
export const UNKNOWN_STATUS_PRESENTATION: StatusPresentation = { label: "Status unavailable", variant: "secondary" };

function lookup<K extends string>(table: Record<K, StatusPresentation>, key: string): StatusPresentation | undefined {
  return Object.prototype.hasOwnProperty.call(table, key) ? table[key as K] : undefined;
}

/**
 * Label and badge variant for any dashboard status. Request statuses follow
 * specification §7 item 7 (PENDING → "Pending review", APPROVED → "Approved",
 * REJECTED → "Declined", CANCELLED → "Cancelled"); settlement "confirmed" is
 * the only source of "Completed". Pass `domain` when the raw value is shared
 * between families ("PENDING"). Unrecognised values render "Status
 * unavailable" and never throw.
 */
export function statusPresentation(status: StatusValue | string, domain?: StatusDomain): StatusPresentation {
  const tables: Record<StatusDomain, Record<string, StatusPresentation>> = {
    request: REQUEST_PRESENTATION,
    settlement: SETTLEMENT_PRESENTATION,
    allocation: ALLOCATION_PRESENTATION,
    verification: VERIFICATION_PRESENTATION,
    mfa: MFA_PRESENTATION,
  };
  if (domain) return lookup(tables[domain], status) ?? UNKNOWN_STATUS_PRESENTATION;
  for (const key of ["request", "settlement", "allocation", "verification", "mfa"] as const) {
    const found = lookup(tables[key], status);
    if (found) return found;
  }
  return UNKNOWN_STATUS_PRESENTATION;
}

/**
 * Mask a destination for general lists: the first 6 and last 4 characters
 * around an ellipsis for values of 12 characters or more. Shorter values
 * (short bank account numbers, for example) never use that pattern because
 * it would reveal almost everything: they show the first 2 characters and an
 * ellipsis. `null`/empty → `null`. Full destinations belong only in the
 * owner's detail view.
 */
export function maskDestination(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length < 12) return `${trimmed.slice(0, 2)}…`;
  return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`;
}

const TYPE_LABELS: Record<TransactionType, string> = {
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  PROFIT_ACCRUAL: "Recorded outcome",
  COPY_FEE: "Copy fee",
  BONUS: "Bonus credit",
  ADJUSTMENT: "Adjustment",
};

/** Customer label for a transaction type. Deposits and withdrawals are cash flows, never income. Unknown → "Other". */
export function typeLabel(type: TransactionType | string): string {
  return Object.prototype.hasOwnProperty.call(TYPE_LABELS, type) ? TYPE_LABELS[type as TransactionType] : "Other";
}

/** Format a plain count (copiers, reviews, confirmations) with grouping; `null` → "—". Not for money. */
export function formatCount(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return UNAVAILABLE_TEXT;
  return Math.trunc(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * One or two upper-case initials for an avatar fallback ("Alex Morgan" → "AM",
 * "alex@x.io" → "A", "alex.morgan@x.io" → "AM"). An email contributes only its
 * local part.
 */
export function initialsFor(name: string): string {
  const base = name.includes("@") ? name.slice(0, name.indexOf("@")) : name;
  const words = base.trim().split(/[\s._-]+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0].charAt(0);
  const last = words.length > 1 ? words[words.length - 1].charAt(0) : "";
  return `${first}${last}`.toUpperCase();
}
