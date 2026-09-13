/**
 * In-memory fixture store for the design preview.
 *
 * `createFixtureStore(scenarioId)` builds the complete state of one scenario
 * from the deterministic fixture modules and exposes it as a client-safe
 * {@link DashboardData}. Every read resolves from the current state, so the
 * actions in `./actions.ts` can mutate it and re-render through
 * `subscribe`. Nothing here imports a server module, Prisma, Node APIs or
 * the system clock; the only clock is {@link FIXTURE_CLOCK}.
 *
 * All money arithmetic goes through `lib/dashboard/money.ts`.
 */

import {
  CURRENCY_META,
  SUPPORTED_CRYPTO,
  isSupportedCrypto,
  type AllocationDetail,
  type AllocationView,
  type AssetBalance,
  type AttentionItem,
  type Capabilities,
  type DecimalString,
  type DepositInstruction,
  type DepositOption,
  type NotificationFilter,
  type NotificationView,
  type Page,
  type RecordedPnl,
  type RegionResult,
  type SecurityView,
  type SettlementLedger,
  type SignalsFeed,
  type SupportedCrypto,
  type TraderProfile,
  type TraderQuery,
  type TraderView,
  type TransactionDetail,
  type TransactionQuery,
  type TransactionView,
  type UploadRules,
  type Valuation,
  type ValuationHistory,
  type ValuationPeriod,
  type VerificationView,
  type WithdrawalOptions,
  type WithdrawalQuote,
  type WithdrawalReceipt,
} from "../contracts";
import {
  regionEmpty,
  regionError,
  regionNotFound,
  regionReady,
  regionUnavailable,
  type DashboardData,
} from "../data-source";
import { add, compare, fromUnits, isZero, parseDecimal, sum, toFixed } from "../money";
import { accountFor, holdingTotal, LONG_ADDRESS, type AccountFixture } from "./accounts";
import { buildAllocations } from "./allocations";
import { buildCapabilities } from "./capabilities";
import { FIXTURE_CLOCK, atMinutes } from "./clock";
import { buildValuationHistory, estimateUsd } from "./history";
import { buildNotifications } from "./notifications";
import { FIXTURE_QUOTE_SOURCE, fixtureQuotes } from "./quotes";
import { DEFAULT_SCENARIO_ID, isScenarioId, type ScenarioId } from "./scenarios";
import { buildSecurity } from "./security";
import { buildSignals } from "./signals";
import { buildTraders } from "./traders";
import { buildTransactions, fixtureHash, sortNewestFirst, type FixtureTransaction } from "./transactions";
import { buildVerification, VERIFICATION_UPLOAD_RULES } from "./verification";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

/** Message of every simulated read failure in the `read-error` scenario. */
export const READ_ERROR_MESSAGE = "The fixture service did not respond (simulated read failure)";

/** Reason of the unavailable valuation in the `no-quotes` scenario. */
export const NO_QUOTES_REASON = "No price feed is configured; balances are exact but no fiat estimate can be produced";

/** Method text attached to the recorded 30-day P/L. */
export const PNL_METHOD = "Ledger: recorded copy-trade outcomes";

/** Method text when the percentage return basis is not supplied. */
export const PNL_METHOD_NO_PERCENT = "Ledger: recorded copy-trade outcomes; return basis not supplied for this period";

/** Page size of the notifications inbox. */
export const NOTIFICATION_PAGE_SIZE = 10;

/** Recent deposits shown on the deposit page. */
export const RECENT_DEPOSIT_LIMIT = 5;

/** Notice attached to every fixture deposit address. */
export const FIXTURE_ADDRESS_NOTICE = "Fixture address for design review. Do not send funds to it.";

/** Proof upload rules in the preview (same limits as identity documents). */
export const DEPOSIT_PROOF_RULES: UploadRules = VERIFICATION_UPLOAD_RULES;

/** Fixture withdrawal fees per asset and network (magnitudes at ledger precision). */
export const WITHDRAWAL_FEES: Record<string, DecimalString> = {
  "BTC:bitcoin": "0.00020000",
  "ETH:ethereum": "0.00020000",
  "BCH:bitcoin-cash": "0.00010000",
  "LTC:litecoin": "0.00100000",
  "XRP:xrp-ledger": "0.200000",
  "USDT:ethereum": "5.000000",
  "USDT:tron": "1.000000",
};

/** Bank wire fee per source currency (magnitudes at ledger precision). */
export const BANK_WIRE_FEES: Partial<Record<string, DecimalString>> = {
  USD: "2.50",
  USDT: "2.500000",
};

/** Bank scheme offered by the fixture withdrawal form. */
export const BANK_SCHEME: NonNullable<WithdrawalOptions["bankScheme"]> = {
  fields: [
    { id: "accountHolder", label: "Account holder name", required: true, kind: "text" },
    { id: "country", label: "Bank country", required: true, kind: "country" },
    { id: "iban", label: "IBAN", required: true, kind: "iban" },
    { id: "swift", label: "SWIFT / BIC", required: true, kind: "swift" },
  ],
  denominations: ["USD", "EUR", "GBP"],
};

