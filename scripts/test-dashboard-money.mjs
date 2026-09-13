// Exact decimal-string arithmetic checks for lib/dashboard/money.ts.
// Transpiles the TypeScript source with the `typescript` package (like the
// other scripts) and runs it in an isolated vm context. No network, no
// database, no account actions.
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

const money = load(fileURLToPath(new URL("../lib/dashboard/money", import.meta.url)));
const {
  MoneyError,
  isDecimalString,
  parseDecimal,
  fromUnits,
  normalize,
  add,
  subtract,
  sum,
  compare,
  isNegative,
  isPositive,
  isZero,
  negate,
  abs,
  multiplyByDecimal,
  toFixed,
  scaleOf,
  min,
  max,
} = money;

let checks = 0;
const eq = (actual, expected, label) => {
  assert.equal(actual, expected, label);
  checks += 1;
};
const throwsMoney = (fn, label) => {
  assert.throws(fn, (error) => error instanceof MoneyError && error.name === "MoneyError", label);
  checks += 1;
};

// Validation.
for (const good of ["0", "0.00000000", "-45.00", "123456789.12345678", "1250.000000", "007"]) eq(isDecimalString(good), true, `valid ${good}`);
for (const bad of ["", "abc", "1,000", "+1", "1.", ".5", "1e5", "0x10", " 1", "1 ", "NaN", "Infinity", "1.2.3", 5, null, undefined]) {
  eq(isDecimalString(bad), false, `invalid ${String(bad)}`);
}
for (const bad of ["", "abc", "1,000", "+1", "1.", ".5", "1e5", 5, null, undefined, "0.1 BTC"]) {
  throwsMoney(() => parseDecimal(bad), `parseDecimal(${String(bad)}) throws`);
  throwsMoney(() => add(bad, "1"), `add(${String(bad)}) throws`);
  throwsMoney(() => toFixed(bad, 2), `toFixed(${String(bad)}) throws`);
}
throwsMoney(() => toFixed("1", -1), "negative precision throws");
throwsMoney(() => toFixed("1", 1.5), "fractional precision throws");
throwsMoney(() => fromUnits(BigInt(1), -1), "negative scale throws");
throwsMoney(() => min([]), "min of nothing throws");
throwsMoney(() => max([]), "max of nothing throws");

// Parsing.
assert.deepEqual(parseDecimal("-0012.3400"), { sign: -1, integer: "12", fraction: "3400", scale: 4, units: BigInt(-123400) });
assert.deepEqual(parseDecimal("0.00000000"), { sign: 0, integer: "0", fraction: "00000000", scale: 8, units: BigInt(0) });
assert.deepEqual(parseDecimal("7"), { sign: 1, integer: "7", fraction: "", scale: 0, units: BigInt(7) });
checks += 3;

// Precision preservation and no floating point.
eq(add("0.1", "0.2"), "0.3", "0.1 + 0.2 is exactly 0.3");
eq(add("0.10000000", "0.02000000"), "0.12000000", "eight-decimal add keeps scale");
eq(add("0.08000000", "0.02000000"), "0.10000000", "BTC available + reserved = total");
eq(add("1.50000000", "0.50000000"), "2.00000000", "ETH available + reserved = total");
eq(add("1000.000000", "250.000000"), "1250.000000", "USDT available + reserved = total");
eq(add("0.10000000", "0.02"), "0.12000000", "mixed scales widen to the larger scale");
eq(add("123456789.12345678", "0.00000001"), "123456789.12345679", "large eight-decimal value keeps every digit");
eq(add("9007199254740993", "0"), "9007199254740993", "beyond 2^53 integer stays exact");
eq(subtract("0.10000000", "0.08000000"), "0.02000000", "subtract keeps scale");
eq(subtract("1.00", "1.10"), "-0.10", "negative difference");
eq(subtract("5", "5.000"), "0.000", "zero difference at wider scale");
eq(sum(["0.1", "0.2", "0.3"]), "0.6", "sum of three");
eq(sum([]), "0", "empty sum is 0");

// Negative values.
eq(isNegative("-45.00"), true, "-45.00 negative");
eq(isNegative("-0.00"), false, "-0.00 is not negative");
eq(isNegative("0.00000001"), false, "tiny positive not negative");
eq(isPositive("0.00000001"), true, "tiny positive is positive");
eq(isPositive("-0.00"), false, "-0.00 not positive");
eq(isZero("-0.0"), true, "-0.0 is zero");
eq(isZero("0.00000000"), true, "0.00000000 is zero");
eq(isZero("0.00000001"), false, "0.00000001 is not zero");
eq(negate("-45.00"), "45.00", "negate negative");
eq(negate("45.00"), "-45.00", "negate positive");
eq(negate("0.00"), "0.00", "negate zero has no sign");
eq(abs("-45.00"), "45.00", "abs");
eq(add("-45.00", "120.00"), "75.00", "signed add");
eq(add("-0.5", "-0.5"), "-1.0", "two negatives");
eq(fromUnits(BigInt(-5), 3), "-0.005", "fromUnits pads small negative");
eq(fromUnits(BigInt(0), 2), "0.00", "fromUnits zero");

