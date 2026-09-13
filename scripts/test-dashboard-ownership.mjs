// Ownership checks for the live adapter (lib/dashboard/adapters/live.ts),
// the server queries and the server actions. Prisma, Supabase, `server-only`,
// `react` and `next/cache` are stubbed through the module loader; every
// recorded Prisma call on an owned model must be scoped by the internal
// User.id, and a foreign record must come back as not-found. No network, no
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

const { toFixed } = createLoader()("@/lib/dashboard/money");
const dec = (text) => ({ toFixed: (dp) => toFixed(text, dp ?? 8, "half-up") });
const date = (iso) => new Date(iso);

/* ------------------------------------------------------------------------ */
/* Stubbed Prisma client: an in-memory dataset with two owners.             */
/* ------------------------------------------------------------------------ */

function dataset() {
  return {
    user: [
      { id: "user-A", supabaseUid: "sb-A", email: "ann@example.com", fullName: "Ann Able", phone: null, country: "UK", status: "ACTIVE", twoFactorEnabled: false, createdAt: date("2026-01-01T00:00:00Z") },
      { id: "user-B", supabaseUid: "sb-B", email: "bob@example.com", fullName: "Bob Baker", phone: null, country: null, status: "ACTIVE", twoFactorEnabled: false, createdAt: date("2026-01-01T00:00:00Z") },
      { id: "user-C", supabaseUid: "sb-C", email: "cy@example.com", fullName: null, phone: null, country: null, status: "SUSPENDED", twoFactorEnabled: false, createdAt: date("2026-01-01T00:00:00Z") },
    ],
    wallet: [
      { id: "w1", userId: "user-A", currency: "BTC", balance: dec("0.1"), updatedAt: date("2026-09-06T12:00:00Z") },
      { id: "w2", userId: "user-A", currency: "USDT", balance: dec("1250"), updatedAt: date("2026-09-06T12:00:00Z") },
      { id: "w3", userId: "user-A", currency: "USD", balance: dec("12.5"), updatedAt: date("2026-09-06T12:00:00Z") },
      { id: "w4", userId: "user-B", currency: "BTC", balance: dec("5"), updatedAt: date("2026-09-06T12:00:00Z") },
    ],
    transaction: [
      { id: "tx-A1", userId: "user-A", type: "DEPOSIT", currency: "BTC", amount: dec("0.05"), fee: dec("0"), status: "APPROVED", txHash: "a".repeat(64), paymentProof: "https://storage.example/proof.png", notes: null, createdAt: date("2026-08-01T10:00:00Z"), updatedAt: date("2026-08-01T14:00:00Z") },
      { id: "tx-A2", userId: "user-A", type: "WITHDRAWAL", currency: "ETH", amount: dec("0.5"), fee: dec("0.0002"), status: "PENDING", txHash: null, paymentProof: null, notes: "Withdrawal to 0x9a2fD4e6C1b7A3f0E8d5C2b9A6f4E1d7C3b8A5f2", createdAt: date("2026-09-04T09:00:00Z"), updatedAt: date("2026-09-04T09:00:00Z") },
      { id: "tx-A3", userId: "user-A", type: "PROFIT_ACCRUAL", currency: "USD", amount: dec("12.5"), fee: dec("0"), status: "FROZEN", txHash: null, paymentProof: null, notes: null, createdAt: date("2026-09-02T16:00:00Z"), updatedAt: date("2026-09-02T16:00:00Z") },
      { id: "tx-B1", userId: "user-B", type: "WITHDRAWAL", currency: "BTC", amount: dec("1"), fee: dec("0.0001"), status: "PENDING", txHash: null, paymentProof: null, notes: "to bc1qsecretdestinationofbob0000000000000000", createdAt: date("2026-09-05T09:00:00Z"), updatedAt: date("2026-09-05T09:00:00Z") },
    ],
    copyTrader: [
      { id: "trader-1", name: "Alex", avatar: "/images/community/alex-morgan.webp", tagline: "Swing", winRate: dec("60"), profitShare: dec("15"), riskLevel: "MEDIUM", minCapital: dec("100"), totalFollowers: 128, status: "Published", isActive: true },
      { id: "trader-2", name: "Zed", avatar: null, tagline: null, winRate: dec("50"), profitShare: dec("10"), riskLevel: "LOW", minCapital: dec("50"), totalFollowers: 3, status: "Published", isActive: false },
    ],
    userCopyTrade: [
      { id: "alloc-A1", userId: "user-A", traderId: "trader-1", allocatedUsd: dec("250"), status: "ACTIVE", totalEarned: dec("12.5"), createdAt: date("2026-08-01T00:00:00Z"), updatedAt: date("2026-08-02T00:00:00Z") },
      { id: "alloc-B1", userId: "user-B", traderId: "trader-1", allocatedUsd: dec("900"), status: "FROZEN", totalEarned: dec("0"), createdAt: date("2026-08-01T00:00:00Z"), updatedAt: date("2026-08-01T00:00:00Z") },
    ],
    kycDocument: [
      { id: "kyc-A", userId: "user-A", documentType: "PASSPORT", frontUrl: "https://storage.example/private/ann-front.jpg", backUrl: "https://storage.example/private/ann-back.jpg", status: "PENDING", rejectionMsg: null, createdAt: date("2026-09-01T00:00:00Z"), updatedAt: date("2026-09-01T00:00:00Z") },
    ],
    notification: [
      { id: "ntf-A1", userId: "user-A", title: "Hello", message: "Welcome", isRead: false, createdAt: date("2026-09-05T00:00:00Z") },
      { id: "ntf-A2", userId: "user-A", title: "Old", message: "Read already", isRead: true, createdAt: date("2026-09-01T00:00:00Z") },
      { id: "ntf-B1", userId: "user-B", title: "Bob", message: "Private to Bob", isRead: false, createdAt: date("2026-09-05T00:00:00Z") },
    ],
    systemSetting: [
      { id: "s1", key: "deposit-instruction:BTC:bitcoin", value: JSON.stringify({ networkName: "Bitcoin", address: "bc1qoperatoraddress0000", confirmations: 3 }) },
      { id: "s2", key: "deposit-instruction:ETH:ethereum", value: "{broken json" },
      { id: "s3", key: "site-name", value: "Crypto Index Asset" },
    ],
    tradingSignal: [],
    ledgerEntry: [],
  };
}

