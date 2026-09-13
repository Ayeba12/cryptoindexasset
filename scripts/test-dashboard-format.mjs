// Display formatting checks for lib/dashboard/format.ts.
// Transpiles the TypeScript sources with the `typescript` package and runs
// them in an isolated vm context. No network, no database, no account actions.
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

const format = load(fileURLToPath(new URL("../lib/dashboard/format", import.meta.url)));
// Guard the source (comments removed) against float parsing and locale-dependent number formatting.
const source = readFileSync(fileURLToPath(new URL("../lib/dashboard/format.ts", import.meta.url)), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");
assert.doesNotMatch(source, /parseFloat|parseInt|\bNumber\(|toLocaleString|Intl\./, "format.ts must not use float parsing or locale-dependent number formatting");

const {
  formatAmount,
  formatSignedAmount,
  formatUsdEstimate,
  formatPercent,
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeAge,
  statusPresentation,
  maskDestination,
  typeLabel,
  formatCount,
  initialsFor,
  groupDigits,
  UNAVAILABLE_TEXT,
} = format;

let checks = 1;
const eq = (actual, expected, label) => {
  assert.equal(actual, expected, label);
  checks += 1;
};
const deep = (actual, expected, label) => {
  assert.deepEqual(actual, expected, label);
  checks += 1;
};

eq(UNAVAILABLE_TEXT, "—", "em dash");

// formatAmount: zero is a real zero, null is a dash with a reason, never conflated.
deep(formatAmount("0.00000000", "BTC"), { text: "0.00000000", unit: "BTC", full: "0.00000000 BTC", unavailable: false, exact: "0.00000000 BTC", rounded: false }, "zero BTC");
deep(formatAmount("0", "BTC"), { text: "0.00000000", unit: "BTC", full: "0.00000000 BTC", unavailable: false, exact: "0.00000000 BTC", rounded: false }, "bare zero padded to ledger precision");
deep(formatAmount(null, "BTC"), { text: "—", unit: "BTC", full: "—", unavailable: true, reason: "Not available", exact: "—", rounded: false }, "null BTC");
eq(formatAmount(null, "USD", { unavailableReason: "The ledger does not define holds yet" }).reason, "The ledger does not define holds yet", "custom reason");
deep(formatAmount("0.10000000", "BTC"), { text: "0.10000000", unit: "BTC", full: "0.10000000 BTC", unavailable: false, exact: "0.10000000 BTC", rounded: false }, "BTC total");
deep(formatAmount("1250.000000", "USDT"), { text: "1,250.00", unit: "USDT", full: "1,250.00 USDT", unavailable: false, exact: "1,250.000000 USDT", rounded: false }, "USDT shown to 2 with exact six");
deep(formatAmount("1250.123456", "USDT"), { text: "1,250.12", unit: "USDT", full: "1,250.12 USDT", unavailable: false, exact: "1,250.123456 USDT", rounded: true }, "USDT rounding flagged");
eq(formatAmount("1250.123456", "USDT", { exact: true }).text, "1,250.123456", "exact option shows every digit");
eq(formatAmount("1250.1234567", "USDT", { exact: true }).text, "1,250.1234567", "exact keeps supplied digits beyond ledger precision");
eq(formatAmount("1250.123456", "USDT", { precision: 4 }).text, "1,250.1235", "precision override with half-up");
eq(formatAmount("123456789.12345678", "BTC").text, "123,456,789.12345678", "grouping on the integer part only");
eq(formatAmount("12250", "USD").full, "12,250.00 USD", "USD padded to 2");
eq(formatAmount("0.5", "XRP").text, "0.500000", "XRP six decimals");
eq(formatAmount("120.00", "USD", { sign: true }).text, "+120.00", "explicit plus");
eq(formatAmount("-45.00", "USD", { sign: true }).full, "-45.00 USD", "minus always shown");
eq(formatAmount("-45.00", "USD").text, "-45.00", "minus without sign option");
eq(formatAmount("0.00", "USD", { sign: true }).text, "0.00", "zero has no sign");
eq(formatAmount("-1234567.5", "USD").text, "-1,234,567.50", "negative grouping");
deep(formatAmount("abc", "BTC"), { text: "—", unit: "BTC", full: "—", unavailable: true, reason: "Amount is not in a readable format", exact: "—", rounded: false }, "unreadable is unavailable, never money");
eq(formatAmount("1,000", "USD").unavailable, true, "grouped input is unreadable");
eq(formatAmount("1e5", "USD").unavailable, true, "exponent input is unreadable");
eq(groupDigits("1234567.891"), "1,234,567.891", "groupDigits");
eq(groupDigits("-999"), "-999", "groupDigits small negative");

// formatSignedAmount: direction carries the sign.
eq(formatSignedAmount("120.00", "USD", "credit").full, "+120.00 USD", "credit plus");
eq(formatSignedAmount("0.50000000", "ETH", "debit").full, "-0.50000000 ETH", "debit minus");
eq(formatSignedAmount("0.50000000", "ETH", "debit").exact, "-0.50000000 ETH", "debit exact");
eq(formatSignedAmount("0", "USD", "debit").text, "0.00", "zero unsigned");
eq(formatSignedAmount(null, "USD", "credit").unavailable, true, "null unavailable");
eq(formatSignedAmount("-1", "USD", "credit").unavailable, true, "negative magnitude is unreadable");

// formatUsdEstimate: never zero for a missing quote; labelled Estimated with a timestamp.
const estimate = formatUsdEstimate("12250.00", "2026-09-06T12:00:00Z");
eq(estimate.full, "12,250.00 USD", "estimate value");
eq(estimate.label, "Estimated", "estimate label");
eq(estimate.asOf, "2026-09-06T12:00:00Z", "estimate asOf");
eq(estimate.asOfText, "Quotes as of 6 Sep 2026, 12:00 UTC", "estimate asOfText");
const noQuote = formatUsdEstimate(null, null);
eq(noQuote.text, "—", "no quote dash");
eq(noQuote.reason, "No price quote is available", "no quote reason");
eq(noQuote.asOfText, null, "no quote asOf");
eq(formatUsdEstimate("1.00", null).asOfText, null, "value without timestamp still shows");
eq(formatUsdEstimate("1.00", "not-a-date").asOf, null, "invalid timestamp ignored");

// formatPercent.
deep(formatPercent("0.98", { sign: true }), { text: "+0.98%", unavailable: false }, "percent plus");
deep(formatPercent("-12.5"), { text: "-12.50%", unavailable: false }, "percent negative padded");
eq(formatPercent("1234.5678").text, "1,234.57%", "percent grouped and rounded");
deep(formatPercent(null), { text: "—", unavailable: true, reason: "Not available" }, "percent null");
eq(formatPercent("12%").unavailable, true, "percent unreadable");
eq(formatPercent("0", { sign: true }).text, "0.00%", "percent zero unsigned");

// Dates: always UTC, en-GB order, identical on server and client.
eq(formatDateTime("2026-09-06T12:00:00Z"), "6 Sep 2026, 12:00 UTC", "date time");
eq(formatDateTime("2026-09-06T14:00:00+02:00"), "6 Sep 2026, 12:00 UTC", "offset normalised to UTC");
eq(formatDateTime("2026-12-31T23:59:59.999Z"), "31 Dec 2026, 23:59 UTC", "end of year");
eq(formatDateTime("2026-01-01T00:05:00Z"), "1 Jan 2026, 00:05 UTC", "zero padded time");
eq(formatDate("2026-09-06T12:00:00Z"), "6 Sep 2026", "date only");
eq(formatTime("2026-09-06T09:07:00Z"), "09:07 UTC", "time only");
eq(formatDateTime(null), "—", "null date");
eq(formatDateTime("not a date"), "—", "invalid date");

// Relative age from a fixed clock.
const now = "2026-09-06T12:00:00Z";
eq(formatRelativeAge("2026-09-06T11:59:40Z", now), "just now", "just now");
eq(formatRelativeAge("2026-09-06T11:55:00Z", now), "5 min ago", "minutes");
eq(formatRelativeAge("2026-09-06T09:00:00Z", now), "3 h ago", "hours");
eq(formatRelativeAge("2026-09-05T12:00:00Z", now), "1 day ago", "one day");
eq(formatRelativeAge("2026-09-03T12:00:00Z", now), "3 days ago", "days");
eq(formatRelativeAge("2026-08-23T12:00:00Z", now), "2 weeks ago", "weeks");
eq(formatRelativeAge("2026-07-23T12:00:00Z", now), "23 Jul 2026", "older than 30 days falls back to the date");
eq(formatRelativeAge("2026-09-06T12:05:00Z", now), "in 5 min", "future");
eq(formatRelativeAge("bad", now), "—", "invalid age");

// Status presentation per specification §7 item 7; settlement is separate.
deep(statusPresentation("PENDING"), { label: "Pending review", variant: "secondary" }, "PENDING");
deep(statusPresentation("APPROVED"), { label: "Approved", variant: "outline" }, "APPROVED");
deep(statusPresentation("REJECTED"), { label: "Declined", variant: "destructive" }, "REJECTED");
deep(statusPresentation("CANCELLED"), { label: "Cancelled", variant: "secondary" }, "CANCELLED");
deep(statusPresentation("UNKNOWN"), { label: "Status unavailable", variant: "secondary" }, "UNKNOWN");
deep(statusPresentation("PENDING", "allocation"), { label: "Pending", variant: "secondary" }, "allocation PENDING");
deep(statusPresentation("STOPPING", "allocation"), { label: "Stop pending", variant: "secondary" }, "STOPPING");
deep(statusPresentation("ERROR"), { label: "Error", variant: "destructive" }, "ERROR");
deep(statusPresentation("confirmed"), { label: "Completed", variant: "outline" }, "settlement confirmed is the only Completed");
deep(statusPresentation("unconfirmed"), { label: "Settlement not confirmed", variant: "secondary" }, "unconfirmed");
deep(statusPresentation("failed", "settlement"), { label: "Settlement failed", variant: "destructive" }, "settlement failed");
deep(statusPresentation("in-review"), { label: "In review", variant: "secondary" }, "verification in review");
deep(statusPresentation("changes-required"), { label: "Changes required", variant: "destructive" }, "changes required");
deep(statusPresentation("enabled", "mfa"), { label: "Enabled", variant: "outline" }, "mfa enabled");
deep(statusPresentation("not-enabled"), { label: "Not enabled", variant: "secondary" }, "mfa not enabled");
deep(statusPresentation("BOGUS"), { label: "Status unavailable", variant: "secondary" }, "unknown raw status");
deep(statusPresentation("APPROVED", "mfa"), { label: "Status unavailable", variant: "secondary" }, "wrong domain is unavailable");
deep(statusPresentation("constructor"), { label: "Status unavailable", variant: "secondary" }, "prototype keys are not statuses");
// Only settlement "confirmed" may read Completed; request approval and every other family must not.
for (const s of ["PENDING", "APPROVED", "REJECTED", "CANCELLED", "UNKNOWN", "unconfirmed", "ACTIVE", "STOPPED", "verified", "enabled"]) {
  assert.doesNotMatch(statusPresentation(s).label, /Completed/, `${s} must not read Completed`);
  checks += 1;
}

// maskDestination: 6 + ellipsis + 4 for 12 or more characters; short values never reveal almost everything.
const address = "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq";
eq(maskDestination(address), "bc1qar…5mdq", "long address");
eq(maskDestination("123456789012"), "123456…9012", "exactly 12");
eq(maskDestination("12345678901"), "12…", "eleven characters");
eq(maskDestination("ab"), "ab…", "two characters");
eq(maskDestination("  " + address + "  "), maskDestination(address), "trimmed");
eq(maskDestination(""), null, "empty");
eq(maskDestination("   "), null, "blank");
eq(maskDestination(null), null, "null");
eq(maskDestination(undefined), null, "undefined");
eq(maskDestination("a".repeat(88)).length, 11, "88-character address masks to 11");

// typeLabel: cash flows are not income.
eq(typeLabel("DEPOSIT"), "Deposit", "DEPOSIT");
eq(typeLabel("WITHDRAWAL"), "Withdrawal", "WITHDRAWAL");
eq(typeLabel("PROFIT_ACCRUAL"), "Recorded outcome", "PROFIT_ACCRUAL");
eq(typeLabel("COPY_FEE"), "Copy fee", "COPY_FEE");
eq(typeLabel("BONUS"), "Bonus credit", "BONUS");
eq(typeLabel("ADJUSTMENT"), "Adjustment", "ADJUSTMENT");
eq(typeLabel("SOMETHING_ELSE"), "Other", "unknown type");
eq(typeLabel("toString"), "Other", "prototype key");
for (const t of ["DEPOSIT", "WITHDRAWAL", "PROFIT_ACCRUAL", "COPY_FEE", "BONUS", "ADJUSTMENT"]) {
  assert.doesNotMatch(typeLabel(t), /yield|income|profit share|ROI/i, `${t} label avoids marketing terms`);
  checks += 1;
}

// Counts and initials (not money).
eq(formatCount(1234567), "1,234,567", "count grouping");
eq(formatCount(0), "0", "count zero");
eq(formatCount(null), "—", "count null");
eq(initialsFor("Alex Morgan"), "AM", "initials two words");
eq(initialsFor("alex@example.com"), "A", "initials from an email use the local part only");
eq(initialsFor("alex.morgan@example.com"), "AM", "dotted local part gives two initials");
eq(initialsFor("Anna-Maria Rossi"), "AR", "hyphenated first name");
eq(initialsFor("Maya"), "M", "single initial");
eq(initialsFor("  "), "?", "blank initials");

console.log(`Passed: ${checks} display formatting checks (null vs zero, grouping, exact detail, signs, UTC dates, relative age, status labels, masking, type labels). Pure functions; no network or account actions.`);
