/**
 * Customer dashboard data contracts.
 *
 * Every value that crosses the server/client boundary of the customer
 * dashboard is described here. The rules that apply to all of them:
 *
 * - Money is a {@link DecimalString}: an exact decimal string, never a float.
 *   Use `lib/dashboard/money.ts` for arithmetic and `lib/dashboard/format.ts`
 *   for display. No `parseFloat`/`Number` on money anywhere.
 * - Timestamps are ISO 8601 strings in UTC (`2026-09-06T12:00:00Z`).
 * - `| null` on a field means "unknown, render as unavailable". It is never
 *   the same as zero. Zero is the string `"0"` / `"0.00000000"`.
 * - Fields marked `?` are optional context (reasons, raw diagnostics).
 * - Capabilities are UX hints, never authorisation. Every live action is
 *   re-checked on the server.
 *
 * Exported names and shapes in this file are frozen after Stage A. Later
 * stages may add optional fields only when their completion summary lists
 * them.
 */

/* -------------------------------------------------------------------------- */
/* Primitives                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Exact decimal string, canonical form `-?\d+(\.\d+)?`, no grouping, no
 * exponent, no leading `+`. Examples: `"0.10000000"`, `"1250.000000"`, `"-45.00"`.
 */
export type DecimalString = string;

/** ISO 8601 timestamp in UTC, e.g. `"2026-09-06T12:00:00Z"`. */
export type IsoDateTime = string;

/** Crypto assets the product supports. */
export type SupportedCrypto = "BTC" | "ETH" | "BCH" | "LTC" | "XRP" | "USDT";

/** Any currency that can appear on a ledger row: the six crypto assets plus the USD settlement ledger. */
export type LedgerCurrency = SupportedCrypto | "USD";

/** The six supported crypto assets in display order. */
export const SUPPORTED_CRYPTO: readonly SupportedCrypto[] = ["BTC", "ETH", "BCH", "LTC", "XRP", "USDT"];

/** Every ledger currency in display order (crypto first, settlement ledger last). */
export const LEDGER_CURRENCIES: readonly LedgerCurrency[] = [...SUPPORTED_CRYPTO, "USD"];

/** Static metadata for a ledger currency. */
export interface CurrencyMeta {
  /** Human name, e.g. "Bitcoin". */
  name: string;
  /**
   * Ledger precision: the number of fraction digits the service stores and
   * that an exact display must show.
   */
  precision: number;
  /**
   * Default fraction digits for ordinary (non-exact) display. Equal to
   * `precision` except for USDT, which is shown to 2 by default with the exact
   * six-decimal value available on demand.
   */
  displayPrecision: number;
  /** "crypto" for the six assets, "settlement" for the USD ledger row. */
  kind: "crypto" | "settlement";
}

/** Metadata for every ledger currency. */
export const CURRENCY_META: Record<LedgerCurrency, CurrencyMeta> = {
  BTC: { name: "Bitcoin", precision: 8, displayPrecision: 8, kind: "crypto" },
  ETH: { name: "Ethereum", precision: 8, displayPrecision: 8, kind: "crypto" },
  BCH: { name: "Bitcoin Cash", precision: 8, displayPrecision: 8, kind: "crypto" },
  LTC: { name: "Litecoin", precision: 8, displayPrecision: 8, kind: "crypto" },
  XRP: { name: "XRP", precision: 6, displayPrecision: 6, kind: "crypto" },
  USDT: { name: "Tether USD", precision: 6, displayPrecision: 2, kind: "crypto" },
  USD: { name: "US dollar", precision: 2, displayPrecision: 2, kind: "settlement" },
};

/** Type guard for {@link SupportedCrypto}. */
export function isSupportedCrypto(value: unknown): value is SupportedCrypto {
  return typeof value === "string" && (SUPPORTED_CRYPTO as readonly string[]).includes(value);
}

/** Type guard for {@link LedgerCurrency}. */
export function isLedgerCurrency(value: unknown): value is LedgerCurrency {
  return typeof value === "string" && (LEDGER_CURRENCIES as readonly string[]).includes(value);
}

/* -------------------------------------------------------------------------- */
/* Session and capabilities                                                   */
/* -------------------------------------------------------------------------- */

