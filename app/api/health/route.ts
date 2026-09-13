import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getMarketSnapshot } from "@/lib/market/service";
import { getReconciliationTelemetry } from "@/lib/admin/reconciliation.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface SubsystemDiagnostic {
  status: "healthy" | "degraded" | "unconfigured" | "unreachable";
  latencyMs?: number;
  [key: string]: any;
}

/**
 * Validates whether the caller is authorized to view deep diagnostics.
 * Authorized if:
 * 1. `x-healthcheck-token` matches HEALTHCHECK_SECRET or CRON_SECRET env variable.
 * 2. OR caller has an authenticated Supabase admin/superadmin session.
 */
async function isAuthorizedForDiagnostics(request: NextRequest): Promise<boolean> {
  const secretToken =
    process.env.HEALTHCHECK_SECRET || process.env.CRON_SECRET;

  const headerToken = request.headers.get("x-healthcheck-token");
  const queryToken = request.nextUrl.searchParams.get("token");

  if (secretToken && (headerToken === secretToken || queryToken === secretToken)) {
    return true;
  }

  // Check admin session
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const role = (user?.app_metadata?.role as string | undefined)?.toLowerCase();
    if (role === "admin" || role === "superadmin") {
      return true;
    }
  } catch {
    // Session check fails gracefully
  }

  return false;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  const isDetailed = request.nextUrl.searchParams.get("detailed") === "true";
  const canViewDiagnostics = await isAuthorizedForDiagnostics(request);

  // 1. Database Check
  let dbStatus: SubsystemDiagnostic = { status: "unreachable" };
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = {
      status: "healthy",
      latencyMs: Date.now() - dbStart,
    };
  } catch (err: any) {
    dbStatus = {
      status: "unreachable",
      latencyMs: Date.now() - dbStart,
      errorCategory: err?.code || "DB_CONNECTION_FAILED",
    };
  }

  // 2. Supabase Configuration Check
  let supabaseStatus: SubsystemDiagnostic = { status: "unconfigured" };
  const supabaseConfig = getSupabaseConfig();
  if (supabaseConfig) {
    supabaseStatus = {
      status: "healthy",
      configured: true,
      urlConfigured: Boolean(supabaseConfig.url),
    };
  }

  // 3. Market Feed Check
  let marketStatus: SubsystemDiagnostic = { status: "degraded" };
  try {
    const snapshot = await getMarketSnapshot();
    const quoteCount = Object.keys(snapshot.quotes).length;
    marketStatus = {
      status: quoteCount >= 6 ? "healthy" : "degraded",
      quoteCount,
      isStale: snapshot.isStale,
      quotedAt: snapshot.quotedAt,
    };
  } catch {
    marketStatus = {
      status: "degraded",
      quoteCount: 0,
      isStale: true,
    };
  }

  // 4. Financial Reconciliation Telemetry Check
  let reconStatus: SubsystemDiagnostic = { status: "healthy" };
  try {
    const telemetry = await getReconciliationTelemetry();
    reconStatus = {
      status: telemetry.status === "DEGRADED" ? "degraded" : "healthy",
      mismatchCount: telemetry.mismatchCount,
      walletsAudited: telemetry.walletsAudited,
      circuitBreakerActive: telemetry.circuitBreakerActive,
      lastReconciledAt: telemetry.lastReconciledAt,
    };
  } catch {
    reconStatus = {
      status: "unconfigured",
    };
  }

  // 5. Overall System Health Evaluation
  const isHealthy =
    dbStatus.status === "healthy" &&
    supabaseStatus.status === "healthy" &&
    !reconStatus.circuitBreakerActive;

  const httpStatus = isHealthy ? 200 : 503;

  // Unauthenticated / Public Probes: Return lightweight, secure payload
  if (!isDetailed || !canViewDiagnostics) {
    return NextResponse.json(
      {
        status: isHealthy ? "ok" : "degraded",
        timestamp,
      },
      {
        status: httpStatus,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  }

  // Authenticated Probes: Return rich diagnostic breakdown
  return NextResponse.json(
    {
      status: isHealthy ? "ok" : "degraded",
      timestamp,
      uptimeSeconds: Math.floor(process.uptime()),
      version: "2.0.0",
      totalLatencyMs: Date.now() - startTime,
      diagnostics: {
        database: dbStatus,
        supabase: supabaseStatus,
        market: marketStatus,
        reconciliation: reconStatus,
      },
    },
    {
      status: httpStatus,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    }
  );
}
