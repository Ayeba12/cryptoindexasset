// Isolated screen-read coverage. No network, database or customer account access.
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const cache = new Map();
function load(file) {
  let absolute = path.resolve(file);
  absolute = existsSync(`${absolute}.ts`) ? `${absolute}.ts` : path.join(absolute, "index.ts");
  if (cache.has(absolute)) return cache.get(absolute).exports;
  const source = readFileSync(absolute, "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const module = { exports: {} }; cache.set(absolute, module);
  vm.runInThisContext(`(function(exports,require,module){${outputText}\n})`, { filename: absolute })(module.exports, name => {
    if (name.startsWith(".")) return load(path.resolve(path.dirname(absolute), name));
    throw new Error(`Unexpected external import: ${name}`);
  }, module);
  return module.exports;
}

const { loadScreen, transactionQuery } = load("lib/dashboard/screen-data");
const { ROUTE_PATTERNS } = load("lib/dashboard/navigation");
const { createFixtureStore } = load("lib/dashboard/fixtures");
const { SCENARIOS } = load("lib/dashboard/fixtures/scenarios");
const params = { currency: "BTC", transactionId: "tx-wdr-0001", traderId: "trader-alex-morgan", allocationId: "alloc-0001" };
let checks = 0;
for (const scenario of SCENARIOS) {
  const store = createFixtureStore(scenario.id);
  for (const route of ROUTE_PATTERNS) {
    const result = await loadScreen(store.data, route, params, new URLSearchParams("currency=BTC&network=bitcoin"));
    assert.equal(typeof result.capabilities.depositInstructions.available, "boolean"); checks++;
    for (const [key, value] of Object.entries(result)) {
      if (key === "capabilities") continue;
      assert.ok(["ready", "empty", "unavailable", "error", "not-found"].includes(value.status), `${scenario.id} ${route} ${key}`); checks++;
    }
  }
}
for (const route of ROUTE_PATTERNS) {
  const source = readFileSync(`app/(dashboard)${route}/page.tsx`, "utf8");
  assert.ok(source.includes(`livePage("${route}")`));
  assert.ok(!source.includes("under construction")); checks += 2;
}
const source = createFixtureStore("funded").data;
const trader = await loadScreen(source, "/dashboard/traders/[traderId]", params, new URLSearchParams());
assert.equal(trader.trader.status, "ready"); checks++;
assert.equal((await loadScreen(source, "/dashboard/assets/[currency]", { currency: "BNB" }, new URLSearchParams())).asset.status, "not-found"); checks++;
const query = transactionQuery(new URLSearchParams("currency=garbage&type=garbage&status=garbage&page=-5&pageSize=999&from=not-a-date"));
assert.deepEqual(query, { currency: "all", type: "all", status: "all", page: 1, pageSize: 25, from: undefined, to: undefined }); checks++;
const failing = new Proxy(source, { get(target, property) { if (property === "getAssets") return () => Promise.reject(new Error("read failed")); return Reflect.get(target, property); } });
const result = await loadScreen(failing, "/dashboard", {}, new URLSearchParams());
assert.equal(result.assets.status, "error"); assert.equal(result.valuation.status, "ready"); checks += 2;
console.log(`Passed: ${checks} screen checks across ${SCENARIOS.length} scenarios and ${ROUTE_PATTERNS.length} routes; route wiring, filter validation and independent read failures. In-memory only.`);
