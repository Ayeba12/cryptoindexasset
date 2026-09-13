/**
 * Pure record → contract mappers for the live adapter.
 *
 * Every function here is deterministic, dependency-free (contracts, money,
 * format and the explorer allowlist only) and safe to import from a test.
 * The Prisma rows are described structurally so the mappers never depend on
 * the generated client: a `Decimal` is anything with `toFixed()`.
 *
 * Rules: unknown enum values are preserved as `rawStatus` and shown as
 * "Status unavailable"; nothing is inferred from a display name; KYC file
 * URLs and payment proofs never leave this module; money stays a decimal
 * string validated by `money.ts`.
 */

import {
  CURRENCY_META,
  SUPPORTED_CRYPTO,
  isLedgerCurrency,
  isSupportedCrypto,
  type AllocationDetail,
  type AllocationStatus,
  type AllocationView,
  type AssetBalance,
  type DecimalString,
  type Direction,
  type MfaStatus,
  type NetworkRef,
  type NotificationView,
  type ProfileView,
  type RequestStatus,
  type Quote,
  type SettlementLedger,
  type SettlementState,
  type SupportedCrypto,
  type TimelineEntry,
  type TraderProfile,
  type TraderView,
  type TransactionDetail,
  type TransactionType,
  type TransactionView,
  type VerificationDocument,
  type VerificationState,
  type VerificationView,
} from "../contracts";
import { statusPresentation, maskDestination } from "../format";
import { isDecimalString, isNegative, negate, toFixed, subtract, compare, multiplyByDecimal } from "../money";
import { explorerUrlFor } from "./explorers";

/* -------------------------------------------------------------------------- */
/* Reasons and labels                                                         */
/* -------------------------------------------------------------------------- */

/** Message of every failed live read. */
export const ACCOUNT_SERVICE_ERROR = "The account service did not respond";

/** Reasons the live environment reports for missing services. */
export const LIVE_REASONS = {
  holds: "The ledger does not define holds yet",
  quotes: "No price feed is configured",
  history: "No valuation history source is configured",
  walletMissing: "Wallet not initialised for this account",
  depositProof: "Proof upload is not connected in this environment",
  depositInstruction: "No deposit instruction is configured for this asset and network",
  withdrawals: "Withdrawal requests are not connected in this environment",
  copy: "No copy execution contract is connected; start, pause and stop are unavailable",
  signals: "No signal feed is connected",
  sessions: "No session source is connected; active sessions cannot be listed here",
  kycUpload: "Document upload is not connected in this environment",
  cancel: "Cancelling a request is not connected in this environment",
  settlement: "This account has no USD settlement ledger",
} as const;

/** Provenance attached to every operator-entered trader record. */
export const TRADER_PROVENANCE = "Operator-entered record; performance not independently measured";

/** Label of a recorded allocation credit. */
export const ALLOCATION_PNL_LABEL = "Recorded credits (operator accrual)";

/** Method text of a recorded allocation credit. */
export const ALLOCATION_PNL_METHOD = "Sum of credits recorded for this allocation by the operator; not a measured market return";

/** Explanation of Stop when no execution contract exists. */
export const STOP_UNAVAILABLE_EXPLANATION =
  "Stopping is not connected in this environment. Contact support to change an allocation.";

/** Document types accepted by the review team. */
export const VERIFICATION_DOCUMENT_TYPES = ["Passport", "Driving licence", "National ID card"];

/** Retention notice shown on the verification page. */
export const VERIFICATION_RETENTION_NOTICE =
  "Identity documents are stored privately, are visible only to the review team, and are retained for as long as regulation requires. They are never published at a public address.";

/** Message shown when a previous submission is no longer under review. */
export const VERIFICATION_RESUBMIT_MESSAGE = "The previous submission is no longer under review. Submit your documents again.";

/* -------------------------------------------------------------------------- */
/* Structural record shapes                                                   */
/* -------------------------------------------------------------------------- */

/** Anything that renders itself at a fixed number of decimals (Prisma `Decimal`). */
export interface DecimalLike {
  toFixed(decimalPlaces?: number): string;
}

export interface WalletRecord {
  currency: string;
  balance: DecimalLike;
  reserved?: DecimalLike | null;
  updatedAt: Date;
}

