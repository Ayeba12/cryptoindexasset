import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../proxy.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

for (const mode of ["development", "production"]) {
  const exports = {};
  const context = {
    exports,
    process: { env: { NODE_ENV: mode } },
    require(name) {
      if (name === "next/server") return { NextResponse: { next: () => "public" } };
      if (name === "@/lib/supabase/middleware") return { updateSession: async () => "session-check" };
      throw new Error(`Unexpected middleware import: ${name}`);
    },
  };
  vm.runInNewContext(outputText, context);
  for (const path of ["/", "/how-it-works", "/copy-trading", "/about", "/contact", "/terms", "/policy", "/cookie-policy"]) {
    assert.equal(await exports.proxy({ nextUrl: { pathname: path } }), "public", `${mode}: ${path}`);
  }
  for (const path of ["/dashboard", "/dashboard/copy-trading", "/deposit", "/withdraw", "/copy-trading/private", "/copy-trading-extra", "/admin", "/admin/login", "/login", "/register", "/settings", "/transactions", "/api/private"]) {
    assert.equal(await exports.proxy({ nextUrl: { pathname: path } }), "session-check", `${mode}: ${path}`);
  }
  for (const path of ["/design-preview", "/design-preview/home"]) {
    assert.equal(await exports.proxy({ nextUrl: { pathname: path } }), mode === "development" ? "public" : "session-check", `${mode}: ${path}`);
  }
}
console.log("Passed: 46 public/preview/protected routing assertions. Session authorization itself is outside this test.");
