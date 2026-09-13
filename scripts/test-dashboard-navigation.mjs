// Navigation model checks for lib/dashboard/navigation.ts (active route
// matching, breadcrumbs, route titles, settings tabs). Transpiles the
// TypeScript source with the `typescript` package and runs it in an
// isolated vm context. No network, no database, no account actions.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const cache = new Map();
function load(file) {
  const abs = `${path.resolve(file)}.ts`;
  if (cache.has(abs)) return cache.get(abs).exports;
  const source = readFileSync(abs, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const module = { exports: {} };
  cache.set(abs, module);
  // Run in this realm (shared Object/Array prototypes) so deepStrictEqual works on returned objects.
  const wrapper = vm.runInThisContext(`(function (exports, require, module) {\n${outputText}\n})`, { filename: abs });
  wrapper(module.exports, (name) => {
    if (name.startsWith(".")) return load(path.resolve(path.dirname(abs), name));
    throw new Error(`Unexpected import: ${name}`);
  }, module);
  return module.exports;
}

const nav = load(fileURLToPath(new URL("../lib/dashboard/navigation", import.meta.url)));
const {
  NAV_GROUPS,
  SETTINGS_TABS,
  ROUTE_TITLES,
  ROUTE_PATTERNS,
  matchActiveRoute,
  breadcrumbsFor,
  resolveRoute,
  routeTitleFor,
  normalizePathname,
  isDashboardPath,
  settingsTabFor,
  isDetailPattern,
} = nav;

let checks = 0;
const eq = (actual, expected, label) => {
  assert.equal(actual, expected, label);
  checks += 1;
};
const deep = (actual, expected, label) => {
  assert.deepEqual(actual, expected, label);
  checks += 1;
};

// Groups and items.
deep(NAV_GROUPS.map((g) => g.label), ["Overview", "Account", "Copy trading", "Account tools"], "group order");
deep(NAV_GROUPS.map((g) => g.items.length), [1, 4, 3, 3], "item counts");
eq(NAV_GROUPS[3].collapsed, true, "account tools collapsed");
eq(NAV_GROUPS[0].items[0].exact, true, "overview exact");
const hrefs = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href));
eq(new Set(hrefs).size, hrefs.length, "hrefs unique");
for (const href of hrefs) {
  assert.match(href, /^\/dashboard(\/[a-z-]+)*$/, `${href} is a dashboard route, never #`);
  assert.ok(resolveRoute(href), `${href} resolves to a route pattern`);
  checks += 2;
}
const icons = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.icon));
for (const icon of icons) {
  assert.match(icon, /^[A-Z][A-Za-z]+$/, `${icon} looks like a Phosphor export`);
  checks += 1;
}
deep(SETTINGS_TABS.map((t) => t.id), ["profile", "security", "verification"], "settings tabs");
eq(NAV_GROUPS[3].items[1].href, SETTINGS_TABS[0].href, "settings item links to the profile tab");

// Route titles cover every section 5 route and detail pattern.
eq(Object.keys(ROUTE_TITLES).length, 17, "17 route patterns");
eq(ROUTE_TITLES["/dashboard/traders/[traderId]"], "Trader profile", "detail title");
eq(ROUTE_PATTERNS[0].split("/").length >= ROUTE_PATTERNS[ROUTE_PATTERNS.length - 1].split("/").length, true, "patterns sorted most specific first");
eq(isDetailPattern("/dashboard/assets/[currency]"), true, "detail pattern");
eq(isDetailPattern("/dashboard/assets"), false, "list pattern");

// Path normalisation.
eq(normalizePathname("/dashboard/"), "/dashboard", "trailing slash");
eq(normalizePathname("/dashboard/activity?page=2#row"), "/dashboard/activity", "query and hash stripped");
eq(normalizePathname("dashboard"), "/dashboard", "leading slash added");
eq(normalizePathname("/"), "/", "root");
eq(isDashboardPath("/dashboard"), true, "root is dashboard");
eq(isDashboardPath("/dashboard-extra"), false, "sibling is not dashboard");
eq(isDashboardPath("/login"), false, "login is not dashboard");