function matches(row, where) {
  for (const [key, condition] of Object.entries(where ?? {})) {
    if (key === "userId_currency") {
      if (row.userId !== condition.userId || row.currency !== condition.currency) return false;
      continue;
    }
    const value = row[key];
    if (condition !== null && typeof condition === "object" && !(condition instanceof Date)) {
      if ("in" in condition && !condition.in.includes(value)) return false;
      if ("startsWith" in condition && !(typeof value === "string" && value.startsWith(condition.startsWith))) return false;
      if ("gte" in condition && !(value >= condition.gte)) return false;
      if ("lte" in condition && !(value <= condition.lte)) return false;
      if ("equals" in condition && value !== condition.equals) return false;
    } else if (value !== condition) {
      return false;
    }
  }
  return true;
}

function createPrismaStub({ failing = false } = {}) {
  const data = dataset();
  const calls = [];
  function rows(model, args) {
    let list = data[model].filter((row) => matches(row, args?.where));
    if (args?.orderBy) {
      const [[field, direction]] = Object.entries(args.orderBy);
      list = [...list].sort((a, b) => {
        const x = a[field];
        const y = b[field];
        const cmp = x instanceof Date ? x.getTime() - y.getTime() : String(x).localeCompare(String(y));
        return direction === "desc" ? -cmp : cmp;
      });
    }
    if (args?.skip) list = list.slice(args.skip);
    if (args?.take !== undefined) list = list.slice(0, args.take);
    return list.map((row) => {
      const copy = { ...row };
      if (model === "userCopyTrade" && args?.select?.trader) {
        const trader = data.copyTrader.find((candidate) => candidate.id === row.traderId);
        copy.trader = trader ? { name: trader.name, avatar: trader.avatar } : null;
      }
      return copy;
    });
  }
  const client = {};
  for (const model of Object.keys(data)) {
    const record = (method, args) => calls.push({ model, method, args });
    client[model] = {
      async findMany(args) {
        record("findMany", args);
        if (failing) throw new Error(`stub failure for ${JSON.stringify(args)}`);
        return rows(model, args);
      },
      async findFirst(args) {
        record("findFirst", args);
        if (failing) throw new Error("stub failure");
        return rows(model, args)[0] ?? null;
      },
      async findUnique(args) {
        record("findUnique", args);
        if (failing) throw new Error("stub failure");
        return rows(model, args)[0] ?? null;
      },
      async count(args) {
        record("count", args);
        if (failing) throw new Error("stub failure");
        return rows(model, args).length;
      },
      async updateMany(args) {
        record("updateMany", args);
        if (failing) throw new Error("stub failure");
        const targets = data[model].filter((row) => matches(row, args.where));
        for (const row of targets) Object.assign(row, args.data);
        return { count: targets.length };
      },
      async update(args) {
        record("update", args);
        if (failing) throw new Error("stub failure");
        const target = data[model].find((row) => matches(row, args.where));
        if (!target) throw new Error("Record not found");
        Object.assign(target, args.data);
        return { ...target };
      },
    };
  }
  return { prisma: client, calls, data };
}