/** Prisma `AccountStatus` values as exposed to the dashboard. */
export type AccountStatus = "ACTIVE" | "SUSPENDED" | "PENDING_KYC";

/**
 * The authenticated identity mapped to the internal `User.id`.
 *
 * - `authenticated`: identity resolved; `userId` is the Prisma id every read
 *   and write is scoped by (never `auth.uid()` directly).
 * - `unauthenticated`: no session; the layout redirects to `/login`.
 * - `unprovisioned`: a Supabase user without a Prisma `User` row.
 * - `restricted`: the account exists but may not use the dashboard.
 */
export type SessionAccount =
  | {
      state: "authenticated";
      /** Internal Prisma `User.id`. */
      userId: string;
      /** Supabase `auth.users.id`. */
      supabaseUid: string;
      email: string;
      /** Name shown in the shell; falls back to the email local part. */
      displayName: string;
      /** One or two upper-case characters for the avatar fallback. */
      initials: string;
      accountStatus: AccountStatus;
      /** Plain-language restrictions that apply to this account, empty when none. */
      restrictions: string[];
    }
  | { state: "unauthenticated" }
  | { state: "unprovisioned"; email: string }
  | { state: "restricted"; email: string; reason: string };

/** The `authenticated` member of {@link SessionAccount}. */
export type AuthenticatedAccount = Extract<SessionAccount, { state: "authenticated" }>;

/** Availability of one capability, with a customer-readable reason when unavailable. */
export interface Capability {
  available: boolean;
  /** Why the capability is unavailable (or a note when available). */
  reason?: string;
}

/** Keys of {@link Capabilities}. */
export type CapabilityKey =
  | "depositInstructions"
  | "depositProof"
  | "withdrawCrypto"
  | "withdrawBank"
  | "withdrawalQuotes"
  | "copyStart"
  | "copyPause"
  | "copyStop"
  | "signals"
  | "mfaEnrollment"
  | "passwordChange"
  | "sessions"
  | "kycUpload"
  | "notificationsMarkRead"
  | "profileSave";

/** Every capability key, for building complete records. */
export const CAPABILITY_KEYS: readonly CapabilityKey[] = [
  "depositInstructions",
  "depositProof",
  "withdrawCrypto",
  "withdrawBank",
  "withdrawalQuotes",
  "copyStart",
  "copyPause",
  "copyStop",
  "signals",
  "mfaEnrollment",
  "passwordChange",
  "sessions",
  "kycUpload",
  "notificationsMarkRead",
  "profileSave",
];

/**
 * UX hints about which workflows the current environment supports. Never
 * authorisation: the server re-checks every action.
 */
export type Capabilities = Record<CapabilityKey, Capability>;

/* -------------------------------------------------------------------------- */
/* Region results                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Outcome of one data region read. Every region renders Loading (before the
 * promise resolves), Ready, Empty, Not found, Error and Unavailable
 * distinctly. "empty" means the account has no records; "unavailable" means
 * the service or entitlement is missing; "error" means the read failed.
 */
export type RegionResult<T> =
  | { status: "ready"; data: T; fetchedAt: IsoDateTime }
  | { status: "empty"; reason?: string }
  | { status: "not-found" }
  | { status: "error"; message: string; retryable: boolean }
  | { status: "unavailable"; reason: string; alternative?: { label: string; href: string } };

/** Status discriminator of {@link RegionResult}. */
export type RegionStatus = RegionResult<unknown>["status"];

/** One page of a server-paginated list. */
export interface Page<T> {
  items: T[];
  /** 1-based page number. */
  page: number;
  pageSize: number;
  /** Total matching records across all pages. */
  total: number;
  hasMore: boolean;
}

/* -------------------------------------------------------------------------- */
/* Balances and valuation                                                     */
/* -------------------------------------------------------------------------- */

/** A deposit/withdrawal network for an asset. Separate from the currency; never inferred from a display name. */
export interface NetworkRef {
  /** Stable id, e.g. "bitcoin", "ethereum", "tron". */
  id: string;
  /** Display name, e.g. "Bitcoin", "Ethereum (ERC20)". */
  name: string;
  /** Whether transfers on this network need a destination tag/memo. */
  requiresTag: boolean;
}

