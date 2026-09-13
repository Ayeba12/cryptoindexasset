// Fixture store and action checks for lib/dashboard/fixtures. Transpiles the
// TypeScript sources with the `typescript` package and runs them in this
// realm. Everything is in memory: no network, no database, no account
// actions. Money checks use lib/dashboard/money.ts, never Number().
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
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
    const candidates = path.extname(base)
      ? [base]
      : [`${base}.ts`, `${base}.tsx`, `${base}.json`, path.join(base, "index.ts")];
    for (const candidate of candidates) {
      if (existsSync(candidate)) return candidate;
    }
    throw new Error(`Cannot resolve ${spec} from ${fromDir}`);
  }
  const bareImports = new Set();
  function load(spec, fromDir = root) {
    if (Object.prototype.hasOwnProperty.call(stubs, spec)) return stubs[spec];
    if (!spec.startsWith(".") && !spec.startsWith("@/")) {
      bareImports.add(spec);
      return nodeRequire(spec);
    }
    const abs = resolveFile(spec, fromDir);
    if (cache.has(abs)) return cache.get(abs).exports;
    const source = readFileSync(abs, "utf8");
    if (path.extname(abs) === ".json") {
      const parsed = JSON.parse(source);
      const module = { exports: { default: parsed, ...parsed } };
      cache.set(abs, module);
      return module.exports;
    }
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
  load.bareImports = bareImports;
  return load;
}

const load = createLoader();
const fixtures = load("@/lib/dashboard/fixtures");
const money = load("@/lib/dashboard/money");
const { DASHBOARD_ACTION_NAMES } = load("@/lib/dashboard/data-source");
const { add, sum, multiplyByDecimal, toFixed, compare } = money;

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