/** Minimum deposit per asset (fixture policy). */
const MINIMUM_DEPOSITS: Record<SupportedCrypto, DecimalString> = {
  BTC: "0.00010000",
  ETH: "0.01000000",
  BCH: "0.01000000",
  LTC: "0.10000000",
  XRP: "10.000000",
  USDT: "10.000000",
};

/** Required confirmations per network (fixture policy; `null` when the network has none supplied). */
const CONFIRMATIONS: Record<string, number | null> = {
  bitcoin: 3,
  ethereum: 12,
  "bitcoin-cash": 6,
  litecoin: 6,
  "xrp-ledger": 1,
  tron: 20,
};

/* -------------------------------------------------------------------------- */
/* State                                                                      */
/* -------------------------------------------------------------------------- */

/** A submitted deposit proof awaiting review; never credits a balance. */
export interface DepositProofRecord {
  reference: string;
  currency: SupportedCrypto;
  networkId: string;
  txHash: string;
  note: string | null;
  fileName: string | null;
  submittedAt: string;
}

/** A quote issued by `quoteWithdrawal`, with the fingerprint of the input it was issued for. */
export interface QuoteRecord {
  quote: WithdrawalQuote;
  fingerprint: string;
}

/** Sequence counters for ids issued by the actions. */
export interface Counters {
  quote: number;
  withdrawal: number;
  depositProof: number;
  copyRequest: number;
  allocation: number;
  notification: number;
  document: number;
}

/** Complete mutable state of one scenario. */
export interface FixtureState {
  scenarioId: ScenarioId;
  clock: string;
  account: AccountFixture;
  capabilities: Capabilities;
  /** Ledger rows, newest first. */
  transactions: FixtureTransaction[];
  traders: TraderProfile[];
  allocations: AllocationDetail[];
  signals: SignalsFeed;
  notifications: NotificationView[];
  security: SecurityView;
  verification: VerificationView;
  depositProofs: DepositProofRecord[];
  quotes: Map<string, QuoteRecord>;
  /** Idempotency key → receipt of the withdrawal it created. */
  idempotency: Map<string, WithdrawalReceipt>;
  /** Factor id of a pending or enabled fixture factor. */
  mfaFactorId: string | null;
  counters: Counters;
}

function highestSequence(ids: readonly string[], prefix: string): number {
  let highest = 0;
  for (const id of ids) {
    if (!id.startsWith(prefix)) continue;
    const digits = id.slice(prefix.length).match(/^\d+/);
    if (!digits) continue;
    const value = Number.parseInt(digits[0], 10);
    if (Number.isFinite(value) && value > highest) highest = value;
  }
  return highest;
}

/** Build the state of a scenario. Pure and deterministic. */
export function buildFixtureState(scenarioId: ScenarioId): FixtureState {
  const transactions = buildTransactions(scenarioId);
  const allocations = buildAllocations(scenarioId);
  const notifications = buildNotifications(scenarioId);
  const verification = buildVerification(scenarioId);
  const security = buildSecurity(scenarioId);
  return {
    scenarioId,
    clock: FIXTURE_CLOCK,
    account: accountFor(scenarioId),
    capabilities: buildCapabilities(scenarioId),
    transactions,
    traders: buildTraders(scenarioId),
    allocations,
    signals: buildSignals(scenarioId),
    notifications,
    security,
    verification,
    depositProofs: [],
    quotes: new Map(),
    idempotency: new Map(),
    mfaFactorId: security.mfa.state === "enabled" ? FIXTURE_FACTOR_ID : null,
    counters: {
      quote: 0,
      withdrawal: highestSequence(
        transactions.filter((row) => row.type === "WITHDRAWAL").map((row) => row.reference),
        "WDR-2026-",
      ),
      depositProof: 0,
      copyRequest: 0,
      allocation: highestSequence(
        allocations.map((allocation) => allocation.id),
        "alloc-",
      ),
      notification: highestSequence(
        notifications.map((notification) => notification.id),
        "ntf-",
      ),
      document: highestSequence(
        verification.documents.map((document) => document.id),
        "doc-",
      ),
    },
  };
}

/** Id of the fixture authenticator factor. */
export const FIXTURE_FACTOR_ID = "factor-fixture-0001";

/* -------------------------------------------------------------------------- */
/* Derived values (shared with the actions)                                   */
/* -------------------------------------------------------------------------- */

/** Zero-pad a sequence number to four digits. */
export function sequence(value: number): string {
  return String(value).padStart(4, "0");
}