function createSupabaseStub({ user, factors = [], acceptPassword = "correct horse", acceptCode = "123456" } = {}) {
  const log = [];
  const client = {
    auth: {
      async getUser() {
        return user ? { data: { user }, error: null } : { data: { user: null }, error: { message: "no session" } };
      },
      async signInWithPassword({ email, password }) {
        log.push(["signInWithPassword", email]);
        return password === acceptPassword ? { data: {}, error: null } : { data: {}, error: { message: "Invalid login credentials" } };
      },
      async updateUser(attributes) {
        log.push(["updateUser", Object.keys(attributes)]);
        return { data: {}, error: null };
      },
      mfa: {
        async listFactors() {
          log.push(["listFactors"]);
          return { data: { all: factors, totp: factors.filter((factor) => factor.factor_type === "totp"), phone: [] }, error: null };
        },
        async enroll(params) {
          log.push(["enroll", params.factorType]);
          return { data: { id: "factor-new", type: "totp", totp: { qr_code: "data:image/svg+xml;utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3C%2Fsvg%3E", secret: "SECRET", uri: "otpauth://x" } }, error: null };
        },
        async challenge({ factorId }) {
          log.push(["challenge", factorId]);
          return { data: { id: "challenge-1", type: "totp", expires_at: 0 }, error: null };
        },
        async verify({ factorId, challengeId, code }) {
          log.push(["verify", factorId, challengeId]);
          return code === acceptCode ? { data: {}, error: null } : { data: null, error: { message: "Invalid TOTP code" } };
        },
        async unenroll({ factorId }) {
          log.push(["unenroll", factorId]);
          return { data: { id: factorId }, error: null };
        },
      },
    },
  };
  return { client, log };
}

function boot({ user, factors, failing, acceptPassword } = {}) {
  const prismaStub = createPrismaStub({ failing });
  const supabaseStub = createSupabaseStub({ user, factors, acceptPassword });
  const revalidations = [];
  const load = createLoader({
    "server-only": {},
    react: { cache: (fn) => fn },
    "next/cache": { revalidatePath: (...args) => revalidations.push(args) },
    "@/lib/db/prisma": { prisma: prismaStub.prisma },
    "@/lib/supabase/server": { createClient: async () => supabaseStub.client },
    "@/lib/supabase/config": { getSupabaseConfig: () => ({ url: "https://example.test", key: "test-only" }) },
  });
  const queries = load("@/lib/dashboard/queries.server");
  const mutations = load("@/lib/dashboard/mutations.server");
  const mappers = load("@/lib/dashboard/adapters/mappers");
  return { queries, mutations, mappers, calls: prismaStub.calls, data: prismaStub.data, supabase: supabaseStub.log, revalidations };
}

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