// Client safety: the fixture package pulls in no bare module (no Prisma, no server-only, no Node API).
eq(load.bareImports.size, 0, `fixtures import no bare modules (${[...load.bareImports].join(", ")})`);
const fixtureDir = path.join(root, "lib", "dashboard", "fixtures");
for (const file of readdirSync(fixtureDir)) {
  const text = readFileSync(path.join(fixtureDir, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  ok(!/Math\.random|Date\.now\(\)|new Date\(\)/.test(text), `${file} uses no random or system clock`);
}

const REGION_STATUSES = new Set(["ready", "empty", "not-found", "error", "unavailable"]);
const SAMPLE_CALLS = [
  ["getValuation", []],
  ["getValuationHistory", ["30D"]],
  ["getAssets", []],
  ["getSettlementLedger", []],
  ["getAsset", ["BTC"]],
  ["getAssetActivity", ["USDT"]],
  ["listTransactions", [{ page: 1, pageSize: 10 }]],
  ["getTransaction", ["tx-dep-0001"]],
  ["getDepositOptions", []],
  ["getDepositInstruction", ["BTC", "bitcoin"]],
  ["getDepositProofRules", []],
  ["listRecentDeposits", []],
  ["getWithdrawalOptions", []],
  ["listTraders", [{ sort: "name" }]],
  ["getTrader", ["trader-alex-morgan"]],
  ["listAllocations", []],
  ["getAllocation", ["alloc-0001"]],
  ["getSignals", []],
  ["listNotifications", ["all", 1]],
  ["getProfile", []],
  ["getSecurity", []],
  ["getVerification", []],
  ["getNeedsAttention", []],
  ["listRecentActivity", [5]],
];

// Every scenario builds and every region has a valid status.
eq(fixtures.SCENARIO_IDS.length, 16, "sixteen scenarios in the catalogue");
for (const id of fixtures.SCENARIO_IDS) {
  const store = fixtures.createFixtureStore(id);
  eq(store.scenarioId, id, `${id}: store scenario id`);
  eq(store.clock, fixtures.FIXTURE_CLOCK, `${id}: fixed clock`);
  eq(store.version, 0, `${id}: initial version`);
  const session = await store.data.getSession();
  eq(session.state, "authenticated", `${id}: session authenticated`);
  eq(typeof (await store.data.getUnreadCount()), "number", `${id}: unread count is a number`);
  const capabilities = await store.data.getCapabilities();
  eq(Object.keys(capabilities).length, 15, `${id}: complete capabilities`);
  for (const [name, args] of SAMPLE_CALLS) {
    const result = await store.data[name](...args);
    ok(REGION_STATUSES.has(result.status), `${id}: ${name} status ${result.status} is valid`);
    if (result.status === "ready") ok(typeof result.fetchedAt === "string", `${id}: ${name} carries fetchedAt`);
  }
  // Read regions never mutate.
  eq(store.version, 0, `${id}: reads do not bump the version`);
}

// Determinism: two stores of the same scenario produce identical reads.
{
  const a = fixtures.createFixtureStore("funded");
  const b = fixtures.createFixtureStore("funded");
  deep(await a.data.getAssets(), await b.data.getAssets(), "assets deterministic");
  deep(await a.data.listTransactions({ page: 2, pageSize: 10 }), await b.data.listTransactions({ page: 2, pageSize: 10 }), "ledger deterministic");
  deep(await a.data.getValuationHistory("90D"), await b.data.getValuationHistory("90D"), "history deterministic");
}

/* ------------------------------------------------------------------------ */
/* Funded accounting                                                        */
/* ------------------------------------------------------------------------ */

const funded = fixtures.createFixtureStore("funded");
const assets = (await funded.data.getAssets()).data;
eq(assets.length, 6, "six asset rows");
deep(assets.map((asset) => asset.currency), ["BTC", "ETH", "BCH", "LTC", "XRP", "USDT"], "display order");
const expectedHoldings = {
  BTC: ["0.08000000", "0.02000000", "0.10000000"],
  ETH: ["1.50000000", "0.50000000", "2.00000000"],
  BCH: ["0.00000000", "0.00000000", "0.00000000"],
  LTC: ["0.00000000", "0.00000000", "0.00000000"],
  XRP: ["0.000000", "0.000000", "0.000000"],
  USDT: ["1000.000000", "250.000000", "1250.000000"],
};
for (const asset of assets) {
  const [available, reserved, total] = expectedHoldings[asset.currency];
  eq(asset.enabled, true, `${asset.currency} enabled`);
  eq(asset.available, available, `${asset.currency} available`);
  eq(asset.reserved, reserved, `${asset.currency} reserved`);
  eq(asset.total, total, `${asset.currency} total`);
  eq(add(asset.available, asset.reserved), asset.total, `${asset.currency}: available + reserved = total (money.ts)`);
  eq(asset.estimatedUsd, toFixed(multiplyByDecimal(asset.total, fixtures.FIXTURE_PRICES[asset.currency]), 2), `${asset.currency} estimate = units × fixture price`);
  eq(asset.asOf, fixtures.FIXTURE_CLOCK, `${asset.currency} asOf is the clock`);
}
const valuation = (await funded.data.getValuation()).data;
eq(valuation.estimatedTotal, "12250.00", "estimated total 12250.00");
eq(valuation.availableTotal, "9550.00", "available total 9550.00");
eq(valuation.reservedTotal, "2700.00", "reserved total 2700.00");
eq(add(valuation.availableTotal, valuation.reservedTotal), valuation.estimatedTotal, "USD totals reconcile");
eq(toFixed(sum(assets.map((asset) => asset.estimatedUsd)), 2), valuation.estimatedTotal, "sum of asset estimates equals the total");
eq(valuation.source, fixtures.FIXTURE_QUOTE_SOURCE, "quotes labelled as fixtures");
eq(valuation.quotedAt, fixtures.FIXTURE_CLOCK, "quotes timestamped");
eq(valuation.partial, false, "not partial");
deep(valuation.recordedPnl, { amount: "120.00", period: "30D", method: "Ledger: recorded copy-trade outcomes", percent: "0.98" }, "recorded 30-day P/L +120.00 USD, +0.98%");
const history = (await funded.data.getValuationHistory("90D")).data;
eq(history.points.length, 91, "91 daily points");
eq(history.points[90].value, valuation.estimatedTotal, "last point equals the current estimate");
ok(history.points.every((point, index) => index === 0 || compare(point.value, history.points[index - 1].value) >= 0), "value only steps up on deposits (no drift)");
eq(history.points[0].value, "6000.00", "first point holds only the day -90 deposits (0.05 BTC + 1 ETH + 500 USDT at fixture prices)");
eq(history.points[0].at, "2026-06-08T12:00:00Z", "first point is 90 days before the clock");
eq(history.source, fixtures.FIXTURE_QUOTE_SOURCE, "history source labelled");
const settlement = (await funded.data.getSettlementLedger()).data;
const usdRows = [];
for (let page = 1; ; page += 1) {
  const result = (await funded.data.listTransactions({ currency: "USD", page, pageSize: 50 })).data;
  usdRows.push(...result.items);
  if (!result.hasMore) break;
}
const expectedSettlement = toFixed(
  sum(usdRows.filter((row) => row.status === "APPROVED").map((row) => (row.direction === "credit" ? row.amount : `-${row.amount}`))),
  2,
);
eq(settlement.balance, expectedSettlement, "USD settlement balance equals the signed sum of approved USD rows");

/* ------------------------------------------------------------------------ */
/* Ledger                                                                   */
/* ------------------------------------------------------------------------ */

const page1 = (await funded.data.listTransactions({ page: 1, pageSize: 10 })).data;
ok(page1.total >= 30, `funded ledger has at least 30 rows (${page1.total})`);
eq(page1.items.length, 10, "page size respected");
eq(page1.hasMore, true, "more pages");
const page2 = (await funded.data.listTransactions({ page: 2, pageSize: 10 })).data;
ok(!page2.items.some((row) => page1.items.some((first) => first.id === row.id)), "page 2 has different rows");
ok(page1.items.every((row, index) => index === 0 || Date.parse(row.createdAt) <= Date.parse(page1.items[index - 1].createdAt)), "newest first");
const withdrawals = (await funded.data.listTransactions({ type: "WITHDRAWAL", page: 1, pageSize: 10 })).data;
eq(withdrawals.total, 3, "three withdrawals in funded");
deep(withdrawals.items.map((row) => row.status).sort(), ["CANCELLED", "PENDING", "REJECTED"], "pending, declined and cancelled withdrawals");
const declined = (await funded.data.getTransaction("tx-wdr-0002")).data;
eq(declined.reason, "Destination address failed compliance review", "declined reason");
eq(declined.status, "REJECTED", "declined status");
const pendingWithdrawal = (await funded.data.getTransaction("tx-wdr-0001")).data;
eq(pendingWithdrawal.amount, "0.50000000", "pending ETH withdrawal amount");
eq(pendingWithdrawal.fee, "0.00020000", "pending withdrawal fee");
eq(pendingWithdrawal.destinationMasked, "0x9a2f…A5f2", "destination masked");
deep(pendingWithdrawal.permittedActions, ["cancel"], "pending withdrawal can be cancelled");
const nothing = (await funded.data.listTransactions({ type: "BONUS", currency: "BTC", page: 1, pageSize: 10 }));
eq(nothing.status, "ready", "no match is still ready");
eq(nothing.data.total, 0, "no match has zero rows");
eq((await funded.data.listTransactions({ from: "2026-09-04", page: 1, pageSize: 10 })).data.total, 1, "from-date filter (only the 4 Sep withdrawal request)");
eq((await funded.data.listTransactions({ from: "2026-09-02", to: "2026-09-02", page: 1, pageSize: 10 })).data.total, 2, "inclusive single-day range (outcome and fee on 2 Sep)");
eq((await funded.data.getTransaction("tx-missing")).status, "not-found", "missing record is not-found");
eq((await funded.data.getTransaction("tx-adj-0001")).data.sourceLabel, "Manual adjustment by operator", "manual adjustment label");
const profit = (await funded.data.getTransaction("tx-pnl-0004")).data;
eq(profit.amount, "30.00", "recorded outcome amount");
eq(profit.direction, "credit", "recorded outcome credit");
eq(profit.type, "PROFIT_ACCRUAL", "recorded outcome type");
const deposit = (await funded.data.getTransaction("tx-dep-0001")).data;
eq(deposit.settlement, "confirmed", "confirmed deposit settlement");
ok(deposit.explorerUrl?.startsWith("https://mempool.space/tx/"), "BTC explorer link");
const unconfirmed = (await funded.data.getTransaction("tx-dep-0007")).data;
eq(unconfirmed.settlement, "unconfirmed", "approved deposit without settlement evidence");
eq((await funded.data.listRecentDeposits()).data.length, 5, "five recent deposits");
eq((await funded.data.getAssetActivity("ETH")).data.every((row) => row.currency === "ETH"), true, "asset activity filtered");

/* ------------------------------------------------------------------------ */
/* Scenario variations                                                      */
/* ------------------------------------------------------------------------ */

{
  const empty = fixtures.createFixtureStore("empty");
  eq((await empty.data.listTransactions({ page: 1, pageSize: 10 })).status, "empty", "empty account has no activity");
  eq((await empty.data.listAllocations()).status, "empty", "empty account has no allocations");
  eq((await empty.data.getNeedsAttention()).status, "ready", "empty account still has real attention items (MFA, verification)");
  const rows = (await empty.data.getAssets()).data;
  ok(rows.every((asset) => asset.enabled && asset.total === "0".padEnd(asset.precision + 2, "0").replace(/^00/, "0.")), "enabled zero wallets show zero, not null");
  eq((await empty.data.getValuation()).data.estimatedTotal, "0.00", "zero estimate is 0.00");
  eq((await empty.data.getValuationHistory("30D")).status, "empty", "no history points for a new account");
  eq((await empty.data.getVerification()).data.state, "not-submitted", "verification not submitted");
  eq((await empty.data.getSecurity()).data.mfa.state, "not-enabled", "MFA not enabled");
}
{
  const partial = fixtures.createFixtureStore("partial-support");
  const rows = (await partial.data.getAssets()).data;
  eq(rows.find((asset) => asset.currency === "LTC").enabled, false, "LTC unsupported");
  eq(rows.find((asset) => asset.currency === "XRP").total, null, "unsupported total is null, not zero");
  eq(rows.find((asset) => asset.currency === "BTC").enabled, true, "BTC still usable");
  const valuation = (await partial.data.getValuation()).data;
  eq(valuation.partial, true, "partial valuation");
  deep(valuation.excluded, ["LTC", "XRP"], "excluded assets named");
  eq(valuation.estimatedTotal, "12250.00", "partial total still exact for the included assets");
  eq((await partial.data.getDepositInstruction("LTC", "litecoin")).status, "unavailable", "no LTC instruction");
  deep((await partial.data.getDepositOptions()).data.map((option) => option.currency), ["BTC", "ETH", "BCH", "USDT"], "deposit options exclude LTC and XRP");
}
{
  const noQuotes = fixtures.createFixtureStore("no-quotes");
  eq((await noQuotes.data.getValuation()).status, "unavailable", "valuation unavailable without quotes");
  const rows = (await noQuotes.data.getAssets()).data;
  eq(rows[0].total, "0.10000000", "balances stay exact");
  eq(rows[0].estimatedUsd, null, "estimate null, never zero");
  ok(rows[0].estimateReason, "estimate reason given");
}
{
  const readError = fixtures.createFixtureStore("read-error");
  for (const name of ["getAssets", "getValuation"]) {
    const result = await readError.data[name]();
    eq(result.status, "error", `${name} fails`);
    eq(result.retryable, true, `${name} retryable`);
  }
  eq((await readError.data.listTransactions({ page: 1, pageSize: 10 })).status, "error", "listTransactions fails");
  eq((await readError.data.getProfile()).status, "ready", "other regions stay usable");
}
{
  const long = fixtures.createFixtureStore("long-values");
  eq((await long.data.getSession()).displayName.length, 42, "42-character name");
  eq((await long.data.getTransaction("tx-wdr-0001")).data.destinationFull.length, 88, "88-character address");
  eq((await long.data.getAssets()).data[0].total, "123456789.12345678", "large exact BTC balance");
  eq((await long.data.getDepositInstruction("BTC", "bitcoin")).data.address.length, 88, "long deposit address");
}
{
  const large = fixtures.createFixtureStore("large-amounts");
  const usdt = (await large.data.getAssets()).data.find((asset) => asset.currency === "USDT");
  eq(add(usdt.available, usdt.reserved), usdt.total, "large USDT buckets reconcile");
  eq(usdt.total, "99999999991.123456", "large USDT total exact");
}
{
  const losing = fixtures.createFixtureStore("losing-outcome");
  const valuation = (await losing.data.getValuation()).data;
  eq(valuation.recordedPnl.amount, "-45.00", "losing 30-day P/L is -45.00 USD");
  eq(valuation.recordedPnl.percent, null, "percent unavailable in the losing scenario");
  const loss = (await losing.data.getTransaction("tx-pnl-0002")).data;
  eq(loss.direction, "debit", "recorded loss is a debit");
  eq(loss.amount, "45.00", "recorded loss magnitude");
}
{
  const pending = fixtures.createFixtureStore("pending-withdrawal");
  const attention = (await pending.data.getNeedsAttention()).data;
  eq(attention.filter((item) => item.kind === "withdrawal-pending").length, 2, "two pending withdrawals need attention");
  eq((await pending.data.listTransactions({ status: "PENDING", type: "WITHDRAWAL", page: 1, pageSize: 10 })).data.total, 2, "two pending rows");
}
{
  const missing = fixtures.createFixtureStore("trader-missing-metrics");
  const traders = (await missing.data.listTraders({ sort: "name" })).data;
  const leila = traders.find((trader) => trader.id === "trader-leila-hassan");
  eq(leila.rating.value, null, "missing rating stays null");
  eq(leila.drawdown.value, null, "missing drawdown stays null");
  eq(leila.risk.label, null, "missing risk stays null");
  eq(traders.find((trader) => trader.id === "trader-alex-morgan").rating.value, 4.7, "other traders keep approved metrics");
}
{
  const noExecution = fixtures.createFixtureStore("allocation-no-execution");
  const allocations = (await noExecution.data.listAllocations()).data;
  ok(allocations.every((allocation) => allocation.executionMode === "unavailable" && allocation.permittedActions.length === 0), "no actions without an execution contract");
  eq((await noExecution.data.getCapabilities()).copyStart.available, false, "copy start capability off");
}
{
  const disabled = fixtures.createFixtureStore("signals-disabled");
  const feed = (await disabled.data.getSignals()).data;
  eq(feed.entitled, false, "not entitled");
  ok(feed.entitlementReason, "entitlement reason given");
  const enabled = (await funded.data.getSignals()).data;
  eq(enabled.signals.length, 3, "three signals in funded");
  eq(enabled.signals.filter((signal) => signal.expired).length, 1, "one expired signal");
  eq(enabled.source, "Operator desk (fixture)", "signal source named");
}
{
  const mfa = fixtures.createFixtureStore("mfa-not-enabled");
  eq((await mfa.data.getSecurity()).data.mfa.state, "not-enabled", "MFA not enabled");
  ok((await mfa.data.getNeedsAttention()).data.some((item) => item.kind === "security-enrollment"), "attention asks for enrollment");
  const review = fixtures.createFixtureStore("verification-in-review");
  const verification = (await review.data.getVerification()).data;
  eq(verification.state, "in-review", "in review");
  eq(verification.documents.length, 2, "two documents");
  eq((await funded.data.getVerification()).data.state, "verified", "funded is verified");
  eq((await funded.data.getSecurity()).data.mfa.state, "enabled", "funded MFA enabled");
}

/* ------------------------------------------------------------------------ */
/* Traders, allocations, notifications                                      */
/* ------------------------------------------------------------------------ */

const traders = (await funded.data.listTraders({ sort: "name" })).data;
eq(traders.length, 6, "six approved profiles");
ok(traders.every((trader) => trader.portrait?.startsWith("/images/traders/") && trader.portraitDisclosure), "approved trader portraits carry a disclosure");
eq((await funded.data.listTraders({ sort: "copiers" })).data[0].name, "Sofia Al-Mansoor", "copiers sort");
eq((await funded.data.listTraders({ sort: "accuracy" })).data[0].name, "Sofia Al-Mansoor", "accuracy sort (81.2%)");
eq((await funded.data.listTraders({ sort: "name", search: "momentum" })).data.length, 1, "search by strategy");
eq((await funded.data.listTraders({ sort: "name", risk: "Low" })).data.length, 2, "risk filter");
eq(traders[0].accuracy.period, "Reporting period not supplied", "missing accuracy period stated truthfully");
const alex = (await funded.data.getTrader("trader-alex-morgan")).data;
eq(alex.name, "Daniel Freeman", "customer preview uses the admin-approved first trader");
ok(alex.history && alex.history.points.length > 0, "first trader has recorded fixture history");
ok(alex.activity && alex.activity.length > 0, "first trader activity comes from the fixture ledger");
eq((await funded.data.getTrader("trader-nobody")).status, "not-found", "unknown trader");

const allocations = (await funded.data.listAllocations()).data;
deep(allocations.map((allocation) => [allocation.id, allocation.status]), [["alloc-0001", "ACTIVE"], ["alloc-0002", "PAUSED"], ["alloc-0003", "STOPPED"], ["alloc-0004", "STOPPING"]], "four allocations");
eq(allocations[0].recordedPnl.amount, "120.00", "active allocation P/L from the ledger");
eq(allocations[2].recordedPnl.amount, "-12.00", "stopped allocation shows its loss");
deep(allocations[0].permittedActions, ["pause", "stop"], "active actions");
deep(allocations[1].permittedActions, ["resume", "stop"], "paused actions");
const stopping = (await funded.data.getAllocation("alloc-0004")).data;
eq(stopping.pendingOperation.kind, "stop", "pending stop visible");
ok(stopping.activity.length > 0 && stopping.fees.length === 1, "detail carries activity and aggregated fees");
eq((await funded.data.getAllocation("alloc-9999")).status, "not-found", "unknown allocation");

const inbox = (await funded.data.listNotifications("all", 1)).data;
eq(inbox.total, 12, "twelve notifications");
eq(inbox.items.length, 10, "inbox page size 10");
eq((await funded.data.listNotifications("unread", 1)).data.total, 3, "three unread");
eq(await funded.data.getUnreadCount(), 3, "unread count 3");
ok(inbox.items.concat((await funded.data.listNotifications("all", 2)).data.items).some((item) => item.href === fixtures.MISSING_RECORD_HREF), "one notification links to the missing record");

/* ------------------------------------------------------------------------ */
/* Actions                                                                  */
/* ------------------------------------------------------------------------ */

const actionOptions = { latencyMs: 5, confirmationDelayMs: null };
const actions = fixtures.createFixtureActions(funded, actionOptions);
let notified = 0;
const unsubscribe = funded.subscribe(() => {
  notified += 1;
});

const marked = await actions.markNotificationRead("ntf-0001");
eq(marked.ok, true, "mark read ok");
eq(marked.data.unreadCount, 2, "unread count decremented");
eq(await funded.data.getUnreadCount(), 2, "store reflects the change");
eq(funded.version, 1, "version bumped");
eq(notified, 1, "subscriber notified");
eq((await actions.markNotificationRead("ntf-9999")).code, "not-found", "unknown notification");

const withdrawalInput = { method: "crypto", currency: "ETH", networkId: "ethereum", address: "0x9a2fD4e6C1b7A3f0E8d5C2b9A6f4E1d7C3b8A5f2", amount: "0.10000000" };
const quote = await actions.quoteWithdrawal(withdrawalInput);
eq(quote.ok, true, "quote ok");
eq(quote.data.fee, "0.00020000", "fee quoted");
eq(quote.data.totalDebit, "0.10020000", "total debit = amount + fee (money.ts)");
eq(quote.data.recipientAmount, "0.10000000", "recipient amount");
eq(quote.data.recipientRef, "0x9a2f…A5f2", "recipient masked");
const tooMuch = await actions.quoteWithdrawal({ ...withdrawalInput, amount: "1.50000000" });
eq(tooMuch.code, "invalid", "amount plus fee above available is invalid");
ok(tooMuch.fieldErrors.amount, "amount field error");
eq((await actions.quoteWithdrawal({ ...withdrawalInput, amount: "0.100000001" })).code, "invalid", "a non-zero ninth decimal is rejected for an 8-decimal asset");
eq((await actions.quoteWithdrawal({ ...withdrawalInput, amount: "0.1000000000" })).ok, true, "redundant trailing zeros are accepted exactly");
const noTag = await actions.quoteWithdrawal({ method: "crypto", currency: "XRP", networkId: "xrp-ledger", address: "rExampleDestination12345", amount: "1.000000" });
ok(noTag.fieldErrors?.tag, "XRP needs a destination tag");
const bank = await actions.quoteWithdrawal({ method: "bank", currency: "USDT", denomination: "USD", amount: "100.000000", fields: { accountHolder: "Jordan Avery", country: "United Kingdom", iban: "GB33BUKB20201555555555", swift: "BUKBGB22" } });
eq(bank.ok, true, "bank quote ok");
eq(bank.data.totalDebit, "102.500000", "bank fee applied");
ok(bank.data.recipientRef.startsWith("Jordan Avery, IBAN GB33BU"), "bank recipient reference");
const badBank = await actions.quoteWithdrawal({ method: "bank", currency: "USDT", denomination: "USD", amount: "100.000000", fields: { accountHolder: "", country: "UK", iban: "nope", swift: "x" } });
ok(badBank.fieldErrors["fields.accountHolder"] && badBank.fieldErrors["fields.iban"] && badBank.fieldErrors["fields.swift"], "bank field errors keyed by field");

const before = (await funded.data.listTransactions({ page: 1, pageSize: 10 })).data.total;
const submitted = await actions.submitWithdrawal(withdrawalInput, quote.data.quoteId, "idem-0001");
eq(submitted.ok, true, "submit ok");
eq(submitted.data.status, "PENDING", "submitted request is pending");
eq(submitted.data.reference, "WDR-2026-0004", "reference continues the sequence");
const again = await actions.submitWithdrawal(withdrawalInput, quote.data.quoteId, "idem-0001");
eq(again.ok, true, "resubmission with the same key succeeds");
eq(again.data.requestId, submitted.data.requestId, "same key → same request, no duplicate");
eq((await funded.data.listTransactions({ page: 1, pageSize: 10 })).data.total, before + 1, "exactly one row added");
eq((await actions.submitWithdrawal(withdrawalInput, quote.data.quoteId, "idem-0002")).code, "invalid", "a consumed quote cannot be reused");
const quote2 = await actions.quoteWithdrawal(withdrawalInput);
eq((await actions.submitWithdrawal({ ...withdrawalInput, amount: "0.05000000" }, quote2.data.quoteId, "idem-0003")).code, "invalid", "changed input invalidates the quote");
eq((await actions.reconcileWithdrawal("idem-0001")).data.requestId, submitted.data.requestId, "reconcile by key");
eq((await actions.reconcileWithdrawal("idem-none")).code, "not-found", "unknown key not-found");
ok((await funded.data.getNeedsAttention()).data.some((item) => item.id === `attention-${submitted.data.requestId}`), "new request needs attention");
eq(await funded.data.getUnreadCount(), 3, "submission adds an unread notification");
const cancelled = await actions.cancelTransaction(submitted.data.requestId);
eq(cancelled.ok, true, "cancel ok");
eq(cancelled.data.status, "CANCELLED", "cancelled status");
eq((await actions.cancelTransaction(submitted.data.requestId)).code, "invalid", "cannot cancel twice");
eq((await actions.cancelTransaction("tx-dep-0001")).code, "invalid", "cannot cancel a deposit");
eq((await funded.data.getAssets()).data[1].total, "2.00000000", "balances are untouched until approval");

const copy = await actions.requestCopy("trader-alex-morgan", { currency: "USDT", amount: "100.000000", executionMode: "manual-allocation", riskAcknowledged: true });
eq(copy.ok, true, "copy request ok");
eq(copy.data.status, "PENDING", "copy request pending");
eq(copy.data.allocationId, "alloc-0005", "new allocation id");
eq(copy.data.reference, "COPY-REQ-0001", "copy reference");
eq((await funded.data.listAllocations()).data.length, 5, "pending allocation listed");
eq((await funded.data.getAllocation("alloc-0005")).data.status, "PENDING", "pending allocation detail");
eq((await actions.requestCopy("trader-alex-morgan", { currency: "USDT", amount: "100.000000", executionMode: "manual-allocation", riskAcknowledged: false })).fieldErrors.riskAcknowledged !== undefined, true, "risk acknowledgement required");
eq((await actions.requestCopy("trader-alex-morgan", { currency: "USDT", amount: "50.000000", executionMode: "manual-allocation", riskAcknowledged: true })).fieldErrors.amount !== undefined, true, "below minimum allocation");
eq((await actions.requestCopy("trader-nobody", { currency: "USDT", amount: "100.000000", executionMode: "manual-allocation", riskAcknowledged: true })).code, "not-found", "unknown trader");

const stopped = await actions.stopAllocation("alloc-0001");
eq(stopped.ok, true, "stop ok");
eq(stopped.data.status, "STOPPING", "stop is pending confirmation");
deep(stopped.data.permittedActions, [], "no actions while stopping");
eq((await funded.data.getAllocation("alloc-0001")).data.pendingOperation.kind, "stop", "pending operation persisted");
eq((await funded.data.getAllocation("alloc-0001")).data.status, "STOPPING", "still stopping before the confirmation tick");
eq((await actions.pauseAllocation("alloc-0002")).code, "invalid", "cannot pause a paused allocation");
eq((await actions.resumeAllocation("alloc-0002")).data.status, "ACTIVE", "resume ok");
eq((await actions.pauseAllocation("alloc-0002")).data.status, "PAUSED", "pause ok");
eq(fixtures.settlePendingOperations(funded), 3, "confirmation tick settles the two pending stops and the pending copy request");
eq((await funded.data.getAllocation("alloc-0001")).data.status, "STOPPED", "stopped after confirmation");
eq((await funded.data.getAllocation("alloc-0001")).data.pendingOperation, null, "pending operation cleared");
eq((await funded.data.getAllocation("alloc-0005")).data.status, "ACTIVE", "copy request activated");

const profile = await actions.saveProfile({ fullName: "Jordan A. Avery", phone: "+44 20 7946 0001" });
eq(profile.ok, true, "profile saved");
eq((await funded.data.getSession()).displayName, "Jordan A. Avery", "session name follows the profile");
eq((await funded.data.getSession()).initials, "JA", "initials recomputed");
eq((await actions.saveProfile({ phone: "abc" })).fieldErrors.phone !== undefined, true, "phone validation");
eq((await actions.changePassword({ currentPassword: "wrong", newPassword: "a-long-new-password" })).fieldErrors.currentPassword !== undefined, true, "wrong current password");
eq((await actions.changePassword({ currentPassword: fixtures.FIXTURE_CURRENT_PASSWORD, newPassword: "a-long-new-password" })).ok, true, "password changed");
eq((await actions.startMfaEnrollment()).code, "invalid", "already enabled in funded");
eq((await actions.disableMfa(fixtures.FIXTURE_FACTOR_ID, "000000")).fieldErrors.code !== undefined, true, "wrong code");
eq((await actions.disableMfa(fixtures.FIXTURE_FACTOR_ID, fixtures.FIXTURE_MFA_CODE)).data.state, "not-enabled", "disabled");

const proof = await actions.submitDepositProof({ currency: "BTC", networkId: "bitcoin", txHash: "f".repeat(64), note: "sent from my wallet" });
eq(proof.ok, true, "proof submitted");
eq(proof.data.reference, "DEP-REQ-0001", "proof reference");
eq(proof.data.status, "PENDING", "proof pending");
ok((await funded.data.getNeedsAttention()).data.some((item) => item.kind === "deposit-review"), "proof needs review");
eq((await funded.data.getAssets()).data[0].total, "0.10000000", "proof never credits a balance");
eq((await actions.submitDepositProof({ currency: "BTC", networkId: "tron", txHash: "short" })).code, "invalid", "invalid proof input");
eq((await actions.submitVerification({ documentType: "Passport", files: [{ side: "front", fileName: "a.png", contentType: "image/png", sizeBytes: 100 }] })).code, "invalid", "verified account cannot resubmit");
unsubscribe();
const versionAfter = funded.version;
await actions.markAllNotificationsRead();
eq(funded.version, versionAfter + 1, "commits keep bumping after unsubscribe");
eq(notified > 5, true, "subscriber was notified for each commit while subscribed");

{
  const mfa = fixtures.createFixtureStore("mfa-not-enabled");
  const mfaActions = fixtures.createFixtureActions(mfa, actionOptions);
  const enrollment = await mfaActions.startMfaEnrollment();
  eq(enrollment.ok, true, "enrollment started");
  eq(enrollment.data.factorId, fixtures.FIXTURE_FACTOR_ID, "fixture factor id");
  ok(enrollment.data.secret.includes("FIXTURE"), "secret labelled as fixture");
  eq((await mfa.data.getSecurity()).data.mfa.state, "enrollment-pending", "pending after start");
  eq((await mfaActions.verifyMfaEnrollment(enrollment.data.factorId, "111111")).code, "invalid", "wrong code rejected");
  eq((await mfaActions.verifyMfaEnrollment(enrollment.data.factorId, fixtures.FIXTURE_MFA_CODE)).data.state, "enabled", "verified");
  eq((await mfa.data.getSecurity()).data.mfa.state, "enabled", "security shows enabled");
}
{
  const review = fixtures.createFixtureStore("verification-in-review");
  const reviewActions = fixtures.createFixtureActions(review, actionOptions);
  const removed = await reviewActions.removeVerificationDocument("doc-0003");
  eq(removed.ok, true, "document removed");
  eq(removed.data.documents.length, 1, "one document left");
  eq((await reviewActions.removeVerificationDocument("doc-0003")).code, "not-found", "removed document not-found");
  const resubmitted = await reviewActions.submitVerification({ documentType: "Passport", files: [{ side: "front", fileName: "p.jpg", contentType: "image/jpeg", sizeBytes: 1000 }, { side: "back", fileName: "b.jpg", contentType: "image/jpeg", sizeBytes: 1000 }] });
  eq(resubmitted.ok, true, "resubmission ok");
  eq(resubmitted.data.state, "in-review", "still in review, never verified by upload");
  eq(resubmitted.data.documents.length, 2, "two new documents");
  eq((await reviewActions.submitVerification({ documentType: "Passport", files: [{ side: "front", fileName: "p.exe", contentType: "application/octet-stream", sizeBytes: 1000 }] })).code, "invalid", "unaccepted type");
}
{
  const unknown = fixtures.createFixtureStore("unknown-outcome");
  const unknownActions = fixtures.createFixtureActions(unknown, actionOptions);
  const q = await unknownActions.quoteWithdrawal(withdrawalInput);
  const before = (await unknown.data.listTransactions({ page: 1, pageSize: 10 })).data.total;
  const result = await unknownActions.submitWithdrawal(withdrawalInput, q.data.quoteId, "idem-unknown");
  eq(result.ok, false, "submission times out");
  eq(result.code, "unknown-outcome", "unknown outcome code");
  eq(result.reference, "idem-unknown", "reference for reconciliation");
  const reconciled = await unknownActions.reconcileWithdrawal("idem-unknown");
  eq(reconciled.ok, true, "reconcile finds the request");
  eq(reconciled.data.status, "PENDING", "reconciled receipt pending");
  const retry = await unknownActions.submitWithdrawal(withdrawalInput, q.data.quoteId, "idem-unknown");
  eq(retry.ok, true, "retry with the same key returns the receipt");
  eq(retry.data.requestId, reconciled.data.requestId, "no second request");
  eq((await unknown.data.listTransactions({ page: 1, pageSize: 10 })).data.total, before + 1, "exactly one request recorded");
}
{
  const failing = fixtures.createFixtureStore("write-failure");
  const failingActions = fixtures.createFixtureActions(failing, actionOptions);
  const samples = {
    submitDepositProof: [{ currency: "BTC", networkId: "bitcoin", txHash: "f".repeat(64) }],
    quoteWithdrawal: [withdrawalInput],
    submitWithdrawal: [withdrawalInput, "quote-0001", "key"],
    reconcileWithdrawal: ["key"],
    cancelTransaction: ["tx-wdr-0001"],
    requestCopy: ["trader-alex-morgan", { currency: "USDT", amount: "100.000000", executionMode: "manual-allocation", riskAcknowledged: true }],
    pauseAllocation: ["alloc-0001"],
    resumeAllocation: ["alloc-0002"],
    stopAllocation: ["alloc-0001"],
    markNotificationRead: ["ntf-0001"],
    markAllNotificationsRead: [],
    saveProfile: [{ fullName: "X" }],
    changePassword: [{ currentPassword: fixtures.FIXTURE_CURRENT_PASSWORD, newPassword: "a-long-new-password" }],
    startMfaEnrollment: [],
    verifyMfaEnrollment: [fixtures.FIXTURE_FACTOR_ID, fixtures.FIXTURE_MFA_CODE],
    disableMfa: [fixtures.FIXTURE_FACTOR_ID, fixtures.FIXTURE_MFA_CODE],
    submitVerification: [{ documentType: "Passport", files: [{ side: "front", fileName: "a.png", contentType: "image/png", sizeBytes: 1 }] }],
    removeVerificationDocument: ["doc-0005"],
  };
  for (const name of DASHBOARD_ACTION_NAMES) {
    const result = await failingActions[name](...samples[name]);
    eq(result.ok, false, `${name} fails in write-failure`);
    eq(result.code, "failed", `${name} → failed`);
  }
  eq(failing.version, 0, "nothing changed after failed writes");
  eq(await failing.data.getUnreadCount(), 3, "unread count unchanged");
}
{
  const timed = fixtures.createFixtureStore("funded");
  const timedActions = fixtures.createFixtureActions(timed, { latencyMs: 60, confirmationDelayMs: null });
  const started = Date.now();
  await timedActions.markAllNotificationsRead();
  ok(Date.now() - started >= 50, "simulated latency is applied so busy states are visible");
  const clamped = fixtures.createFixtureActions(timed, { latencyMs: 5000, confirmationDelayMs: null });
  const start2 = Date.now();
  await clamped.markAllNotificationsRead();
  ok(Date.now() - start2 < 1000, "latency is clamped to at most 400 ms");
}

console.log(`Passed: ${checks} fixture checks (16 scenarios build with valid region statuses; funded accounting reconciles per asset and in USD at 12250.00 / 9550.00 / 2700.00; idempotent submitWithdrawal; unknown-outcome reconcile; unread counts; allocation lifecycle; write-failure). In-memory only; no network, database or account actions.`);