/** Public list shape of a stored ledger row. */
export function toTransactionView(row: FixtureTransaction): TransactionView {
  return {
    id: row.id,
    reference: row.reference,
    type: row.type,
    sourceLabel: row.sourceLabel,
    currency: row.currency,
    network: row.network,
    amount: row.amount,
    direction: row.direction,
    fee: row.fee,
    status: row.status,
    ...(row.rawStatus === undefined ? {} : { rawStatus: row.rawStatus }),
    settlement: row.settlement,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    destinationMasked: row.destinationMasked,
    txHash: row.txHash,
    explorerUrl: row.explorerUrl,
    permittedActions: [...row.permittedActions],
  };
}

/** Owner-only detail shape of a stored ledger row. */
export function toTransactionDetail(row: FixtureTransaction): TransactionDetail {
  return {
    ...toTransactionView(row),
    destinationFull: row.destinationFull,
    tag: row.tag,
    notes: row.notes,
    reason: row.reason,
    nextStep: row.nextStep,
    timeline: row.timeline.map((entry) => ({ ...entry })),
  };
}

/** Enabled holdings as `currency → total` (disabled wallets omitted). */
export function currentHoldings(state: FixtureState): Partial<Record<SupportedCrypto, DecimalString>> {
  const totals: Partial<Record<SupportedCrypto, DecimalString>> = {};
  for (const currency of SUPPORTED_CRYPTO) {
    const entry = state.account.holdings[currency];
    if (entry.enabled) totals[currency] = holdingTotal(entry);
  }
  return totals;
}

/** Signed sum of the recorded outcomes (PROFIT_ACCRUAL rows) matching `predicate`, at USD precision. */
export function recordedOutcomeSum(rows: readonly FixtureTransaction[], predicate: (row: FixtureTransaction) => boolean): DecimalString | null {
  let total: DecimalString | null = null;
  for (const row of rows) {
    if (row.type !== "PROFIT_ACCRUAL" || row.currency !== "USD" || row.status !== "APPROVED") continue;
    if (!predicate(row)) continue;
    const signed = row.direction === "credit" ? row.amount : `-${row.amount}`;
    total = total === null ? signed : add(total, signed);
  }
  return total === null ? null : toFixed(total, CURRENCY_META.USD.precision, "half-up");
}

/**
 * `part / total × 100` at two decimals, half-up, computed on scaled integers.
 * Returns `null` when `total` is zero.
 */
export function ratioPercent(part: DecimalString, total: DecimalString): DecimalString | null {
  const p = parseDecimal(part);
  const t = parseDecimal(total);
  if (t.sign === 0) return null;
  const scale = Math.max(p.scale, t.scale);
  const pow = (exponent: number) => {
    let result = BigInt(1);
    for (let i = 0; i < exponent; i += 1) result *= BigInt(10);
    return result;
  };
  const numerator = p.units * pow(scale - p.scale) * BigInt(10000);
  const denominator = t.units * pow(scale - t.scale);
  const negative = numerator < BigInt(0) !== denominator < BigInt(0);
  const absNumerator = numerator < BigInt(0) ? -numerator : numerator;
  const absDenominator = denominator < BigInt(0) ? -denominator : denominator;
  let quotient = absNumerator / absDenominator;
  const remainder = absNumerator % absDenominator;
  if (remainder * BigInt(2) >= absDenominator) quotient += BigInt(1);
  return fromUnits(negative ? -quotient : quotient, 2);
}

/** Recorded 30-day P/L of the whole account, or `null` when nothing was recorded. */
export function accountRecordedPnl(state: FixtureState): RecordedPnl | null {
  const windowStart = Date.parse(state.clock) - 30 * 24 * 60 * 60_000;
  const amount = recordedOutcomeSum(state.transactions, (row) => Date.parse(row.createdAt) >= windowStart);
  if (amount === null) return null;
  if (state.scenarioId === "losing-outcome") {
    return { amount, period: "30D", method: PNL_METHOD_NO_PERCENT, percent: null };
  }
  const total = estimateUsd(currentHoldings(state));
  return { amount, period: "30D", method: PNL_METHOD, percent: ratioPercent(amount, total) };
}

/** Public asset rows for the scenario in display order. */
export function assetRows(state: FixtureState): AssetBalance[] {
  const noQuotes = state.scenarioId === "no-quotes";
  return SUPPORTED_CRYPTO.map((currency) => {
    const meta = CURRENCY_META[currency];
    const entry = state.account.holdings[currency];
    const networks = state.account.networks[currency].map((network) => ({ ...network }));
    if (!entry.enabled) {
      return {
        currency,
        name: meta.name,
        precision: meta.precision,
        enabled: false,
        enabledReason: entry.reason,
        total: null,
        available: null,
        reserved: null,
        reservedReason: entry.reason,
        estimatedUsd: null,
        estimateReason: entry.reason,
        asOf: null,
        networks,
      };
    }
    const total = holdingTotal(entry);
    return {
      currency,
      name: meta.name,
      precision: meta.precision,
      enabled: true,
      total,
      available: entry.available,
      reserved: entry.reserved,
      reservedReason: entry.reservedReason,
      estimatedUsd: noQuotes ? null : estimateUsd({ [currency]: total }),
      ...(noQuotes ? { estimateReason: NO_QUOTES_REASON } : {}),
      asOf: state.clock,
      networks,
    };
  });
}

