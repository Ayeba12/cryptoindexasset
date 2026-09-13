"use server";

import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "./access.server";
import {
  blankTrader,
  validateTrader,
  type Currency,
  type Trader,
} from "./model";
import { uploadTraderPortrait } from "@/lib/storage/supabase-storage.server";

/* -------------------------------------------------------------------------- */
/* Cache Revalidation Helper                                                  */
/* -------------------------------------------------------------------------- */

function revalidateTraderPaths(traderId?: string) {
  try {
    revalidateTag("public-traders", { expire: 0 });
    revalidatePath("/");
    revalidatePath("/copy-trading");
    revalidatePath("/dashboard/traders");
    revalidatePath("/dashboard/copy-trades");
    revalidatePath("/dashboard");
    revalidatePath("/admin/traders");
    if (traderId) {
      revalidatePath(`/dashboard/traders/${traderId}`);
      revalidatePath(`/admin/traders/${traderId}`);
    }
  } catch (err) {
    console.warn("[admin] revalidateTraderPaths warning:", err);
  }
}

/* -------------------------------------------------------------------------- */
/* Mappers                                                                    */
/* -------------------------------------------------------------------------- */

function mapPrismaTraderToAdmin(row: any): Trader {
  return {
    id: row.id,
    name: row.name,
    avatar: row.avatar ?? "",
    avatarAlt: row.avatarAlt ?? "",
    summary: row.summary ?? "",
    biography: row.biography ?? "",
    strategy: row.strategy ?? "Swing trading",
    strategyDetails: row.strategyDetails ?? "",
    assets: row.assets ?? "BTC, ETH",
    experience: row.experience ?? "",
    holdingPeriod: row.holdingPeriod ?? "",
    accuracy: row.accuracy
      ? row.accuracy.toString()
      : row.winRate
        ? row.winRate.toString()
        : "",
    period: row.period ?? "",
    sampleSize: row.sampleSize ?? "",
    metricSource: row.metricSource ?? "",
    updatedAt: row.updatedAt instanceof Date
      ? row.updatedAt.toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    risk:
      row.riskLevel === "LOW"
        ? "Low risk"
        : row.riskLevel === "HIGH"
          ? "High risk"
          : "Medium risk",
    riskMethod: row.riskMethod ?? "",
    returns: row.returns ? row.returns.toString() : "",
    drawdown: row.drawdown ? row.drawdown.toString() : "",
    copiers: (row.totalFollowers ?? 0).toString(),
    rating: row.rating ? row.rating.toString() : "",
    ratingCount: (row.ratingCount ?? 0).toString(),
    communitySource: row.communitySource ?? "",
    minimum: row.minCapital ? row.minCapital.toString() : "100.00",
    currency: (row.currency as Currency) || "USDT",
    fee: row.fee
      ? row.fee.toString()
      : row.profitShare
        ? row.profitShare.toString()
        : "15.00",
    mode:
      row.mode ??
      (row.autoTradeMode ? "Automatic execution" : "Manual requests"),
    eligibility: row.eligibility ?? "",
    status:
      (row.status as "Draft" | "Published" | "Archived") ??
      (row.isActive ? "Published" : "Draft"),
    featured: Boolean(row.featured),
    notes: row.notes ?? "",
    version: typeof row.version === "number" ? row.version : 1,
  };
}

