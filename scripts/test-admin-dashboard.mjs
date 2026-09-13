// Isolated tests only. No database, network or real accounts.
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const modules = new Map();
function load(file) {
  const absolute = path.resolve(`${file}.ts`);
  if (modules.has(absolute)) return modules.get(absolute).exports;
  const module = { exports: {} };
  modules.set(absolute, module);
  const { outputText } = ts.transpileModule(readFileSync(absolute, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  vm.runInThisContext(`(function(exports,require,module){${outputText}\n})`, {
    filename: absolute,
  })(
    module.exports,
    (name) => {
      if (name.startsWith("."))
        return load(path.resolve(path.dirname(absolute), name));
      if (name === "@/lib/content/approved-people") {
        const approved = JSON.parse(
          readFileSync("content/approved-people.json", "utf8"),
        );
        return {
          APPROVED_TRADERS: approved.traders,
          APPROVED_TESTIMONIALS: approved.testimonials,
          APPROVED_CONTENT_DATE: "2026-09-12",
        };
      }
      throw new Error(`Unexpected dependency: ${name}`);
    },
    module,
  );
  return module.exports;
}
const { createAdminFixture } = load("lib/admin/fixtures");
const {
  ADMIN_SECTIONS,
  adjustWallet,
  positiveAmount,
  validateTrader,
  blankTrader,
  publishedTraders,
} = load("lib/admin/model");
let checks = 0;
const check = (test) => {
  test();
  checks++;
};
const fixture = createAdminFixture();
const { blankSignal, signalErrors, addPreviewSignal } =
  load("lib/admin/signals");
const signalDraft = {
  ...blankSignal(),
  title: "  BTC momentum review  ",
  analysis: "  Wait for confirmation. Volatility can invalidate this setup.  ",
};
check(() => assert.deepEqual(signalErrors(signalDraft), {}));
for (const [field, value] of [
  ["title", "   "],
  ["title", "x".repeat(101)],
  ["analysis", "Too short"],
  ["analysis", "x".repeat(1501)],
  ["asset", "FAKE"],
  ["direction", "Guaranteed win"],
  ["timeframe", "Forever"],
]) {
  check(() =>
    assert.ok(signalErrors({ ...signalDraft, [field]: value })[field]),
  );
}
const signalState = createAdminFixture();
const walletsBeforeSignal = JSON.stringify(signalState.wallets);
const signalsBefore = signalState.signals.length;
const auditsBefore = signalState.audit.length;
addPreviewSignal(
  signalState,
  signalDraft,
  "signal-test",
  "2026-09-11T12:00:00.000Z",
);
check(() => assert.equal(signalState.signals.length, signalsBefore + 1));
check(() => assert.equal(signalState.signals[0].enabled, false));
check(() => assert.equal(signalState.signals[0].title, "BTC momentum review"));
check(() =>
  assert.equal(signalState.signals[0].analysis, signalDraft.analysis.trim()),
);
check(() => assert.equal(signalState.signals[0].direction, "Watch"));
check(() =>
  assert.equal(signalState.signals[0].createdAt, "2026-09-11T12:00:00.000Z"),
);
check(() => assert.equal(signalState.audit.length, auditsBefore + 1));
check(() =>
  assert.equal(JSON.stringify(signalState.wallets), walletsBeforeSignal),
);
check(() =>
  assert.throws(() =>
    addPreviewSignal(
      signalState,
      signalDraft,
      "signal-test",
      "2026-09-11T12:00:00.000Z",
    ),
  ),
);
check(() =>
  assert.throws(() =>
    addPreviewSignal(
      signalState,
      blankSignal(),
      "invalid",
      "2026-09-11T12:00:00.000Z",
    ),
  ),
);
check(() => assert.equal(signalState.signals.length, signalsBefore + 1));
const traderUI = readFileSync("components/dashboard/views/trading.tsx", "utf8");
check(() => assert.match(traderUI, /after:rounded-\[var\(--radius\)\]/));
check(() =>
  assert.match(traderUI, /AvatarImage[\s\S]*?rounded-\[var\(--radius\)\]/),
);
check(() =>
  assert.match(traderUI, /AvatarFallback[\s\S]*?rounded-\[var\(--radius\)\]/),
);
const { profileErrors, ACCOUNT_PAGES } = load("lib/admin/account");
check(() =>
  assert.deepEqual(
    profileErrors({ name: "Demo Admin", phone: "", jobTitle: "" }),
    {},
  ),
);
check(() =>
  assert.ok(profileErrors({ name: "  ", phone: "", jobTitle: "" }).name),
);
check(() =>
  assert.ok(
    profileErrors({ name: "x".repeat(101), phone: "", jobTitle: "" }).name,
  ),
);
check(() =>
  assert.ok(
    profileErrors({ name: "Demo", phone: "invalid", jobTitle: "" }).phone,
  ),
);
check(() =>
  assert.ok(
    profileErrors({ name: "Demo", phone: "", jobTitle: "x".repeat(101) })
      .jobTitle,
  ),
);
check(() =>
  assert.deepEqual(
    profileErrors({
      name: " Demo ",
      phone: "+1 (555) 010-0123",
      jobTitle: "Operations",
    }),
    {},
  ),
);
check(() => assert.equal(fixture.account.twoFactorDemo, false));
for (const [slug] of ACCOUNT_PAGES) {
  check(() =>
    assert.ok(existsSync(`app/(admin)/admin/account/${slug}/page.tsx`)),
  );
}
const original = JSON.stringify(fixture);
const request = {
  key: "test-credit",
  walletId: "wallet-1-USDT",
  userId: "demo-user-1",
  version: 1,
  direction: "add",
  amount: "0.100001",
  reason: "Test profit adjustment",
  creditId: "",
};
const credited = adjustWallet(fixture, request, "2026-09-08T12:00:00Z");
check(() =>
  assert.throws(
    () => adjustWallet(credited, { ...request, amount: "2" }, "later"),
    /different adjustment/,
  ),
);
check(() =>
  assert.throws(
    () => adjustWallet(fixture, { ...request, key: "" }, "later"),
    /request key/,
  ),
);
check(() =>
  assert.equal(
    credited.wallets.find((w) => w.id === request.walletId).available,
    "2400.10000100",
  ),
);
check(() => assert.equal(JSON.stringify(fixture), original));
check(() => assert.equal(adjustWallet(credited, request, "later"), credited));
check(() => assert.equal(credited.audit.length, 2));
check(() =>
  assert.equal(
    credited.wallets.find((w) => w.id === request.walletId).reserved,
    "250.00000000",
  ),
);
check(() =>
  assert.throws(
    () => adjustWallet(credited, { ...request, key: "new-key-2" }, "later"),
    /wallet changed/,
  ),
);
for (const amount of [
  "0",
  "-1",
  "NaN",
  "Infinity",
  "1e3",
  "1.0000001",
  "9999999999999",
  "",
  "01",
  " 2",
])
  check(() => assert.throws(() => positiveAmount(amount, "USDT")));
for (const currency of ["BTC", "ETH", "BCH", "LTC"])
  check(() =>
    assert.equal(positiveAmount("0.00000001", currency), "0.00000001"),
  );
check(() =>
  assert.throws(
    () => adjustWallet(fixture, { ...request, userId: "demo-user-2" }, "now"),
    /could not be found/,
  ),
);
check(() =>
  assert.throws(
    () => adjustWallet(fixture, { ...request, reason: "" }, "now"),
    /Explain/,
  ),
);
check(() =>
  assert.throws(
    () =>
      adjustWallet(
        fixture,
        { ...request, userId: "demo-user-6", walletId: "wallet-6-USDT" },
        "now",
      ),
    /suspended/,
  ),
);
const reversal = {
  ...request,
  key: "test-reversal",
  direction: "remove",
  creditId: "credit-1",
  amount: "20",
};
const removed = adjustWallet(fixture, reversal, "now");
check(() =>
  assert.equal(
    removed.wallets.find((w) => w.id === request.walletId).available,
    "2380.00000000",
  ),
);
check(() =>
  assert.equal(
    removed.wallets.find((w) => w.id === request.walletId).profit,
    "100.00000000",
  ),
);
check(() =>
  assert.equal(
    removed.credits.find((c) => c.id === "credit-1").remaining,
    "100.00000000",
  ),
);
check(() =>
  assert.throws(
    () => adjustWallet(fixture, { ...reversal, amount: "121" }, "now"),
    /unreversed/,
  ),
);
check(() =>
  assert.throws(
    () => adjustWallet(fixture, { ...reversal, creditId: "credit-2" }, "now"),
    /unreversed/,
  ),
);
const spent = structuredClone(fixture);
spent.wallets.find((w) => w.id === request.walletId).available = "1";
check(() =>
  assert.throws(
    () => adjustWallet(spent, reversal, "now"),
    /Insufficient available/,
  ),
);
const t = {
  ...fixture.traders[0],
  sampleSize: "100",
  ratingCount: "1",
  notes: "PRIVATE_OPERATOR_NOTES",
};
check(() => assert.deepEqual(validateTrader(t), {}));
check(() => assert.ok(validateTrader(blankTrader()).name));
for (const accuracy of ["101", "-1", "nan", "99.999"])
  check(() => assert.ok(validateTrader({ ...t, accuracy }).accuracy));
for (const key of ["period", "metricSource", "updatedAt"])
  check(() => assert.ok(validateTrader({ ...t, [key]: "" }).metricSource));
check(() => assert.ok(validateTrader({ ...t, sampleSize: "0" }).sampleSize));
check(() => assert.ok(validateTrader({ ...t, rating: "5.5" }).rating));
check(() =>
  assert.ok(validateTrader({ ...t, communitySource: "" }).communitySource),
);
check(() =>
  assert.ok(
    validateTrader({ ...t, status: "Published", biography: "" }).biography,
  ),
);
const edited = structuredClone(fixture);
edited.traders[0] = t;
check(() =>
  assert.ok(
    !JSON.stringify(publishedTraders(edited)).includes(
      "PRIVATE_OPERATOR_NOTES",
    ),
  ),
);
check(() => assert.equal(publishedTraders(edited).length, 6));
edited.traders[0].status = "Archived";
check(() => assert.equal(publishedTraders(edited).length, 5));
check(() => assert.equal(edited.traders.length, 6));
for (const [slug] of ADMIN_SECTIONS)
  check(() =>
    assert.ok(
      existsSync(`app/(admin)/admin/${slug ? slug + "/" : ""}page.tsx`),
    ),
  );
for (const route of [
  "users/[userId]",
  "traders/new",
  "traders/[traderId]",
  "traders/publication",
])
  check(() => assert.ok(existsSync(`app/(admin)/admin/${route}/page.tsx`)));
const source = (file) => readFileSync(file, "utf8");
check(() =>
  assert.ok(
    source("app/design-preview/admin/layout.tsx").includes(
      'process.env.NODE_ENV !== "development"',
    ),
  ),
);
check(() =>
  assert.ok(
    source("app/design-preview/admin/[[...segments]]/page.tsx").includes(
      'process.env.NODE_ENV !== "development"',
    ),
  ),
);
check(() =>
  assert.ok(source("app/(admin)/layout.tsx").includes("await requireAdmin()")),
);
check(() =>
  assert.ok(
    source("components/admin/live-page.tsx").includes("await requireAdmin()"),
  ),
);
check(() => assert.ok(!source("app/(admin)/layout.tsx").includes("fixtures")));
check(() =>
  assert.ok(source("app/(admin)/layout.tsx").includes("initial={null}")),
);
check(() =>
  assert.ok(!source("lib/admin/access.server.ts").includes("user_metadata")),
);

// Execute the server guard with isolated auth/config stubs, including forged user metadata.
async function guard({
  configured = true,
  user = null,
  error = null,
  throws = false,
} = {}) {
  const module = { exports: {} };
  let calls = 0;
  const code = ts.transpileModule(source("lib/admin/access.server.ts"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInThisContext(`(function(exports,require,module){${code}\n})`)(
    module.exports,
    (name) => {
      if (name === "server-only") return {};
      if (name === "react") return { cache: (fn) => fn };
      if (name === "next/navigation")
        return {
          redirect: (location) => {
            throw new Error(`REDIRECT:${location}`);
          },
        };
      if (name.endsWith("/config"))
        return { getSupabaseConfig: () => (configured ? {} : null) };
      if (name.endsWith("/server"))
        return {
          createClient: async () => ({
            auth: {
              getUser: async () => {
                calls++;
                if (throws) throw new Error("offline");
                return { data: { user }, error };
              },
            },
          }),
        };
      throw new Error(name);
    },
    module,
  );
  try {
    await module.exports.requireAdmin();
    return { allowed: true, calls };
  } catch (e) {
    return { allowed: false, calls, error: e.message };
  }
}
for (const options of [
  {},
  { configured: false },
  { user: { user_metadata: { role: "admin" } } },
  { user: { app_metadata: { role: "user" } } },
  { user: { app_metadata: { role: "admin" } }, error: {} },
]) {
  const result = await guard(options);
  check(() => assert.equal(result.allowed, false));
}
const authorized = await guard({ user: { app_metadata: { role: "admin" } } });
check(() => assert.equal(authorized.allowed, true));
check(() => assert.equal(authorized.calls, 1));
console.log(
  `Passed ${checks} admin checks: signal creation/validation, portrait radius, exact adjustments, reversals, stale writes, targeting, trader validation/projection, route isolation and auth guard. No live services used.`,
);
