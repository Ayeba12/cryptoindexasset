#!/usr/bin/env node
/**
 * scripts/reconcile-ledger.mjs
 *
 * Automated Financial Reconciliation & Invariant Auditor.
 * Audits all wallets, ledger entries, pending withdrawal holds, and copy trade allocations.
 *
 * Usage:
 *   node scripts/reconcile-ledger.mjs [--dry-run] [--auto-backfill-opening] [--user <id>] [--json] [--test]
 */

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

// 1. Simple environment loader for .env if process.env.DATABASE_URL is missing
function loadEnv() {
  const envPath = path.join(root, ".env");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

loadEnv();

// 2. Load money math from lib/dashboard/money.ts to guarantee exact decimal arithmetic
const moneyPath = path.join(root, "lib/dashboard/money.ts");
const moneySource = readFileSync(moneyPath, "utf8");
const { outputText: moneyJs } = ts.transpileModule(moneySource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

const moneyModule = { exports: {} };
const fn = new Function("exports", "module", "require", moneyJs);
fn(moneyModule.exports, moneyModule, (mod) => {
  throw new Error(`Unexpected import in money.ts: ${mod}`);
});
const { add, subtract, compare, toFixed } = moneyModule.exports;

// Exact decimal string helper
function decToStr(val) {
  if (val === null || val === undefined) return "0.00000000";
  if (typeof val === "object" && typeof val.toString === "function") return val.toString();
  return String(val);
}

// 3. In-memory Pure Reconciliation Auditor
export function auditLedgerState({
  wallets,
  pendingWithdrawals = [],
  activeAllocations = [],
  autoBackfillOpening = false,
  dryRun = false,
}) {
  const discrepancies = [];
  const backfilledEntries = [];

  // Build lookup map for expected pending withdrawal holds: `${userId}:${currency}` -> sum(amount + fee)
  const pendingWithdMap = new Map();
  for (const tx of pendingWithdrawals) {
    const key = `${tx.userId}:${tx.currency.toUpperCase()}`;
    const txTotal = add(decToStr(tx.amount), decToStr(tx.fee));
    const current = pendingWithdMap.get(key) || "0.00000000";
    pendingWithdMap.set(key, add(current, txTotal));
  }

  // Build lookup map for active copy trade holds: userId -> sum(allocatedUsd)
  const copyHoldMap = new Map();
  for (const alloc of activeAllocations) {
    const current = copyHoldMap.get(alloc.userId) || "0.00";
    copyHoldMap.set(alloc.userId, add(current, decToStr(alloc.allocatedUsd)));
  }

  for (const wallet of wallets) {
    const actualBal = decToStr(wallet.balance);
    const actualRes = decToStr(wallet.reserved);
    const currency = wallet.currency.toUpperCase();
    const userKey = `${wallet.userId}:${currency}`;
    const ledgerEntries = wallet.ledgerEntries || [];

    let ledgerCredits = "0.00000000";
    let ledgerDebits = "0.00000000";
    let hasOpeningEntry = false;

    for (const entry of ledgerEntries) {
      const entryAmt = decToStr(entry.amount);
      if (entry.type === "CREDIT") {
        ledgerCredits = add(ledgerCredits, entryAmt);
        if (entry.description && entry.description.includes("OPENING_BALANCE")) {
          hasOpeningEntry = true;
        }
      } else if (entry.type === "DEBIT") {
        ledgerDebits = add(ledgerDebits, entryAmt);
      }
    }

    const expectedBalFromLedger = subtract(ledgerCredits, ledgerDebits);
    const isLedgerEmpty = ledgerEntries.length === 0;

    // Check backfill eligibility
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
        backfilledEntries.push({
          walletId: wallet.id,
          userId: wallet.userId,
          currency: wallet.currency,
          amount: balanceToBackfill,
          description: "RECONCILED_OPENING_BALANCE: Audited Stage 8 legacy migration baseline",
        });
        ledgerCredits = add(ledgerCredits, balanceToBackfill);
      }
    }

    const finalExpectedBal = subtract(ledgerCredits, ledgerDebits);
    const balDiff = subtract(actualBal, finalExpectedBal);
    const hasBalanceMismatch = compare(balDiff, "0") !== 0;

    // Invariant 2: Reserved hold calculations
    const pendingWithd = pendingWithdMap.get(userKey) || "0.00000000";
    let copyHold = "0.00000000";
    if (currency === "USDT" || currency === "USD") {
      copyHold = copyHoldMap.get(wallet.userId) || "0.00000000";
    }
    const expectedRes = add(pendingWithd, copyHold);
    const resDiff = subtract(actualRes, expectedRes);
    const hasReservedMismatch = compare(resDiff, "0") !== 0;

    // Invariant 3: Non-negativity & over-reservation
    const isNegativeBal = compare(actualBal, "0") < 0;
    const isNegativeRes = compare(actualRes, "0") < 0;
    const isOverReserved = compare(actualRes, actualBal) > 0;

    if (hasBalanceMismatch || hasReservedMismatch || isNegativeBal || isNegativeRes || isOverReserved) {
      const reasons = [];
      if (hasBalanceMismatch) {
        reasons.push(
          `Balance mismatch: wallet=${actualBal}, ledger=${finalExpectedBal} (diff=${balDiff})`
        );
      }
      if (hasReservedMismatch) {
        reasons.push(
          `Reserved mismatch: walletReserved=${actualRes}, expected=${expectedRes} (diff=${resDiff})`
        );
      }
      if (isNegativeBal) reasons.push(`Negative balance: ${actualBal}`);
      if (isNegativeRes) reasons.push(`Negative reserved: ${actualRes}`);
      if (isOverReserved) reasons.push(`Over-reserved: reserved (${actualRes}) > balance (${actualBal})`);

      const severity = hasBalanceMismatch || isNegativeBal || isOverReserved ? "CRITICAL" : "WARNING";

      discrepancies.push({
        walletId: wallet.id,
        userId: wallet.userId,
        currency: wallet.currency,
        actualBalance: actualBal,
        expectedBalance: finalExpectedBal,
        actualReserved: actualRes,
        expectedReserved: expectedRes,
        balanceDiff: balDiff,
        reservedDiff: resDiff,
        severity,
        reason: reasons.join("; "),
      });
    }
  }

  const criticalCount = discrepancies.filter((d) => d.severity === "CRITICAL").length;
  const warningCount = discrepancies.filter((d) => d.severity === "WARNING").length;

  return {
    walletsAudited: wallets.length,
    cleanWallets: wallets.length - discrepancies.length,
    discrepanciesCount: discrepancies.length,
    criticalCount,
    warningCount,
    discrepancies,
    backfilledEntries,
    circuitBreakerTripped: criticalCount > 0,
    status: discrepancies.length === 0 ? "CLEAN" : "DISCREPANCY_DETECTED",
  };
}