/** Valuation of the scenario from the fixture quotes. */
export function valuationFor(state: FixtureState): Valuation {
  const enabled: Partial<Record<SupportedCrypto, DecimalString>> = {};
  const available: Partial<Record<SupportedCrypto, DecimalString>> = {};
  const reserved: Partial<Record<SupportedCrypto, DecimalString>> = {};
  const excluded: SupportedCrypto[] = [];
  for (const currency of SUPPORTED_CRYPTO) {
    const entry = state.account.holdings[currency];
    if (!entry.enabled) {
      excluded.push(currency);
      continue;
    }
    enabled[currency] = holdingTotal(entry);
    available[currency] = entry.available;
    reserved[currency] = entry.reserved;
  }
  return {
    displayCurrency: "USD",
    source: FIXTURE_QUOTE_SOURCE,
    quotedAt: state.clock,
    quotes: fixtureQuotes(),
    estimatedTotal: estimateUsd(enabled),
    availableTotal: estimateUsd(available),
    reservedTotal: estimateUsd(reserved),
    partial: excluded.length > 0,
    excluded,
    recordedPnl: accountRecordedPnl(state),
  };
}

/** Signed USD settlement balance from approved USD rows, or `null` when the account has no USD row. */
export function settlementBalance(state: FixtureState): DecimalString | null {
  let balance: DecimalString | null = null;
  for (const row of state.transactions) {
    if (row.currency !== "USD" || row.status !== "APPROVED") continue;
    const signed = row.direction === "credit" ? row.amount : `-${row.amount}`;
    balance = balance === null ? signed : add(balance, signed);
  }
  return balance === null ? null : toFixed(balance, CURRENCY_META.USD.precision, "half-up");
}

/** Recorded P/L of one allocation from its ledger rows, or `null` when nothing was recorded. */
export function allocationPnl(state: FixtureState, allocationId: string): AllocationView["recordedPnl"] {
  const amount = recordedOutcomeSum(state.transactions, (row) => row.allocationId === allocationId);
  if (amount === null) return null;
  return { amount, currency: "USD", label: "Recorded P/L, before copy fees", method: PNL_METHOD };
}

/** List shape of an allocation with ledger-derived P/L. */
export function toAllocationView(state: FixtureState, allocation: AllocationDetail): AllocationView {
  return {
    id: allocation.id,
    traderId: allocation.traderId,
    traderName: allocation.traderName,
    traderPortrait: allocation.traderPortrait,
    allocated: { ...allocation.allocated },
    status: allocation.status,
    ...(allocation.rawStatus === undefined ? {} : { rawStatus: allocation.rawStatus }),
    executionMode: allocation.executionMode,
    recordedPnl: allocationPnl(state, allocation.id),
    createdAt: allocation.createdAt,
    updatedAt: allocation.updatedAt,
    permittedActions: [...allocation.permittedActions],
  };
}

/** Detail shape of an allocation with ledger-derived P/L, fees and activity. */
export function toAllocationDetail(state: FixtureState, allocation: AllocationDetail): AllocationDetail {
  const rows = state.transactions.filter((row) => row.allocationId === allocation.id);
  const feeRows = rows.filter((row) => row.type === "COPY_FEE" && row.status === "APPROVED");
  const fees: AllocationDetail["fees"] =
    feeRows.length === 0
      ? []
      : [
          {
            label: `Copy fees recorded (${feeRows.length})`,
            amount: toFixed(sum(feeRows.map((row) => row.amount)), CURRENCY_META.USD.precision, "half-up"),
            currency: "USD",
          },
        ];
  return {
    ...toAllocationView(state, allocation),
    timeline: allocation.timeline.map((entry) => ({ ...entry })),
    fees,
    activity: sortNewestFirst(rows).map(toTransactionView),
    stopExplanation: allocation.stopExplanation,
    pendingOperation: allocation.pendingOperation ? { ...allocation.pendingOperation } : null,
  };
}

/** Discovery-card shape of a trader profile. */
export function toTraderView(trader: TraderProfile): TraderView {
  return {
    id: trader.id,
    name: trader.name,
    portrait: trader.portrait,
    portraitDisclosure: trader.portraitDisclosure,
    strategy: trader.strategy,
    accuracy: { ...trader.accuracy },
    copiers: trader.copiers,
    rating: { ...trader.rating },
    drawdown: { ...trader.drawdown },
    risk: { ...trader.risk },
    minimumAllocation: trader.minimumAllocation ? { ...trader.minimumAllocation } : null,
    fee: trader.fee ? { ...trader.fee } : null,
    provenance: trader.provenance,
  };
}

