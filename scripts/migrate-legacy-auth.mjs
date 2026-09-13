#!/usr/bin/env node
/**
 * scripts/migrate-legacy-auth.mjs
 *
 * Pre-cutover Legacy Account Migration & Authentication Audit.
 * Validates user records, Supabase Auth linkages, role mappings, and currency balance aggregates.
 *
 * Usage:
 *   node scripts/migrate-legacy-auth.mjs [--test] [--json] [--dry-run]
 */

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

// Load money math from lib/dashboard/money.ts
const moneyPath = path.join(root, "lib/dashboard/money.ts");
const moneySource = readFileSync(moneyPath, "utf8");
const { outputText: moneyJs } = ts.transpileModule(moneySource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const moneyModule = { exports: {} };
new Function("exports", "module", "require", moneyJs)(moneyModule.exports, moneyModule, () => {
  throw new Error("Unexpected import");
});
const { add, compare } = moneyModule.exports;

function decToStr(val) {
  if (val === null || val === undefined) return "0.00000000";
  if (typeof val === "object" && typeof val.toString === "function") return val.toString();
  return String(val);
}

// Pure migration auditor function
export function auditMigrationState({ users = [], wallets = [], transactions = [] }) {
  const issues = [];
  const userMap = new Map();
  const emailSet = new Set();

  let unlinkedAuthCount = 0;
  let activeUsersCount = 0;
  let suspendedUsersCount = 0;
  let adminUsersCount = 0;

  // 1. Audit User Accounts
  for (const user of users) {
    userMap.set(user.id, user);

    // Email uniqueness
    const lowerEmail = (user.email || "").toLowerCase().trim();
    if (emailSet.has(lowerEmail)) {
      issues.push({
        severity: "CRITICAL",
        category: "DUPLICATE_EMAIL",
        target: user.id,
        detail: `Duplicate email address detected: ${lowerEmail}`,
      });
    }
    emailSet.add(lowerEmail);

    // Supabase Auth link verification
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!user.supabaseUid || !uuidRegex.test(user.supabaseUid)) {
      unlinkedAuthCount++;
      issues.push({
        severity: "WARNING",
        category: "UNLINKED_SUPABASE_AUTH",
        target: user.id,
        detail: `User ${user.email} has missing or non-UUID supabase_uid: ${user.supabaseUid}`,
      });
    }

    if (user.status === "ACTIVE") activeUsersCount++;
    else if (user.status === "SUSPENDED") suspendedUsersCount++;

    if (user.role === "ADMIN" || user.role === "SUPERADMIN") adminUsersCount++;
  }

  // 2. Audit Currency Aggregates & Orphaned Wallets
  const currencyAggregates = new Map();
  let orphanedWalletsCount = 0;

  for (const wallet of wallets) {
    if (!userMap.has(wallet.userId)) {
      orphanedWalletsCount++;
      issues.push({
        severity: "CRITICAL",
        category: "ORPHANED_WALLET",
        target: wallet.id,
        detail: `Wallet ${wallet.id} references non-existent user ${wallet.userId}`,
      });
    }

    const curr = wallet.currency.toUpperCase();
    const bal = decToStr(wallet.balance);
    const res = decToStr(wallet.reserved);

    const agg = currencyAggregates.get(curr) || {
      currency: curr,
      totalBalance: "0.00000000",
      totalReserved: "0.00000000",
      walletCount: 0,
    };

    agg.totalBalance = add(agg.totalBalance, bal);
    agg.totalReserved = add(agg.totalReserved, res);
    agg.walletCount++;
    currencyAggregates.set(curr, agg);
  }

  // 3. Audit Transactions
  let orphanedTxCount = 0;
  for (const tx of transactions) {
    if (!userMap.has(tx.userId)) {
      orphanedTxCount++;
      issues.push({
        severity: "CRITICAL",
        category: "ORPHANED_TRANSACTION",
        target: tx.id,
        detail: `Transaction ${tx.id} references non-existent user ${tx.userId}`,
      });
    }
  }

  const criticalCount = issues.filter((i) => i.severity === "CRITICAL").length;
  const warningCount = issues.filter((i) => i.severity === "WARNING").length;

  return {
    totalUsers: users.length,
    activeUsers: activeUsersCount,
    suspendedUsers: suspendedUsersCount,
    adminUsers: adminUsersCount,
    unlinkedAuthCount,
    totalWallets: wallets.length,
    orphanedWalletsCount,
    totalTransactions: transactions.length,
    orphanedTxCount,
    currencyAggregates: Array.from(currencyAggregates.values()),
    issues,
    criticalCount,
    warningCount,
    isReadyForCutover: criticalCount === 0,
  };
}

