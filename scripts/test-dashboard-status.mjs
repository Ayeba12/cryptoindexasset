// Status and enum mapping checks for the live adapter mappers
// (lib/dashboard/adapters/mappers.ts, deposit-settings.ts, explorers.ts) and
// the format layer. Transpiles the TypeScript sources with the `typescript`
// package and runs them in this realm. Pure functions only: no network, no
// database, no account actions.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const nodeRequire = createRequire(import.meta.url);
const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

function createLoader(stubs = {}) {
  const cache = new Map();
  function resolveFile(spec, fromDir) {
    const base = spec.startsWith("@/") ? path.join(root, spec.slice(2)) : path.resolve(fromDir, spec);
    for (const candidate of [`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) {
      if (existsSync(candidate)) return candidate;
    }
    throw new Error(`Cannot resolve ${spec} from ${fromDir}`);
  }
  function load(spec, fromDir = root) {
    if (Object.prototype.hasOwnProperty.call(stubs, spec)) return stubs[spec];
    if (!spec.startsWith(".") && !spec.startsWith("@/")) return nodeRequire(spec);
    const abs = resolveFile(spec, fromDir);
    if (cache.has(abs)) return cache.get(abs).exports;
    const source = readFileSync(abs, "utf8");
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      fileName: abs,
    });
    const module = { exports: {} };
    cache.set(abs, module);
    const wrapper = vm.runInThisContext(`(function (exports, require, module, __filename, __dirname) {\n${outputText}\n})`, { filename: abs });
    wrapper(module.exports, (name) => load(name, path.dirname(abs)), module, abs, path.dirname(abs));
    return module.exports;
  }
  return load;
}

const load = createLoader();
const mappers = load("@/lib/dashboard/adapters/mappers");
const settings = load("@/lib/dashboard/adapters/deposit-settings");
const { explorerUrlFor } = load("@/lib/dashboard/adapters/explorers");
const { statusPresentation, UNKNOWN_STATUS_PRESENTATION } = load("@/lib/dashboard/format");
const { toFixed } = load("@/lib/dashboard/money");

let checks = 0;
const eq = (actual, expected, label) => {
  assert.equal(actual, expected, label);
  checks += 1;
};
const deep = (actual, expected, label) => {
  assert.deepEqual(actual, expected, label);
  checks += 1;
};
const ok = (value, label) => {
  assert.ok(value, label);
  checks += 1;
};
const dec = (text) => ({ toFixed: (dp) => toFixed(text, dp ?? 8, "half-up") });
const date = (iso) => new Date(iso);

// Request status mapping, including unknown values.
deep(mappers.mapRequestStatus("PENDING"), { status: "PENDING" }, "PENDING maps");
deep(mappers.mapRequestStatus("APPROVED"), { status: "APPROVED" }, "APPROVED maps");
deep(mappers.mapRequestStatus("REJECTED"), { status: "REJECTED" }, "REJECTED maps");
deep(mappers.mapRequestStatus("CANCELLED"), { status: "CANCELLED" }, "CANCELLED maps");
deep(mappers.mapRequestStatus("FROZEN"), { status: "UNKNOWN", rawStatus: "FROZEN" }, "unknown status keeps the raw value");
deep(mappers.mapRequestStatus("pending"), { status: "UNKNOWN", rawStatus: "pending" }, "case is not normalised");
deep(mappers.mapRequestStatus(null), { status: "UNKNOWN", rawStatus: "" }, "null status is UNKNOWN");
deep(statusPresentation("PENDING", "request"), { label: "Pending review", variant: "secondary" }, "PENDING → Pending review");
deep(statusPresentation("APPROVED", "request"), { label: "Approved", variant: "outline" }, "APPROVED → Approved");
deep(statusPresentation("REJECTED", "request"), { label: "Declined", variant: "destructive" }, "REJECTED → Declined");
deep(statusPresentation("CANCELLED", "request"), { label: "Cancelled", variant: "secondary" }, "CANCELLED → Cancelled");
deep(statusPresentation("UNKNOWN", "request"), UNKNOWN_STATUS_PRESENTATION, "UNKNOWN → Status unavailable");
deep(statusPresentation("FROZEN"), UNKNOWN_STATUS_PRESENTATION, "unrecognised value never throws");
eq(statusPresentation("PENDING", "allocation").label, "Pending", "allocation PENDING is disambiguated");
eq(statusPresentation("confirmed", "settlement").label, "Completed", "settlement confirmed is the only Completed");
eq(statusPresentation("unconfirmed", "settlement").label, "Settlement not confirmed", "unconfirmed settlement label");

// Transaction type mapping.
for (const type of ["DEPOSIT", "WITHDRAWAL", "PROFIT_ACCRUAL", "COPY_FEE", "BONUS", "ADJUSTMENT"]) {
  deep(mappers.mapTransactionType(type), { type, recognised: true }, `${type} recognised`);
}
deep(mappers.mapTransactionType("REBATE"), { type: "ADJUSTMENT", recognised: false }, "unknown type is an unrecognised adjustment");
eq(mappers.sourceLabelFor("ADJUSTMENT", false, "REBATE"), "Ledger entry (REBATE)", "unrecognised type keeps the raw name in the label");
eq(mappers.sourceLabelFor("PROFIT_ACCRUAL", true, "PROFIT_ACCRUAL"), "Recorded credit (operator accrual)", "accrual is never called profit");

// Allocation status mapping.
deep(mappers.mapAllocationStatus("ACTIVE"), { status: "ACTIVE" }, "ACTIVE maps");
deep(mappers.mapAllocationStatus("PAUSED"), { status: "PAUSED" }, "PAUSED maps");
deep(mappers.mapAllocationStatus("STOPPED"), { status: "STOPPED" }, "STOPPED maps");
deep(mappers.mapAllocationStatus("active"), { status: "ERROR", rawStatus: "active" }, "free-text status is not guessed");
deep(mappers.mapAllocationStatus(undefined), { status: "ERROR", rawStatus: "" }, "missing status is ERROR");

// Verification state mapping.
eq(mappers.mapVerificationState(null), "not-submitted", "no document → not submitted");
eq(mappers.mapVerificationState("PENDING"), "in-review", "PENDING → in review");
eq(mappers.mapVerificationState("APPROVED"), "verified", "APPROVED → verified");
eq(mappers.mapVerificationState("REJECTED"), "changes-required", "REJECTED → changes required");
eq(mappers.mapVerificationState("CANCELLED"), "changes-required", "CANCELLED → changes required");
eq(mappers.mapVerificationState("WEIRD"), "changes-required", "unknown → changes required (never verified)");

// Settlement and direction.
eq(mappers.settlementFor("DEPOSIT", "APPROVED"), "unconfirmed", "approved deposit is unconfirmed, never Completed");
eq(mappers.settlementFor("WITHDRAWAL", "APPROVED"), "unconfirmed", "approved withdrawal is unconfirmed");
eq(mappers.settlementFor("DEPOSIT", "PENDING"), "not-applicable", "pending deposit not applicable");
eq(mappers.settlementFor("PROFIT_ACCRUAL", "APPROVED"), "not-applicable", "ledger credit not applicable");
eq(mappers.settlementFor("WITHDRAWAL", "UNKNOWN"), "not-applicable", "unknown status not applicable");
eq(mappers.directionFor("DEPOSIT", false), "credit", "deposit credits");
eq(mappers.directionFor("WITHDRAWAL", false), "debit", "withdrawal debits");
eq(mappers.directionFor("COPY_FEE", false), "debit", "copy fee debits");
eq(mappers.directionFor("ADJUSTMENT", true), "debit", "negative adjustment debits");
eq(mappers.directionFor("WITHDRAWAL", true), "credit", "negative withdrawal amount flips to credit");

// Decimal handling.
eq(mappers.decimalToString(dec("0.1"), 8), "0.10000000", "record decimal rendered at ledger precision");
eq(mappers.decimalToString(null, 8), null, "missing decimal is null, not zero");
eq(mappers.decimalToString({ toFixed: () => "1e-8" }, 8), null, "exponent output is rejected");
eq(mappers.decimalToString({ toFixed: () => { throw new Error("boom"); } }, 8), null, "throwing decimal is null");
eq(mappers.precisionFor("XRP"), 6, "XRP precision 6");
eq(mappers.precisionFor("USD"), 2, "USD precision 2");
eq(mappers.precisionFor("TRX"), 8, "unknown currency defaults to 8");

// Transaction mapping.
const btcHash = "a".repeat(64);
const baseRow = {
  id: "3f2a9c1b-0000-4000-8000-000000000001",
  type: "DEPOSIT",
  currency: "BTC",
  amount: dec("0.05"),
  fee: dec("0"),
  status: "APPROVED",
  txHash: btcHash.toUpperCase(),
  notes: null,
  createdAt: date("2026-09-01T10:00:00Z"),
  updatedAt: date("2026-09-01T14:00:00Z"),
};
const btcView = mappers.mapTransaction(baseRow);
eq(btcView.reference, "DEP-3F2A9C1B", "reference from id");
eq(btcView.amount, "0.05000000", "amount at ledger precision");
eq(btcView.direction, "credit", "deposit direction");
eq(btcView.status, "APPROVED", "status mapped");
eq(btcView.settlement, "unconfirmed", "settlement unconfirmed");
eq(btcView.network?.id, "bitcoin", "BTC implies the bitcoin network");
eq(btcView.explorerUrl, `https://mempool.space/tx/${btcHash}`, "explorer link built from the allowlist with a lowercased hash");
eq(btcView.txHash, btcHash.toUpperCase(), "raw hash preserved");
deep(btcView.permittedActions, [], "no cancel contract in live");
eq(btcView.rawStatus, undefined, "no rawStatus for known status");
eq(btcView.createdAt, "2026-09-01T10:00:00.000Z", "ISO timestamp");

const unknownRow = { ...baseRow, id: "tx-unknown", type: "PROFIT_ACCRUAL", currency: "USD", amount: dec("12.5"), status: "FROZEN", txHash: null };
const unknownView = mappers.mapTransaction(unknownRow);
eq(unknownView.status, "UNKNOWN", "unknown status");
eq(unknownView.rawStatus, "FROZEN", "raw status preserved for diagnostics");
eq(unknownView.amount, "12.50", "USD amount at 2 decimals");
eq(unknownView.network, null, "USD has no network");
eq(unknownView.explorerUrl, null, "no explorer without network");

const usdtRow = { ...baseRow, id: "tx-usdt", currency: "USDT", amount: dec("100"), txHash: `0x${"b".repeat(64)}` };
eq(mappers.mapTransaction(usdtRow).explorerUrl, null, "USDT has no confirmed network, so no explorer link");
eq(mappers.mapTransaction(usdtRow).network, null, "USDT network is not inferred");
const ethRow = { ...baseRow, id: "tx-eth", currency: "ETH", txHash: `0x${"c".repeat(64)}` };
eq(mappers.mapTransaction(ethRow).explorerUrl, `https://etherscan.io/tx/0x${"c".repeat(64)}`, "ETH explorer link");
eq(mappers.mapTransaction({ ...ethRow, txHash: "c".repeat(64) }).explorerUrl, null, "ETH hash without 0x is rejected");

const negativeRow = { ...baseRow, id: "tx-neg", type: "BONUS", currency: "USD", amount: dec("-4"), txHash: null };
eq(mappers.mapTransaction(negativeRow).amount, "4.00", "negative amount shown as magnitude");
eq(mappers.mapTransaction(negativeRow).direction, "debit", "negative credit type becomes a debit");
eq(mappers.mapTransaction({ ...baseRow, currency: "TRX" }), null, "unsupported currency rows are excluded, never mislabelled");

// Detail mapping.
const withdrawal = {
  ...baseRow,
  id: "tx-wdr",
  type: "WITHDRAWAL",
  currency: "ETH",
  amount: dec("0.5"),
  fee: dec("0.0002"),
  status: "REJECTED",
  txHash: null,
  notes: "Destination address failed compliance review",
};
const rejected = mappers.mapTransactionDetail(withdrawal);
eq(rejected.reason, "Destination address failed compliance review", "rejection notes become the reason");
eq(rejected.notes, null, "notes are not duplicated when they are the reason");
eq(rejected.timeline.length, 2, "rejected timeline has submission and decision");
eq(rejected.timeline[1].label, "Declined", "decision label uses the product mapping");
eq(rejected.nextStep, null, "no next step for a declined request");
const pending = mappers.mapTransactionDetail({ ...withdrawal, status: "PENDING", notes: "Withdrawal to 0x9a2fD4e6C1b7A3f0E8d5C2b9A6f4E1d7C3b8A5f2 requested" });
eq(pending.destinationFull, "0x9a2fD4e6C1b7A3f0E8d5C2b9A6f4E1d7C3b8A5f2", "destination extracted from a recognised note pattern");
eq(pending.destinationMasked, "0x9a2f…A5f2", "destination masked in the list shape");
eq(pending.nextStep, "Awaiting operator review.", "pending next step");
eq(pending.timeline.length, 1, "pending timeline has no decision entry");
eq(mappers.destinationFromNotes("Customer called about the fee"), null, "notes without a destination pattern yield null");
eq(mappers.destinationFromNotes(null), null, "null notes yield null");
eq(mappers.mapTransaction({ ...baseRow, notes: "to bc1qfixture0cancelled0request0destination0000demo" }).destinationMasked, null, "destination only read for withdrawals");

// Wallets and settlement.
const wallets = [
  { currency: "BTC", balance: dec("0.1"), updatedAt: date("2026-09-06T12:00:00Z") },
  { currency: "USD", balance: dec("12.5"), updatedAt: date("2026-09-06T12:00:00Z") },
];
const assets = mappers.mapWallets(wallets, { BTC: [{ id: "bitcoin", name: "Bitcoin", requiresTag: false }] });
eq(assets.length, 6, "six asset rows always");
const btc = assets.find((asset) => asset.currency === "BTC");
eq(btc.enabled, true, "BTC enabled");
eq(btc.total, "0.10000000", "BTC total from balance");
eq(btc.available, null, "available unknown without holds");
eq(btc.reserved, null, "reserved unknown without holds");
eq(btc.reservedReason, mappers.LIVE_REASONS.holds, "holds reason");
eq(btc.estimatedUsd, null, "no quote source");
eq(btc.networks.length, 1, "configured network attached");
const bch = assets.find((asset) => asset.currency === "BCH");
eq(bch.enabled, false, "missing wallet disabled");
eq(bch.enabledReason, mappers.LIVE_REASONS.walletMissing, "missing wallet reason");
eq(bch.total, null, "missing wallet total is null, not zero");
eq(assets.some((asset) => asset.currency === "USD"), false, "USD is never a seventh crypto asset");
deep(mappers.mapSettlement(wallets), { currency: "USD", balance: "12.50", asOf: "2026-09-06T12:00:00.000Z" }, "USD row is the settlement ledger");
eq(mappers.mapSettlement([wallets[0]]), null, "no USD row → null");

// Allocations.
const allocation = mappers.mapAllocation({
  id: "alloc-1",
  traderId: "trader-1",
  allocatedUsd: dec("250"),
  status: "FROZEN",
  totalEarned: dec("12.5"),
  createdAt: date("2026-08-01T00:00:00Z"),
  updatedAt: date("2026-08-02T00:00:00Z"),
  trader: { name: "Alex", avatar: "https://cdn.example/alex.png" },
});
eq(allocation.status, "ERROR", "unknown allocation status is ERROR");
eq(allocation.rawStatus, "FROZEN", "raw allocation status kept");
eq(allocation.allocated.amount, "250.00", "allocated USD at 2 decimals");
eq(allocation.recordedPnl.amount, "12.50000000", "recorded credits at stored precision");
eq(allocation.recordedPnl.label, mappers.ALLOCATION_PNL_LABEL, "credits labelled as operator accrual");
eq(allocation.traderPortrait, null, "remote avatar is not used");
deep(allocation.permittedActions, [], "no execution contract → no actions");
eq(allocation.executionMode, "unavailable", "execution unavailable");
const detail = mappers.mapAllocationDetail({ ...allocation, allocatedUsd: dec("250"), totalEarned: dec("12.5"), createdAt: date("2026-08-01T00:00:00Z"), updatedAt: date("2026-08-02T00:00:00Z"), trader: null });
eq(detail.traderName, "Trader record unavailable", "missing trader join is explicit");
eq(detail.stopExplanation, mappers.STOP_UNAVAILABLE_EXPLANATION, "stop explanation states the missing contract");
eq(detail.pendingOperation, null, "no pending operation");

// Traders.
const trader = mappers.mapTrader({
  id: "trader-1",
  name: "Alex",
  avatar: "/images/community/alex-morgan.webp",
  tagline: "Swing positions",
  profitShare: dec("15"),
  riskLevel: "MEDIUM",
  minCapital: dec("100"),
  totalFollowers: 128,
  isActive: true,
});
eq(trader.accuracy.value, null, "accuracy has no period or method → null");
eq(trader.rating.value, null, "no rating source");
eq(trader.drawdown.value, null, "no drawdown source");
eq(trader.risk.label, null, "risk label withheld without a methodology");
eq(trader.copiers, 128, "copiers from followers");
deep(trader.minimumAllocation, { amount: "100.00", currency: "USD" }, "minimum from minCapital");
deep(trader.fee, { percent: "15.00", basis: "of recorded outcomes" }, "fee from profitShare");
eq(trader.portrait, "/images/community/alex-morgan.webp", "same-origin portrait kept");
eq(trader.provenance, mappers.TRADER_PROVENANCE, "provenance attached");
eq(mappers.portraitFrom("//evil.example/x.png"), null, "protocol-relative avatar rejected");
eq(mappers.portraitFrom("/images/../secret.png"), null, "path traversal rejected");
eq(
  mappers.portraitFrom("https://project.supabase.co/storage/v1/object/public/public-traders/trader-1.webp"),
  "https://project.supabase.co/storage/v1/object/public/public-traders/trader-1.webp",
  "public Supabase trader portrait kept",
);
eq(mappers.portraitFrom("https://evil.example/trader.png"), null, "unapproved remote avatar rejected");
eq(mappers.portraitFrom(null), null, "null avatar");
eq(mappers.mapTraderProfile({ ...trader, avatar: null, tagline: null, profitShare: dec("15"), minCapital: dec("100"), totalFollowers: 1, isActive: true }).executionMode, "unavailable", "profile execution unavailable");

// Verification never exposes file URLs.
const kyc = {
  id: "kyc-1",
  documentType: "PASSPORT",
  frontUrl: "https://storage.example/private/front.jpg",
  backUrl: null,
  status: "REJECTED",
  rejectionMsg: "Back side unreadable",
  createdAt: date("2026-08-20T00:00:00Z"),
  updatedAt: date("2026-08-21T00:00:00Z"),
};
const verification = mappers.mapVerification(kyc);
eq(verification.state, "changes-required", "rejected → changes required");
eq(verification.message, "Back side unreadable", "rejection message surfaced");
eq(verification.documents.length, 1, "front present");
eq(verification.documents[0].side, "front", "front side");
ok(!JSON.stringify(verification).includes("storage.example"), "file URL never appears in the view");
eq(verification.uploadRules, null, "no upload contract");
eq(mappers.mapVerification(null).state, "not-submitted", "no document → not submitted");
eq(mappers.mapVerification({ ...kyc, status: "PENDING" }).reviewedAt, null, "in review has no review time");
eq(mappers.mapVerification({ ...kyc, status: "CANCELLED" }).message, mappers.VERIFICATION_RESUBMIT_MESSAGE, "cancelled asks for resubmission");

// Notifications and profile.
const notification = mappers.mapNotification({ id: "n1", title: "T", message: "M", isRead: false, createdAt: date("2026-09-06T00:00:00Z") });
eq(notification.kind, "system", "no category column → system");
eq(notification.href, null, "no link column → null");
const profile = mappers.mapProfile({ email: "a@example.com", fullName: "  ", phone: null, country: "UK", createdAt: date("2026-01-01T00:00:00Z") });
eq(profile.fullName, null, "blank name is null");
deep(profile.editable, ["fullName", "phone", "country"], "editable fields exclude email");
eq(mappers.displayNameFor(null, "alex.morgan@example.com"), "alex.morgan", "display name falls back to the local part");

// MFA from provider factors, never from a flag.
eq(mappers.mfaStatusFromFactors([]).state, "not-enabled", "no factors");
eq(mappers.mfaStatusFromFactors([{ id: "f", factor_type: "totp", status: "unverified", updated_at: "2026-09-01T00:00:00Z" }]).state, "enrollment-pending", "unverified totp");
const enabled = mappers.mfaStatusFromFactors([{ id: "f", factor_type: "totp", status: "verified", friendly_name: "Phone app", updated_at: "2026-09-01T00:00:00Z" }]);
eq(enabled.state, "enabled", "verified totp");
eq(enabled.factorLabel, "Phone app", "friendly name used");
eq(enabled.verifiedAt, "2026-09-01T00:00:00Z", "verified time from factor");
eq(mappers.mfaStatusFromFactors([{ id: "p", factor_type: "phone", status: "verified", updated_at: "x" }]).state, "not-enabled", "phone factors are not TOTP");

// Deposit settings.
deep(settings.parseDepositSettingKey("deposit-instruction:BTC:bitcoin"), { currency: "BTC", networkId: "bitcoin" }, "key parsed");
eq(settings.parseDepositSettingKey("deposit-instruction:TRX:tron"), null, "unsupported currency key rejected");
eq(settings.parseDepositSettingKey("other:BTC:bitcoin"), null, "other keys ignored");
eq(settings.depositSettingKey("USDT", "tron"), "deposit-instruction:USDT:tron", "key built");
const good = settings.parseDepositSetting(JSON.stringify({ networkName: "Bitcoin", address: "bc1qexampleaddress", confirmations: 3, minimumDeposit: "0.0001" }));
eq(good.networkName, "Bitcoin", "valid setting parsed");
eq(settings.parseDepositSetting("{not json"), null, "invalid JSON rejected");
eq(settings.parseDepositSetting(JSON.stringify({ networkName: "Bitcoin" })), null, "missing address rejected");
eq(settings.parseDepositSetting(JSON.stringify({ networkName: "Bitcoin", address: "bc1qexampleaddress", minimumDeposit: "1,000" })), null, "grouped minimum rejected");
eq(settings.parseDepositSetting(JSON.stringify({ networkName: "Bitcoin", address: "bc1qexampleaddress", confirmations: -1 })), null, "negative confirmations rejected");
const instruction = settings.instructionFromSetting("BTC", "bitcoin", good, "2026-09-06T12:00:00Z");
eq(instruction.tag, null, "no tag → null");
eq(instruction.expiresAt, null, "no expiry → null");
eq(instruction.confirmations, 3, "confirmations carried");
eq(instruction.minimumDeposit, "0.0001", "minimum carried");
eq(instruction.network.requiresTag, false, "requiresTag from tag presence");
const networks = settings.networksFromSettings([
  { key: "deposit-instruction:BTC:bitcoin", value: JSON.stringify({ networkName: "Bitcoin", address: "bc1qexampleaddress" }) },
  { key: "deposit-instruction:ETH:ethereum", value: "broken" },
  { key: "deposit-instruction:XRP:xrp-ledger", value: JSON.stringify({ networkName: "XRP Ledger", address: "rExampleAddress1", tag: "1234" }) },
  { key: "site-name", value: "x" },
]);
deep(Object.keys(networks).sort(), ["BTC", "XRP"], "only valid rows advertise a network");
eq(networks.XRP[0].requiresTag, true, "tag presence sets requiresTag");

// Explorer allowlist.
eq(explorerUrlFor("bitcoin", btcHash), `https://mempool.space/tx/${btcHash}`, "bitcoin explorer");
eq(explorerUrlFor("tron", "x".repeat(64)), null, "unlisted network → null");
eq(explorerUrlFor("bitcoin", "not-a-hash"), null, "invalid hash → null");
eq(explorerUrlFor("bitcoin", null), null, "no hash → null");
eq(explorerUrlFor("__proto__", btcHash), null, "prototype keys are not allowlist entries");

console.log(`Passed: ${checks} status and enum mapping checks (request, allocation, verification, settlement, unknown values, explorer allowlist, deposit settings). Pure mappers; no network, database or account actions.`);
