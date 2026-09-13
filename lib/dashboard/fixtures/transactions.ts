/**
 * Deterministic ledger fixtures.
 *
 * Rows are expanded from a fixed seed table (no `Math.random`, no
 * `Date.now`): every id, amount, timestamp and hash is derived from the
 * table and the fixture clock. The funded scenario has 35 rows so pagination
 * is real. Deposits and withdrawals are cash flows; recorded outcomes are the
 * only rows that count as profit or loss.
 */

import {
  CURRENCY_META,
  type Direction,
  type LedgerCurrency,
  type NetworkRef,
  type RequestStatus,
  type SettlementState,
  type TimelineEntry,
  type TransactionDetail,
  type TransactionType,
} from "../contracts";
import { maskDestination, statusPresentation } from "../format";
import { toFixed } from "../money";
import { explorerUrlFor } from "../adapters/explorers";
import { FIXTURE_NETWORKS, LONG_ADDRESS } from "./accounts";
import { atDay } from "./clock";
import type { ScenarioId } from "./scenarios";

/** A ledger row as stored in the fixture state (detail shape plus the allocation it belongs to). */
export interface FixtureTransaction extends TransactionDetail {
  /** Allocation this outcome or fee belongs to, when any. */
  allocationId: string | null;
}

/** One entry of the seed table. Amounts are magnitudes; `direction` carries the sign. */
export interface SeedRow {
  id: string;
  reference: string;
  type: TransactionType;
  currency: LedgerCurrency;
  networkId?: string;
  amount: string;
  direction: Direction;
  fee?: string;
  status: RequestStatus;
  settlement: SettlementState;
  /** Day offset from the clock (negative = past) and hour of creation. */
  day: number;
  hour?: number;
  /** Day/hour of the last update when it differs from creation. */
  updatedDay?: number;
  updatedHour?: number;
  sourceLabel: string;
  destination?: string;
  tag?: string;
  withHash?: boolean;
  notes?: string;
  reason?: string;
  nextStep?: string;
  allocationId?: string;
  cancellable?: boolean;
}

/** Deterministic pseudo-hash from a seed string (fixture only; not a real transaction hash). */
export function fixtureHash(seed: string, prefix = ""): string {
  let state = 0x9e3779b9;
  for (let i = 0; i < seed.length; i += 1) {
    state = Math.imul(state ^ seed.charCodeAt(i), 0x01000193) >>> 0 || 1;
  }
  let out = "";
  while (out.length < 64) {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    out += state.toString(16).padStart(8, "0");
  }
  return `${prefix}${out.slice(0, 64)}`;
}

/** Fixture destinations (not real addresses). */
export const FIXTURE_DESTINATIONS = {
  eth: "0x9a2fD4e6C1b7A3f0E8d5C2b9A6f4E1d7C3b8A5f2",
  tron: "TFixtureQk3m9Zp4Lw7Hs2Vd8Rb6Nx1Cy5Ta0Gf",
  btc: "bc1qfixture0cancelled0request0destination0000demo",
};

function outcome(seq: number, day: number, amount: string, trader: string, allocationId: string): SeedRow {
  const credit = !amount.startsWith("-");
  return {
    id: `tx-pnl-${String(seq).padStart(4, "0")}`,
    reference: `PNL-2026-${String(seq).padStart(4, "0")}`,
    type: "PROFIT_ACCRUAL",
    currency: "USD",
    amount: credit ? amount : amount.slice(1),
    direction: credit ? "credit" : "debit",
    fee: "0.00",
    status: "APPROVED",
    settlement: "not-applicable",
    day,
    hour: 16,
    sourceLabel: `Recorded copy-trade outcome, ${trader}`,
    allocationId,
  };
}

function copyFee(seq: number, day: number, amount: string, trader: string, allocationId: string): SeedRow {
  return {
    id: `tx-fee-${String(seq).padStart(4, "0")}`,
    reference: `FEE-2026-${String(seq).padStart(4, "0")}`,
    type: "COPY_FEE",
    currency: "USD",
    amount,
    direction: "debit",
    fee: "0.00",
    status: "APPROVED",
    settlement: "not-applicable",
    day,
    hour: 17,
    sourceLabel: `Copy fee, ${trader} (share of recorded outcome)`,
    allocationId,
  };
}

function deposit(
  seq: number,
  day: number,
  currency: LedgerCurrency,
  networkId: string,
  amount: string,
  settlement: SettlementState,
): SeedRow {
  return {
    id: `tx-dep-${String(seq).padStart(4, "0")}`,
    reference: `DEP-2026-${String(seq).padStart(4, "0")}`,
    type: "DEPOSIT",
    currency,
    networkId,
    amount,
    direction: "credit",
    fee: toFixed("0", CURRENCY_META[currency].precision),
    status: "APPROVED",
    settlement,
    day,
    hour: 10,
    updatedDay: day,
    updatedHour: 14,
    sourceLabel: "Deposit",
    withHash: true,
  };
}