export interface TransactionRecord {
  id: string;
  type: string;
  currency: string;
  amount: DecimalLike;
  fee: DecimalLike | null;
  status: string;
  txHash: string | null;
  destinationAddress?: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TraderRecord {
  id: string;
  name: string;
  avatar: string | null;
  tagline: string | null;
  summary?: string | null;
  strategy?: string | null;
  strategyDetails?: string | null;
  profitShare: DecimalLike;
  riskLevel: string;
  minCapital: DecimalLike;
  totalFollowers: number;
  winRate?: DecimalLike | null;
  accuracy?: DecimalLike | null;
  period?: string | null;
  rating?: DecimalLike | null;
  ratingCount?: number | null;
  drawdown?: DecimalLike | null;
  metricSource?: string | null;
  riskMethod?: string | null;
  communitySource?: string | null;
  currency?: string | null;
  fee?: DecimalLike | null;
  mode?: string | null;
  autoTradeMode?: boolean | null;
  status?: string | null;
  isActive: boolean;
}

export interface AllocationRecord {
  id: string;
  traderId: string;
  allocatedUsd: DecimalLike;
  status: string;
  totalEarned: DecimalLike;
  createdAt: Date;
  updatedAt: Date;
  trader: { name: string; avatar: string | null } | null;
}

export interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export interface KycRecord {
  id: string;
  documentType: string;
  /** Present or not; the value itself is never mapped. */
  frontUrl: string | null;
  backUrl: string | null;
  status: string;
  rejectionMsg: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRecord {
  email: string;
  fullName: string | null;
  phone: string | null;
  country: string | null;
  createdAt: Date;
}

export interface FactorRecord {
  id: string;
  factor_type: string;
  status: string;
  friendly_name?: string;
  updated_at: string;
}

/* -------------------------------------------------------------------------- */
/* Primitives                                                                 */
/* -------------------------------------------------------------------------- */

/** ISO 8601 UTC timestamp for a `Date`. */
export function isoOf(date: Date): string {
  return date.toISOString();
}

/**
 * A record decimal at ledger precision, or `null` when the value is missing
 * or does not render as a canonical decimal string.
 */
export function decimalToString(value: DecimalLike | null | undefined, precision: number): DecimalString | null {
  if (value === null || value === undefined) return null;
  let text: string;
  try {
    text = value.toFixed(precision);
  } catch {
    return null;
  }
  return isDecimalString(text) ? text : null;
}

/** Ledger precision for a currency; 8 for anything the contract does not know. */
export function precisionFor(currency: string): number {
  return isLedgerCurrency(currency) ? CURRENCY_META[currency].precision : 8;
}

/** Request status from a raw enum value; unknown values become UNKNOWN with the raw value kept. */
export function mapRequestStatus(raw: string | null | undefined): { status: RequestStatus; rawStatus?: string } {
  switch (raw) {
    case "PENDING":
    case "APPROVED":
    case "REJECTED":
    case "CANCELLED":
      return { status: raw };
    default:
      return { status: "UNKNOWN", rawStatus: raw === null || raw === undefined ? "" : String(raw) };
  }
}

/** Transaction type from a raw enum value; unrecognised values map to ADJUSTMENT and are flagged. */
export function mapTransactionType(raw: string | null | undefined): { type: TransactionType; recognised: boolean } {
  switch (raw) {
    case "DEPOSIT":
    case "WITHDRAWAL":
    case "PROFIT_ACCRUAL":
    case "COPY_FEE":
    case "BONUS":
    case "ADJUSTMENT":
      return { type: raw, recognised: true };
    default:
      return { type: "ADJUSTMENT", recognised: false };
  }
}

/** Allocation status from the free-text `UserCopyTrade.status`; anything else is ERROR with the raw value kept. */
export function mapAllocationStatus(raw: string | null | undefined): { status: AllocationStatus; rawStatus?: string } {
  switch (raw) {
    case "ACTIVE":
    case "PAUSED":
    case "STOPPED":
      return { status: raw };
    default:
      return { status: "ERROR", rawStatus: raw === null || raw === undefined ? "" : String(raw) };
  }
}

/** Verification state from a KYC document status; `null` means no document. */
export function mapVerificationState(raw: string | null | undefined): VerificationState {
  switch (raw) {
    case null:
    case undefined:
      return "not-submitted";
    case "PENDING":
      return "in-review";
    case "APPROVED":
      return "verified";
    default:
      return "changes-required";
  }
}

/**
 * Settlement evidence for a row. The ledger stores no settlement record, so
 * approved transfers are "unconfirmed" (never "confirmed") and everything
 * else is not applicable.
 */
export function settlementFor(type: TransactionType, status: RequestStatus): SettlementState {
  if ((type === "DEPOSIT" || type === "WITHDRAWAL") && status === "APPROVED") return "unconfirmed";
  return "not-applicable";
}

/** Money direction for a type; a negative stored amount flips it. */
export function directionFor(type: TransactionType, amountNegative: boolean): Direction {
  const base: Direction = type === "WITHDRAWAL" || type === "COPY_FEE" ? "debit" : "credit";
  if (!amountNegative) return base;
  return base === "debit" ? "credit" : "debit";
}

/** Customer-facing source label for a row. */
export function sourceLabelFor(type: TransactionType, recognised: boolean, rawType: string): string {
  if (!recognised) return `Ledger entry (${rawType})`;
  switch (type) {
    case "DEPOSIT":
      return "Deposit";
    case "WITHDRAWAL":
      return "Withdrawal request";
    case "PROFIT_ACCRUAL":
      return "Recorded credit (operator accrual)";
    case "COPY_FEE":
      return "Copy fee";
    case "BONUS":
      return "Bonus credit (operator)";
    default:
      return "Manual adjustment by operator";
  }
}

const REFERENCE_PREFIX: Record<TransactionType, string> = {
  DEPOSIT: "DEP",
  WITHDRAWAL: "WDR",
  PROFIT_ACCRUAL: "PNL",
  COPY_FEE: "FEE",
  BONUS: "BON",
  ADJUSTMENT: "ADJ",
};

/** Customer reference derived from the record id (first 8 characters, upper case). */
export function referenceFor(type: TransactionType, id: string): string {
  return `${REFERENCE_PREFIX[type]}-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

const DESTINATION_PATTERN = /(?:^|\b)(?:to|destination|address)\s*[:=]?\s*([A-Za-z0-9:]{20,120})/i;

/** Destination recorded in free-text notes, only when a recognised pattern exists. */
export function destinationFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const match = DESTINATION_PATTERN.exec(notes);
  return match ? match[1] : null;
}

/** Network implied by a single-network asset (BTC, ETH); other assets have no confirmed network. */
export function impliedNetworkFor(currency: string): NetworkRef | null {
  if (currency === "BTC") return { id: "bitcoin", name: "Bitcoin", requiresTag: false };
  if (currency === "ETH") return { id: "ethereum", name: "Ethereum (ERC20)", requiresTag: false };
  return null;
}

/** Safe local, inline-image or public Supabase trader portrait, else `null`. */
export function portraitFrom(avatar: string | null | undefined): string | null {
  if (!avatar) return null;
  const trimmed = avatar.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("..")) return trimmed;
  if (/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (
      url.protocol === "https:" &&
      url.pathname.startsWith("/storage/v1/object/public/public-traders/")
    ) {
      return url.toString();
    }
  } catch {
    return null;
  }
  return null;
}

/** Display name from a record: full name, else the email local part. */
export function displayNameFor(fullName: string | null | undefined, email: string): string {
  const name = fullName?.trim();
  if (name) return name;
  const at = email.indexOf("@");
  return at > 0 ? email.slice(0, at) : email;
}

/* -------------------------------------------------------------------------- */
/* Record mappers                                                             */
/* -------------------------------------------------------------------------- */

/** Asset rows for every supported crypto from the account's wallet rows. */
export function mapWallets(
  wallets: readonly WalletRecord[],
  networks: Partial<Record<string, NetworkRef[]>>,
  quotes?: Partial<Record<SupportedCrypto, Quote>> | null,
): AssetBalance[] {
  return SUPPORTED_CRYPTO.map((currency) => {
    const meta = CURRENCY_META[currency];
    const wallet = wallets.find((row) => row.currency === currency);
    const configured = networks[currency] ?? [];
    const quote = quotes ? quotes[currency] : undefined;

    if (!wallet) {
      return {
        currency,
        name: meta.name,
        precision: meta.precision,
        enabled: false,
        enabledReason: LIVE_REASONS.walletMissing,
        total: null,
        available: null,
        reserved: null,
        reservedReason: LIVE_REASONS.walletMissing,
        estimatedUsd: null,
        estimateReason: quote ? LIVE_REASONS.walletMissing : LIVE_REASONS.quotes,
        asOf: null,
        networks: configured,
      };
    }
    const total = decimalToString(wallet.balance, meta.precision);
    const hasReserved = "reserved" in wallet && wallet.reserved !== undefined;
    const rawReserved = hasReserved && wallet.reserved !== null ? decimalToString(wallet.reserved, meta.precision) : null;
    const reserved = hasReserved ? (rawReserved ?? toFixed("0", meta.precision)) : null;
    const reservedReason = hasReserved ? undefined : LIVE_REASONS.holds;

    let available: DecimalString | null = null;
    if (total !== null && reserved !== null) {
      const diff = subtract(total, reserved);
      available = compare(diff, "0") < 0 ? toFixed("0", meta.precision) : diff;
    }

    let estimatedUsd: DecimalString | null = null;
    let estimateReason: string | undefined = LIVE_REASONS.quotes;
    if (quote && total !== null) {
      try {
        estimatedUsd = toFixed(multiplyByDecimal(total, quote.price), 2, "half-up");
        estimateReason = undefined;
      } catch {
        estimatedUsd = null;
        estimateReason = LIVE_REASONS.quotes;
      }
    }

    return {
      currency,
      name: meta.name,
      precision: meta.precision,
      enabled: true,
      total,
      available,
      reserved,
      reservedReason,
      estimatedUsd,
      estimateReason,
      asOf: isoOf(wallet.updatedAt),
      networks: configured,
    };
  });
}

/** The USD settlement row, or `null` when the account has none or it is unreadable. */
export function mapSettlement(wallets: readonly WalletRecord[]): SettlementLedger | null {
  const wallet = wallets.find((row) => row.currency === "USD");
  if (!wallet) return null;
  const balance = decimalToString(wallet.balance, CURRENCY_META.USD.precision);
  if (balance === null) return null;
  return { currency: "USD", balance, asOf: isoOf(wallet.updatedAt) };
}

/** A ledger row as listed, or `null` when its currency is not a ledger currency the dashboard can display. */
export function mapTransaction(record: TransactionRecord): TransactionView | null {
  if (!isLedgerCurrency(record.currency)) return null;
  const currency = record.currency;
  const precision = CURRENCY_META[currency].precision;
  const { type, recognised } = mapTransactionType(record.type);
  const { status, rawStatus } = mapRequestStatus(record.status);
  const rawAmount = decimalToString(record.amount, precision);
  const amountNegative = rawAmount !== null && isNegative(rawAmount);
  const amount = rawAmount === null ? toFixed("0", precision) : amountNegative ? negate(rawAmount) : rawAmount;
  const network = impliedNetworkFor(currency);
  const txHash = record.txHash?.trim() || null;
  const destination = type === "WITHDRAWAL" ? record.destinationAddress || destinationFromNotes(record.notes) : null;
  return {
    id: record.id,
    reference: referenceFor(type, record.id),
    type,
    sourceLabel: sourceLabelFor(type, recognised, String(record.type)),
    currency,
    network,
    amount,
    direction: directionFor(type, amountNegative),
    fee: decimalToString(record.fee, precision),
    status,
    ...(rawStatus === undefined ? {} : { rawStatus }),
    settlement: settlementFor(type, status),
    createdAt: isoOf(record.createdAt),
    updatedAt: isoOf(record.updatedAt),
    destinationMasked: maskDestination(destination),
    txHash,
    explorerUrl: explorerUrlFor(network?.id, txHash),
    permittedActions: status === "PENDING" && type === "WITHDRAWAL" ? ["cancel"] : [],
  };
}

/** Owner-only detail of a ledger row. */
export function mapTransactionDetail(record: TransactionRecord): TransactionDetail | null {
  const view = mapTransaction(record);
  if (!view) return null;
  const destination = view.type === "WITHDRAWAL" ? destinationFromNotes(record.notes) : null;
  const timeline: TimelineEntry[] = [
    { at: view.createdAt, label: view.type === "WITHDRAWAL" || view.type === "DEPOSIT" ? "Request submitted" : "Recorded" },
  ];
  if (view.status !== "PENDING" && view.status !== "UNKNOWN" && view.updatedAt !== view.createdAt) {
    timeline.push({ at: view.updatedAt, label: statusPresentation(view.status, "request").label });
  }
  const reason = view.status === "REJECTED" ? record.notes?.trim() || null : null;
  return {
    ...view,
    destinationFull: destination,
    tag: null,
    notes: reason === null ? record.notes?.trim() || null : null,
    reason,
    nextStep: view.status === "PENDING" ? "Awaiting operator review." : null,
    timeline,
  };
}

/** Trader discovery card from an operator-entered record. */
export function mapTrader(record: TraderRecord): TraderView {
  const currency = isLedgerCurrency(record.currency) ? record.currency : "USD";
  const minimum = decimalToString(record.minCapital, CURRENCY_META[currency].precision);
  const fee = decimalToString(record.fee ?? record.profitShare, 2);
  const accVal = decimalToString(record.accuracy ?? record.winRate, 2);
  const ratingNum = record.rating ? Number(record.rating) : null;
  const ddVal = decimalToString(record.drawdown, 2);
  const riskStr =
    record.riskLevel?.toUpperCase() === "LOW"
      ? "Low risk"
      : record.riskLevel?.toUpperCase() === "HIGH"
        ? "High risk"
        : "Medium risk";

  return {
    id: record.id,
    name: record.name,
    portrait: portraitFrom(record.avatar),
    portraitDisclosure: null,
    strategy: record.summary?.trim() || record.strategy?.trim() || record.tagline?.trim() || "Strategy not described by the operator",
    accuracy: accVal && record.period && record.metricSource ? { value: accVal, period: record.period, method: record.metricSource, wins: null, losses: null } : { value: null, period: null, method: null, wins: null, losses: null },
    copiers: Number.isFinite(record.totalFollowers) ? record.totalFollowers : null,
    rating: ratingNum !== null && Number.isFinite(ratingNum) && record.communitySource ? { value: ratingNum, reviews: record.ratingCount ?? null } : { value: null, reviews: null },
    drawdown: ddVal && record.period ? { value: ddVal, period: record.period, method: "Max peak-to-trough" } : { value: null, period: null, method: null },
    risk: record.riskMethod ? { label: riskStr, method: record.riskMethod } : { label: null, method: null },
    minimumAllocation: minimum === null ? null : { amount: minimum, currency },
    fee: fee === null ? null : { percent: fee, basis: "of recorded outcomes" },
    provenance: TRADER_PROVENANCE,
  };
}

/** Full trader profile; no history or activity source exists. */
export function mapTraderProfile(record: TraderRecord): TraderProfile {
  const mode = record.mode?.trim().toLowerCase();
  const executionMode =
    mode === "manual requests" || mode === "manual-allocation"
      ? "manual-allocation"
      : mode === "automatic execution" || mode === "exchange-execution" || (!mode && record.autoTradeMode)
        ? "exchange-execution"
        : "unavailable";
  return {
    ...mapTrader(record),
    description: record.strategyDetails?.trim() || record.summary?.trim() || record.tagline?.trim() || "The operator has not described this trader.",
    approach: [],
    history: null,
    activity: null,
    executionMode,
  };
}

/** Allocation list row from a copy-trade record. */
export function mapAllocation(record: AllocationRecord): AllocationView {
  const { status, rawStatus } = mapAllocationStatus(record.status);
  const allocated = decimalToString(record.allocatedUsd, CURRENCY_META.USD.precision) ?? toFixed("0", CURRENCY_META.USD.precision);
  const earned = decimalToString(record.totalEarned, 8);
  return {
    id: record.id,
    traderId: record.traderId,
    traderName: record.trader?.name ?? "Trader record unavailable",
    traderPortrait: portraitFrom(record.trader?.avatar),
    allocated: { amount: allocated, currency: "USD" },
    status,
    ...(rawStatus === undefined ? {} : { rawStatus }),
    executionMode: "unavailable",
    recordedPnl: earned === null ? null : { amount: earned, currency: "USD", label: ALLOCATION_PNL_LABEL, method: ALLOCATION_PNL_METHOD },
    createdAt: isoOf(record.createdAt),
    updatedAt: isoOf(record.updatedAt),
    permittedActions:
      status === "ACTIVE"
        ? ["pause", "stop"]
        : status === "PAUSED"
          ? ["resume", "stop"]
          : [],
  };
}

/** Allocation detail; the ledger does not link rows to allocations, so activity and fees are empty. */
export function mapAllocationDetail(record: AllocationRecord): AllocationDetail {
  const view = mapAllocation(record);
  const timeline: TimelineEntry[] = [{ at: view.createdAt, label: "Allocation recorded" }];
  if (view.updatedAt !== view.createdAt) {
    timeline.push({ at: view.updatedAt, label: `Status: ${statusPresentation(view.status, "allocation").label}` });
  }
  return { ...view, timeline, fees: [], activity: [], stopExplanation: STOP_UNAVAILABLE_EXPLANATION, pendingOperation: null };
}

/** Notification row; the record has no category or link. */
export function mapNotification(record: NotificationRecord): NotificationView {
  return {
    id: record.id,
    title: record.title,
    message: record.message,
    kind: "system",
    read: record.isRead,
    createdAt: isoOf(record.createdAt),
    href: null,
  };
}

/** Verification view from the KYC row (or none). File URLs are never mapped. */
export function mapVerification(record: KycRecord | null): VerificationView {
  const state = mapVerificationState(record?.status ?? null);
  const documents: VerificationDocument[] = [];
  if (record) {
    if (record.frontUrl) {
      documents.push({ id: `${record.id}-front`, type: record.documentType, fileName: "Front of document (on file)", side: "front", uploadedAt: isoOf(record.createdAt) });
    }
    if (record.backUrl) {
      documents.push({ id: `${record.id}-back`, type: record.documentType, fileName: "Back of document (on file)", side: "back", uploadedAt: isoOf(record.createdAt) });
    }
  }
  const reviewed = record && state !== "in-review" && state !== "not-submitted" ? isoOf(record.updatedAt) : null;
  let message: string | null = null;
  if (record && state === "changes-required") {
    message = record.status === "REJECTED" ? record.rejectionMsg?.trim() || "The review team asked for changes." : VERIFICATION_RESUBMIT_MESSAGE;
  }
  return {
    state,
    submittedAt: record ? isoOf(record.createdAt) : null,
    reviewedAt: reviewed,
    message,
    documentTypes: [...VERIFICATION_DOCUMENT_TYPES],
    documents,
    uploadRules: null,
    retentionNotice: VERIFICATION_RETENTION_NOTICE,
  };
}

/** Profile view; the email is shown but never editable here. */
export function mapProfile(record: UserRecord): ProfileView {
  return {
    email: record.email,
    fullName: record.fullName?.trim() || null,
    phone: record.phone?.trim() || null,
    country: record.country?.trim() || null,
    memberSince: isoOf(record.createdAt),
    editable: ["fullName", "phone", "country"],
  };
}

/** Confirmed MFA state from the provider's factor list; a flag alone is never proof. */
export function mfaStatusFromFactors(factors: readonly FactorRecord[]): MfaStatus {
  const totp = factors.filter((factor) => factor.factor_type === "totp");
  const verified = totp.find((factor) => factor.status === "verified");
  if (verified) {
    return { state: "enabled", factorLabel: verified.friendly_name?.trim() || "Authenticator app", verifiedAt: verified.updated_at };
  }
  const pending = totp.find((factor) => factor.status === "unverified");
  if (pending) return { state: "enrollment-pending", factorLabel: pending.friendly_name?.trim() || "Authenticator app" };
  return { state: "not-enabled" };
}

/** True when a currency is one of the six crypto assets (narrowing helper for adapters). */
export function isCryptoCurrency(value: string): boolean {
  return isSupportedCrypto(value);
}
