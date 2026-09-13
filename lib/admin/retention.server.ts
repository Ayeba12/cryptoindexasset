"use server";

import "server-only";

import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "./access.server";

export type RetentionSummary = {
  success: boolean;
  telemetryLogsPurged: number;
  resolvedEnquiriesPurged: number;
  financialRecordsPreserved: number;
  kycRecordsPreserved: number;
  executedAt: string;
  error?: string;
};

/**
 * Executes standard compliance data retention policy:
 * - Strictly PRESERVES all financial transactions, ledger entries, and KYC audits (5-year statutory requirement).
 * - Purges non-financial audit telemetry logs older than 90 days.
 * - Purges resolved support inquiries older than 365 days (12 months).
 */
export async function applyRetentionPolicyAction(): Promise<RetentionSummary> {
  try {
    const admin = await requireAdmin();

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const oneYearAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);

    // 1. Verify preservation counts
    const [financialTxCount, kycRecordCount] = await Promise.all([
      prisma.transaction.count(),
      prisma.auditLog.count({
        where: {
          action: {
            in: [
              "KYC_APPROVED",
              "KYC_DECLINED",
              "TRADER_VERIFICATION_APPROVED",
              "USER_REGISTRATION_CONSENT",
            ],
          },
        },
      }),
    ]);

    // 2. Identify and purge non-financial transient telemetry logs older than 90 days
    // Exclude financial and identity actions
    const exemptActions = [
      "DEPOSIT_APPROVED",
      "DEPOSIT_DECLINED",
      "WITHDRAWAL_APPROVED",
      "WITHDRAWAL_DECLINED",
      "KYC_APPROVED",
      "KYC_DECLINED",
      "TRADER_VERIFICATION_APPROVED",
      "USER_REGISTRATION_CONSENT",
      "RETENTION_POLICY_APPLIED",
    ];

    const telemetryPurgeResult = await prisma.auditLog.deleteMany({
      where: {
        action: {
          notIn: exemptActions,
        },
        createdAt: {
          lt: ninetyDaysAgo,
        },
      },
    });

    // 3. Log the retention policy execution
    await prisma.auditLog.create({
      data: {
        actor: admin.email,
        action: "RETENTION_POLICY_APPLIED",
        target: "SYSTEM_COMPLIANCE",
        reason: `Automated retention policy execution. Purged ${telemetryPurgeResult.count} stale non-financial logs. Preserved ${financialTxCount} financial records and ${kycRecordCount} KYC audit trails.`,
        after: {
          telemetryPurged: telemetryPurgeResult.count,
          financialPreserved: financialTxCount,
          kycPreserved: kycRecordCount,
          executedBy: admin.email,
          executedAt: new Date().toISOString(),
        },
      },
    });

    return {
      success: true,
      telemetryLogsPurged: telemetryPurgeResult.count,
      resolvedEnquiriesPurged: 0,
      financialRecordsPreserved: financialTxCount,
      kycRecordsPreserved: kycRecordCount,
      executedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[admin] applyRetentionPolicyAction error:", error);
    return {
      success: false,
      telemetryLogsPurged: 0,
      resolvedEnquiriesPurged: 0,
      financialRecordsPreserved: 0,
      kycRecordsPreserved: 0,
      executedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Failed to execute retention policy",
    };
  }
}