// Active route matching incl. detail descendants and settings subroutes.
const active = (p) => matchActiveRoute(p)?.item.id ?? null;
eq(active("/dashboard"), "overview", "overview");
eq(active("/dashboard/"), "overview", "overview trailing slash");
eq(active("/dashboard/assets"), "assets", "assets");
eq(active("/dashboard/assets/BTC"), "assets", "asset detail");
eq(active("/dashboard/activity/tx-dep-0001"), "activity", "transaction detail");
eq(active("/dashboard/traders/trader-alex-morgan"), "traders", "trader detail");
eq(active("/dashboard/copy-trades/alloc-0001"), "copy-trades", "allocation detail");
eq(active("/dashboard/copy-trades"), "copy-trades", "copy trades list");
eq(active("/dashboard/settings/profile"), "settings", "settings profile");
eq(active("/dashboard/settings/security"), "settings", "settings security");
eq(active("/dashboard/settings"), "settings", "settings index");
eq(active("/dashboard/notifications?filter=unread"), "notifications", "notifications with query");
eq(active("/dashboard/help"), "help", "help");
eq(active("/dashboard/unknown"), null, "unknown dashboard path");
eq(active("/dashboard/assetsx"), null, "prefix must end at a segment");
eq(active("/login"), null, "outside dashboard");
eq(matchActiveRoute("/dashboard/traders/abc")?.group.id, "copy-trading", "group of a detail");

// Route resolution.
deep(resolveRoute("/dashboard/activity/tx-1"), { pattern: "/dashboard/activity/[transactionId]", title: "Transaction details", params: { transactionId: "tx-1" } }, "resolve detail");
deep(resolveRoute("/dashboard/assets/BTC"), { pattern: "/dashboard/assets/[currency]", title: "Asset details", params: { currency: "BTC" } }, "resolve asset");
deep(resolveRoute("/dashboard/traders/a%20b"), { pattern: "/dashboard/traders/[traderId]", title: "Trader profile", params: { traderId: "a b" } }, "decodes params");
eq(resolveRoute("/dashboard/settings"), null, "settings index has no page pattern");
eq(resolveRoute("/dashboard/activity/tx/extra"), null, "too deep");
eq(routeTitleFor("/dashboard/settings/security"), "Security", "title for settings");
eq(routeTitleFor("/dashboard/nowhere"), "Dashboard", "fallback title");

// Breadcrumbs: Dashboard / Section / Page; last crumb has no href.
deep(breadcrumbsFor("/dashboard"), [{ label: "Dashboard", href: "/dashboard" }, { label: "Overview" }], "overview crumbs");
deep(breadcrumbsFor("/dashboard/deposit"), [{ label: "Dashboard", href: "/dashboard" }, { label: "Account" }, { label: "Deposit" }], "deposit crumbs");
deep(
  breadcrumbsFor("/dashboard/settings/security"),
  [{ label: "Dashboard", href: "/dashboard" }, { label: "Account tools" }, { label: "Settings", href: "/dashboard/settings/profile" }, { label: "Security" }],
  "settings crumbs",
);
deep(
  breadcrumbsFor("/dashboard/traders/t1"),
  [{ label: "Dashboard", href: "/dashboard" }, { label: "Copy trading" }, { label: "Discover traders", href: "/dashboard/traders" }, { label: "Trader profile" }],
  "detail crumbs without extra",
);
deep(
  breadcrumbsFor("/dashboard/traders/t1", [{ label: "Alex Morgan" }]),
  [{ label: "Dashboard", href: "/dashboard" }, { label: "Copy trading" }, { label: "Discover traders", href: "/dashboard/traders" }, { label: "Alex Morgan" }],
  "detail crumbs with extra replace the generic title",
);
deep(
  breadcrumbsFor("/dashboard/withdraw", [{ label: "Review request" }]),
  [{ label: "Dashboard", href: "/dashboard" }, { label: "Account" }, { label: "Withdraw", href: "/dashboard/withdraw" }, { label: "Review request" }],
  "extra appended on a list route",
);
deep(breadcrumbsFor("/dashboard/nowhere"), [{ label: "Dashboard" }], "unknown path");
deep(breadcrumbsFor("/dashboard/nowhere", [{ label: "Not found" }]), [{ label: "Dashboard", href: "/dashboard" }, { label: "Not found" }], "unknown path with extra");
for (const p of ["/dashboard", "/dashboard/assets/BTC", "/dashboard/settings/verification", "/dashboard/help"]) {
  const crumbs = breadcrumbsFor(p);
  assert.equal("href" in crumbs[crumbs.length - 1], false, `${p}: last crumb is the current page`);
  checks += 1;
}

// Settings tabs.
eq(settingsTabFor("/dashboard/settings/verification")?.id, "verification", "tab for verification");
eq(settingsTabFor("/dashboard/settings"), null, "no tab for the index");
eq(settingsTabFor("/dashboard/help"), null, "no tab outside settings");

console.log(`Passed: ${checks} navigation checks (groups, active route incl. detail descendants and settings subroutes, route titles, breadcrumbs, settings tabs). Pure functions; no network or account actions.`);