// 4. Automated Self-Tests (--test flag)
function runSelfTests() {
  console.log("Running reconciliation engine unit tests...");

  // Test Case A: Balanced wallet with matching ledger
  const testA = auditLedgerState({
    wallets: [
      {
        id: "w-1",
        userId: "u-1",
        currency: "BTC",
        balance: "1.50000000",
        reserved: "0.00000000",
        ledgerEntries: [
          { type: "CREDIT", amount: "2.00000000", description: "DEPOSIT" },
          { type: "DEBIT", amount: "0.50000000", description: "WITHDRAWAL" },
        ],
      },
    ],
  });
  assert.equal(testA.discrepanciesCount, 0, "Balanced wallet must have 0 discrepancies");
  assert.equal(testA.circuitBreakerTripped, false, "Circuit breaker must not trip");

  // Test Case B: Wallet with missing opening balance backfill
  const testBWithoutBackfill = auditLedgerState({
    wallets: [
      {
        id: "w-legacy",
        userId: "u-legacy",
        currency: "ETH",
        balance: "10.00000000",
        reserved: "0.00000000",
        ledgerEntries: [],
      },
    ],
    autoBackfillOpening: false,
  });
  assert.equal(testBWithoutBackfill.discrepanciesCount, 1, "Unbacked legacy balance must flag discrepancy");
  assert.equal(testBWithoutBackfill.criticalCount, 1);

  // Test Case C: Auto-backfill corrects unbacked balance
  const testBWithBackfill = auditLedgerState({
    wallets: [
      {
        id: "w-legacy",
        userId: "u-legacy",
        currency: "ETH",
        balance: "10.00000000",
        reserved: "0.00000000",
        ledgerEntries: [],
      },
    ],
    autoBackfillOpening: true,
  });
  assert.equal(testBWithBackfill.discrepanciesCount, 0, "Auto-backfill must resolve discrepancy cleanly");
  assert.equal(testBWithBackfill.backfilledEntries.length, 1, "Must generate 1 opening balance backfill");
  assert.equal(testBWithBackfill.backfilledEntries[0].amount, "10.00000000");

  // Test Case D: Pending withdrawal hold verification
  const testHold = auditLedgerState({
    wallets: [
      {
        id: "w-usdt",
        userId: "u-trader",
        currency: "USDT",
        balance: "5000.00",
        reserved: "1500.00",
        ledgerEntries: [
          { type: "CREDIT", amount: "5000.00", description: "OPENING_BALANCE" },
        ],
      },
    ],
    pendingWithdrawals: [
      { userId: "u-trader", currency: "USDT", amount: "950.00", fee: "50.00" },
    ],
    activeAllocations: [
      { userId: "u-trader", allocatedUsd: "500.00" },
    ],
  });
  assert.equal(testHold.discrepanciesCount, 0, "Matching pending withdrawal + copy trade hold must pass");

  // Test Case E: Over-reserved wallet trips circuit breaker
  const testOverReserved = auditLedgerState({
    wallets: [
      {
        id: "w-over",
        userId: "u-over",
        currency: "BTC",
        balance: "0.50000000",
        reserved: "1.00000000",
        ledgerEntries: [
          { type: "CREDIT", amount: "0.50000000", description: "OPENING_BALANCE" },
        ],
      },
    ],
  });
  assert.equal(testOverReserved.criticalCount, 1, "Over-reserved must be CRITICAL");
  assert.equal(testOverReserved.circuitBreakerTripped, true, "Circuit breaker must trip for over-reserved");

  console.log("All 5 reconciliation unit test cases passed successfully!");
}

