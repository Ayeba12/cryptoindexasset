"use server";

import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "./access.server";
import { type Currency } from "./model";
import {
  signalErrors,
  type Signal,
  type SignalDraft,
  type SIGNAL_DIRECTIONS,
  type SIGNAL_TIMEFRAMES,
} from "./signals";

/* -------------------------------------------------------------------------- */
/* Helpers & Mappers (Internal only - NOT exported)                           */
/* -------------------------------------------------------------------------- */

function calculateExpiresAt(timeframe: string, fromDate = new Date()): Date {
  const msPerHour = 60 * 60 * 1000;
  switch (timeframe) {
    case "1 hour":
      return new Date(fromDate.getTime() + msPerHour);
    case "4 hours":
      return new Date(fromDate.getTime() + 4 * msPerHour);
    case "1 day":
      return new Date(fromDate.getTime() + 24 * msPerHour);
    case "1 week":
      return new Date(fromDate.getTime() + 7 * 24 * msPerHour);
    default:
      return new Date(fromDate.getTime() + 24 * msPerHour);
  }
}

function mapPrismaSignalToAdmin(row: any): Signal {
  const now = new Date();
  let status = (row.status as "Draft" | "Published" | "Withdrawn" | "Expired") || "Draft";

  // Auto-evaluate expired status if past expiration
  if (status === "Published" && row.expiresAt && new Date(row.expiresAt) <= now) {
    status = "Expired";
  }

  return {
    id: row.id,
    title: row.title,
    asset: (row.asset as Currency) || "BTC",
    direction: (row.direction as (typeof SIGNAL_DIRECTIONS)[number]) || "Watch",
    timeframe: (row.timeframe as (typeof SIGNAL_TIMEFRAMES)[number]) || "1 day",
    analysis: row.analysis,
    enabled: Boolean(row.enabled),
    status,
    author: row.author ?? undefined,
    version: row.version ?? 1,
    expiresAt: row.expiresAt instanceof Date ? row.expiresAt.toISOString() : (row.expiresAt ? String(row.expiresAt) : null),
    publishedAt: row.publishedAt instanceof Date ? row.publishedAt.toISOString() : (row.publishedAt ? String(row.publishedAt) : null),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  };
}

/* -------------------------------------------------------------------------- */
/* Server Actions                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Fetch all trading signals for admin overview.
 */