/** One crypto asset balance row. Unknown buckets are `null`, never zero. */
export interface AssetBalance {
  currency: SupportedCrypto;
  name: string;
  /** Ledger precision for this asset. */
  precision: number;
  /** False when the wallet is unsupported or not initialised for this account. */
  enabled: boolean;
  /** Why the wallet is disabled. */
  enabledReason?: string;
  /** Total holdings, or `null` when unknown. */
  total: DecimalString | null;
  /** Available for withdrawal/allocation, or `null` when the ledger does not define holds. */
  available: DecimalString | null;
  /** Reserved (held) units, or `null` when the ledger does not define holds. */
  reserved: DecimalString | null;
  /** Why `reserved`/`available` are unavailable. */
  reservedReason?: string;
  /** USD estimate from a timestamped quote, or `null` when there is no quote. */
  estimatedUsd: DecimalString | null;
  /** Why `estimatedUsd` is unavailable. */
  estimateReason?: string;
  /** When the balance was read, or `null` when unknown. */
  asOf: IsoDateTime | null;
  /** Networks currently supported for this asset; empty when none are configured. */
  networks: NetworkRef[];
}

/** The USD settlement ledger row, present only when the service exposes it. Not a seventh crypto asset. */
export interface SettlementLedger {
  currency: "USD";
  balance: DecimalString;
  asOf: IsoDateTime;
}

/** Chart/history periods. */
export type ValuationPeriod = "7D" | "30D" | "90D";

/** Every valuation period in control order. */
export const VALUATION_PERIODS: readonly ValuationPeriod[] = ["7D", "30D", "90D"];

/** Periods for recorded P/L. */
export type PnlPeriod = ValuationPeriod | "lifetime";

/** One quote used for a fiat estimate. */
export interface Quote {
  currency: SupportedCrypto;
  /** Price of one unit in the display currency. */
  price: DecimalString;
  quotedAt: IsoDateTime;
}

/** Recorded profit/loss with its period and method. Never derived from account-value movement. */
export interface RecordedPnl {
  /** Signed amount in the display currency. */
  amount: DecimalString;
  period: PnlPeriod;
  /** How the figure was produced, e.g. "Ledger: recorded copy-trade outcomes". */
  method: string;
  /** Percentage return, or `null` when the return method is not supplied. */
  percent: DecimalString | null;
}

/** Estimated account value built only from timestamped quotes. Missing quotes never count as zero. */
export interface Valuation {
  displayCurrency: "USD";
  /** Quote source label, e.g. "Fixture quotes, not live prices". */
  source: string;
  /** Time of the quotes, or `null` when no quote exists. */
  quotedAt: IsoDateTime | null;
  quotes: Quote[];
  /** Estimated total, or `null` when it cannot be computed. */
  estimatedTotal: DecimalString | null;
  availableTotal: DecimalString | null;
  reservedTotal: DecimalString | null;
  /** True when some assets were excluded for lack of a quote. */
  partial: boolean;
  /** Assets excluded from the totals. */
  excluded: SupportedCrypto[];
  recordedPnl: RecordedPnl | null;
}

/** One point on the account-value history. */
export interface ValuationPoint {
  at: IsoDateTime;
  value: DecimalString;
}

/** Account valuation history for a period, with a textual summary for accessibility. */
export interface ValuationHistory {
  period: ValuationPeriod;
  points: ValuationPoint[];
  /** Human summary, e.g. "Estimated value moved from 11,900.00 USD to 12,250.00 USD over 30 days." */
  summary: string;
  source: string;
}

/* -------------------------------------------------------------------------- */
/* Transactions                                                               */
/* -------------------------------------------------------------------------- */

/** Ledger transaction types (Prisma enum plus ADJUSTMENT for manual operator entries). */
export type TransactionType = "DEPOSIT" | "WITHDRAWAL" | "PROFIT_ACCRUAL" | "COPY_FEE" | "BONUS" | "ADJUSTMENT";

