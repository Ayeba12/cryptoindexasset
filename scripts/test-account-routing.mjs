import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../lib/supabase/middleware.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
const redirectsSource = await readFile(new URL("../lib/auth/redirects.ts", import.meta.url), "utf8");
const { outputText: redirectsOutput } = ts.transpileModule(redirectsSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
const redirects = {};
vm.runInNewContext(redirectsOutput, { exports: redirects, URL, decodeURIComponent });
let calls = 0;
async function check(path, configured, user, expected) {
  const exports = {};
  const next = () => ({ kind: "next", cookies: { set() {} } });
  vm.runInNewContext(outputText, { exports, URL, require(name) {
    if (name === "./config") return { getSupabaseConfig: () => configured ? { url: "https://example.test", key: "test-only" } : null };
    if (name === "next/server") return { NextResponse: {
      next,
      redirect: (url) => ({ kind: "redirect", path: url.pathname, search: url.search }),
      json: (body, options) => ({ kind: "json", status: options.status, body }),
    } };
    if (name === "@/lib/auth/redirects") return redirects;
    if (name === "@supabase/ssr") return { createServerClient() {
      calls++;
      return { auth: { getUser: async () => ({ data: { user } }) } };
    } };
    throw new Error(`Unexpected import: ${name}`);
  } });
  const requestUrl = new URL(path, "http://localhost");
  requestUrl.clone = () => new URL(requestUrl);
  const request = { url: requestUrl.toString(), nextUrl: requestUrl, cookies: { getAll: () => [], set() {} } };
  const result = await exports.updateSession(request);
  const actual = result.kind === "redirect" ? `redirect:${result.path}` : result.kind === "json" ? `status:${result.status}` : "next";
  assert.equal(actual, expected, `${path}, configured=${configured}, role=${user?.app_metadata?.role}`);
}

for (const unsafe of ["//evil.example", "/\\evil.example", "https://evil.example", "/%5cevil.example", "/contact"]) {
  assert.equal(redirects.sanitizeCustomerReturnPath(unsafe), "/dashboard", `unsafe customer return: ${unsafe}`);
}
assert.equal(redirects.sanitizeCustomerReturnPath("/dashboard/traders/t-1?tab=history"), "/dashboard/traders/t-1?tab=history");
assert.equal(redirects.sanitizeAdminReturnPath("/admin/users?status=pending"), "/admin/users?status=pending");
assert.equal(redirects.sanitizeAdminReturnPath("/dashboard"), "/admin");
assert.equal(redirects.sanitizeAuthCallbackPath("/reset-password"), "/reset-password");
assert.equal(redirects.sanitizeAuthCallbackPath("/@evil.example"), "/dashboard");

for (const path of ["/login", "/register", "/admin/login", "/forgot-password", "/reset-password"]) await check(path, false, null, "next");
for (const path of ["/dashboard", "/deposit", "/withdraw", "/copy-trading/private", "/transactions", "/settings"]) await check(path, false, null, "redirect:/login");
await check("/admin", false, null, "redirect:/admin/login");
await check("/api/private", false, null, "status:503");
assert.equal(calls, 0, "Missing configuration must not create an auth client");

const ordinary = { app_metadata: { role: "user" } };
const editableClaim = { user_metadata: { role: "admin" }, app_metadata: {} };
const administrator = { app_metadata: { role: "admin" } };
for (const path of ["/admin", "/admin/users", "/admin/withdrawals"]) {
  await check(path, true, null, "redirect:/admin/login");
  await check(path, true, ordinary, "status:403");
  await check(path, true, editableClaim, "status:403");
  await check(path, true, administrator, "next");
}
await check("/dashboard", true, null, "redirect:/login");
await check("/dashboard", true, ordinary, "next");
await check("/login", true, ordinary, "redirect:/dashboard");
await check("/register", true, ordinary, "redirect:/dashboard");
await check("/login?returnUrl=%2Fdashboard%2Ftraders%2Ft-1", true, ordinary, "redirect:/dashboard/traders/t-1");
await check("/login?returnUrl=%2F%2Fevil.example", true, ordinary, "redirect:/dashboard");
await check("/login", true, null, "next");
await check("/admin/login", true, ordinary, "next");
await check("/admin/login?returnUrl=%2Fadmin%2Fusers", true, administrator, "redirect:/admin/users");
console.log("Passed: middleware and redirect-sanitizer scenarios, including malicious returns, missing configuration and server-managed admin roles. Supabase is stubbed; no network or account actions.");