export async function getAdminSignalsAction(): Promise<{
  success: boolean;
  signals: Signal[];
  error?: string;
}> {
  try {
    await requireAdmin();

    const rows = await prisma.tradingSignal.findMany({
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      signals: rows.map(mapPrismaSignalToAdmin),
    };
  } catch (error) {
    console.error("[getAdminSignalsAction] Error fetching signals:", error);
    return {
      success: false,
      signals: [],
      error: error instanceof Error ? error.message : "Failed to load signals.",
    };
  }
}

/**
 * Create a new trading signal draft.
 */
export async function createSignalAction(draft: SignalDraft): Promise<{
  success: boolean;
  signal?: Signal;
  error?: string;
  errors?: Record<string, string>;
}> {
  try {
    const admin = await requireAdmin();

    const errors = signalErrors(draft);
    if (Object.keys(errors).length > 0) {
      return { success: false, errors: errors as Record<string, string> };
    }

    const expiresAt = calculateExpiresAt(draft.timeframe);

    const created = await prisma.tradingSignal.create({
      data: {
        title: draft.title.trim(),
        asset: draft.asset,
        direction: draft.direction,
        timeframe: draft.timeframe,
        analysis: draft.analysis.trim(),
        status: "Draft",
        enabled: false,
        author: admin.email,
        version: 1,
        expiresAt,
      },
    });

    try {
      await prisma.auditLog.create({
        data: {
          actor: admin.email,
          action: "SIGNAL_CREATE",
          target: created.id,
          reason: `Created signal draft for ${draft.asset} (${draft.direction})`,
          after: created as any,
        },
      });
    } catch (auditErr) {
      console.warn("[createSignalAction] Audit log error (non-fatal):", auditErr);
    }

    revalidatePath("/admin/signals");
    revalidatePath("/admin");
    revalidatePath("/dashboard/trading");
    revalidatePath("/dashboard");
    revalidateTag("trading-signals", { expire: 0 });

    return {
      success: true,
      signal: mapPrismaSignalToAdmin(created),
    };
  } catch (error) {
    console.error("[createSignalAction] Error creating signal:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create signal.",
    };
  }
}

/**
 * Toggle visibility (Show / Hide) of a trading signal.
 */
export async function toggleSignalVisibilityAction(
  id: string,
  expectedVersion?: number,
): Promise<{
  success: boolean;
  signal?: Signal;
  error?: string;
}> {
  try {
    const admin = await requireAdmin();

    const signal = await prisma.tradingSignal.findUnique({
      where: { id },
    });

    if (!signal) {
      return { success: false, error: "Signal not found." };
    }

    if (expectedVersion !== undefined && signal.version !== expectedVersion) {
      return {
        success: false,
        error: "This signal was modified by another administrator. Please refresh.",
      };
    }

    const newEnabled = !signal.enabled;
    const now = new Date();
    let newStatus = signal.status;
    let newExpiresAt = signal.expiresAt;
    let newPublishedAt = signal.publishedAt;

    if (newEnabled) {
      newStatus = "Published";
      newPublishedAt = now;
      // Refresh expiration window if missing or in the past
      if (!newExpiresAt || newExpiresAt <= now) {
        newExpiresAt = calculateExpiresAt(signal.timeframe, now);
      }
    } else {
      newStatus = "Draft";
    }

    const updated = await prisma.tradingSignal.update({
      where: { id },
      data: {
        enabled: newEnabled,
        status: newStatus,
        publishedAt: newPublishedAt,
        expiresAt: newExpiresAt,
        version: { increment: 1 },
      },
    });

    try {
      await prisma.auditLog.create({
        data: {
          actor: admin.email,
          action: "SIGNAL_VISIBILITY_TOGGLE",
          target: signal.id,
          reason: `Signal ${signal.id} visibility toggled to ${newEnabled ? "shown" : "hidden"}`,
          before: signal as any,
          after: updated as any,
        },
      });
    } catch (auditErr) {
      console.warn("[toggleSignalVisibilityAction] Audit log error (non-fatal):", auditErr);
    }

    revalidatePath("/admin/signals");
    revalidatePath("/admin");
    revalidatePath("/dashboard/trading");
    revalidatePath("/dashboard");
    revalidateTag("trading-signals", { expire: 0 });

    return {
      success: true,
      signal: mapPrismaSignalToAdmin(updated),
    };
  } catch (error) {
    console.error("[toggleSignalVisibilityAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to toggle visibility.",
    };
  }
}

/**
 * Withdraw an active trading signal.
 */
export async function withdrawSignalAction(
  id: string,
  expectedVersion?: number,
): Promise<{
  success: boolean;
  signal?: Signal;
  error?: string;
}> {
  try {
    const admin = await requireAdmin();

    const signal = await prisma.tradingSignal.findUnique({
      where: { id },
    });

    if (!signal) {
      return { success: false, error: "Signal not found." };
    }

    if (expectedVersion !== undefined && signal.version !== expectedVersion) {
      return {
        success: false,
        error: "This signal was modified by another administrator. Please refresh.",
      };
    }

    const updated = await prisma.tradingSignal.update({
      where: { id },
      data: {
        enabled: false,
        status: "Withdrawn",
        version: { increment: 1 },
      },
    });

    try {
      await prisma.auditLog.create({
        data: {
          actor: admin.email,
          action: "SIGNAL_WITHDRAW",
          target: signal.id,
          reason: `Signal ${signal.id} withdrawn by administrator`,
          before: signal as any,
          after: updated as any,
        },
      });
    } catch (auditErr) {
      console.warn("[withdrawSignalAction] Audit log error (non-fatal):", auditErr);
    }

    revalidatePath("/admin/signals");
    revalidatePath("/admin");
    revalidatePath("/dashboard/trading");
    revalidatePath("/dashboard");
    revalidateTag("trading-signals", { expire: 0 });

    return {
      success: true,
      signal: mapPrismaSignalToAdmin(updated),
    };
  } catch (error) {
    console.error("[withdrawSignalAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to withdraw signal.",
    };
  }
}