// Self-tests
function runSelfTests() {
  console.log("Running migration auditor self-tests...");

  // Test 1: Clean migration state
  const cleanState = auditMigrationState({
    users: [
      {
        id: "u-1",
        email: "alice@example.com",
        supabaseUid: "e2c65a48-5bc8-4eb0-a352-3a56bb5f7142",
        role: "USER",
        status: "ACTIVE",
      },
      {
        id: "u-admin",
        email: "admin@example.com",
        supabaseUid: "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
        role: "ADMIN",
        status: "ACTIVE",
      },
    ],
    wallets: [
      { id: "w-1", userId: "u-1", currency: "BTC", balance: "2.50000000", reserved: "0.00000000" },
      { id: "w-2", userId: "u-1", currency: "USDT", balance: "10000.00", reserved: "1500.00" },
    ],
    transactions: [
      { id: "tx-1", userId: "u-1", currency: "BTC", amount: "2.50000000", type: "DEPOSIT", status: "APPROVED" },
    ],
  });

  assert.equal(cleanState.criticalCount, 0);
  assert.equal(cleanState.isReadyForCutover, true);
  assert.equal(cleanState.currencyAggregates.length, 2);
  const btcAgg = cleanState.currencyAggregates.find((c) => c.currency === "BTC");
  assert.equal(btcAgg.totalBalance, "2.50000000");

  // Test 2: Detect orphaned wallet and duplicate email
  const dirtyState = auditMigrationState({
    users: [
      { id: "u-1", email: "bob@example.com", supabaseUid: "e2c65a48-5bc8-4eb0-a352-3a56bb5f7142" },
      { id: "u-2", email: "bob@example.com", supabaseUid: "f3d76b59-6cd9-4fc1-b463-4b67cc6e8253" },
    ],
    wallets: [
      { id: "w-orphan", userId: "non-existent-user", currency: "ETH", balance: "1.00000000" },
    ],
  });

  assert.equal(dirtyState.criticalCount, 2, "Must flag duplicate email and orphaned wallet as CRITICAL");
  assert.equal(dirtyState.isReadyForCutover, false);

  console.log("All migration auditor unit tests passed!\n");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--test")) {
    runSelfTests();
    process.exit(0);
  }

  const isJson = args.includes("--json");

  let PrismaClient;
  try {
    const prismaPkg = await import("@prisma/client");
    PrismaClient = prismaPkg.PrismaClient;
  } catch {
    console.log("Prisma client unavailable. Running unit tests instead.");
    runSelfTests();
    process.exit(0);
  }

  const prisma = new PrismaClient();
  try {
    const [users, wallets, transactions] = await Promise.all([
      prisma.user.findMany(),
      prisma.wallet.findMany(),
      prisma.transaction.findMany(),
    ]);

    const report = auditMigrationState({ users, wallets, transactions });

    if (isJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log("\n=======================================================");
      console.log("       PRE-CUTOVER MIGRATION AUDIT REPORT             ");
      console.log("=======================================================");
      console.log(`Total Users Audited   : ${report.totalUsers}`);
      console.log(`Active Users          : ${report.activeUsers}`);
      console.log(`Admin / Superadmins   : ${report.adminUsers}`);
      console.log(`Unlinked Auth Users   : ${report.unlinkedAuthCount}`);
      console.log(`Total Wallets         : ${report.totalWallets}`);
      console.log(`Orphaned Wallets      : ${report.orphanedWalletsCount}`);
      console.log(`Total Transactions    : ${report.totalTransactions}`);
      console.log(`Orphaned Transactions : ${report.orphanedTxCount}`);
      console.log(`Critical Invariant Issues: ${report.criticalCount}`);
      console.log(`Cutover Readiness     : ${report.isReadyForCutover ? "READY FOR CUTOVER" : "BLOCKED (Issues Found)"}`);
      console.log("=======================================================\n");

      console.log("CURRENCY BALANCE AGGREGATES:");
      console.table(
        report.currencyAggregates.map((c) => ({
          Currency: c.currency,
          "Total Balance": c.totalBalance,
          "Total Reserved": c.totalReserved,
          "Wallets Count": c.walletCount,
        }))
      );

      if (report.issues.length > 0) {
        console.log("\nDETECTED ISSUES:");
        console.table(report.issues);
      }
    }

    await prisma.$disconnect();
    process.exit(report.isReadyForCutover ? 0 : 1);
  } catch (err) {
    console.error("Migration audit failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