/** Every transaction type in filter order. */
export const TRANSACTION_TYPES: readonly TransactionType[] = [
  "DEPOSIT",
  "WITHDRAWAL",
  "PROFIT_ACCRUAL",
  "COPY_FEE",
  "BONUS",
  "ADJUSTMENT",
];

/** Request processing status. UNKNOWN preserves an unexpected raw value for diagnostics. */
export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "UNKNOWN";

/** Every request status in filter order. */
export const REQUEST_STATUSES: readonly RequestStatus[] = ["PENDING", "APPROVED", "REJECTED", "CANCELLED", "UNKNOWN"];

/** Transfer settlement, separate from request status. "confirmed" requires independent settlement evidence. */
export type SettlementState = "not-applicable" | "unconfirmed" | "confirmed" | "failed";

/** Money direction relative to the customer's account. */
export type Direction = "credit" | "debit";

/** Actions a customer may take on a transaction. */
export type TransactionAction = "cancel";

/** One ledger row as shown in lists. `amount` is a non-negative magnitude; `direction` carries the sign. */
export interface TransactionView {
  /** Owned record id. */
  id: string;
  /** Customer-facing reference, e.g. "WDR-2026-0001". */
  reference: string;
  type: TransactionType;
  /** Actual source label, e.g. "Manual adjustment by operator". */
  sourceLabel: string;
  currency: LedgerCurrency;
  network: NetworkRef | null;
  amount: DecimalString;
  direction: Direction;
  /** Fee charged, or `null` when unknown. */
  fee: DecimalString | null;
  status: RequestStatus;
  /** Raw status when it did not map to {@link RequestStatus}. */
  rawStatus?: string;
  settlement: SettlementState;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  /** Masked destination for general lists, or `null`. */
  destinationMasked: string | null;
  txHash: string | null;
  /** Explorer link built only from an allowlisted network mapping, or `null`. */
  explorerUrl: string | null;
  permittedActions: TransactionAction[];
}

/** One timeline entry on a detail view. */
export interface TimelineEntry {
  at: IsoDateTime;
  label: string;
}

/** Full transaction record, shown only to its owner. */
export interface TransactionDetail extends TransactionView {
  /** Full destination, owner-only. */
  destinationFull: string | null;
  tag: string | null;
  notes: string | null;
  /** Decline/failure reason when available. */
  reason: string | null;
  /** What the customer can do next, when anything. */
  nextStep: string | null;
  timeline: TimelineEntry[];
}

/** Allowed page sizes for the activity ledger. */
export type PageSize = 10 | 25 | 50;

/** Every allowed page size. */
export const PAGE_SIZES: readonly PageSize[] = [10, 25, 50];

/** Filters and pagination for the activity ledger. Persisted in the URL; page resets to 1 on filter change. */
export interface TransactionQuery {
  type?: TransactionType | "all";
  currency?: LedgerCurrency | "all";
  status?: RequestStatus | "all";
  /** Inclusive lower bound (ISO date or timestamp). */
  from?: string;
  /** Inclusive upper bound (ISO date or timestamp). */
  to?: string;
  /** 1-based page. */
  page: number;
  pageSize: PageSize;
}

/* -------------------------------------------------------------------------- */
/* Deposits                                                                   */
/* -------------------------------------------------------------------------- */

/** An asset with the networks that accept deposits. */
export interface DepositOption {
  currency: SupportedCrypto;
  networks: NetworkRef[];
}

/** Deposit details returned by the service for one asset/network selection. Missing policies are `null`, never invented. */
export interface DepositInstruction {
  currency: SupportedCrypto;
  network: NetworkRef;
  address: string;
  /** Destination tag/memo when the network requires one. */
  tag: string | null;
  minimumDeposit: DecimalString | null;
  /** Required confirmations, or `null` when the policy is not supplied. */
  confirmations: number | null;
  /** When the address stops being valid, or `null` when it does not expire. */
  expiresAt: IsoDateTime | null;
  /** Operator notice for this selection. */
  notice: string | null;
  issuedAt: IsoDateTime;
}

/** Input for a deposit proof submission. Never credits a balance locally. */
export interface DepositProofInput {
  currency: SupportedCrypto;
  networkId: string;
  txHash: string;
  note?: string;
  /** Name of an uploaded proof file, when the upload capability exists. */
  fileName?: string;
}