function mapAdminToPrismaInput(t: Partial<Trader>) {
  const isAuto = t.mode ? t.mode.toLowerCase().includes("auto") : true;
  const riskMap: Record<string, "LOW" | "MEDIUM" | "HIGH"> = {
    low: "LOW",
    medium: "MEDIUM",
    high: "HIGH",
  };
  const parsedRisk = t.risk
    ? riskMap[t.risk.toLowerCase().replace(/ risk/, "")] ?? "MEDIUM"
    : "MEDIUM";

  return {
    name: (t.name ?? "").trim(),
    slug: (t.name ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    avatar: t.avatar?.trim() || null,
    avatarAlt: t.avatarAlt?.trim() || null,
    summary: t.summary?.trim() || null,
    biography: t.biography?.trim() || null,
    strategy: t.strategy?.trim() || null,
    strategyDetails: t.strategyDetails?.trim() || null,
    assets: t.assets?.trim() || null,
    experience: t.experience?.trim() || null,
    holdingPeriod: t.holdingPeriod?.trim() || null,
    winRate: t.accuracy ? new Prisma.Decimal(t.accuracy) : new Prisma.Decimal(0),
    profitShare: t.fee ? new Prisma.Decimal(t.fee) : new Prisma.Decimal(15),
    accuracy: t.accuracy ? new Prisma.Decimal(t.accuracy) : null,
    period: t.period?.trim() || null,
    sampleSize: t.sampleSize?.trim() || null,
    metricSource: t.metricSource?.trim() || null,
    riskLevel: parsedRisk,
    riskMethod: t.riskMethod?.trim() || null,
    returns: t.returns ? new Prisma.Decimal(t.returns) : null,
    drawdown: t.drawdown ? new Prisma.Decimal(t.drawdown) : null,
    rating: t.rating ? new Prisma.Decimal(t.rating) : null,
    ratingCount: parseInt(t.ratingCount || "0", 10) || 0,
    communitySource: t.communitySource?.trim() || null,
    minCapital: t.minimum ? new Prisma.Decimal(t.minimum) : new Prisma.Decimal(100),
    currency: t.currency || "USDT",
    fee: t.fee ? new Prisma.Decimal(t.fee) : null,
    mode: t.mode?.trim() || null,
    autoTradeMode: isAuto,
    eligibility: t.eligibility?.trim() || null,
    notes: t.notes?.trim() || null,
    featured: Boolean(t.featured),
    totalFollowers: parseInt(t.copiers || "0", 10) || 0,
  };
}

/* -------------------------------------------------------------------------- */
/* Queries                                                                    */
/* -------------------------------------------------------------------------- */

export async function getAdminTradersAction(): Promise<Trader[]> {
  await requireAdmin();
  try {
    const rows = await prisma.copyTrader.findMany({
      orderBy: [
        { featured: "desc" },
        { featuredOrder: "asc" },
        { name: "asc" },
      ],
    });
    return rows.map(mapPrismaTraderToAdmin);
  } catch (error) {
    console.error("[admin] Trader directory query failed.");
    throw new Error("Trader profiles could not be loaded. Please try again.");
  }
}

/* -------------------------------------------------------------------------- */
/* Mutations                                                                  */
/* -------------------------------------------------------------------------- */

export async function createTraderAction(
  input: Trader
): Promise<{ success: boolean; trader?: Trader; errors?: Record<string, string>; error?: string }> {
  const admin = await requireAdmin();
  const errors = validateTrader(input);
  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  try {
    const prismaData = mapAdminToPrismaInput(input);

    if (input.avatar && input.avatar.startsWith("data:")) {
      const uploadRes = await uploadTraderPortrait(crypto.randomUUID(), 1, input.avatar);
      if (!uploadRes.success || !uploadRes.url) return { success: false, error: uploadRes.error || "Portrait could not be saved." };
      prismaData.avatar = uploadRes.url;
    }

    const created = await prisma.$transaction(async (tx) => {
      const res = await tx.copyTrader.create({
        data: {
          ...prismaData,
          status: input.status || "Draft",
          isActive: input.status === "Published",
          version: 1,
        },
      });

      await tx.auditLog.create({
        data: {
          actor: admin.email,
          action: "TRADER_CREATE",
          target: res.id,
          reason: `Trader profile "${res.name}" created with status "${res.status}".`,
          before: Prisma.JsonNull,
          after: { id: res.id, name: res.name, status: res.status },
        },
      });

      return res;
    });

    revalidateTraderPaths(created.id);

    return { success: true, trader: mapPrismaTraderToAdmin(created) };
  } catch (err) {
    console.error("[admin] createTraderAction failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to create trader" };
  }
}

export async function updateTraderAction(
  id: string,
  input: Trader,
  expectedVersion: number
): Promise<{ success: boolean; trader?: Trader; errors?: Record<string, string>; error?: string }> {
  const admin = await requireAdmin();
  const errors = validateTrader(input);
  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  const existing = await prisma.copyTrader.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: "Trader profile not found." };
  }
  if (existing.version !== expectedVersion) {
    return {
      success: false,
      error: `Conflict: This profile was modified by another administrator (version ${existing.version} vs expected ${expectedVersion}). Please reload the page.`,
    };
  }

  try {
    const prismaData = mapAdminToPrismaInput(input);

    if (input.avatar && input.avatar.startsWith("data:")) {
      const uploadRes = await uploadTraderPortrait(id, (existing.version ?? 1) + 1, input.avatar);
      if (!uploadRes.success || !uploadRes.url) return { success: false, error: uploadRes.error || "Portrait could not be saved." };
      prismaData.avatar = uploadRes.url;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.copyTrader.update({
        where: { id },
        data: {
          ...prismaData,
          status: input.status,
          isActive: input.status === "Published",
          version: { increment: 1 },
        },
      });

      await tx.auditLog.create({
        data: {
          actor: admin.email,
          action: "TRADER_UPDATE",
          target: id,
          reason: `Trader profile "${res.name}" updated (version ${res.version}).`,
          before: {
            name: existing.name,
            status: existing.status,
            version: existing.version,
          },
          after: {
            name: res.name,
            status: res.status,
            version: res.version,
          },
        },
      });

      return res;
    });

    revalidateTraderPaths(id);

    return { success: true, trader: mapPrismaTraderToAdmin(updated) };
  } catch (err) {
    console.error("[admin] updateTraderAction failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to update trader" };
  }
}