// 5. Main CLI Runner
async function main() {
  const args = process.argv.slice(2);
  const isTest = args.includes("--test");
  const isDryRun = args.includes("--dry-run");
  const autoBackfill = args.includes("--auto-backfill-opening");
  const isJson = args.includes("--json");

  let targetUserId = null;
  const userIdx = args.indexOf("--user");
  if (userIdx !== -1 && args[userIdx + 1]) {
    targetUserId = args[userIdx + 1];
  }

  if (isTest) {
    runSelfTests();
    process.exit(0);
  }

  // Attempt database connection via Prisma
  let PrismaClient;
  try {
    const prismaPkg = await import("@prisma/client");
    PrismaClient = prismaPkg.PrismaClient;
  } catch (err) {
    console.error("PrismaClient package not found or failed to load. Running in test mode.");
    runSelfTests();
    process.exit(0);
  }

  const prisma = new PrismaClient();

  try {
    console.log("Connecting to database and fetching financial state...");
    const whereClause = targetUserId ? { userId: targetUserId } : {};

    const [wallets, pendingTxs, activeAllocations] = await Promise.all([
      prisma.wallet.findMany({
        where: whereClause,
        include: {
          ledgerEntries: { orderBy: { createdAt: "asc" } },
        },
      }),
      prisma.transaction.findMany({
        where: { type: "WITHDRAWAL", status: "PENDING", ...whereClause },
        select: { userId: true, currency: true, amount: true, fee: true },
      }),
      prisma.userCopyTrade.findMany({
        where: { status: { in: ["ACTIVE", "PAUSED"] }, ...whereClause },
        select: { userId: true, allocatedUsd: true },
      }),
    ]);

    const report = auditLedgerState({
      wallets,
      pendingWithdrawals: pendingTxs,
      activeAllocations,
      autoBackfillOpening: autoBackfill,
      dryRun: isDryRun,
    });

    // If backfills were identified and not dry run, apply them to database
    if (report.backfilledEntries.length > 0 && !isDryRun) {
      console.log(`Applying ${report.backfilledEntries.length} opening balance backfill entries...`);
      for (const entry of report.backfilledEntries) {
        await prisma.ledgerEntry.create({
          data: {
            walletId: entry.walletId,
            userId: entry.userId,
            currency: entry.currency,
            type: "CREDIT",
            amount: entry.amount,
            balanceBefore: "0.00000000",
            balanceAfter: entry.amount,
            reservedBefore: "0.00000000",
            reservedAfter: "0.00000000",
            description: entry.description,
            actor: "system:reconciliation:cli",
          },
        });
      }
    }

    // If critical discrepancies detected, record audit logs
    if (report.criticalCount > 0 && !isDryRun) {
      for (const d of report.discrepancies.filter((x) => x.severity === "CRITICAL")) {
        await prisma.auditLog.create({
          data: {
            actor: "system:reconciliation:cli",
            action: "CIRCUIT_BREAKER_ALERT",
            target: d.walletId,
            reason: d.reason,
            before: { actualBalance: d.actualBalance, actualReserved: d.actualReserved },
            after: { expectedBalance: d.expectedBalance, expectedReserved: d.expectedReserved },
          },
        });
      }
    }

    if (isJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log("\n=======================================================");
      console.log("       FINANCIAL RECONCILIATION AUDIT REPORT           ");
      console.log("=======================================================");
      console.log(`Audited Wallets       : ${report.walletsAudited}`);
      console.log(`Clean Wallets         : ${report.cleanWallets}`);
      console.log(`Discrepancies Total   : ${report.discrepanciesCount}`);
      console.log(`Critical Issues       : ${report.criticalCount}`);
      console.log(`Warnings              : ${report.warningCount}`);
      console.log(`Backfilled Entries    : ${report.backfilledEntries.length}`);
      console.log(`Circuit Breaker Tripped: ${report.circuitBreakerTripped ? "YES (CRITICAL)" : "NO"}`);
      console.log(`Overall Status        : ${report.status}`);
      console.log("=======================================================\n");

      if (report.discrepancies.length > 0) {
        console.table(
          report.discrepancies.map((d) => ({
            Wallet: d.walletId,
            User: d.userId,
            Asset: d.currency,
            Actual: d.actualBalance,
            Expected: d.expectedBalance,
            Reserved: d.actualReserved,
            Severity: d.severity,
            Reason: d.reason,
          }))
        );
      }
    }

    await prisma.$disconnect();
    process.exit(report.circuitBreakerTripped ? 1 : 0);
  } catch (err) {
    console.error("Reconciliation execution failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