// Compare.
eq(compare("1.0", "1.00"), 0, "1.0 equals 1.00");
eq(compare("0.00000001", "0"), 1, "tiny positive greater than zero");
eq(compare("-1", "0"), -1, "negative less than zero");
eq(compare("10", "9.99999999"), 1, "10 > 9.99999999");
eq(min(["1.5", "0.5", "2"]), "0.5", "min");
eq(max(["1.5", "0.5", "2"]), "2", "max");

// Normalize.
eq(normalize("0100.50000"), "100.5", "normalize strips redundant zeros");
eq(normalize("-0.0"), "0", "normalize -0.0 to 0");
eq(normalize("0.00000000"), "0", "normalize zero");
eq(normalize("1250.000000"), "1250", "normalize integer-valued");
eq(normalize("-45.10"), "-45.1", "normalize negative");

// Multiplication for fixture quotes.
eq(multiplyByDecimal("0.10000000", "60000.00"), "6000.0000000000", "product scale is the sum of scales");
eq(multiplyByDecimal("-0.5", "2"), "-1.0", "signed product");
eq(multiplyByDecimal("0", "60000.00"), "0.00", "zero product");
eq(scaleOf("6000.0000000000"), 10, "scaleOf");

// Funded fixture accounting derived from fixed quotes (BTC 60000, ETH 2500, USDT 1, BCH 300, LTC 80, XRP 0.50).
const quotes = { BTC: "60000.00", ETH: "2500.00", USDT: "1.00", BCH: "300.00", LTC: "80.00", XRP: "0.50" };
const holdings = {
  BTC: { total: "0.10000000", available: "0.08000000", reserved: "0.02000000" },
  ETH: { total: "2.00000000", available: "1.50000000", reserved: "0.50000000" },
  USDT: { total: "1250.000000", available: "1000.000000", reserved: "250.000000" },
  BCH: { total: "0.00000000", available: "0.00000000", reserved: "0.00000000" },
  LTC: { total: "0.00000000", available: "0.00000000", reserved: "0.00000000" },
  XRP: { total: "0.000000", available: "0.000000", reserved: "0.000000" },
};
const totalUsd = (bucket) => toFixed(sum(Object.keys(holdings).map((c) => multiplyByDecimal(holdings[c][bucket], quotes[c]))), 2);
eq(totalUsd("total"), "12250.00", "estimated total from quotes");
eq(totalUsd("available"), "9550.00", "available total from quotes");
eq(totalUsd("reserved"), "2700.00", "reserved total from quotes");
eq(add(totalUsd("available"), totalUsd("reserved")), totalUsd("total"), "available + reserved reconciles to total");
for (const c of Object.keys(holdings)) eq(add(holdings[c].available, holdings[c].reserved), holdings[c].total, `${c} buckets reconcile`);

// toFixed: padding, rounding modes, exact mode.
eq(toFixed("1.5", 2), "1.50", "pad to 2");
eq(toFixed("7", 8), "7.00000000", "pad integer to 8");
eq(toFixed("1250.000000", 2), "1250.00", "drop zero digits");
eq(toFixed("0.126", 2), "0.13", "half-up rounds up");
eq(toFixed("0.125", 2), "0.13", "half-up on exact half");
eq(toFixed("0.124", 2), "0.12", "half-up rounds down");
eq(toFixed("-0.125", 2), "-0.13", "half-up away from zero for negatives");
eq(toFixed("0.999", 2), "1.00", "carry into the integer part");
eq(toFixed("-0.001", 2), "0.00", "rounds to zero without a minus sign");
eq(toFixed("0.129", 2, "truncate"), "0.12", "truncate drops digits");
eq(toFixed("-0.129", 2, "truncate"), "-0.12", "truncate toward zero");
eq(toFixed("-0.001", 2, "truncate"), "0.00", "truncate to zero without a minus sign");
eq(toFixed("6000.0000000000", 2, "exact"), "6000.00", "exact mode allows dropping zeros");
throwsMoney(() => toFixed("0.129", 2, "exact"), "exact mode refuses to lose non-zero digits");
eq(toFixed("123456789.12345678", 8, "exact"), "123456789.12345678", "exact at ledger precision");
eq(toFixed("0.00000001", 8), "0.00000001", "one satoshi survives");
eq(toFixed("0.000000005", 8), "0.00000001", "half satoshi rounds up");

console.log(`Passed: ${checks} decimal-string money checks (precision, 0.1+0.2, eight-decimal totals, negatives, rounding modes, invalid input). Pure arithmetic; no network or account actions.`);
