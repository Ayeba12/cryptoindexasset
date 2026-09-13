"use server";

import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { add, subtract, compare, toFixed, isDecimalString } from "@/lib/dashboard/money";
import { decimalToString } from "@/lib/dashboard/adapters/mappers";

/* -------------------------------------------------------------------------- */
/* Types & Telemetry Interfaces                                               */
/* -------------------------------------------------------------------------- */

export type DiscrepancySeverity = "CRITICAL" | "WARNING";

export interface LedgerDiscrepancy {
  walletId: string;
  userId: string;
  userEmail: string;
  currency: string;
  actualBalance: string;
  expectedBalance: string;
  actualReserved: string;
  expectedReserved: string;
  balanceDiff: string;
  reservedDiff: string;
  severity: DiscrepancySeverity;
  reason: string;
  detectedAt: string;
}

export interface ReconciliationReport {
  reconciledAt: string;
  walletsAudited: number;
  usersAudited: number;
  cleanWallets: number;
  discrepanciesCount: number;
  criticalCount: number;
  warningCount: number;
  discrepancies: LedgerDiscrepancy[];
  backfilledEntriesCount: number;
  circuitBreakerTripped: boolean;
  status: "CLEAN" | "DISCREPANCY_DETECTED" | "CORRECTED";
  executionTimeMs: number;
}

export interface ReconciliationTelemetry {
  lastReconciledAt: string | null;
  status: "HEALTHY" | "DEGRADED" | "UNINITIALIZED";
  mismatchCount: number;
  walletsAudited: number;
  activeHoldsCount: number;
  circuitBreakerActive: boolean;
  lastReportSummary?: {
    cleanWallets: number;
    discrepanciesCount: number;
    backfilledEntriesCount: number;
  };
}

/* -------------------------------------------------------------------------- */
/* Decimal Helper                                                             */
/* -------------------------------------------------------------------------- */

function toDecString(value: any, precision: number = 8): string {
  if (value === null || value === undefined) return toFixed("0", precision);
  const result = decimalToString(value, precision);
  return result ?? toFixed("0", precision);
}

/* -------------------------------------------------------------------------- */
/* In-memory Telemetry State (Persisted across warm serverless invocations)  */
/* -------------------------------------------------------------------------- */

let cachedTelemetry: ReconciliationTelemetry = {
  lastReconciledAt: null,
  status: "UNINITIALIZED",
  mismatchCount: 0,
  walletsAudited: 0,
  activeHoldsCount: 0,
  circuitBreakerActive: false,
};

export async function getReconciliationTelemetry(): Promise<ReconciliationTelemetry> {
  return cachedTelemetry;
}

/* -------------------------------------------------------------------------- */
/* Core Reconciliation Engine                                                 */
/* -------------------------------------------------------------------------- */

export interface ReconciliationOptions {
  dryRun?: boolean;
  autoBackfillOpening?: boolean;
  targetUserId?: string;
  targetWalletId?: string;
}

/**
 * Executes a full cryptographic audit of all wallets against double-entry ledger entries,
 * pending withdrawal holds, and active copy-trading allocations.
 */
