import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

let authorized = true;
let fail = false;
let calls = 0;
const transactions = [{ type: "DEPOSIT", status: "PENDING" }, { type: "WITHDRAWAL", status: "PENDING" }, { type: "DEPOSIT", status: "APPROVED" }];
const documents = [{ status: "PENDING" }, { status: "REJECTED" }];
const count = rows => async ({ where }) => {
  calls++;
  if (fail) throw new Error("Database unavailable");
  return rows.filter(row => Object.entries(where).every(([key, value]) => row[key] === value)).length;
};
const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync("lib/admin/attention.server.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
  exports, console: { error() {} },
  require(name) {
    if (name === "./access.server") return { requireAdmin: async () => { if (!authorized) throw new Error("Unauthorized"); } };
    if (name === "@/lib/db/prisma") return { prisma: { transaction: { count: count(transactions) }, kycDocument: { count: count(documents) } } };
    throw new Error(name);
  },
});
assert.equal(JSON.stringify(await exports.getAdminAttention()), JSON.stringify({ deposits: 1, withdrawals: 1, verification: 1 }));
transactions[0].status = "APPROVED";
documents[0].status = "APPROVED";
assert.equal(JSON.stringify(await exports.getAdminAttention()), JSON.stringify({ deposits: 0, withdrawals: 1, verification: 0 }));
authorized = false;
const before = calls;
await assert.rejects(exports.getAdminAttention(), /Unauthorized/);
assert.equal(calls, before, "No database reads before admin authorization");
authorized = true; fail = true;
await assert.rejects(exports.getAdminAttention(), /unavailable/, "A failed count must not be reported as zero");
console.log("Passed: pending-only counts, reviewed-item removal, admin authorization, and unavailable-state handling.");