/** Accepted upload types and size limit. */
export interface UploadRules {
  /** MIME types or extensions, e.g. ["image/png", "application/pdf"]. */
  acceptedTypes: string[];
  maxBytes: number;
}

/** Proof upload rules, `null` when proof submission is not supported. */
export type DepositProofRules = UploadRules | null;

/** Result of a successful deposit proof submission. */
export interface DepositProofReceipt {
  /** Request reference, e.g. "DEP-REQ-0001". */
  reference: string;
  submittedAt: IsoDateTime;
  status: "PENDING";
}

/* -------------------------------------------------------------------------- */
/* Withdrawals                                                                */
/* -------------------------------------------------------------------------- */

/** Withdrawal methods. */
export type WithdrawalMethodId = "crypto" | "bank";

/** Field kinds in a bank payout scheme. */
export type BankFieldKind = "text" | "country" | "iban" | "swift" | "routing";

/** One field of the supported bank payout scheme. */
export interface BankSchemeField {
  id: string;
  label: string;
  required: boolean;
  kind: BankFieldKind;
}

/** What the withdrawal form may offer. Unavailable methods stay listed with a reason. */
export interface WithdrawalOptions {
  methods: Array<{ id: WithdrawalMethodId; label: string; available: boolean; reason?: string }>;
  assets: Array<{ currency: SupportedCrypto; networks: NetworkRef[]; available: DecimalString | null }>;
  /** Bank payout scheme, or `null` when bank wires are not supported. */
  bankScheme: { fields: BankSchemeField[]; denominations: string[] } | null;
}

/** Crypto withdrawal request. */
export interface CryptoWithdrawalInput {
  method: "crypto";
  currency: SupportedCrypto;
  networkId: string;
  address: string;
  tag?: string;
  amount: DecimalString;
}

/** Bank wire withdrawal request. Never stored in query strings, analytics or localStorage. */
export interface BankWithdrawalInput {
  method: "bank";
  /** Values keyed by {@link BankSchemeField.id}. */
  fields: Record<string, string>;
  amount: DecimalString;
  /** Payout denomination from {@link WithdrawalOptions.bankScheme}. */
  denomination: string;
  /** Source ledger currency being debited. */
  currency: LedgerCurrency;
}

/** Either withdrawal method. */
export type WithdrawalRequestInput = CryptoWithdrawalInput | BankWithdrawalInput;

/** Server-quoted fee and totals for a validated request. Expired or changed quotes need revalidation. */
export interface WithdrawalQuote {
  quoteId: string;
  expiresAt: IsoDateTime;
  fee: DecimalString;
  totalDebit: DecimalString;
  recipientAmount: DecimalString;
  currency: LedgerCurrency;
  /** Validated recipient reference (masked destination or bank recipient label). */
  recipientRef: string;
  /** Informational USD estimate of the total debit, or null. */
  estimatedDebitUsd?: DecimalString | null;
  /** Informational USD estimate of the fee, or null. */
  estimatedFeeUsd?: DecimalString | null;
}

/** Result of a submitted withdrawal request. Approval later does not mean settlement. */
export interface WithdrawalReceipt {
  requestId: string;
  reference: string;
  status: "PENDING";
  submittedAt: IsoDateTime;
}

/* -------------------------------------------------------------------------- */
/* Copy trading                                                               */
/* -------------------------------------------------------------------------- */

/** A measured metric with its period and method; `null` parts mean unavailable. */
export interface TraderMetric {
  value: DecimalString | number | null;
  period: string | null;
  method: string | null;
}

/** Sort keys for trader discovery. */
export type TraderSort = "name" | "copiers" | "accuracy";

/** Filters for trader discovery. */
export interface TraderQuery {
  search?: string;
  sort: TraderSort;
  risk?: string;
}