export async function publishTraderAction(
  id: string,
  expectedVersion: number
): Promise<{ success: boolean; trader?: Trader; error?: string }> {
  const admin = await requireAdmin();
  const existing = await prisma.copyTrader.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: "Trader profile not found." };
  }
  if (existing.version !== expectedVersion) {
    return {
      success: false,
      error: `Conflict: Profile was updated by another administrator. Please reload.`,
    };
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.copyTrader.update({
        where: { id },
        data: {
          status: "Published",
          isActive: true,
          version: { increment: 1 },
        },
      });

      await tx.auditLog.create({
        data: {
          actor: admin.email,
          action: "TRADER_PUBLISH",
          target: id,
          reason: "Published trader profile to discovery directories.",
          before: { status: existing.status, version: existing.version },
          after: { status: res.status, version: res.version },
        },
      });

      return res;
    });

    revalidateTraderPaths(id);

    return { success: true, trader: mapPrismaTraderToAdmin(updated) };
  } catch (err) {
    console.error("[admin] publishTraderAction failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Publication failed" };
  }
}

export async function unpublishTraderAction(
  id: string,
  expectedVersion: number
): Promise<{ success: boolean; trader?: Trader; error?: string }> {
  const admin = await requireAdmin();
  const existing = await prisma.copyTrader.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: "Trader profile not found." };
  }
  if (existing.version !== expectedVersion) {
    return {
      success: false,
      error: `Conflict: Profile was updated by another administrator. Please reload.`,
    };
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.copyTrader.update({
        where: { id },
        data: {
          status: "Draft",
          isActive: false,
          version: { increment: 1 },
        },
      });

      await tx.auditLog.create({
        data: {
          actor: admin.email,
          action: "TRADER_UNPUBLISH",
          target: id,
          reason: "Unpublished trader profile to Draft status.",
          before: { status: existing.status, version: existing.version },
          after: { status: res.status, version: res.version },
        },
      });

      return res;
    });

    revalidateTraderPaths(id);

    return { success: true, trader: mapPrismaTraderToAdmin(updated) };
  } catch (err) {
    console.error("[admin] unpublishTraderAction failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unpublish failed" };
  }
}