const OWNED_MODELS = new Set(["wallet", "transaction", "userCopyTrade", "kycDocument", "notification", "ledgerEntry"]);
function assertOwnership(calls, userId, supabaseUid) {
  for (const call of calls) {
    const where = call.args?.where ?? {};
    const label = `${call.model}.${call.method} ${JSON.stringify(where)}`;
    if (OWNED_MODELS.has(call.model)) {
      const owner = where.userId ?? where.userId_currency?.userId;
      assert.equal(owner, userId, `owned model call must be scoped by the internal user id: ${label}`);
    } else if (call.model === "user") {
      assert.ok(where.id === userId || where.supabaseUid === supabaseUid, `user lookups only by supabaseUid mapping or own id: ${label}`);
    } else {
      assert.ok(call.model === "copyTrader" || call.model === "systemSetting" || call.model === "tradingSignal", `unexpected model in call: ${label}`);
    }
    checks += 1;
  }
}

const annUser = { id: "sb-A", email: "ann@example.com" };
const verifiedFactor = { id: "factor-1", factor_type: "totp", status: "verified", friendly_name: "Authenticator app", created_at: "2026-08-01T00:00:00Z", updated_at: "2026-08-01T00:00:00Z" };

/* ------------------------------------------------------------------------ */
/* Session states                                                           */
/* ------------------------------------------------------------------------ */

{
  const anonymous = boot({ user: null });
  deep(await anonymous.queries.getSessionAccount(), { state: "unauthenticated" }, "no Supabase user → unauthenticated");
  const data = await anonymous.queries.getDashboardData();
  eq((await data.getAssets()).status, "unavailable", "unauthenticated data is unavailable");
  eq(await data.getUnreadCount(), 0, "unauthenticated unread count is 0");
  eq(anonymous.calls.length, 0, "no Prisma call without a session");
  const expired = await anonymous.mutations.markAllNotificationsRead();
  eq(expired.ok, false, "action without session fails");
  eq(expired.code, "session-expired", "action without session → session-expired");
}
{
  const stranger = boot({ user: { id: "sb-Z", email: "z@example.com" } });
  deep(await stranger.queries.getSessionAccount(), { state: "unprovisioned", email: "z@example.com" }, "Supabase user without a User row → unprovisioned");
  eq((await (await stranger.queries.getDashboardData()).getProfile()).status, "unavailable", "unprovisioned regions unavailable");
  const forbidden = await stranger.mutations.saveProfile({ fullName: "Z" });
  eq(forbidden.code, "forbidden", "unprovisioned action → forbidden");
  eq(stranger.calls.filter((call) => call.model !== "user").length, 0, "unprovisioned never touches owned models");
}
{
  const suspended = boot({ user: { id: "sb-C", email: "cy@example.com" } });
  const session = await suspended.queries.getSessionAccount();
  eq(session.state, "restricted", "SUSPENDED → restricted");
  eq(session.email, "cy@example.com", "restricted carries the email");
  const result = await suspended.mutations.markAllNotificationsRead();
  eq(result.code, "forbidden", "restricted action → forbidden");
}

/* ------------------------------------------------------------------------ */
/* Authenticated reads, all scoped by user-A                                */
/* ------------------------------------------------------------------------ */

const ann = boot({ user: annUser, factors: [verifiedFactor] });
const session = await ann.queries.getSessionAccount();
eq(session.state, "authenticated", "sb-A → authenticated");
eq(session.userId, "user-A", "userId is the Prisma id, not auth.uid()");
eq(session.supabaseUid, "sb-A", "supabaseUid kept");
eq(session.displayName, "Ann Able", "display name from record");
eq(session.initials, "AA", "initials");
deep(session.restrictions, [], "active account has no restrictions");