/** The Alex Morgan (alloc-0001) outcomes inside the 30-day window; they sum to +120.00 USD in `funded`. */
function alexRows(losing: boolean): SeedRow[] {
  const trader = "Alex Morgan";
  const alloc = "alloc-0001";
  if (losing) {
    return [
      outcome(1, -25, "30.00", trader, alloc),
      copyFee(1, -25, "4.50", trader, alloc),
      outcome(2, -18, "-45.00", trader, alloc),
      outcome(3, -11, "10.00", trader, alloc),
      copyFee(2, -11, "1.50", trader, alloc),
      outcome(4, -4, "-40.00", trader, alloc),
    ];
  }
  return [
    outcome(1, -25, "30.00", trader, alloc),
    copyFee(1, -25, "4.50", trader, alloc),
    outcome(2, -18, "40.00", trader, alloc),
    copyFee(2, -18, "6.00", trader, alloc),
    outcome(3, -11, "20.00", trader, alloc),
    copyFee(3, -11, "3.00", trader, alloc),
    outcome(4, -4, "30.00", trader, alloc),
    copyFee(4, -4, "4.50", trader, alloc),
  ];
}

const PENDING_NEXT_STEP = "Awaiting operator review. You can cancel the request while it is pending.";

/** Seed table for the ledger (35 rows in `funded`) with scenario variations. */
export function seedRows(scenarioId: ScenarioId): SeedRow[] {
  if (scenarioId === "empty") return [];
  const longValues = scenarioId === "long-values";
  const rows: SeedRow[] = [
    deposit(1, -90, "BTC", "bitcoin", "0.05000000", "confirmed"),
    deposit(2, -90, "ETH", "ethereum", "1.00000000", "confirmed"),
    deposit(3, -90, "USDT", "tron", "500.000000", "confirmed"),
    deposit(4, -75, "USDT", "tron", "500.000000", "confirmed"),
    deposit(5, -60, "BTC", "bitcoin", "0.05000000", "confirmed"),
    deposit(6, -45, "ETH", "ethereum", "1.00000000", "confirmed"),
    deposit(7, -30, "USDT", "ethereum", "250.000000", "unconfirmed"),
    {
      id: "tx-wdr-0001",
      reference: "WDR-2026-0003",
      type: "WITHDRAWAL",
      currency: longValues ? "BTC" : "ETH",
      networkId: longValues ? "bitcoin" : "ethereum",
      amount: "0.50000000",
      direction: "debit",
      fee: "0.00020000",
      status: "PENDING",
      settlement: "not-applicable",
      day: -2,
      hour: 9,
      sourceLabel: "Withdrawal request",
      destination: longValues ? LONG_ADDRESS : FIXTURE_DESTINATIONS.eth,
      nextStep: PENDING_NEXT_STEP,
      cancellable: true,
    },
    {
      id: "tx-wdr-0002",
      reference: "WDR-2026-0002",
      type: "WITHDRAWAL",
      currency: "USDT",
      networkId: "tron",
      amount: "100.000000",
      direction: "debit",
      fee: "1.000000",
      status: "REJECTED",
      settlement: "not-applicable",
      day: -20,
      hour: 11,
      updatedDay: -19,
      updatedHour: 15,
      sourceLabel: "Withdrawal request",
      destination: FIXTURE_DESTINATIONS.tron,
      reason: "Destination address failed compliance review",
      nextStep: "Check the destination address and submit a new request, or contact support.",
    },
    {
      id: "tx-wdr-0003",
      reference: "WDR-2026-0001",
      type: "WITHDRAWAL",
      currency: "BTC",
      networkId: "bitcoin",
      amount: "0.01000000",
      direction: "debit",
      fee: "0.00010000",
      status: "CANCELLED",
      settlement: "not-applicable",
      day: -35,
      hour: 8,
      updatedDay: -35,
      updatedHour: 9,
      sourceLabel: "Withdrawal request",
      destination: FIXTURE_DESTINATIONS.btc,
    },
    {
      id: "tx-bonus-0001",
      reference: "BON-2026-0001",
      type: "BONUS",
      currency: "USD",
      amount: "10.00",
      direction: "credit",
      fee: "0.00",
      status: "APPROVED",
      settlement: "not-applicable",
      day: -70,
      hour: 13,
      sourceLabel: "Welcome credit (operator)",
    },
    {
      id: "tx-adj-0001",
      reference: "ADJ-2026-0001",
      type: "ADJUSTMENT",
      currency: "USD",
      amount: "5.00",
      direction: "credit",
      fee: "0.00",
      status: "APPROVED",
      settlement: "not-applicable",
      day: -15,
      hour: 17,
      sourceLabel: "Manual adjustment by operator",
      notes: "Fee correction applied by the operations desk.",
    },
    ...alexRows(scenarioId === "losing-outcome"),
    // Daniel Okafor (alloc-0003, stopped on day -50); outcomes net to -12.00 USD.
    outcome(5, -84, "8.00", "Daniel Okafor", "alloc-0003"),
    copyFee(5, -84, "1.20", "Daniel Okafor", "alloc-0003"),
    outcome(6, -77, "6.00", "Daniel Okafor", "alloc-0003"),
    copyFee(6, -77, "0.90", "Daniel Okafor", "alloc-0003"),
    outcome(7, -70, "-4.00", "Daniel Okafor", "alloc-0003"),
    outcome(8, -63, "2.00", "Daniel Okafor", "alloc-0003"),
    copyFee(7, -63, "0.30", "Daniel Okafor", "alloc-0003"),
    outcome(9, -56, "-10.00", "Daniel Okafor", "alloc-0003"),
    outcome(10, -50, "-14.00", "Daniel Okafor", "alloc-0003"),
    // Maya Chen (alloc-0002, paused on day -10); outcomes net to +18.00 USD.
    outcome(11, -48, "10.00", "Maya Chen", "alloc-0002"),
    copyFee(8, -48, "1.50", "Maya Chen", "alloc-0002"),
    outcome(12, -41, "8.00", "Maya Chen", "alloc-0002"),
    copyFee(9, -41, "1.20", "Maya Chen", "alloc-0002"),
    // Elena Rossi (alloc-0004, stop pending); one outcome outside the 30-day window.
    outcome(13, -33, "5.00", "Elena Rossi", "alloc-0004"),
    copyFee(10, -33, "0.75", "Elena Rossi", "alloc-0004"),
  ];
  if (scenarioId === "pending-withdrawal") {
    rows.push({
      id: "tx-wdr-0004",
      reference: "WDR-2026-0004",
      type: "WITHDRAWAL",
      currency: "USDT",
      networkId: "ethereum",
      amount: "150.000000",
      direction: "debit",
      fee: "5.000000",
      status: "PENDING",
      settlement: "not-applicable",
      day: -1,
      hour: 18,
      sourceLabel: "Withdrawal request",
      destination: FIXTURE_DESTINATIONS.eth,
      nextStep: PENDING_NEXT_STEP,
      cancellable: true,
    });
  }
  return rows;
}