/** Fixture deposit address for an asset/network pair. Deterministic; not a real address. */
export function fixtureAddress(state: FixtureState, currency: SupportedCrypto, networkId: string): string {
  if (state.scenarioId === "long-values" && currency === "BTC") return LONG_ADDRESS;
  const hash = fixtureHash(`deposit:${state.account.session.userId}:${currency}:${networkId}`);
  switch (networkId) {
    case "bitcoin":
      return `bc1q${hash.slice(0, 38)}`;
    case "ethereum":
      return `0x${hash.slice(0, 40)}`;
    case "tron":
      return `T${hash.slice(0, 33).toUpperCase()}`;
    case "bitcoin-cash":
      return `bitcoincash:q${hash.slice(0, 41)}`;
    case "litecoin":
      return `ltc1q${hash.slice(0, 38)}`;
    case "xrp-ledger":
      return `r${hash.slice(0, 33)}`;
    default:
      return hash.slice(0, 40);
  }
}

function cloneRules(rules: UploadRules | null): UploadRules | null {
  return rules ? { acceptedTypes: [...rules.acceptedTypes], maxBytes: rules.maxBytes } : null;
}

/** Unread count of the inbox. */
export function unreadCount(state: FixtureState): number {
  return state.notifications.filter((notification) => !notification.read).length;
}

/** Real pending items of the scenario. */
export function attentionItems(state: FixtureState): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const row of state.transactions) {
    if (row.type === "WITHDRAWAL" && row.status === "PENDING") {
      items.push({
        id: `attention-${row.id}`,
        kind: "withdrawal-pending",
        title: `Withdrawal ${row.reference} pending review`,
        description: `${row.amount} ${row.currency} to ${row.destinationMasked ?? "the requested destination"} is awaiting operator review.`,
        href: `/dashboard/activity/${row.id}`,
        since: row.createdAt,
      });
    }
    if (row.type === "DEPOSIT" && row.status === "PENDING") {
      items.push({
        id: `attention-${row.id}`,
        kind: "deposit-review",
        title: `Deposit ${row.reference} in review`,
        description: `${row.amount} ${row.currency} is awaiting operator review.`,
        href: `/dashboard/activity/${row.id}`,
        since: row.createdAt,
      });
    }
  }
  for (const proof of state.depositProofs) {
    items.push({
      id: `attention-${proof.reference}`,
      kind: "deposit-review",
      title: `Deposit proof ${proof.reference} in review`,
      description: `Your ${proof.currency} deposit proof is awaiting operator review. The balance is credited only after review.`,
      href: "/dashboard/deposit",
      since: proof.submittedAt,
    });
  }
  if (state.security.mfa.state !== "enabled") {
    items.push({
      id: "attention-mfa",
      kind: "security-enrollment",
      title: "Enable an authenticator app",
      description:
        state.security.mfa.state === "enrollment-pending"
          ? "An enrollment was started but not verified."
          : "Your account has no second factor for sign-in.",
      href: "/dashboard/settings/security",
      since: state.clock,
    });
  }
  if (state.verification.state === "not-submitted" || state.verification.state === "changes-required") {
    items.push({
      id: "attention-verification",
      kind: "verification-action",
      title: state.verification.state === "not-submitted" ? "Submit identity documents" : "Verification needs changes",
      description: state.verification.message ?? "Identity verification is required before withdrawals are reviewed.",
      href: "/dashboard/settings/verification",
      since: state.verification.reviewedAt ?? state.verification.submittedAt ?? state.clock,
    });
  }
  return items.sort((a, b) => Date.parse(b.since) - Date.parse(a.since) || a.id.localeCompare(b.id));
}

/* -------------------------------------------------------------------------- */
/* Query helpers                                                              */
/* -------------------------------------------------------------------------- */

function boundsFor(query: TransactionQuery): { from: number | null; to: number | null } {
  const from = query.from ? Date.parse(query.from) : Number.NaN;
  let to = query.to ? Date.parse(query.to) : Number.NaN;
  if (query.to && /^\d{4}-\d{2}-\d{2}$/.test(query.to) && Number.isFinite(to)) to += 24 * 60 * 60_000 - 1;
  return { from: Number.isFinite(from) ? from : null, to: Number.isFinite(to) ? to : null };
}

/** Rows matching a ledger query, newest first. */
export function filterTransactions(rows: readonly FixtureTransaction[], query: TransactionQuery): FixtureTransaction[] {
  const { from, to } = boundsFor(query);
  return rows.filter((row) => {
    if (query.type && query.type !== "all" && row.type !== query.type) return false;
    if (query.currency && query.currency !== "all" && row.currency !== query.currency) return false;
    if (query.status && query.status !== "all" && row.status !== query.status) return false;
    const created = Date.parse(row.createdAt);
    if (from !== null && created < from) return false;
    if (to !== null && created > to) return false;
    return true;
  });
}

