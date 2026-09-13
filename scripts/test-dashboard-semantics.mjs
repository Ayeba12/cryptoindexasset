import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const module = { exports: {} };
const code = ts.transpileModule(
  readFileSync("lib/dashboard/status-tone.ts", "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
vm.runInThisContext(`(function(exports){${code}\n})`)(module.exports);
const { statusTone } = module.exports;
let checks = 0;
for (const [label, tone] of Object.entries({
  Approved: "success",
  Completed: "success",
  Active: "success",
  Published: "success",
  Declined: "danger",
  Error: "danger",
  Suspended: "danger",
  "Pending review": "warning",
  "Settlement not confirmed": "warning",
  "In review": "warning",
  "Changes required": "warning",
  Draft: "neutral",
  Cancelled: "neutral",
  "Status unavailable": "neutral",
  "not approved": "neutral",
  constructor: "neutral",
  "future state": "neutral",
})) {
  assert.equal(statusTone(label), tone, label);
  checks++;
}
function luminance(hex) {
  const rgb = hex
    .match(/[\da-f]{2}/gi)
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
const css = readFileSync("components/dashboard/status-colors.css", "utf8");
const palettes = [
  ...css.matchAll(
    /(?:^|\n)(?:html\.dark )?body:has\(\.ca-dashboard\) \{([^}]+)\}/g,
  ),
];
assert.equal(palettes.length, 2);
checks++;
for (const [index, match] of palettes.entries()) {
  const vars = Object.fromEntries(
    [...match[1].matchAll(/--ca-([\w-]+):\s*(#[\da-f]{6})/g)].map((m) => [
      m[1],
      m[2],
    ]),
  );
  for (const tone of ["success", "danger", "warning", "info", "neutral"]) {
    const a = luminance(vars[`${tone}-fg`]);
    const b = luminance(vars[`${tone}-bg`]);
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    assert.ok(ratio >= 4.5, `${index ? "dark" : "light"} ${tone}: ${ratio}`);
    checks++;
    console.log(`${index ? "Dark" : "Light"} ${tone}: ${ratio.toFixed(2)}:1`);
  }
}
for (const asset of [
  "btc.png",
  "eth.png",
  "bch.svg",
  "ltc.png",
  "xrp.png",
  "usdt.svg",
]) {
  assert.ok(existsSync(`public/images/icon/${asset}`));
  checks++;
}
for (const asset of ["bch.svg", "usdt.svg"]) {
  assert.ok(
    !/<script|foreignObject|onload=|https?:\/\/(?!www.w3.org)/i.test(
      readFileSync(`public/images/icon/${asset}`, "utf8"),
    ),
  );
  checks++;
}
console.log(
  `Passed ${checks} semantic status, contrast and coin-asset checks. No live services used.`,
);
