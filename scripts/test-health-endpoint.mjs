import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

console.log("Running /api/health endpoint tests...");

// 1. Transpile app/api/health/route.ts
const routePath = path.join(root, "app/api/health/route.ts");
const routeSource = readFileSync(routePath, "utf8");
const { outputText: routeJs } = ts.transpileModule(routeSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

// Setup mock environment
let mockDbHealthy = true;
let mockSupabaseConfigured = true;
let mockMarketQuoteCount = 6;
let mockReconTelemetry = {
  status: "HEALTHY",
  mismatchCount: 0,
  walletsAudited: 12,
  circuitBreakerActive: false,
  lastReconciledAt: "2026-09-12T12:00:00.000Z",
};

const stubs = {
  "next/server": {
    NextResponse: {
      json: (body, init) => ({
        status: init?.status ?? 200,
        headers: init?.headers ?? {},
        body,
        json: async () => body,
      }),
    },
  },
  "@/lib/db/prisma": {
    prisma: {
      $queryRaw: async () => {
        if (!mockDbHealthy) throw new Error("DB connection timeout");
        return [{ 1: 1 }];
      },
    },
  },
  "@/lib/supabase/config": {
    getSupabaseConfig: () =>
      mockSupabaseConfigured ? { url: "https://example.supabase.co", key: "anon-key" } : null,
  },
  "@/lib/supabase/server": {
    createClient: async () => ({
      auth: {
        getUser: async () => ({ data: { user: null } }),
      },
    }),
  },
  "@/lib/market/service": {
    getMarketSnapshot: async () => ({
      quotes: Object.fromEntries(Array.from({ length: mockMarketQuoteCount }, (_, i) => [`ASSET_${i}`, { price: "100.00" }])),
      coins: [],
      quotedAt: "2026-09-12T12:00:00.000Z",
      isStale: false,
    }),
  },
  "@/lib/admin/reconciliation.server": {
    getReconciliationTelemetry: async () => mockReconTelemetry,
  },
};

function createMockRequest({ url = "http://localhost/api/health", headers = {} } = {}) {
  const parsedUrl = new URL(url);
  return {
    url,
    nextUrl: parsedUrl,
    headers: {
      get: (k) => headers[k.toLowerCase()] ?? null,
    },
  };
}

const sandbox = {
  exports: {},
  module: { exports: {} },
  require: (id) => {
    if (stubs[id]) return stubs[id];
    throw new Error(`Unexpected import in test: ${id}`);
  },
  process: {
    env: { HEALTHCHECK_SECRET: "super-secret-token" },
    uptime: () => 1234,
  },
  console,
  Date,
  Math,
  Object,
  Array,
  Promise,
  Boolean,
  String,
};

vm.runInNewContext(routeJs, sandbox);
const { GET } = sandbox.exports;

// Test 1: Public request returns lightweight status without leaking diagnostics
{
  mockDbHealthy = true;
  mockSupabaseConfigured = true;
  mockReconTelemetry.circuitBreakerActive = false;

  const req = createMockRequest();
  const res = await GET(req);
  assert.equal(res.status, 200, "Public healthy check must return 200");
  assert.equal(res.body.status, "ok");
  assert.ok(res.body.timestamp);
  assert.equal(res.body.diagnostics, undefined, "Public probe must not leak diagnostics");
  console.log("✓ Test 1 Passed: Public request returns lightweight { status: 'ok', timestamp }");
}

// Test 2: Public request when database is down returns 503 degraded
{
  mockDbHealthy = false;
  const req = createMockRequest();
  const res = await GET(req);
  assert.equal(res.status, 503, "Public probe must return 503 when DB down");
  assert.equal(res.body.status, "degraded");
  assert.equal(res.body.diagnostics, undefined, "Degraded public probe must not leak stack traces or diagnostics");
  mockDbHealthy = true; // reset
  console.log("✓ Test 2 Passed: Public request returns 503 degraded without leaking internals when DB is down");
}

// Test 3: Authenticated diagnostic request with token returns full breakdown
{
  const req = createMockRequest({
    url: "http://localhost/api/health?detailed=true",
    headers: { "x-healthcheck-token": "super-secret-token" },
  });
  const res = await GET(req);
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "ok");
  assert.ok(res.body.diagnostics, "Detailed probe must include diagnostics");
  assert.equal(res.body.diagnostics.database.status, "healthy");
  assert.equal(res.body.diagnostics.supabase.status, "healthy");
  assert.equal(res.body.diagnostics.market.status, "healthy");
  assert.equal(res.body.diagnostics.market.quoteCount, 6);
  assert.equal(res.body.diagnostics.reconciliation.status, "healthy");
  assert.equal(res.body.diagnostics.reconciliation.mismatchCount, 0);
  console.log("✓ Test 3 Passed: Authenticated diagnostic request returns full subsystem breakdown");
}

// Test 4: Unauthenticated detailed request is denied detailed view and receives safe public view
{
  const req = createMockRequest({
    url: "http://localhost/api/health?detailed=true",
    headers: { "x-healthcheck-token": "invalid-token" },
  });
  const res = await GET(req);
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "ok");
  assert.equal(res.body.diagnostics, undefined, "Invalid token must not receive diagnostic telemetry");
  console.log("✓ Test 4 Passed: Unauthenticated request with ?detailed=true safely falls back to public payload");
}

// Test 5: Circuit breaker trips overall health to degraded
{
  mockReconTelemetry.circuitBreakerActive = true;
  mockReconTelemetry.mismatchCount = 3;
  const req = createMockRequest();
  const res = await GET(req);
  assert.equal(res.status, 503, "Tripped circuit breaker must return 503 degraded");
  assert.equal(res.body.status, "degraded");
  mockReconTelemetry.circuitBreakerActive = false; // reset
  console.log("✓ Test 5 Passed: Tripped reconciliation circuit breaker flips system to degraded");
}

console.log("All 5 /api/health endpoint tests passed successfully!\n");
