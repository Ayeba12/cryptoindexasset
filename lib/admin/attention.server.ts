"use server";

import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "./access.server";

export async function getAdminAttention() {
  await requireAdmin();
  try {
    const [deposits, withdrawals, verification] = await Promise.all([
      prisma.transaction.count({ where: { type: "DEPOSIT", status: "PENDING" } }),
      prisma.transaction.count({ where: { type: "WITHDRAWAL", status: "PENDING" } }),
      prisma.kycDocument.count({ where: { status: "PENDING" } }),
    ]);
    return { deposits, withdrawals, verification };
  } catch {
    console.error("[admin] Pending review counts unavailable");
    throw new Error("Pending review counts unavailable");
  }
}