const data = await ann.queries.getDashboardData();
const assets = await data.getAssets();
eq(assets.status, "ready", "assets ready");
const btc = assets.data.find((asset) => asset.currency === "BTC");
eq(btc.total, "0.10000000", "Ann's BTC total, not Bob's");
eq(btc.available, "0.10000000", "available balance equals balance minus zero reserved");
eq(btc.networks[0]?.id, "bitcoin", "network from a valid deposit setting");
eq(assets.data.find((asset) => asset.currency === "ETH").enabled, false, "missing ETH wallet disabled");
eq(assets.data.find((asset) => asset.currency === "ETH").networks.length, 0, "invalid ETH setting advertises no network");
const settlement = await data.getSettlementLedger();
eq(settlement.status, "ready", "settlement ready");
eq(settlement.data.balance, "12.50", "USD settlement row");
eq((await data.getAsset("BTC")).status, "ready", "single asset");
eq((await data.getAsset("DOGE")).status, "not-found", "unsupported asset not-found");
const valuation = await data.getValuation();
eq(valuation.status, "ready", "valuation ready with live/fallback quotes");
const history = await data.getValuationHistory("30D");
eq(history.status, "ready", "history ready");
const page = await data.listTransactions({ page: 1, pageSize: 10 });
eq(page.status, "ready", "transactions ready");
eq(page.data.total, 3, "only Ann's three rows are counted");
deep(page.data.items.map((row) => row.id), ["tx-A2", "tx-A3", "tx-A1"], "newest first, Bob's row absent");
eq(page.data.items[1].status, "UNKNOWN", "unknown enum surfaces as UNKNOWN");
eq(page.data.items[1].rawStatus, "FROZEN", "raw enum preserved");
ok(!JSON.stringify(page).includes("storage.example"), "payment proof URL never leaves the adapter");
const filtered = await data.listTransactions({ type: "WITHDRAWAL", page: 1, pageSize: 10 });
eq(filtered.data.total, 1, "type filter applied server-side");
eq((await data.listTransactions({ type: "ADJUSTMENT", page: 1, pageSize: 10 })).data.total, 0, "ADJUSTMENT filter (not a Prisma enum) is an empty ready page");
eq((await data.listTransactions({ status: "UNKNOWN", page: 1, pageSize: 10 })).data.total, 0, "UNKNOWN filter is an empty ready page");
const ranged = await data.listTransactions({ from: "2026-09-03", to: "2026-09-04", page: 1, pageSize: 10 });
eq(ranged.data.total, 1, "date range applied inclusively");
const detail = await data.getTransaction("tx-A2");
eq(detail.status, "ready", "own transaction detail");
eq(detail.data.destinationFull, "0x9a2fD4e6C1b7A3f0E8d5C2b9A6f4E1d7C3b8A5f2", "own destination in detail");
eq((await data.getTransaction("tx-B1")).status, "not-found", "foreign transaction is not-found");
eq((await data.getTransaction("")).status, "not-found", "empty id is not-found");
eq((await data.getAssetActivity("ETH")).data.length, 1, "asset activity filtered by currency");
eq((await data.getAssetActivity("BCH")).status, "empty", "asset without rows is empty");
const deposits = await data.listRecentDeposits();
eq(deposits.data.length, 1, "recent deposits");
const options = await data.getDepositOptions();
eq(options.status, "ready", "deposit options from settings");
deep(options.data.map((option) => option.currency), ["BTC"], "only the valid setting is offered");
const instruction = await data.getDepositInstruction("BTC", "bitcoin");
eq(instruction.status, "ready", "instruction ready");
eq(instruction.data.address, "bc1qoperatoraddress0000", "address from the setting");
eq(instruction.data.confirmations, 3, "confirmations from the setting");
eq((await data.getDepositInstruction("ETH", "ethereum")).status, "unavailable", "invalid setting → unavailable");
eq((await data.getDepositInstruction("BTC", "../etc")).status, "unavailable", "bad network id → unavailable, no query");
eq((await data.getDepositProofRules()).status, "ready", "proof upload rules ready");
const withdrawal = await data.getWithdrawalOptions();
eq(withdrawal.data.methods.find((m) => m.id === "crypto").available, true, "crypto withdrawal enabled");
eq(withdrawal.data.methods.find((m) => m.id === "bank").available, false, "bank wire unavailable");
eq(withdrawal.data.bankScheme, null, "no bank scheme");
const traders = await data.listTraders({ sort: "name" });
eq(traders.status, "ready", "traders ready");
deep(traders.data.map((trader) => trader.id), ["trader-1"], "inactive traders excluded");
eq((await data.getTrader("trader-2")).status, "not-found", "inactive trader not-found");
eq((await data.getTrader("trader-1")).data.executionMode, "unavailable", "no execution contract");
const allocations = await data.listAllocations();
deep(allocations.data.map((allocation) => allocation.id), ["alloc-A1"], "only Ann's allocation");
eq(allocations.data[0].traderName, "Alex", "trader joined");
eq((await data.getAllocation("alloc-B1")).status, "not-found", "foreign allocation not-found");
eq((await data.getAllocation("alloc-A1")).status, "ready", "own allocation ready");
eq((await data.getSignals()).status, "ready", "signals feed ready");
const inbox = await data.listNotifications("all", 1);
eq(inbox.data.total, 2, "Ann's notifications only");
eq((await data.listNotifications("unread", 1)).data.total, 1, "unread filter");
eq(await data.getUnreadCount(), 1, "unread count scoped");
const profile = await data.getProfile();
eq(profile.data.email, "ann@example.com", "profile");
const security = await data.getSecurity();
eq(security.data.mfa.state, "enabled", "MFA from provider factors");
eq(security.data.sessions, null, "no session source");
const verification = await data.getVerification();
eq(verification.data.state, "in-review", "KYC PENDING → in review");
eq(verification.data.documents.length, 2, "front and back present");
ok(!JSON.stringify(verification).includes("storage.example"), "KYC file URLs never leave the adapter");
const attention = await data.getNeedsAttention();
eq(attention.status, "ready", "attention ready");
deep(attention.data.map((item) => item.kind), ["withdrawal-pending"], "pending withdrawal only (MFA enabled, KYC in review)");
eq((await data.listRecentActivity(2)).data.length, 2, "recent activity limit");
eq((await data.getCapabilities()).withdrawBank.available, false, "capabilities reflect missing contracts");
eq((await data.getCapabilities()).withdrawCrypto.available, true, "crypto withdrawals enabled");