/** Slice a list into a 1-based page. */
export function paginate<T>(items: readonly T[], page: number, pageSize: number): Page<T> {
  const safePage = Number.isInteger(page) && page >= 1 ? page : 1;
  const start = (safePage - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);
  return { items: [...slice], page: safePage, pageSize, total: items.length, hasMore: start + pageSize < items.length };
}

function compareNullableNumbers(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b - a;
}

function accuracyValue(trader: TraderView): DecimalString | null {
  const value = trader.accuracy.value;
  if (value === null) return null;
  return typeof value === "number" ? String(value) : value;
}

/** Traders matching a discovery query in the requested order. */
export function filterTraders(traders: readonly TraderProfile[], query: TraderQuery): TraderView[] {
  const search = query.search?.trim().toLowerCase() ?? "";
  const risk = query.risk?.trim().toLowerCase() ?? "";
  const views = traders
    .filter((trader) => {
      if (search && !`${trader.name} ${trader.strategy}`.toLowerCase().includes(search)) return false;
      if (risk && risk !== "all" && (trader.risk.label ?? "").toLowerCase() !== risk) return false;
      return true;
    })
    .map(toTraderView);
  const sorted = [...views];
  switch (query.sort) {
    case "copiers":
      sorted.sort((a, b) => compareNullableNumbers(a.copiers, b.copiers) || a.name.localeCompare(b.name));
      break;
    case "accuracy":
      sorted.sort((a, b) => {
        const av = accuracyValue(a);
        const bv = accuracyValue(b);
        if (av === null && bv === null) return a.name.localeCompare(b.name);
        if (av === null) return 1;
        if (bv === null) return -1;
        return -compare(av, bv) || a.name.localeCompare(b.name);
      });
      break;
    default:
      sorted.sort((a, b) => a.name.localeCompare(b.name));
  }
  return sorted;
}

/* -------------------------------------------------------------------------- */
/* Store                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The preview data store: a {@link DashboardData} over mutable in-memory
 * state with a version counter and subscriptions for re-rendering.
 */
export interface FixtureStore {
  /** Reads over the current state. */
  data: DashboardData;
  /** Incremented by every committed mutation. */
  version: number;
  /** Register a listener called after every commit; returns the unsubscribe function. */
  subscribe(listener: () => void): () => void;
  scenarioId: ScenarioId;
  /** The fixed clock every timestamp is relative to. */
  clock: string;
  /** Mutable state; internal to the fixtures package and its actions. */
  state: FixtureState;
  /** Apply a mutation, bump `version` and notify subscribers. Returns the mutation's result. */
  commit<T>(mutate: (state: FixtureState) => T): T;
}

