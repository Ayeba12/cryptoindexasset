import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../lib/public-cookie-notice.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const exports = {};
vm.runInNewContext(outputText, { exports });
const { hasCurrentCookieNotice: current, COOKIE_NOTICE_VERSION: version, COOKIE_NOTICE_MAX_AGE: age } = exports;
const now = Date.UTC(2026, 8, 4);
const record = (acknowledgedAt, revision = version) => JSON.stringify({ version: revision, acknowledgedAt });
for (const raw of [null, "", "bad", "null", "[]", "{}", record(now, 0), record(now + 1), record(now - age), record(now - age - 1), record("2026-09-04")]) {
  assert.equal(current(raw, now), false, `Invalid or expired notice: ${raw}`);
}
assert.equal(current(record(now), now), true);
assert.equal(current(record(now - age + 1), now), true);
console.log("Passed: 13 cookie-notice version, timestamp, expiry and malformed-storage cases. Acknowledgement is not consent to optional tracking.");

const css = await readFile(new URL("../components/public-site/public.css", import.meta.url), "utf8");
const layer = (selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rule = css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`));
  assert.ok(rule, `Missing layer selector ${selector}`);
  return Number(rule[1].match(/z-index:\s*(\d+)/)?.[1]);
};
assert.ok(layer(".pp-cookie-notice") < layer(".pp-overlay"), "The notice must stay below the modal backdrop");
assert.ok(layer(".pp-cookie-notice") < layer(".pp-sheet"), "The notice must not obscure focus inside mobile navigation");
console.log("Passed: cookie banner stays below the modal overlay and navigation sheet.");