assertOwnership(ann.calls, "user-A", "sb-A");
ok(ann.calls.filter((call) => OWNED_MODELS.has(call.model)).length >= 20, "a meaningful number of owned-model calls were checked");

/* ------------------------------------------------------------------------ */
/* Actions                                                                  */
/* ------------------------------------------------------------------------ */

const foreign = await ann.mutations.markNotificationRead("ntf-B1");
eq(foreign.ok, false, "foreign notification cannot be marked");
eq(foreign.code, "not-found", "foreign notification → not-found");
eq(ann.data.notification.find((row) => row.id === "ntf-B1").isRead, false, "Bob's row untouched");
const marked = await ann.mutations.markNotificationRead("ntf-A1");
eq(marked.ok, true, "own notification marked");
eq(marked.data.unreadCount, 0, "unread count after marking");
eq(marked.data.notification.read, true, "returned notification is read");
deep(ann.revalidations.at(-1), ["/dashboard", "layout"], "revalidatePath after a write");
const revalidationsBefore = ann.revalidations.length;
eq((await ann.mutations.markNotificationRead("")).code, "invalid", "empty id is invalid");
eq(ann.revalidations.length, revalidationsBefore, "no revalidation after a failed write");
const all = await ann.mutations.markAllNotificationsRead();
eq(all.ok, true, "mark all ok");
eq(all.data.updated, 0, "nothing left to update");
const saved = await ann.mutations.saveProfile({ fullName: "Ann B. Able", phone: "", email: "hacker@example.com", role: "ADMIN" });
eq(saved.ok, true, "profile saved");
eq(saved.data.fullName, "Ann B. Able", "name updated");
eq(saved.data.phone, null, "blank phone stored as null");
eq(saved.data.email, "ann@example.com", "email never changed");
const update = ann.calls.findLast((call) => call.model === "user" && call.method === "update");
deep(update.args.where, { id: "user-A" }, "profile update scoped by own id");
deep(Object.keys(update.args.data).sort(), ["fullName", "phone"], "only editable fields written");
const badProfile = await ann.mutations.saveProfile({ fullName: "" });
eq(badProfile.code, "invalid", "empty name invalid");
ok(badProfile.fieldErrors?.fullName, "field error keyed by field");
eq((await ann.mutations.saveProfile({ phone: "not a phone" })).fieldErrors?.phone !== undefined, true, "phone validation");
const qw = await ann.mutations.quoteWithdrawal({ method: "crypto", currency: "BTC", networkId: "bitcoin", address: "bc1q" + "x".repeat(30), amount: "0.01" });
eq(qw.ok, true, "quoteWithdrawal is connected and succeeds");
ok(qw.data.estimatedDebitUsd !== undefined, "estimatedDebitUsd is present in quote");

