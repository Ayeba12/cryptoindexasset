"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "./access.server";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface AdminFinancialItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  currency: string;
  amount: string;
  fee: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  txHash?: string | null;
  paymentProof?: string | null;
  destinationAddress?: string | null;
  notes?: string | null;
  walletBalance?: string;
  walletReserved?: string;
  walletAvailable?: string;
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Queries                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Retrieve financial transaction requests (Deposits or Withdrawals) for admin review.
 */
export async function getAdminFinancialRequestsAction(
  kind: "Deposit" | "Withdrawal",
): Promise<{
  success: boolean;
  items: AdminFinancialItem[];
  error?: string;
}> {
  try {
    await requireAdmin();

    const txType = kind === "Deposit" ? "DEPOSIT" : "WITHDRAWAL";

    const rows = await prisma.transaction.findMany({
      where: { type: txType },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            wallets: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const items: AdminFinancialItem[] = rows.map((row) => {
      const userWallets = row.user?.wallets || [];
      const userWallet = userWallets.find((w) => w.currency === row.currency);
      const balance = userWallet ? userWallet.balance : new Prisma.Decimal(0);
      const reserved = userWallet ? userWallet.reserved : new Prisma.Decimal(0);
      const available = balance.sub(reserved);

      return {
        id: row.id,
        userId: row.userId,
        userName: row.user?.fullName || row.user?.email.split("@")[0] || "Client",
        userEmail: row.user?.email || "unknown@client.com",
        type: row.type as "DEPOSIT" | "WITHDRAWAL",
        currency: row.currency,
        amount: row.amount.toString(),
        fee: row.fee.toString(),
        status: row.status,
        txHash: row.txHash,
        paymentProof: row.paymentProof,
        destinationAddress: row.destinationAddress,
        notes: row.notes,
        walletBalance: balance.toString(),
        walletReserved: reserved.toString(),
        walletAvailable: available.toString(),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      };
    });

    return { success: true, items };
  } catch (error) {
    console.error("[getAdminFinancialRequestsAction] Error:", error);
    return {
      success: false,
      items: [],
      error: error instanceof Error ? error.message : "Failed to load financial requests.",
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Review Mutations                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Review an incoming deposit proof. If approved, credits customer wallet atomically
 * and logs an immutable ledger entry.
 */
export async function reviewDepositAction(
  txId: string,
  decision: "Approved" | "Declined",
  verifiedAmount?: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requireAdmin();

    if (decision === "Declined" && (!reason || reason.trim().length < 8)) {
      return { success: false, error: "Provide a decline justification of at least 8 characters." };
    }

    const tx = await prisma.transaction.findUnique({
      where: { id: txId },
      include: { user: true },
    });

    if (!tx || tx.type !== "DEPOSIT") {
      return { success: false, error: "Deposit transaction record not found." };
    }

    if (tx.status !== "PENDING") {
      return { success: false, error: `This deposit is already ${tx.status.toLowerCase()}.` };
    }

    await prisma.$transaction(async (prismaTx) => {
      // 1. Get or create user wallet
      let wallet = await prismaTx.wallet.findUnique({
        where: {
          userId_currency: {
            userId: tx.userId,
            currency: tx.currency,
          },
        },
      });

      if (!wallet) {
        wallet = await prismaTx.wallet.create({
          data: {
            userId: tx.userId,
            currency: tx.currency,
            balance: new Prisma.Decimal(0),
            reserved: new Prisma.Decimal(0),
          },
        });
      }

      if (decision === "Approved") {
        const creditDecimal = new Prisma.Decimal(verifiedAmount || tx.amount.toString());
        if (creditDecimal.lte(0)) {
          throw new Error("Credited deposit amount must be greater than zero.");
        }

        const balanceBefore = wallet.balance;
        const balanceAfter = balanceBefore.add(creditDecimal);

        // Update Wallet balance
        await prismaTx.wallet.update({
          where: { id: wallet.id },
          data: { balance: balanceAfter },
        });

        // Update Transaction
        await prismaTx.transaction.update({
          where: { id: tx.id },
          data: {
            status: "APPROVED",
            amount: creditDecimal,
            notes: [tx.notes, "Deposit verified and credited by admin"].filter(Boolean).join(" | "),
          },
        });

        // Immutable Ledger Entry
        await prismaTx.ledgerEntry.create({
          data: {
            walletId: wallet.id,
            userId: tx.userId,
            transactionId: tx.id,
            type: "CREDIT",
            amount: creditDecimal,
            balanceBefore,
            balanceAfter,
            reservedBefore: wallet.reserved,
            reservedAfter: wallet.reserved,
            currency: tx.currency,
            description: `Deposit credited via on-chain proof (TxHash: ${tx.txHash || "N/A"})`,
            actor: admin.email,
          },
        });

        // Audit Log
        await prismaTx.auditLog.create({
          data: {
            actor: admin.email,
            action: "DEPOSIT_APPROVED",
            target: tx.userId,
            reason: reason?.trim() || "Verified on-chain receipt",
            before: { status: tx.status, balance: balanceBefore.toString() } as any,
            after: { status: "APPROVED", balance: balanceAfter.toString(), credited: creditDecimal.toString() } as any,
          },
        });

        // Customer Notification
        await prismaTx.notification.create({
          data: {
            userId: tx.userId,
            title: "Deposit Credited",
            message: `Your deposit of ${creditDecimal.toString()} ${tx.currency} has been verified and added to your wallet balance.`,
            isRead: false,
          },
        });
      } else {
        // Declined
        await prismaTx.transaction.update({
          where: { id: tx.id },
          data: {
            status: "REJECTED",
            notes: [tx.notes, `Declined: ${reason?.trim()}`].filter(Boolean).join(" | "),
          },
        });

        await prismaTx.auditLog.create({
          data: {
            actor: admin.email,
            action: "DEPOSIT_DECLINED",
            target: tx.userId,
            reason: reason?.trim() || "Deposit proof rejected",
            before: { status: tx.status } as any,
            after: { status: "REJECTED" } as any,
          },
        });

        await prismaTx.notification.create({
          data: {
            userId: tx.userId,
            title: "Deposit Submission Declined",
            message: `Your deposit submission for ${tx.currency} was declined: ${reason?.trim()}`,
            isRead: false,
          },
        });
      }
    });

    revalidatePath("/admin/deposits");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/activity");
    revalidatePath("/dashboard/deposit");
    revalidatePath("/dashboard/assets");

    return { success: true };
  } catch (error) {
    console.error("[reviewDepositAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to record deposit decision.",
    };
  }
}

/**
 * Review a customer withdrawal request.
 * - Approved: Settles the withdrawal (debits balance, clears reservation, records DEBIT ledger entry).
 * - Declined: Releases the reserved hold back to available balance and records RELEASE ledger entry.
 */
export async function reviewWithdrawalAction(
  txId: string,
  decision: "Approved" | "Declined",
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requireAdmin();

    if (decision === "Declined" && (!reason || reason.trim().length < 8)) {
      return { success: false, error: "Provide a decline justification of at least 8 characters." };
    }

    const tx = await prisma.transaction.findUnique({
      where: { id: txId },
      include: { user: true },
    });

    if (!tx || tx.type !== "WITHDRAWAL") {
      return { success: false, error: "Withdrawal transaction record not found." };
    }

    if (tx.status !== "PENDING") {
      return { success: false, error: `This withdrawal is already ${tx.status.toLowerCase()}.` };
    }

    await prisma.$transaction(async (prismaTx) => {
      const wallet = await prismaTx.wallet.findUnique({
        where: {
          userId_currency: {
            userId: tx.userId,
            currency: tx.currency,
          },
        },
      });

      if (!wallet) {
        throw new Error(`Customer ${tx.currency} wallet record missing.`);
      }

      const totalHeld = tx.amount.add(tx.fee);

      if (decision === "Approved") {
        // Debit balance and clear hold
        const balanceBefore = wallet.balance;
        const balanceAfter = balanceBefore.sub(totalHeld);
        const reservedBefore = wallet.reserved;
        const reservedAfter = Prisma.Decimal.max(new Prisma.Decimal(0), reservedBefore.sub(totalHeld));

        await prismaTx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: balanceAfter,
            reserved: reservedAfter,
          },
        });

        await prismaTx.transaction.update({
          where: { id: tx.id },
          data: {
            status: "APPROVED",
            notes: [tx.notes, "Withdrawal approved and dispatched by admin"].filter(Boolean).join(" | "),
          },
        });

        await prismaTx.ledgerEntry.create({
          data: {
            walletId: wallet.id,
            userId: tx.userId,
            transactionId: tx.id,
            type: "DEBIT",
            amount: totalHeld,
            balanceBefore,
            balanceAfter,
            reservedBefore,
            reservedAfter,
            currency: tx.currency,
            description: `Withdrawal settlement dispatched to ${tx.destinationAddress || "destination"}`,
            actor: admin.email,
          },
        });

        await prismaTx.auditLog.create({
          data: {
            actor: admin.email,
            action: "WITHDRAWAL_APPROVED",
            target: tx.userId,
            reason: reason?.trim() || "Admin approved and dispatched payout",
            before: { status: tx.status, balance: balanceBefore.toString(), reserved: reservedBefore.toString() } as any,
            after: { status: "APPROVED", balance: balanceAfter.toString(), reserved: reservedAfter.toString() } as any,
          },
        });

        await prismaTx.notification.create({
          data: {
            userId: tx.userId,
            title: "Withdrawal Dispatched",
            message: `Your withdrawal of ${tx.amount.toString()} ${tx.currency} has been approved and dispatched to ${tx.destinationAddress || "your external address"}.`,
            isRead: false,
          },
        });
      } else {
        // Declined: Release hold back to available balance
        const reservedBefore = wallet.reserved;
        const reservedAfter = Prisma.Decimal.max(new Prisma.Decimal(0), reservedBefore.sub(totalHeld));

        await prismaTx.wallet.update({
          where: { id: wallet.id },
          data: {
            reserved: reservedAfter,
          },
        });

        await prismaTx.transaction.update({
          where: { id: tx.id },
          data: {
            status: "REJECTED",
            notes: [tx.notes, `Declined: ${reason?.trim()}`].filter(Boolean).join(" | "),
          },
        });

        await prismaTx.ledgerEntry.create({
          data: {
            walletId: wallet.id,
            userId: tx.userId,
            transactionId: tx.id,
            type: "RELEASE",
            amount: totalHeld,
            balanceBefore: wallet.balance,
            balanceAfter: wallet.balance,
            reservedBefore,
            reservedAfter,
            currency: tx.currency,
            description: `Withdrawal hold released upon rejection: ${reason?.trim()}`,
            actor: admin.email,
          },
        });

        await prismaTx.auditLog.create({
          data: {
            actor: admin.email,
            action: "WITHDRAWAL_DECLINED",
            target: tx.userId,
            reason: reason?.trim() || "Withdrawal declined by admin",
            before: { status: tx.status, reserved: reservedBefore.toString() } as any,
            after: { status: "REJECTED", reserved: reservedAfter.toString() } as any,
          },
        });

        await prismaTx.notification.create({
          data: {
            userId: tx.userId,
            title: "Withdrawal Request Declined",
            message: `Your withdrawal of ${tx.amount.toString()} ${tx.currency} was declined: ${reason?.trim()}. Your reserved funds have been returned to your available balance.`,
            isRead: false,
          },
        });
      }
    });

    revalidatePath("/admin/withdrawals");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/activity");
    revalidatePath("/dashboard/withdraw");
    revalidatePath("/dashboard/assets");

    return { success: true };
  } catch (error) {
    console.error("[reviewWithdrawalAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to record withdrawal decision.",
    };
  }
}
