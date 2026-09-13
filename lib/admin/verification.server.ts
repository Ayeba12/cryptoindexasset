"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "./access.server";
import {
  BUCKET_PRIVATE_KYC,
  createPrivateSignedUrl,
} from "@/lib/storage/supabase-storage.server";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface AdminKycItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  documentType: string;
  status: "PENDING" | "APPROVED" | "DECLINED";
  hasFront: boolean;
  hasBack: boolean;
  rejectionMsg?: string | null;
  submittedAt: string;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Server Actions                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Retrieve the identity verification review queue for administrators.
 */
export async function getAdminVerificationQueueAction(): Promise<{
  success: boolean;
  items: AdminKycItem[];
  error?: string;
}> {
  try {
    await requireAdmin();

    const rows = await prisma.kycDocument.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const items: AdminKycItem[] = rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      userName: row.user?.fullName || row.user?.email.split("@")[0] || "Client",
      userEmail: row.user?.email || "unknown@client.com",
      documentType: row.documentType,
      status: (row.status === "REJECTED" ? "DECLINED" : row.status) as "PENDING" | "APPROVED" | "DECLINED",
      hasFront: Boolean(row.frontUrl),
      hasBack: Boolean(row.backUrl),
      rejectionMsg: row.rejectionMsg,
      submittedAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));

    return { success: true, items };
  } catch (error) {
    console.error("[getAdminVerificationQueueAction] Error:", error);
    return {
      success: false,
      items: [],
      error: error instanceof Error ? error.message : "Failed to load verification queue.",
    };
  }
}

/**
 * Generate a short-lived (15-minute) signed URL for private KYC document preview.
 */
export async function getKycDocumentSignedUrlAction(
  documentId: string,
  side: "front" | "back",
): Promise<{
  success: boolean;
  url: string;
  error?: string;
}> {
  try {
    await requireAdmin();

    const doc = await prisma.kycDocument.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
      return { success: false, url: "", error: "Verification document not found." };
    }

    const path = side === "front" ? doc.frontUrl : doc.backUrl;
    if (!path) {
      return { success: false, url: "", error: `No ${side} document uploaded for this submission.` };
    }

    const result = await createPrivateSignedUrl(BUCKET_PRIVATE_KYC, path, 900);
    return result;
  } catch (error) {
    console.error("[getKycDocumentSignedUrlAction] Error:", error);
    return {
      success: false,
      url: "",
      error: error instanceof Error ? error.message : "Failed to access document.",
    };
  }
}

/**
 * Record an administrator review decision (Approved or Declined) for a KYC submission.
 */
export async function reviewKycAction(
  documentId: string,
  decision: "Approved" | "Declined",
  reason: string,
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const admin = await requireAdmin();

    if (!reason || reason.trim().length < 8) {
      return { success: false, error: "Provide a review justification of at least 8 characters." };
    }

    const doc = await prisma.kycDocument.findUnique({
      where: { id: documentId },
      include: { user: true },
    });

    if (!doc) {
      return { success: false, error: "Verification document record not found." };
    }

    const targetStatus = decision === "Approved" ? "APPROVED" : "REJECTED";

    await prisma.$transaction(async (tx) => {
      // 1. Update KYC Document
      await tx.kycDocument.update({
        where: { id: documentId },
        data: {
          status: targetStatus,
          rejectionMsg: decision === "Declined" ? reason.trim() : null,
        },
      });

      // 2. Update User Account Status
      await tx.user.update({
        where: { id: doc.userId },
        data: {
          status: decision === "Approved" && doc.user.status === "PENDING_KYC" ? "ACTIVE" : doc.user.status,
        },
      });

      // 3. Record Audit Log
      await tx.auditLog.create({
        data: {
          actor: admin.email,
          action: `KYC_${decision.toUpperCase()}`,
          target: doc.userId,
          reason: reason.trim(),
          before: { status: doc.status, userStatus: doc.user.status } as any,
          after: { status: targetStatus, userStatus: decision === "Approved" ? "ACTIVE" : doc.user.status } as any,
        },
      });

      // 4. Send Customer Notification
      await tx.notification.create({
        data: {
          userId: doc.userId,
          title: decision === "Approved" ? "Identity Verified" : "Verification Update Required",
          message:
            decision === "Approved"
              ? "Your identity documents have been verified. Withdrawal and enhanced trading capabilities are now active."
              : `Your identity verification was declined: ${reason.trim()}`,
          isRead: false,
        },
      });
    });

    revalidatePath("/admin/verification");
    revalidatePath("/admin/users");
    revalidatePath("/dashboard/settings/verification");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("[reviewKycAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to record review decision.",
    };
  }
}