const kycResult = await ann.mutations.submitVerification({ documentType: "Passport", files: [] });
eq(kycResult.ok, false, "empty files rejected");
eq(kycResult.code, "invalid", "submitVerification validates files");

const wrongPassword = await ann.mutations.changePassword({ currentPassword: "nope", newPassword: "longer-new-password" });
eq(wrongPassword.code, "invalid", "wrong current password is invalid");
ok(wrongPassword.fieldErrors?.currentPassword, "current password field error");
eq(ann.supabase.filter((entry) => entry[0] === "updateUser").length, 0, "no updateUser after failed reauthentication");
const samePassword = await ann.mutations.changePassword({ currentPassword: "correct horse", newPassword: "correct horse" });
eq(samePassword.fieldErrors?.newPassword !== undefined, true, "same password rejected before reauthentication");
const changed = await ann.mutations.changePassword({ currentPassword: "correct horse", newPassword: "longer-new-password" });
eq(changed.ok, true, "password changed after reauthentication");
deep(ann.supabase.filter((entry) => entry[0] === "signInWithPassword").at(-1), ["signInWithPassword", "ann@example.com"], "reauthenticated with the account email");
deep(ann.supabase.at(-1), ["updateUser", ["password"]], "updateUser called with the password only");

const alreadyEnabled = await ann.mutations.startMfaEnrollment();
eq(alreadyEnabled.code, "invalid", "cannot enroll a second factor while one is verified");
const badCode = await ann.mutations.verifyMfaEnrollment("factor-1", "12ab");
eq(badCode.code, "invalid", "malformed code rejected before the provider is called");
ok(badCode.fieldErrors?.code, "code field error");
const wrongCode = await ann.mutations.verifyMfaEnrollment("factor-1", "000000");
eq(wrongCode.code, "invalid", "provider rejection → invalid");
const verified = await ann.mutations.verifyMfaEnrollment("factor-1", "123456");
eq(verified.ok, true, "verified with the provider");
eq(verified.data.state, "enabled", "enabled after verification");
eq(ann.data.user.find((row) => row.id === "user-A").twoFactorEnabled, true, "flag recorded on own row");
const disabled = await ann.mutations.disableMfa("factor-1", "123456");
eq(disabled.ok, true, "disabled after challenge");
eq(disabled.data.state, "not-enabled", "not enabled after unenroll");
deep(ann.supabase.filter((entry) => entry[0] === "unenroll").at(-1), ["unenroll", "factor-1"], "unenroll called for the factor");

{
  const fresh = boot({ user: annUser, factors: [] });
  const enrollment = await fresh.mutations.startMfaEnrollment();
  eq(enrollment.ok, true, "enrollment starts without factors");
  eq(enrollment.data.factorId, "factor-new", "factor id from provider");
  eq(enrollment.data.secret, "SECRET", "secret from provider");
  ok(enrollment.data.qrSvg?.startsWith("<svg"), "QR data URI decoded to SVG markup");
  const security = await (await fresh.queries.getDashboardData()).getSecurity();
  eq(security.data.mfa.state, "not-enabled", "no factors → not enabled, regardless of the twoFactorEnabled flag");
  const attention = await (await fresh.queries.getDashboardData()).getNeedsAttention();
  ok(attention.data.some((item) => item.kind === "security-enrollment"), "attention asks for enrollment");
  assertOwnership(fresh.calls, "user-A", "sb-A");
}

