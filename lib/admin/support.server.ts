"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "./access.server";

export type SupportEnquiry = {
  id: string;
  caseReference: string;
  name: string;
  email: string;
  topic: string;
  reference: string | null;
  message: string;
  status: "Open" | "In progress" | "Resolved";
  createdAt: string;
  updatedAt?: string;
  adminNotes?: string | null;
};

export async function getSupportEnquiriesAction(): Promise<{
  success: boolean;
  enquiries: SupportEnquiry[];
  error?: string;
}> {
  try {
    await requireAdmin();

    // Fetch initial enquiries and all status updates
    const [enquiryLogs, updateLogs] = await Promise.all([
      prisma.auditLog.findMany({
        where: { action: "PUBLIC_CONTACT_ENQUIRY" },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.auditLog.findMany({
        where: { action: "SUPPORT_ENQUIRY_UPDATE" },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    ]);

    // Map latest status update per caseReference
    const latestUpdates = new Map<string, { status: "Open" | "In progress" | "Resolved"; notes?: string; updatedAt: string }>();
    for (const update of updateLogs) {
      const data = update.after as Record<string, unknown> | null;
      const caseRef = String(data?.caseReference || update.target || "");
      if (caseRef && !latestUpdates.has(caseRef)) {
        latestUpdates.set(caseRef, {
          status: (data?.status as any) || "In progress",
          notes: data?.notes ? String(data.notes) : undefined,
          updatedAt: update.createdAt.toISOString(),
        });
      }
    }

    const enquiries: SupportEnquiry[] = enquiryLogs.map((log) => {
      const payload = log.after as Record<string, unknown> | null;
      const caseReference = String(payload?.caseReference || `CIA-${log.createdAt.getUTCFullYear()}-${log.id.slice(0, 6).toUpperCase()}`);
      const latest = latestUpdates.get(caseReference);

      return {
        id: log.id,
        caseReference,
        name: String(payload?.name || log.actor || "Anonymous"),
        email: String(payload?.email || log.actor || "no-reply@cryptoindexasset.com"),
        topic: String(payload?.topic || log.target || "General enquiry"),
        reference: payload?.reference ? String(payload.reference) : log.reason,
        message: String(payload?.message || "No message content recorded."),
        status: latest ? latest.status : "Open",
        createdAt: log.createdAt.toISOString(),
        updatedAt: latest?.updatedAt,
        adminNotes: latest?.notes,
      };
    });

    return { success: true, enquiries };
  } catch (error) {
    console.error("[admin] getSupportEnquiriesAction error:", error);
    return {
      success: false,
      enquiries: [],
      error: error instanceof Error ? error.message : "Failed to load support enquiries",
    };
  }
}

export async function updateSupportEnquiryStatusAction(
  caseReference: string,
  status: "Open" | "In progress" | "Resolved",
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requireAdmin();

    await prisma.auditLog.create({
      data: {
        actor: admin.email,
        action: "SUPPORT_ENQUIRY_UPDATE",
        target: caseReference,
        reason: notes || `Case ${caseReference} marked as ${status}`,
        after: {
          caseReference,
          status,
          notes: notes || null,
          updatedBy: admin.email,
          updatedAt: new Date().toISOString(),
        },
      },
    });

    revalidatePath("/admin/support");
    return { success: true };
  } catch (error) {
    console.error("[admin] updateSupportEnquiryStatusAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update enquiry status",
    };
  }
}