function networkFor(currency: LedgerCurrency, networkId: string | undefined): NetworkRef | null {
  if (!networkId || currency === "USD") return null;
  return FIXTURE_NETWORKS[currency].find((network) => network.id === networkId) ?? null;
}

function timelineFor(row: SeedRow, createdAt: string, updatedAt: string): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    { at: createdAt, label: row.type === "WITHDRAWAL" ? "Request submitted" : "Recorded" },
  ];
  if (row.type === "WITHDRAWAL" || row.type === "DEPOSIT") {
    if (row.status === "PENDING") entries.push({ at: createdAt, label: "Pending review" });
    if (row.status === "APPROVED") entries.push({ at: updatedAt, label: "Approved by operator" });
    if (row.status === "REJECTED") entries.push({ at: updatedAt, label: "Declined" });
    if (row.status === "CANCELLED") entries.push({ at: updatedAt, label: "Cancelled by you" });
    if (row.settlement === "confirmed") entries.push({ at: updatedAt, label: "Settlement confirmed on network" });
  }
  return entries;
}

/** Expand one seed row into a full ledger record. */
export function expandRow(row: SeedRow): FixtureTransaction {
  const hour = row.hour ?? 12;
  const createdAt = atDay(row.day, hour);
  const updatedAt =
    row.updatedDay !== undefined || row.updatedHour !== undefined
      ? atDay(row.updatedDay ?? row.day, row.updatedHour ?? hour)
      : createdAt;
  const network = networkFor(row.currency, row.networkId);
  const txHash = row.withHash ? fixtureHash(row.id, network?.id === "ethereum" ? "0x" : "") : null;
  const precision = CURRENCY_META[row.currency].precision;
  return {
    id: row.id,
    reference: row.reference,
    type: row.type,
    sourceLabel: row.sourceLabel,
    currency: row.currency,
    network,
    amount: toFixed(row.amount, precision, "exact"),
    direction: row.direction,
    fee: row.fee === undefined ? null : toFixed(row.fee, precision, "exact"),
    status: row.status,
    settlement: row.settlement,
    createdAt,
    updatedAt,
    destinationMasked: maskDestination(row.destination),
    txHash,
    explorerUrl: explorerUrlFor(network?.id, txHash),
    permittedActions: row.cancellable && row.status === "PENDING" ? ["cancel"] : [],
    destinationFull: row.destination ?? null,
    tag: row.tag ?? null,
    notes: row.notes ?? null,
    reason: row.reason ?? null,
    nextStep: row.nextStep ?? null,
    timeline: timelineFor(row, createdAt, updatedAt),
    allocationId: row.allocationId ?? null,
  };
}

/** Newest first, ties broken by id so ordering is stable. */
export function sortNewestFirst<T extends { createdAt: string; id: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.id.localeCompare(b.id));
}

/** Every ledger row for a scenario, newest first. */
export function buildTransactions(scenarioId: ScenarioId): FixtureTransaction[] {
  return sortNewestFirst(seedRows(scenarioId).map(expandRow));
}

/** Customer label for a request status (fixture timelines and notifications). */
export function requestStatusLabel(status: RequestStatus): string {
  return statusPresentation(status, "request").label;
}
