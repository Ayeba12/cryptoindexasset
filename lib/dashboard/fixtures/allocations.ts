/**
 * Copy-trade allocation fixtures.
 *
 * Four allocations: active (profitable), paused, stopped (loss) and one with
 * a pending stop. Recorded P/L and fees are derived by the store from the
 * ledger rows that carry the allocation id, so the numbers match the
 * activity table exactly.
 */

import type { AllocationAction, AllocationDetail, AllocationStatus, ExecutionMode, LedgerCurrency } from "../contracts";
import { atDay } from "./clock";
import type { ScenarioId } from "./scenarios";
import { executionModeFor, traderId } from "./traders";

interface AllocationSeed {
  id: string;
  traderSlug: string;
  traderName: string;
  amount: string;
  currency: LedgerCurrency;
  status: AllocationStatus;
  createdDay: number;
  updatedDay: number;
  pendingStopSinceDay?: number;
  timeline: Array<{ day: number; hour?: number; label: string }>;
}

const SEEDS: AllocationSeed[] = [
  {
    id: "alloc-0001",
    traderSlug: "alex-morgan",
    traderName: "Alex Morgan",
    amount: "250.000000",
    currency: "USDT",
    status: "ACTIVE",
    createdDay: -40,
    updatedDay: -4,
    timeline: [
      { day: -40, label: "Copy request submitted" },
      { day: -40, hour: 15, label: "Allocation activated by operator" },
      { day: -4, hour: 16, label: "Recorded outcome posted" },
    ],
  },
  {
    id: "alloc-0002",
    traderSlug: "maya-chen",
    traderName: "Maya Chen",
    amount: "0.02000000",
    currency: "BTC",
    status: "PAUSED",
    createdDay: -55,
    updatedDay: -10,
    timeline: [
      { day: -55, label: "Copy request submitted" },
      { day: -55, hour: 16, label: "Allocation activated by operator" },
      { day: -10, label: "Paused by you" },
    ],
  },
  {
    id: "alloc-0003",
    traderSlug: "daniel-okafor",
    traderName: "Daniel Okafor",
    amount: "200.000000",
    currency: "USDT",
    status: "STOPPED",
    createdDay: -88,
    updatedDay: -50,
    timeline: [
      { day: -88, label: "Copy request submitted" },
      { day: -88, hour: 14, label: "Allocation activated by operator" },
      { day: -51, label: "Stop requested by you" },
      { day: -50, hour: 18, label: "Stop confirmed; allocated units released" },
    ],
  },
  {
    id: "alloc-0004",
    traderSlug: "elena-rossi",
    traderName: "Elena Rossi",
    amount: "0.50000000",
    currency: "ETH",
    status: "STOPPING",
    createdDay: -38,
    updatedDay: -1,
    pendingStopSinceDay: -1,
    timeline: [
      { day: -38, label: "Copy request submitted" },
      { day: -38, hour: 13, label: "Allocation activated by operator" },
      { day: -1, label: "Stop requested by you; awaiting operator confirmation" },
    ],
  },
];

/** Stop explanation for the execution mode of a scenario. */
export function stopExplanationFor(mode: ExecutionMode): string {
  if (mode === "unavailable") {
    return "Stopping is not connected in this environment. Contact support to change an allocation.";
  }
  return "Stop ends new copying for this allocation. The operator closes any open position at the next review and releases the allocated units to Available once the stop is confirmed.";
}

/** Actions permitted for a status under an execution mode. Never inferred from a badge in the UI. */
export function permittedActionsFor(status: AllocationStatus, mode: ExecutionMode): AllocationAction[] {
  if (mode === "unavailable") return [];
  if (status === "ACTIVE") return ["pause", "stop"];
  if (status === "PAUSED") return ["resume", "stop"];
  return [];
}

/** Allocation details without ledger-derived figures (the store adds P/L, fees and activity). */
export function buildAllocations(scenarioId: ScenarioId): AllocationDetail[] {
  if (scenarioId === "empty") return [];
  const mode = executionModeFor(scenarioId);
  return SEEDS.map((seed) => ({
    id: seed.id,
    traderId: traderId(seed.traderSlug),
    traderName: seed.traderName,
    traderPortrait: `/images/community/${seed.traderSlug}.webp`,
    allocated: { amount: seed.amount, currency: seed.currency },
    status: seed.status,
    executionMode: mode,
    recordedPnl: null,
    createdAt: atDay(seed.createdDay, 11),
    updatedAt: atDay(seed.updatedDay, 11),
    permittedActions: permittedActionsFor(seed.status, mode),
    timeline: seed.timeline.map((entry) => ({ at: atDay(entry.day, entry.hour ?? 11), label: entry.label })),
    fees: [],
    activity: [],
    stopExplanation: stopExplanationFor(mode),
    pendingOperation:
      seed.pendingStopSinceDay === undefined ? null : { kind: "stop", since: atDay(seed.pendingStopSinceDay, 11) },
  }));
}