function createData(store: FixtureStore): DashboardData {
  const state = () => store.state;
  const ready = <T>(data: T): RegionResult<T> => regionReady(data, store.clock);
  const readError = <T>(): RegionResult<T> => regionError(READ_ERROR_MESSAGE, true);
  const isReadError = () => store.scenarioId === "read-error";
  const isNoQuotes = () => store.scenarioId === "no-quotes";
  const resolve = <T>(result: RegionResult<T>): Promise<RegionResult<T>> => Promise.resolve(result);

  return {
    getSession: () => Promise.resolve({ ...state().account.session, restrictions: [...state().account.session.restrictions] }),
    getCapabilities: () => Promise.resolve({ ...state().capabilities }),

    getValuation: () => {
      if (isReadError()) return resolve(readError<Valuation>());
      if (isNoQuotes()) return resolve(regionUnavailable<Valuation>(NO_QUOTES_REASON));
      return resolve(ready(valuationFor(state())));
    },

    getValuationHistory: (period: ValuationPeriod) => {
      if (isNoQuotes()) return resolve(regionUnavailable<ValuationHistory>(NO_QUOTES_REASON));
      const holdings = currentHoldings(state());
      const nonZero = Object.values(holdings).some((value) => value !== undefined && !isZero(value));
      if (!nonZero && state().transactions.length === 0) {
        return resolve(regionEmpty<ValuationHistory>("No holdings have been recorded yet"));
      }
      return resolve(ready(buildValuationHistory(holdings, state().transactions, period)));
    },

    getAssets: () => {
      if (isReadError()) return resolve(readError<AssetBalance[]>());
      return resolve(ready(assetRows(state())));
    },

    getSettlementLedger: () => {
      const balance = settlementBalance(state());
      if (balance === null) return resolve(regionEmpty<SettlementLedger>("This account has no USD settlement ledger yet"));
      return resolve(ready<SettlementLedger>({ currency: "USD", balance, asOf: store.clock }));
    },

    getAsset: (currency: SupportedCrypto) => {
      if (!isSupportedCrypto(currency)) return resolve(regionNotFound<AssetBalance>());
      if (isReadError()) return resolve(readError<AssetBalance>());
      const row = assetRows(state()).find((asset) => asset.currency === currency);
      return resolve(row ? ready(row) : regionNotFound<AssetBalance>());
    },

    getAssetActivity: (currency: SupportedCrypto) => {
      if (!isSupportedCrypto(currency)) return resolve(regionNotFound<TransactionView[]>());
      if (isReadError()) return resolve(readError<TransactionView[]>());
      const rows = state().transactions.filter((row) => row.currency === currency);
      if (rows.length === 0) return resolve(regionEmpty<TransactionView[]>("No activity has been recorded for this asset"));
      return resolve(ready(rows.map(toTransactionView)));
    },

    listTransactions: (query: TransactionQuery) => {
      if (isReadError()) return resolve(readError<Page<TransactionView>>());
      const rows = state().transactions;
      if (rows.length === 0) return resolve(regionEmpty<Page<TransactionView>>("No activity has been recorded for this account"));
      const matches = filterTransactions(rows, query);
      const page = paginate(matches, query.page, query.pageSize);
      return resolve(ready<Page<TransactionView>>({ ...page, items: page.items.map(toTransactionView) }));
    },

    getTransaction: (id: string) => {
      const row = state().transactions.find((entry) => entry.id === id);
      return resolve(row ? ready(toTransactionDetail(row)) : regionNotFound<TransactionDetail>());
    },

    getDepositOptions: () => {
      const options: DepositOption[] = [];
      for (const currency of SUPPORTED_CRYPTO) {
        const entry = state().account.holdings[currency];
        const networks = state().account.networks[currency];
        if (!entry.enabled || networks.length === 0) continue;
        options.push({ currency, networks: networks.map((network) => ({ ...network })) });
      }
      if (options.length === 0) return resolve(regionUnavailable<DepositOption[]>("No deposit network is configured for this account"));
      return resolve(ready(options));
    },

    getDepositInstruction: (currency: SupportedCrypto, networkId: string) => {
      const entry = isSupportedCrypto(currency) ? state().account.holdings[currency] : undefined;
      const network = isSupportedCrypto(currency)
        ? state().account.networks[currency].find((candidate) => candidate.id === networkId)
        : undefined;
      if (!entry || !entry.enabled || !network) {
        return resolve(
          regionUnavailable<DepositInstruction>("No deposit instruction is configured for this asset and network"),
        );
      }
      const tag = network.requiresTag ? `1000${sequence(SUPPORTED_CRYPTO.indexOf(currency) + 1)}` : null;
      const tronNotice = network.id === "tron" ? " Tron (TRC20) deposits need 20 network confirmations before review." : "";
      return resolve(
        ready<DepositInstruction>({
          currency,
          network: { ...network },
          address: fixtureAddress(state(), currency, network.id),
          tag,
          minimumDeposit: MINIMUM_DEPOSITS[currency],
          confirmations: CONFIRMATIONS[network.id] ?? null,
          expiresAt: null,
          notice: `${FIXTURE_ADDRESS_NOTICE}${tronNotice}`,
          issuedAt: store.clock,
        }),
      );
    },

    getDepositProofRules: () => {
      if (!state().capabilities.depositProof.available) {
        return resolve(regionUnavailable<UploadRules>(state().capabilities.depositProof.reason ?? "Proof upload is not supported"));
      }
      return resolve(ready<UploadRules>({ ...DEPOSIT_PROOF_RULES, acceptedTypes: [...DEPOSIT_PROOF_RULES.acceptedTypes] }));
    },

    listRecentDeposits: () => {
      if (isReadError()) return resolve(readError<TransactionView[]>());
      const rows = state().transactions.filter((row) => row.type === "DEPOSIT").slice(0, RECENT_DEPOSIT_LIMIT);
      if (rows.length === 0) return resolve(regionEmpty<TransactionView[]>("No deposits have been recorded yet"));
      return resolve(ready(rows.map(toTransactionView)));
    },

    getWithdrawalOptions: () => {
      const capabilities = state().capabilities;
      const assets: WithdrawalOptions["assets"] = SUPPORTED_CRYPTO.map((currency) => {
        const entry = state().account.holdings[currency];
        return {
          currency,
          networks: entry.enabled ? state().account.networks[currency].map((network) => ({ ...network })) : [],
          available: entry.enabled ? entry.available : null,
        };
      });
      return resolve(
        ready<WithdrawalOptions>({
          methods: [
            {
              id: "crypto",
              label: "Crypto transfer",
              available: capabilities.withdrawCrypto.available,
              ...(capabilities.withdrawCrypto.reason ? { reason: capabilities.withdrawCrypto.reason } : {}),
            },
            {
              id: "bank",
              label: "Bank wire",
              available: capabilities.withdrawBank.available,
              ...(capabilities.withdrawBank.reason ? { reason: capabilities.withdrawBank.reason } : {}),
            },
          ],
          assets,
          bankScheme: capabilities.withdrawBank.available
            ? { fields: BANK_SCHEME.fields.map((field) => ({ ...field })), denominations: [...BANK_SCHEME.denominations] }
            : null,
        }),
      );
    },

    listTraders: (query: TraderQuery) => {
      const traders = filterTraders(state().traders, query);
      return resolve(ready(traders));
    },

    getTrader: (id: string) => {
      const trader = state().traders.find((candidate) => candidate.id === id);
      if (!trader) return resolve(regionNotFound<TraderProfile>());
      const allocationIds = new Set(state().allocations.filter((allocation) => allocation.traderId === id).map((allocation) => allocation.id));
      const rows = state().transactions.filter((row) => row.allocationId !== null && allocationIds.has(row.allocationId));
      const profile: TraderProfile = {
        ...toTraderView(trader),
        description: trader.description,
        approach: [...trader.approach],
        history: trader.history ? { ...trader.history, points: trader.history.points.map((point) => ({ ...point })) } : null,
        activity: rows.length === 0 ? null : rows.map(toTransactionView),
        executionMode: trader.executionMode,
      };
      return resolve(ready(profile));
    },

    listAllocations: () => {
      const allocations = state().allocations;
      if (allocations.length === 0) return resolve(regionEmpty<AllocationView[]>("You are not copying any trader yet"));
      return resolve(ready(allocations.map((allocation) => toAllocationView(state(), allocation))));
    },

    getAllocation: (id: string) => {
      const allocation = state().allocations.find((candidate) => candidate.id === id);
      return resolve(allocation ? ready(toAllocationDetail(state(), allocation)) : regionNotFound<AllocationDetail>());
    },

    getSignals: () => {
      const feed = state().signals;
      if (feed.entitled && feed.signals.length === 0) return resolve(regionEmpty<SignalsFeed>("No signals have been published yet"));
      return resolve(ready<SignalsFeed>({ ...feed, signals: feed.signals.map((signal) => ({ ...signal })) }));
    },

    listNotifications: (filter: NotificationFilter, page: number) => {
      const all = state().notifications;
      if (all.length === 0) return resolve(regionEmpty<Page<NotificationView>>("No notifications yet"));
      const rows = filter === "unread" ? all.filter((notification) => !notification.read) : all;
      const result = paginate(rows, page, NOTIFICATION_PAGE_SIZE);
      return resolve(ready<Page<NotificationView>>({ ...result, items: result.items.map((notification) => ({ ...notification })) }));
    },

    getUnreadCount: () => Promise.resolve(unreadCount(state())),

    getProfile: () => resolve(ready({ ...state().account.profile, editable: [...state().account.profile.editable] })),

    getSecurity: () => resolve(ready({ ...state().security, mfa: { ...state().security.mfa } })),

    getVerification: () =>
      resolve(
        ready<VerificationView>({
          ...state().verification,
          documentTypes: [...state().verification.documentTypes],
          documents: state().verification.documents.map((document) => ({ ...document })),
          uploadRules: cloneRules(state().verification.uploadRules),
        }),
      ),

    getNeedsAttention: () => {
      const items = attentionItems(state());
      if (items.length === 0) return resolve(regionEmpty<AttentionItem[]>("Nothing needs your attention"));
      return resolve(ready(items));
    },

    listRecentActivity: (limit: number) => {
      if (isReadError()) return resolve(readError<TransactionView[]>());
      const rows = state().transactions;
      if (rows.length === 0) return resolve(regionEmpty<TransactionView[]>("No activity has been recorded for this account"));
      const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 5;
      return resolve(ready(rows.slice(0, safeLimit).map(toTransactionView)));
    },
  };
}

/**
 * Create the in-memory store for a scenario. Unknown ids fall back to the
 * default scenario. Client-safe: no server-only imports, no Prisma, no Node
 * APIs, no system clock.
 */
export function createFixtureStore(scenarioId: ScenarioId): FixtureStore {
  const id: ScenarioId = isScenarioId(scenarioId) ? scenarioId : DEFAULT_SCENARIO_ID;
  const listeners = new Set<() => void>();
  let version = 0;
  const store: FixtureStore = {
    data: undefined as unknown as DashboardData,
    get version() {
      return version;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    scenarioId: id,
    clock: FIXTURE_CLOCK,
    state: buildFixtureState(id),
    commit(mutate) {
      const result = mutate(store.state);
      version += 1;
      for (const listener of [...listeners]) listener();
      return result;
    },
  };
  store.data = createData(store);
  return store;
}

/** A timestamp `minutes` after the fixture clock; used by actions for expiries. */
export function clockPlusMinutes(minutes: number): string {
  return atMinutes(minutes);
}