export async function reconcileFinancialLedger(
  options: ReconciliationOptions = {}
): Promise<ReconciliationReport> {
  const startTime = Date.now();
  const reconciledAt = new Date().toISOString();
  const { dryRun = false, autoBackfillOpening = false, targetUserId, targetWalletId } = options;

  const discrepancies: LedgerDiscrepancy[] = [];
  let backfilledCount = 0;

  // 1. Fetch wallets to audit
  const walletWhere: Prisma.WalletWhereInput = {};
  if (targetWalletId) walletWhere.id = targetWalletId;
  if (targetUserId) walletWhere.userId = targetUserId;

  const wallets = await prisma.wallet.findMany({
    where: walletWhere,
    include: {
      user: {
        select: { id: true, email: true, status: true },
      },
      ledgerEntries: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // 2. Fetch all active holds in batch for performance
  // a. Pending withdrawals (status = PENDING)
  const pendingWithdrawals = await prisma.transaction.findMany({
    where: {
      type: "WITHDRAWAL",
      status: "PENDING",
      ...(targetUserId ? { userId: targetUserId } : {}),
    },
    select: {
      userId: true,
      currency: true,
      amount: true,
      fee: true,
    },
  });

  // b. Active / Paused copy trading allocations
  const activeAllocations = await prisma.userCopyTrade.findMany({
    where: {
      status: { in: ["ACTIVE", "PAUSED"] },
      ...(targetUserId ? { userId: targetUserId } : {}),
    },
    select: {
      userId: true,
      allocatedUsd: true,
    },
  });

  // Build lookup maps for expected holds
  // Map: `${userId}:${currency}` -> sum of (amount + fee)
  const pendingWithdrawalMap = new Map<string, string>();
  for (const tx of pendingWithdrawals) {
    const key = `${tx.userId}:${tx.currency.toUpperCase()}`;
    const txTotal = add(toDecString(tx.amount, 8), toDecString(tx.fee, 8));
    const current = pendingWithdrawalMap.get(key) || "0.00000000";
    pendingWithdrawalMap.set(key, add(current, txTotal));
  }

  // Map: userId -> sum of allocatedUsd (holds against USDT/USD)
  const copyTradeHoldMap = new Map<string, string>();
  for (const alloc of activeAllocations) {
    const current = copyTradeHoldMap.get(alloc.userId) || "0.00";
    copyTradeHoldMap.set(alloc.userId, add(current, toDecString(alloc.allocatedUsd, 2)));
  }

  // 3. Audit each wallet against invariants
  for (const wallet of wallets) {
    const actualBal = toDecString(wallet.balance, 8);
    const actualRes = toDecString(wallet.reserved, 8);
    const currency = wallet.currency.toUpperCase();
    const userKey = `${wallet.userId}:${currency}`;

    // Invariant 1: Calculate expected balance from ledger entries
    // Total Credits - Total Debits
    let ledgerCredits = "0.00000000";
    let ledgerDebits = "0.00000000";
    let hasOpeningEntry = false;

    for (const entry of wallet.ledgerEntries) {
      const entryAmt = toDecString(entry.amount, 8);
      if (entry.type === "CREDIT") {
        ledgerCredits = add(ledgerCredits, entryAmt);
        if (entry.description?.includes("OPENING_BALANCE")) {
          hasOpeningEntry = true;
        }
      } else if (entry.type === "DEBIT") {
        ledgerDebits = add(ledgerDebits, entryAmt);
      }
    }

    const expectedBalFromLedger = subtract(ledgerCredits, ledgerDebits);
    const isLedgerEmpty = wallet.ledgerEntries.length === 0;

    // Check if backfill is eligible (wallet has balance > 0, but no ledger entries or missing opening line)
    if (
      autoBackfillOpening &&
      !dryRun &&
      compare(actualBal, "0") > 0 &&
      (!hasOpeningEntry || isLedgerEmpty)
    ) {
      const balanceToBackfill = isLedgerEmpty
        ? actualBal
        : subtract(actualBal, expectedBalFromLedger);

      if (compare(balanceToBackfill, "0") > 0) {
        await prisma.ledgerEntry.create({
          data: {
            walletId: wallet.id,
            userId: wallet.userId,
            type: "CREDIT",
            amount: new Prisma.Decimal(balanceToBackfill),
            balanceBefore: new Prisma.Decimal("0.00000000"),
            balanceAfter: new Prisma.Decimal(actualBal),
            reservedBefore: new Prisma.Decimal("0.00000000"),
            reservedAfter: new Prisma.Decimal(actualRes),
            currency: wallet.currency,
            description: "RECONCILED_OPENING_BALANCE: Audited Stage 8 legacy migration baseline",
            actor: "system:reconciliation",
          },
        });
        backfilledCount++;
        // Recalculate ledgerCredits
        ledgerCredits = add(ledgerCredits, balanceToBackfill);
      }
    }

    const finalExpectedBal = subtract(ledgerCredits, ledgerDebits);
    const balDiff = subtract(actualBal, finalExpectedBal);
    const hasBalanceMismatch = compare(balDiff, "0") !== 0;

    // Invariant 2: Calculate expected reserved amount
    // Pending withdrawals for this asset
    const pendingWithd = pendingWithdrawalMap.get(userKey) || "0.00000000";
    // Copy trades reserve against USDT (or USD)
    let copyHold = "0.00000000";
    if (currency === "USDT" || currency === "USD") {
      copyHold = copyTradeHoldMap.get(wallet.userId) || "0.00000000";
    }
    const expectedRes = add(pendingWithd, copyHold);
    const resDiff = subtract(actualRes, expectedRes);
    const hasReservedMismatch = compare(resDiff, "0") !== 0;

    // Invariant 3: Negative balance check
    const isNegativeBal = compare(actualBal, "0") < 0;
    const isNegativeRes = compare(actualRes, "0") < 0;
    const isOverReserved = compare(actualRes, actualBal) > 0;

    // Collect discrepancies
    if (hasBalanceMismatch || hasReservedMismatch || isNegativeBal || isNegativeRes || isOverReserved) {
      const reasons: string[] = [];
      if (hasBalanceMismatch) {
        reasons.push(
          `Balance mismatch: wallet has ${actualBal}, ledger sums to ${finalExpectedBal} (diff: ${balDiff})`
        );
      }
      if (hasReservedMismatch) {
        reasons.push(
          `Reserved mismatch: wallet reserved is ${actualRes}, expected ${expectedRes} (pending withdrawals: ${pendingWithd}, copy allocations: ${copyHold})`
        );
      }
      if (isNegativeBal) reasons.push(`Negative balance detected: ${actualBal}`);
      if (isNegativeRes) reasons.push(`Negative reserved balance detected: ${actualRes}`);
      if (isOverReserved) reasons.push(`Over-reserved: reserved (${actualRes}) exceeds balance (${actualBal})`);

      const severity: DiscrepancySeverity =
        hasBalanceMismatch || isNegativeBal || isOverReserved ? "CRITICAL" : "WARNING";

      discrepancies.push({
        walletId: wallet.id,
        userId: wallet.userId,
        userEmail: wallet.user.email,
        currency: wallet.currency,
        actualBalance: actualBal,
        expectedBalance: finalExpectedBal,
        actualReserved: actualRes,
        expectedReserved: expectedRes,
        balanceDiff: balDiff,
        reservedDiff: resDiff,
        severity,
        reason: reasons.join("; "),
        detectedAt: reconciledAt,
      });
    }
  }

  const criticalCount = discrepancies.filter((d) => d.severity === "CRITICAL").length;
  const warningCount = discrepancies.filter((d) => d.severity === "WARNING").length;
  const circuitBreakerTripped = criticalCount > 0;

  // 4. Circuit Breaker & Audit Alert Logging
  if (discrepancies.length > 0 && !dryRun) {
    for (const d of discrepancies) {
      await prisma.auditLog.create({
        data: {
          actor: "system:reconciliation",
          action: d.severity === "CRITICAL" ? "CIRCUIT_BREAKER_ALERT" : "RECONCILIATION_WARNING",
          target: d.walletId,
          reason: d.reason,
          before: {
            actualBalance: d.actualBalance,
            actualReserved: d.actualReserved,
          },
          after: {
            expectedBalance: d.expectedBalance,
            expectedReserved: d.expectedReserved,
            discrepancyDiff: d.balanceDiff,
          },
        },
      });
    }
  }

  const duration = Date.now() - startTime;
  const status =
    discrepancies.length === 0
      ? "CLEAN"
      : backfilledCount > 0 && discrepancies.length === 0
      ? "CORRECTED"
      : "DISCREPANCY_DETECTED";

  // 5. Update cached telemetry
  cachedTelemetry = {
    lastReconciledAt: reconciledAt,
    status: discrepancies.length === 0 ? "HEALTHY" : "DEGRADED",
    mismatchCount: discrepancies.length,
    walletsAudited: wallets.length,
    activeHoldsCount: pendingWithdrawals.length + activeAllocations.length,
    circuitBreakerActive: circuitBreakerTripped,
    lastReportSummary: {
      cleanWallets: wallets.length - discrepancies.length,
      discrepanciesCount: discrepancies.length,
      backfilledEntriesCount: backfilledCount,
    },
  };

  return {
    reconciledAt,
    walletsAudited: wallets.length,
    usersAudited: new Set(wallets.map((w) => w.userId)).size,
    cleanWallets: wallets.length - discrepancies.length,
    discrepanciesCount: discrepancies.length,
    criticalCount,
    warningCount,
    discrepancies,
    backfilledEntriesCount: backfilledCount,
    circuitBreakerTripped,
    status,
    executionTimeMs: duration,
  };
}

/**
 * Server action to trigger financial reconciliation from admin views.
 */
export async function triggerReconciliationAction(
  options: { autoBackfillOpening?: boolean; dryRun?: boolean } = {}
): Promise<{ success: boolean; report?: ReconciliationReport; error?: string }> {
  try {
    const { requireAdmin } = await import("./access.server");
    await requireAdmin();

    const report = await reconcileFinancialLedger({
      dryRun: options.dryRun ?? false,
      autoBackfillOpening: options.autoBackfillOpening ?? false,
    });

    return { success: true, report };
  } catch (err: any) {
    console.error("[reconciliation] Action failed:", err);
    return { success: false, error: err?.message || "Failed to execute financial reconciliation" };
  }
}