/* ------------------------------------------------------------------------ */
/* Failure handling: error regions, payload-free logs                       */
/* ------------------------------------------------------------------------ */

function bootWithFailingReads() {
  // Identity resolves; every owned-model call throws an error whose message carries a payload.
  const throwing = new Error('stub failure for {"where":{"userId":"user-A","email":"ann@example.com"}}');
  const revalidations = [];
  const prisma = new Proxy(
    {},
    {
      get: (_target, model) => {
        if (model === "user") {
          return {
            async findUnique() {
              return { id: "user-A", email: "ann@example.com", fullName: "Ann Able", status: "ACTIVE" };
            },
            async update() {
              throw throwing;
            },
          };
        }
        return new Proxy({}, { get: () => async () => { throw throwing; } });
      },
    },
  );
  const load = createLoader({
    "server-only": {},
    react: { cache: (fn) => fn },
    "next/cache": { revalidatePath: (...args) => revalidations.push(args) },
    "@/lib/db/prisma": { prisma },
    "@/lib/supabase/server": { createClient: async () => createSupabaseStub({ user: annUser, factors: [verifiedFactor] }).client },
    "@/lib/supabase/config": { getSupabaseConfig: () => ({ url: "https://example.test", key: "test-only" }) },
  });
  return { queries: load("@/lib/dashboard/queries.server"), mutations: load("@/lib/dashboard/mutations.server"), mappers: load("@/lib/dashboard/adapters/mappers"), revalidations };
}

{
  const logged = [];
  const originalError = console.error;
  console.error = (...args) => logged.push(args.map(String).join(" "));
  try {
    const identityBroken = boot({ user: annUser, factors: [verifiedFactor], failing: true });
    eq((await identityBroken.queries.getSessionAccount()).state, "unprovisioned", "identity lookup failure never authenticates");
    eq((await (await identityBroken.queries.getDashboardData()).getAssets()).status, "unavailable", "no data without identity");

    const broken = bootWithFailingReads();
    eq((await broken.queries.getSessionAccount()).state, "authenticated", "identity still resolves");
    const data = await broken.queries.getDashboardData();
    const assets = await data.getAssets();
    eq(assets.status, "error", "Prisma failure → error region");
    eq(assets.message, broken.mappers.ACCOUNT_SERVICE_ERROR, "generic message, no internals");
    eq(assets.retryable, true, "retryable");
    eq((await data.getTransaction("tx-A1")).status, "error", "detail read failure → error, not not-found");
    eq((await data.listAllocations()).status, "error", "allocations failure → error");
    eq(await data.getUnreadCount(), 0, "unread count falls back to 0 on failure");
    eq((await data.getSecurity()).status, "ready", "Supabase-backed security still reads");
    eq((await data.getValuation()).status, "error", "database read failure yields error region");
    const failedWrite = await broken.mutations.markAllNotificationsRead();
    eq(failedWrite.ok, false, "write failure reported");
    eq(failedWrite.code, "failed", "write failure → failed");
    eq(failedWrite.message, broken.mappers.ACCOUNT_SERVICE_ERROR, "write failure message is generic");
    eq(broken.revalidations.length, 0, "no revalidation after a failed write");
    const failedProfile = await broken.mutations.saveProfile({ fullName: "X" });
    eq(failedProfile.code, "failed", "profile write failure → failed");
  } finally {
    console.error = originalError;
  }
  ok(logged.length >= 6, `failures are logged (${logged.length} lines)`);
  for (const line of logged) {
    ok(!line.includes("user-A") && !line.includes("ann@example.com") && !line.includes("stub failure"), `log line carries no payload: ${line}`);
    ok(line.startsWith("[dashboard] "), `log line is prefixed: ${line}`);
  }
}

console.log(`Passed: ${checks} ownership checks (session mapping, every owned-model query scoped by the internal User.id, foreign ids not-found, actions validated and scoped, payload-free failure logs). Prisma and Supabase are stubbed; no network, database or account actions.`);