export async function archiveTraderAction(
  id: string,
  expectedVersion: number
): Promise<{
  success: boolean;
  trader?: Trader;
  liquidatedCount?: number;
  totalRefunded?: string;
  error?: string;
}> {
  const admin = await requireAdmin();
  const existing = await prisma.copyTrader.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: "Trader profile not found." };
  }
  if (existing.version !== expectedVersion) {
    return {
      success: false,
      error: `Conflict: This trader was updated by another administrator (version ${existing.version} vs expected ${expectedVersion}). Please reload.`,
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark trader as Archived and inactive
      const updated = await tx.copyTrader.update({
        where: { id },
        data: {
          status: "Archived",
          isActive: false,
          version: { increment: 1 },
        },
      });

      // 2. Query active follower allocations
      const activeAllocations = await tx.userCopyTrade.findMany({
        where: {
          traderId: id,
          status: { in: ["ACTIVE", "PAUSED"] },
        },
      });

      let liquidatedCount = 0;
      let totalRefunded = new Prisma.Decimal(0);

      // 3. Immediate Liquidation / Auto-Close of active allocations
      for (const alloc of activeAllocations) {
        await tx.userCopyTrade.update({
          where: { id: alloc.id },
          data: {
            status: "LIQUIDATED",
          },
        });

        const wallet = await tx.wallet.findUnique({
          where: {
            userId_currency: {
              userId: alloc.userId,
              currency: "USDT",
            },
          },
        });

        const profitEarned = alloc.totalEarned;
        const capitalHeld = alloc.allocatedUsd;
        const refundAmount = capitalHeld.plus(profitEarned);

        if (wallet) {
          const reservedBefore = wallet.reserved;
          const reservedAfter = Prisma.Decimal.max(new Prisma.Decimal(0), reservedBefore.sub(capitalHeld));
          const balanceBefore = wallet.balance;
          const balanceAfter = balanceBefore.plus(profitEarned);

          await tx.wallet.update({
            where: { id: wallet.id },
            data: {
              balance: balanceAfter,
              reserved: reservedAfter,
            },
          });

          // Ledger Entry 1: Release reservation hold on the capital
          await tx.ledgerEntry.create({
            data: {
              walletId: wallet.id,
              userId: alloc.userId,
              type: "RELEASE",
              amount: capitalHeld,
              balanceBefore,
              balanceAfter,
              reservedBefore,
              reservedAfter,
              currency: "USDT",
              description: `Capital allocation hold released upon administrator archiving trader "${existing.name}"`,
              actor: admin.email,
            },
          });

          // Ledger Entry 2: If profit earned > 0, credit returns
          if (profitEarned.gt(0)) {
            await tx.ledgerEntry.create({
              data: {
                walletId: wallet.id,
                userId: alloc.userId,
                type: "CREDIT",
                amount: profitEarned,
                balanceBefore,
                balanceAfter,
                reservedBefore: reservedAfter,
                reservedAfter,
                currency: "USDT",
                description: `Profit returns credited upon administrator archiving trader "${existing.name}"`,
                actor: admin.email,
              },
            });
          }
        }

        // Record liquidation transaction
        await tx.transaction.create({
          data: {
            userId: alloc.userId,
            type: "PROFIT_ACCRUAL",
            currency: "USDT",
            amount: refundAmount,
            status: "APPROVED",
            notes: `Auto-liquidation for archived copy trader "${existing.name}" ($${capitalHeld} capital released + $${profitEarned} returns credited)`,
          },
        });

        // Notify user of liquidation
        await tx.notification.create({
          data: {
            userId: alloc.userId,
            title: "Copy Trading Position Liquidated",
            message: `Trader "${existing.name}" was archived by administration. Your capital hold ($${capitalHeld.toFixed(2)} USDT) was released and returns ($${profitEarned.toFixed(2)} USDT) credited to your wallet.`,
          },
        });

        liquidatedCount++;
        totalRefunded = totalRefunded.plus(refundAmount);
      }

      // 4. Record audit log
      await tx.auditLog.create({
        data: {
          actor: admin.email,
          action: "TRADER_ARCHIVE",
          target: id,
          reason: `Trader archived with auto-liquidation of ${liquidatedCount} positions ($${totalRefunded.toFixed(2)} total refunded).`,
          before: {
            name: existing.name,
            status: existing.status,
            version: existing.version,
          },
          after: {
            name: updated.name,
            status: updated.status,
            version: updated.version,
            liquidatedPositions: liquidatedCount,
            totalRefundedUsd: totalRefunded.toString(),
          },
        },
      });

      return { updated, liquidatedCount, totalRefunded };
    });

    revalidateTraderPaths(id);

    return {
      success: true,
      trader: mapPrismaTraderToAdmin(result.updated),
      liquidatedCount: result.liquidatedCount,
      totalRefunded: result.totalRefunded.toString(),
    };
  } catch (err) {
    console.error("[admin] archiveTraderAction failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Archive failed" };
  }
}