/** A trader as shown on a discovery card. Missing measures stay absent; no fallback performance. */
export interface TraderView {
  id: string;
  name: string;
  /** Same-origin portrait path, or `null`. */
  portrait: string | null;
  /** Disclosure for fictional/AI portraits, or `null`. */
  portraitDisclosure: string | null;
  strategy: string;
  /** Winning closed trades divided by all closed trades for a supplied period. */
  accuracy: TraderMetric & { wins: number | null; losses: number | null };
  copiers: number | null;
  rating: { value: number | null; reviews: number | null };
  drawdown: TraderMetric;
  risk: { label: string | null; method: string | null };
  minimumAllocation: { amount: DecimalString; currency: LedgerCurrency } | null;
  fee: { percent: DecimalString; basis: string } | null;
  /** Where the record comes from, e.g. "Operator-entered record; performance not independently measured". */
  provenance: string;
}

/** How an allocation is executed. "unavailable" means no execution contract exists. */
export type ExecutionMode = "manual-allocation" | "exchange-execution" | "unavailable";

/** Full trader profile. */
export interface TraderProfile extends TraderView {
  description: string;
  approach: string[];
  history: ValuationHistory | null;
  activity: TransactionView[] | null;
  executionMode: ExecutionMode;
}

/** Input for a copy request. */
export interface CopyRequestInput {
  /** Source wallet currency. */
  currency: LedgerCurrency;
  amount: DecimalString;
  executionMode: ExecutionMode;
  /** The customer acknowledged the risk statement. */
  riskAcknowledged: boolean;
}

/** Allocation lifecycle states. PENDING/STOPPING/ERROR are operation states supplied by the service. */
export type AllocationStatus = "ACTIVE" | "PAUSED" | "STOPPED" | "PENDING" | "STOPPING" | "ERROR";

/** Result of a copy request. */
export interface CopyRequestReceipt {
  allocationId: string;
  reference: string;
  status: AllocationStatus;
  submittedAt: IsoDateTime;
}

/** Actions a customer may take on an allocation. Never inferred from a status badge. */
export type AllocationAction = "pause" | "resume" | "stop";

/** One copy-trade allocation as listed. */
export interface AllocationView {
  id: string;
  traderId: string;
  traderName: string;
  traderPortrait: string | null;
  allocated: { amount: DecimalString; currency: LedgerCurrency };
  status: AllocationStatus;
  rawStatus?: string;
  executionMode: ExecutionMode;
  recordedPnl: { amount: DecimalString; currency: LedgerCurrency; label: string; method: string } | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  permittedActions: AllocationAction[];
}

/** Allocation detail with timeline, fees and supported actions. */
export interface AllocationDetail extends AllocationView {
  timeline: TimelineEntry[];
  fees: Array<{ label: string; amount: DecimalString; currency: LedgerCurrency }>;
  activity: TransactionView[];
  /** What Stop actually does for this allocation (new copying, positions, capital). */
  stopExplanation: string;
  /** An operation awaiting confirmation; stays visible after refresh. */
  pendingOperation: { kind: AllocationAction; since: IsoDateTime } | null;
}

/* -------------------------------------------------------------------------- */
/* Signals                                                                    */
/* -------------------------------------------------------------------------- */

/** One trading signal with an identified source. Never generated from random data or chart slopes. */
export interface SignalView {
  id: string;
  source: string;
  market: string;
  asset: SupportedCrypto | null;
  network: NetworkRef | null;
  direction: "long" | "short" | "neutral" | null;
  publishedAt: IsoDateTime;
  expiresAt: IsoDateTime | null;
  expired: boolean;
  summary: string;
  detail: string;
}

/** Signals entitlement and feed. */
export interface SignalsFeed {
  entitled: boolean;
  entitlementReason?: string;
  source: string | null;
  signals: SignalView[];
}

/* -------------------------------------------------------------------------- */
/* Notifications                                                              */
/* -------------------------------------------------------------------------- */

/** Notification categories. */
export type NotificationKind = "transaction" | "allocation" | "security" | "verification" | "system";

/** Inbox filter. */
export type NotificationFilter = "all" | "unread";

/** One account notification. Financial status comes from records, never from notification text. */
export interface NotificationView {
  id: string;
  title: string;
  message: string;
  kind: NotificationKind;
  read: boolean;
  createdAt: IsoDateTime;
  /** Owned record link, or `null`. */
  href: string | null;
}

/** Result of marking one notification read. */
export interface NotificationReadResult {
  notification: NotificationView;
  unreadCount: number;
}

/** Result of marking all notifications read. */
export interface NotificationsReadAllResult {
  updated: number;
  unreadCount: number;
}

/* -------------------------------------------------------------------------- */
/* Profile, security, verification                                            */
/* -------------------------------------------------------------------------- */

/** Editable profile fields. Email changes follow the identity provider workflow. */
export type ProfileField = "fullName" | "phone" | "country";

/** Personal details. */
export interface ProfileView {
  email: string;
  fullName: string | null;
  phone: string | null;
  country: string | null;
  memberSince: IsoDateTime;
  editable: ProfileField[];
}

/** Profile save input (only editable fields). */
export interface ProfileInput {
  fullName?: string;
  phone?: string;
  country?: string;
}

/** Confirmed MFA state. A boolean flag alone is not proof of a verified factor. */
export type MfaState = "not-enabled" | "enrollment-pending" | "enabled";

/** MFA status with factor context. */
export interface MfaStatus {
  state: MfaState;
  factorLabel?: string;
  verifiedAt?: IsoDateTime;
}

/** One active session, only when a real session source exists. */
export interface SessionView {
  id: string;
  device: string;
  lastActive: IsoDateTime;
  current: boolean;
}

/** Security settings. */
export interface SecurityView {
  mfa: MfaStatus;
  password: { changeAvailable: boolean; reason?: string };
  /** Sessions, or `null` when no session source exists. */
  sessions: SessionView[] | null;
  sessionsReason?: string;
}

/** Provider-issued enrollment data. */
export interface MfaEnrollment {
  factorId: string;
  /** Provider QR as SVG markup, or `null`. */
  qrSvg: string | null;
  secret: string;
  issuer: string;
}

/** Password change input; the provider reauthenticates with the current password. */
export interface PasswordChangeInput {
  currentPassword: string;
  newPassword: string;
}

/** Result of a password change. */
export interface PasswordChangeResult {
  changedAt: IsoDateTime;
}

/** Identity verification states from server data. */
export type VerificationState = "not-submitted" | "in-review" | "verified" | "changes-required";

/** One submitted document; never a public URL. */
export interface VerificationDocument {
  id: string;
  type: string;
  fileName: string;
  side: "front" | "back";
  uploadedAt: IsoDateTime;
}

/** Identity verification status. */
export interface VerificationView {
  state: VerificationState;
  submittedAt: IsoDateTime | null;
  reviewedAt: IsoDateTime | null;
  /** Review message (e.g. what must change), or `null`. */
  message: string | null;
  /** Accepted document types from approved content. */
  documentTypes: string[];
  documents: VerificationDocument[];
  uploadRules: DepositProofRules;
  retentionNotice: string;
}

/** Descriptor of one file in a verification submission. The transport (FormData) is the adapter's concern. */
export interface VerificationFileInput {
  side: "front" | "back";
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

/** Verification submission input. */
export interface VerificationInput {
  documentType: string;
  files: VerificationFileInput[];
}

/* -------------------------------------------------------------------------- */
/* Attention and action results                                               */
/* -------------------------------------------------------------------------- */

/** Kinds of real pending items; no manufactured urgency. */
export type AttentionKind = "withdrawal-pending" | "security-enrollment" | "verification-action" | "deposit-review";

/** One item in "Needs attention". */
export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  title: string;
  description: string;
  href: string;
  since: IsoDateTime;
}

/** Failure codes for actions. "unknown-outcome" means a timeout: reconcile before resubmitting. */
export type ActionErrorCode =
  | "unavailable"
  | "invalid"
  | "failed"
  | "unknown-outcome"
  | "session-expired"
  | "forbidden"
  | "not-found";

/** Outcome of a mutation. */
export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      code: ActionErrorCode;
      message: string;
      /** Field-level errors keyed by field id. */
      fieldErrors?: Record<string, string>;
      /** Request reference or idempotency key for reconciliation. */
      reference?: string;
    };

/** The failure member of {@link ActionResult}. */
export type ActionFailure = Extract<ActionResult<unknown>, { ok: false }>;
