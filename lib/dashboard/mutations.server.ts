"use server";

/**
 * Server actions of the customer dashboard.
 *
 * A `"use server"` module may only export async functions, so each action is
 * a named async function here and the `DashboardActions` object that the
 * layout hands to `DashboardActionsProvider` is assembled in the plain module
 * `lib/dashboard/live-actions.ts`. Import `liveActions` from there; import
 * individual actions from this file only when a form binds one directly.
 *
 * Every action re-validates the session (`session-expired` when absent,
 * `forbidden` for restricted or unprovisioned accounts), validates its input
 * with `zod`, scopes the write by the internal `User.id` and calls
 * `revalidatePath("/dashboard", "layout")` after a successful write.
 *
 * Implemented live: `saveProfile`, `markNotificationRead`,
 * `markAllNotificationsRead`, `changePassword` (Supabase reauthentication
 * then `updateUser`), `startMfaEnrollment` / `verifyMfaEnrollment` /
 * `disableMfa` (Supabase MFA API). Everything money-moving, copy-related and
 * upload-related returns `unavailable` with the capability reason until its
 * backend contract exists. Nothing here calls `WalletService` or
 * `TradeService`.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { createClient } from "@/lib/supabase/server";

import {
  LIVE_REASONS,
  ACCOUNT_SERVICE_ERROR,
  decimalToString,
  mapNotification,
  mapProfile,
  mapVerification,
  mapTransaction,
  mapAllocation,
} from "./adapters/mappers";
import { maskDestination } from "./format";
import { isDecimalString, compare, add, subtract, multiplyByDecimal, toFixed } from "./money";
import { getLiveSessionAccount, logFailure } from "./adapters/live";
import { getMarketQuotes } from "@/lib/market/service";
import type {
  ActionResult,
  AllocationView,
  AuthenticatedAccount,
  CopyRequestInput,
  CopyRequestReceipt,
  DepositProofInput,
  DepositProofReceipt,
  MfaEnrollment,
  MfaStatus,
  NotificationReadResult,
  NotificationsReadAllResult,
  PasswordChangeInput,
  PasswordChangeResult,
  ProfileInput,
  ProfileView,
  TransactionView,
  VerificationInput,
  VerificationView,
  WithdrawalQuote,
  WithdrawalReceipt,
  WithdrawalRequestInput,
} from "./contracts";
import { actionError, actionOk } from "./data-source";

/* -------------------------------------------------------------------------- */
/* Shared helpers (not exported: a "use server" module exports only actions)  */
/* -------------------------------------------------------------------------- */

const SESSION_EXPIRED_MESSAGE = "Your session has expired. Sign in again to continue.";
const UNPROVISIONED_MESSAGE = "This sign-in has no dashboard account yet. Contact support to complete provisioning.";
const MFA_FACTOR_LABEL = "Authenticator app";
const MFA_ISSUER = "Crypto Index Asset";

const idSchema = z.string().trim().min(1).max(128);
const codeSchema = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app");

const profileSchema = z
  .object({
    fullName: z.string().trim().min(1, "Enter your name").max(80, "Use at most 80 characters").optional(),
    phone: z
      .string()
      .trim()
      .max(20, "Use at most 20 characters")
      .refine((value) => value.length === 0 || /^\+?[0-9 ()-]{6,20}$/.test(value), "Enter a phone number with digits, spaces and an optional leading +")
      .optional(),
    country: z.string().trim().max(56, "Use at most 56 characters").optional(),
  })
  .strip();

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(10, "Use at least 10 characters").max(128, "Use at most 128 characters"),
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "Choose a password different from the current one",
    path: ["newPassword"],
  });

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "form";
    if (!(key in errors)) errors[key] = issue.message;
  }
  return errors;
}

function invalidInput<T>(error: z.ZodError): ActionResult<T> {
  return actionError<T>("invalid", "Check the highlighted fields", { fieldErrors: fieldErrorsOf(error) });
}

function unavailable<T>(reason: string): ActionResult<T> {
  return actionError<T>("unavailable", reason);
}

/**
 * Run `work` for the authenticated account. Absent session → `session-expired`;
 * restricted or unprovisioned → `forbidden`; thrown errors → `failed` with a
 * payload-free log line.
 */
async function withAccount<T>(operation: string, work: (account: AuthenticatedAccount) => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  const account = await getLiveSessionAccount();
  if (account.state === "unauthenticated") return actionError<T>("session-expired", SESSION_EXPIRED_MESSAGE);
  if (account.state === "unprovisioned") return actionError<T>("forbidden", UNPROVISIONED_MESSAGE);
  if (account.state === "restricted") return actionError<T>("forbidden", account.reason);
  try {
    return await work(account);
  } catch (error) {
    logFailure(operation, error);
    return actionError<T>("failed", ACCOUNT_SERVICE_ERROR);
  }
}

function revalidateDashboard(): void {
  revalidatePath("/dashboard", "layout");
}

function svgFromQr(qr: string | null | undefined): string | null {
  if (!qr) return null;
  const trimmed = qr.trim();
  if (trimmed.startsWith("<svg")) return trimmed;
  const prefix = "data:image/svg+xml";
  if (trimmed.startsWith(prefix)) {
    const comma = trimmed.indexOf(",");
    if (comma === -1) return null;
    const payload = trimmed.slice(comma + 1);
    try {
      const decoded = trimmed.slice(prefix.length, comma).includes("base64")
        ? Buffer.from(payload, "base64").toString("utf8")
        : decodeURIComponent(payload);
      return decoded.trim().startsWith("<svg") ? decoded.trim() : null;
    } catch {
      return null;
    }
  }
  return null;
}

/** Challenge and verify a TOTP factor; `null` on success, otherwise the failure result. */
async function verifyFactorCode<T>(factorId: string, code: string): Promise<ActionResult<T> | null> {
  const supabase = await createClient();
  const challenge = await supabase.auth.mfa.challenge({ factorId });
  if (challenge.error || !challenge.data) {
    return actionError<T>("invalid", "No enrollment matches this factor. Start the enrollment again.");
  }
  const verified = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code });
  if (verified.error) {
    return actionError<T>("invalid", "The code was not accepted", { fieldErrors: { code: "Enter the current 6-digit code from your authenticator app" } });
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Money-moving, copy and upload actions: unavailable until contracts exist    */
/* -------------------------------------------------------------------------- */

/** Submit a deposit proof for review. */
export async function submitDepositProof(input: DepositProofInput): Promise<ActionResult<DepositProofReceipt>> {
  return withAccount("deposit proof", async ({ userId }) => {
    if (!input.currency || !input.networkId || !input.txHash?.trim()) {
      return actionError<DepositProofReceipt>("invalid", "Provide transaction details and transaction hash.", {
        fieldErrors: {
          txHash: !input.txHash?.trim() ? "Transaction hash is required" : "",
        },
      });
    }

    const combinedNotes = [
      input.networkId ? `Network: ${input.networkId}` : null,
      input.note?.trim() || null,
    ]
      .filter(Boolean)
      .join(" | ");

    const tx = await prisma.transaction.create({
      data: {
        userId,
        type: "DEPOSIT",
        status: "PENDING",
        amount: new Prisma.Decimal(0),
        currency: input.currency,
        txHash: input.txHash.trim(),
        paymentProof: input.fileName?.trim() || null,
        notes: combinedNotes || null,
      },
    });

    try {
      await prisma.notification.create({
        data: {
          userId,
          title: "Deposit Proof Received",
          message: `Your deposit submission for ${input.currency} (Tx: ${input.txHash.slice(0, 10)}...) is being verified.`,
          isRead: false,
        },
      });
    } catch (notifErr) {
      console.warn("[mutations] Failed to write notification:", notifErr);
    }

    revalidatePath("/dashboard/deposit");
    revalidatePath("/dashboard/activity");
    revalidatePath("/admin/deposits");

    return actionOk<DepositProofReceipt>({
      reference: tx.id,
      submittedAt: tx.createdAt.toISOString(),
      status: "PENDING",
    });
  });
}

/** Validate a withdrawal request and quote its fee. */
export async function quoteWithdrawal(input: WithdrawalRequestInput): Promise<ActionResult<WithdrawalQuote>> {
  return withAccount("withdrawal quote", async ({ userId }) => {
    const currency = input.currency;
    const amountStr = input.amount;

    if (!isDecimalString(amountStr) || compare(amountStr, "0") <= 0) {
      return actionError<WithdrawalQuote>("invalid", "Provide a valid withdrawal amount greater than zero.", {
        fieldErrors: { amount: "Amount must be positive" },
      });
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId_currency: { userId, currency } },
    });

    if (!wallet) {
      return actionError<WithdrawalQuote>("invalid", `No active ${currency} wallet found.`);
    }

    const balStr = decimalToString(wallet.balance, 8) ?? "0";
    const resStr = wallet.reserved ? (decimalToString(wallet.reserved, 8) ?? "0") : "0";
    const availableStr = subtract(balStr, resStr);
    const feeStr =
      currency === "BTC"
        ? "0.0002"
        : currency === "ETH"
          ? "0.004"
          : currency === "USDT"
            ? "1.50"
            : "1.00";

    const totalDebit = add(amountStr, feeStr);

    if (compare(availableStr, totalDebit) < 0) {
      return actionError<WithdrawalQuote>(
        "invalid",
        `Insufficient available balance. Your ${currency} balance may be held in open withdrawals or allocations.`,
        { fieldErrors: { amount: "Amount exceeds available balance" } },
      );
    }

    const destination = input.method === "crypto" ? input.address : input.fields?.iban || "Bank account";
    const recipientRef = maskDestination(destination) || destination;

    const quotes = await getMarketQuotes().catch(() => null);
    const quote = quotes && currency in quotes ? quotes[currency as keyof typeof quotes] : null;
    let estimatedDebitUsd: string | null = null;
    let estimatedFeeUsd: string | null = null;
    if (quote) {
      try {
        estimatedDebitUsd = toFixed(multiplyByDecimal(totalDebit, quote.price), 2, "half-up");
        estimatedFeeUsd = toFixed(multiplyByDecimal(feeStr, quote.price), 2, "half-up");
      } catch {
        estimatedDebitUsd = null;
        estimatedFeeUsd = null;
      }
    }

    return actionOk<WithdrawalQuote>({
      quoteId: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      fee: feeStr,
      totalDebit,
      recipientAmount: amountStr,
      currency: currency as any,
      recipientRef,
      estimatedDebitUsd,
      estimatedFeeUsd,
    });
  });
}

/** Submit a quoted withdrawal under an idempotency key. */
export async function submitWithdrawal(
  input: WithdrawalRequestInput,
  _quoteId: string,
  idempotencyKey: string,
): Promise<ActionResult<WithdrawalReceipt>> {
  return withAccount("withdrawal submit", async ({ userId }) => {
    // 1. Idempotency Check
    const existing = await prisma.transaction.findUnique({
      where: { idempotencyKey },
    });

    if (existing) {
      return actionOk<WithdrawalReceipt>({
        requestId: existing.id,
        reference: existing.id,
        status: "PENDING",
        submittedAt: existing.createdAt.toISOString(),
      });
    }

    const currency = input.currency;
    const amountStr = input.amount;
    const feeStr =
      currency === "BTC"
        ? "0.0002"
        : currency === "ETH"
          ? "0.004"
          : currency === "USDT"
            ? "1.50"
            : "1.00";

    const destination = input.method === "crypto" ? input.address : input.fields?.iban || "Bank account";
    const network = input.method === "crypto" ? input.networkId : "bank_wire";
    const tag = input.method === "crypto" ? input.tag : null;
    const totalDebitStr = add(amountStr, feeStr);
    const totalDebitDec = new Prisma.Decimal(totalDebitStr);

    const tx = await prisma.$transaction(async (prismaTx) => {
      const wallet = await prismaTx.wallet.findUnique({
        where: { userId_currency: { userId, currency } },
      });

      if (!wallet) {
        throw new Error(`No ${currency} wallet record found.`);
      }

      const available = wallet.balance.sub(wallet.reserved);
      if (available.lt(totalDebitDec)) {
        throw new Error("Insufficient available balance for this withdrawal.");
      }

      const reservedBefore = wallet.reserved;
      const reservedAfter = reservedBefore.add(totalDebitDec);

      // 1. Increment reserved balance
      await prismaTx.wallet.update({
        where: { id: wallet.id },
        data: { reserved: reservedAfter },
      });

      // 2. Create pending transaction
      const createdTx = await prismaTx.transaction.create({
        data: {
          userId,
          type: "WITHDRAWAL",
          currency,
          amount: new Prisma.Decimal(amountStr),
          fee: new Prisma.Decimal(feeStr),
          status: "PENDING",
          idempotencyKey,
          destinationAddress: destination,
          notes: [network ? `Network: ${network}` : null, tag ? `Tag: ${tag}` : null].filter(Boolean).join(" | ") || null,
        },
      });

      // 3. Create HOLD ledger entry
      await prismaTx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          userId,
          transactionId: createdTx.id,
          type: "HOLD",
          amount: totalDebitDec,
          balanceBefore: wallet.balance,
          balanceAfter: wallet.balance,
          reservedBefore,
          reservedAfter,
          currency,
          description: `Withdrawal request reservation hold for ${amountStr} ${currency}`,
          actor: userId,
        },
      });

      // 4. Create notification
      await prismaTx.notification.create({
        data: {
          userId,
          title: "Withdrawal Request Received",
          message: `Your withdrawal request of ${amountStr} ${currency} to ${maskDestination(destination) || destination} is pending review.`,
          isRead: false,
        },
      });

      return createdTx;
    });

    revalidatePath("/dashboard/withdraw");
    revalidatePath("/dashboard/activity");
    revalidatePath("/dashboard/assets");
    revalidatePath("/admin/withdrawals");

    return actionOk<WithdrawalReceipt>({
      requestId: tx.id,
      reference: tx.id,
      status: "PENDING",
      submittedAt: tx.createdAt.toISOString(),
    });
  });
}

/** Reconcile a submission by its idempotency key. */
export async function reconcileWithdrawal(idempotencyKey: string): Promise<ActionResult<WithdrawalReceipt>> {
  return withAccount("withdrawal reconcile", async ({ userId }) => {
    const tx = await prisma.transaction.findUnique({
      where: { idempotencyKey },
    });

    if (!tx || tx.userId !== userId) {
      return actionError<WithdrawalReceipt>("not-found", "Withdrawal submission not found.");
    }

    return actionOk<WithdrawalReceipt>({
      requestId: tx.id,
      reference: tx.id,
      status: "PENDING",
      submittedAt: tx.createdAt.toISOString(),
    });
  });
}

/** Cancel a pending owned request. */
export async function cancelTransaction(id: string): Promise<ActionResult<TransactionView>> {
  return withAccount("cancel request", async ({ userId }) => {
    const tx = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!tx || tx.userId !== userId) {
      return actionError<TransactionView>("not-found", "Transaction record not found.");
    }

    if (tx.type !== "WITHDRAWAL" || tx.status !== "PENDING") {
      return actionError<TransactionView>("invalid", "Only pending withdrawals can be cancelled.");
    }

    const totalHeld = tx.amount.add(tx.fee);

    const updatedTx = await prisma.$transaction(async (prismaTx) => {
      const wallet = await prismaTx.wallet.findUnique({
        where: { userId_currency: { userId, currency: tx.currency } },
      });

      if (wallet) {
        const reservedBefore = wallet.reserved;
        const reservedAfter = Prisma.Decimal.max(new Prisma.Decimal(0), reservedBefore.sub(totalHeld));

        await prismaTx.wallet.update({
          where: { id: wallet.id },
          data: { reserved: reservedAfter },
        });

        await prismaTx.ledgerEntry.create({
          data: {
            walletId: wallet.id,
            userId,
            transactionId: tx.id,
            type: "RELEASE",
            amount: totalHeld,
            balanceBefore: wallet.balance,
            balanceAfter: wallet.balance,
            reservedBefore,
            reservedAfter,
            currency: tx.currency,
            description: `Withdrawal hold released upon user cancellation`,
            actor: userId,
          },
        });
      }

      const cancelled = await prismaTx.transaction.update({
        where: { id: tx.id },
        data: {
          status: "CANCELLED",
          notes: [tx.notes, "Cancelled by user"].filter(Boolean).join(" | "),
        },
      });

      await prismaTx.notification.create({
        data: {
          userId,
          title: "Withdrawal Cancelled",
          message: `Your pending withdrawal of ${tx.amount.toString()} ${tx.currency} has been cancelled and the held funds returned.`,
          isRead: false,
        },
      });

      return cancelled;
    });

    revalidatePath("/dashboard/withdraw");
    revalidatePath("/dashboard/activity");
    revalidatePath("/dashboard/assets");
    revalidatePath("/admin/withdrawals");

    return actionOk<TransactionView>(mapTransaction(updatedTx as any)!);
  });
}

/** Request to copy a trader. */
export async function requestCopy(traderId: string, input: CopyRequestInput): Promise<ActionResult<CopyRequestReceipt>> {
  return withAccount("copy request", async ({ userId }) => {
    const trader = await prisma.copyTrader.findUnique({
      where: { id: traderId },
    });

    if (!trader || (!trader.isActive && trader.status !== "Published")) {
      return actionError<CopyRequestReceipt>("invalid", "This trader is currently not open for copying.");
    }

    const allocDec = new Prisma.Decimal(input.amount);
    if (allocDec.lt(trader.minCapital)) {
      return actionError<CopyRequestReceipt>(
        "invalid",
        `Minimum allocation for ${trader.name} is ${trader.minCapital.toString()} USDT.`,
      );
    }

    const copyTrade = await prisma.$transaction(async (prismaTx) => {
      // 1. Check user USDT wallet
      const wallet = await prismaTx.wallet.findUnique({
        where: { userId_currency: { userId, currency: "USDT" } },
      });

      if (!wallet) {
        throw new Error("You must have a USDT wallet to allocate capital to copy trading.");
      }

      const available = wallet.balance.sub(wallet.reserved);
      if (available.lt(allocDec)) {
        throw new Error(`Insufficient available USDT balance. Available: ${available.toString()} USDT.`);
      }

      // 2. Increment reserved balance
      const reservedBefore = wallet.reserved;
      const reservedAfter = reservedBefore.add(allocDec);

      await prismaTx.wallet.update({
        where: { id: wallet.id },
        data: { reserved: reservedAfter },
      });

      // 3. Upsert copy trade allocation
      const record = await prismaTx.userCopyTrade.upsert({
        where: {
          userId_traderId: { userId, traderId },
        },
        create: {
          userId,
          traderId,
          allocatedUsd: allocDec,
          status: "ACTIVE",
        },
        update: {
          allocatedUsd: allocDec,
          status: "ACTIVE",
        },
      });

      // 4. Increment trader followers count
      await prismaTx.copyTrader.update({
        where: { id: traderId },
        data: { totalFollowers: { increment: 1 } },
      });

      // 5. Create HOLD ledger entry
      await prismaTx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          userId,
          type: "HOLD",
          amount: allocDec,
          balanceBefore: wallet.balance,
          balanceAfter: wallet.balance,
          reservedBefore,
          reservedAfter,
          currency: "USDT",
          description: `Capital allocation hold for copying trader ${trader.name}`,
          actor: userId,
        },
      });

      // 6. Notification
      await prismaTx.notification.create({
        data: {
          userId,
          title: "Copy Trade Started",
          message: `You have successfully allocated ${allocDec.toString()} USDT to copy ${trader.name}.`,
          isRead: false,
        },
      });

      return record;
    });

    revalidatePath("/dashboard/traders");
    revalidatePath("/dashboard/copy-trades");
    revalidatePath("/dashboard/assets");

    return actionOk<CopyRequestReceipt>({
      allocationId: copyTrade.id,
      reference: copyTrade.id,
      status: "ACTIVE",
      submittedAt: copyTrade.createdAt.toISOString(),
    });
  });
}

/** Pause an allocation. */
export async function pauseAllocation(id: string): Promise<ActionResult<AllocationView>> {
  return withAccount("pause allocation", async ({ userId }) => {
    const copyTrade = await prisma.userCopyTrade.findUnique({
      where: { id },
      include: { trader: true },
    });

    if (!copyTrade || copyTrade.userId !== userId) {
      return actionError<AllocationView>("not-found", "Allocation record not found.");
    }

    if (copyTrade.status !== "ACTIVE") {
      return actionError<AllocationView>("invalid", "Only active allocations can be paused.");
    }

    const updated = await prisma.userCopyTrade.update({
      where: { id },
      data: { status: "PAUSED" },
      include: { trader: true },
    });

    revalidatePath("/dashboard/copy-trades");

    return actionOk<AllocationView>(mapAllocation(updated as any));
  });
}

/** Resume an allocation. */
export async function resumeAllocation(id: string): Promise<ActionResult<AllocationView>> {
  return withAccount("resume allocation", async ({ userId }) => {
    const copyTrade = await prisma.userCopyTrade.findUnique({
      where: { id },
      include: { trader: true },
    });

    if (!copyTrade || copyTrade.userId !== userId) {
      return actionError<AllocationView>("not-found", "Allocation record not found.");
    }

    if (copyTrade.status !== "PAUSED") {
      return actionError<AllocationView>("invalid", "Only paused allocations can be resumed.");
    }

    const updated = await prisma.userCopyTrade.update({
      where: { id },
      data: { status: "ACTIVE" },
      include: { trader: true },
    });

    revalidatePath("/dashboard/copy-trades");

    return actionOk<AllocationView>(mapAllocation(updated as any));
  });
}

/** Stop an allocation and release held capital back to USDT balance. */
export async function stopAllocation(id: string): Promise<ActionResult<AllocationView>> {
  return withAccount("stop allocation", async ({ userId }) => {
    const copyTrade = await prisma.userCopyTrade.findUnique({
      where: { id },
      include: { trader: true },
    });

    if (!copyTrade || copyTrade.userId !== userId) {
      return actionError<AllocationView>("not-found", "Allocation record not found.");
    }

    if (copyTrade.status === "STOPPED" || copyTrade.status === "LIQUIDATED") {
      return actionError<AllocationView>("invalid", "This allocation is already stopped.");
    }

    const updated = await prisma.$transaction(async (prismaTx) => {
      // 1. Release held USDT
      const wallet = await prismaTx.wallet.findUnique({
        where: { userId_currency: { userId, currency: "USDT" } },
      });

      if (wallet) {
        const reservedBefore = wallet.reserved;
        const reservedAfter = Prisma.Decimal.max(new Prisma.Decimal(0), reservedBefore.sub(copyTrade.allocatedUsd));

        await prismaTx.wallet.update({
          where: { id: wallet.id },
          data: { reserved: reservedAfter },
        });

        await prismaTx.ledgerEntry.create({
          data: {
            walletId: wallet.id,
            userId,
            type: "RELEASE",
            amount: copyTrade.allocatedUsd,
            balanceBefore: wallet.balance,
            balanceAfter: wallet.balance,
            reservedBefore,
            reservedAfter,
            currency: "USDT",
            description: `Capital allocation hold released upon stopping ${copyTrade.trader?.name || "trader"}`,
            actor: userId,
          },
        });
      }

      // 2. Decrement follower count
      if (copyTrade.traderId) {
        await prismaTx.copyTrader.update({
          where: { id: copyTrade.traderId },
          data: { totalFollowers: { decrement: 1 } },
        });
      }

      // 3. Set status to STOPPED
      return prismaTx.userCopyTrade.update({
        where: { id },
        data: { status: "STOPPED" },
        include: { trader: true },
      });
    });

    revalidatePath("/dashboard/copy-trades");
    revalidatePath("/dashboard/assets");

    return actionOk<AllocationView>(mapAllocation(updated as any));
  });
}

/** Submit identity documents for review. */
export async function submitVerification(input: VerificationInput): Promise<ActionResult<VerificationView>> {
  return withAccount("verification submit", async ({ userId }) => {
    if (!input.documentType || !input.files || input.files.length === 0) {
      return actionError<VerificationView>("invalid", "Select a document type and provide document images.", {
        fieldErrors: {
          documentType: !input.documentType ? "Document type is required" : "",
          files: !input.files?.length ? "At least one document image is required" : "",
        },
      });
    }

    const frontFile = input.files.find((f) => f.side === "front")?.fileName || "Front of document (submitted)";
    const backFile = input.files.find((f) => f.side === "back")?.fileName || null;

    const kyc = await prisma.kycDocument.upsert({
      where: { userId },
      create: {
        userId,
        documentType: input.documentType,
        frontUrl: frontFile,
        backUrl: backFile,
        status: "PENDING",
      },
      update: {
        documentType: input.documentType,
        frontUrl: frontFile,
        backUrl: backFile,
        status: "PENDING",
        rejectionMsg: null,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        status: "PENDING_KYC",
      },
    });

    try {
      await prisma.notification.create({
        data: {
          userId,
          title: "Verification Documents Received",
          message: "Your identity verification documents have been received and are pending compliance review.",
          isRead: false,
        },
      });
    } catch (notifErr) {
      console.warn("[mutations] Failed to write notification:", notifErr);
    }

    revalidatePath("/dashboard/settings/verification");
    revalidatePath("/admin/verification");

    return actionOk<VerificationView>(mapVerification(kyc as any));
  });
}

/** Remove a submitted verification document. */
export async function removeVerificationDocument(_id: string): Promise<ActionResult<VerificationView>> {
  return withAccount("verification remove", async ({ userId }) => {
    await prisma.kycDocument.deleteMany({
      where: { userId, status: "PENDING" },
    });

    revalidatePath("/dashboard/settings/verification");
    revalidatePath("/admin/verification");

    return actionOk<VerificationView>(mapVerification(null));
  });
}

/* -------------------------------------------------------------------------- */
/* Implemented live                                                           */
/* -------------------------------------------------------------------------- */

/** Mark one owned notification read (`updateMany` scoped by `userId`). */
export async function markNotificationRead(id: string): Promise<ActionResult<NotificationReadResult>> {
  return withAccount("mark notification read", async ({ userId }) => {
    const parsed = idSchema.safeParse(id);
    if (!parsed.success) return invalidInput(parsed.error);
    const updated = await prisma.notification.updateMany({ where: { id: parsed.data, userId }, data: { isRead: true } });
    const row = await prisma.notification.findFirst({
      where: { id: parsed.data, userId },
      select: { id: true, title: true, message: true, isRead: true, createdAt: true },
    });
    if (!row || (updated.count === 0 && !row.isRead)) return actionError("not-found", "This notification was not found");
    const unreadCount = await prisma.notification.count({ where: { userId, isRead: false } });
    revalidateDashboard();
    return actionOk({ notification: mapNotification(row), unreadCount });
  });
}

/** Mark every owned notification read. */
export async function markAllNotificationsRead(): Promise<ActionResult<NotificationsReadAllResult>> {
  return withAccount("mark all notifications read", async ({ userId }) => {
    const updated = await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    revalidateDashboard();
    return actionOk({ updated: updated.count, unreadCount: 0 });
  });
}

/** Save editable profile fields (name, phone, country). The email is never changed here. */
export async function saveProfile(input: ProfileInput): Promise<ActionResult<ProfileView>> {
  return withAccount("save profile", async ({ userId }) => {
    const parsed = profileSchema.safeParse(input ?? {});
    if (!parsed.success) return invalidInput(parsed.error);
    const data: { fullName?: string; phone?: string | null; country?: string | null } = {};
    if (parsed.data.fullName !== undefined) data.fullName = parsed.data.fullName;
    if (parsed.data.phone !== undefined) data.phone = parsed.data.phone.length === 0 ? null : parsed.data.phone;
    if (parsed.data.country !== undefined) data.country = parsed.data.country.length === 0 ? null : parsed.data.country;
    const row = await prisma.user.update({
      where: { id: userId },
      data,
      select: { email: true, fullName: true, phone: true, country: true, createdAt: true },
    });
    revalidateDashboard();
    return actionOk(mapProfile(row));
  });
}

/** Change the password: reauthenticate with the current password, then `auth.updateUser`. */
export async function changePassword(input: PasswordChangeInput): Promise<ActionResult<PasswordChangeResult>> {
  return withAccount("change password", async ({ email }) => {
    const parsed = passwordSchema.safeParse(input ?? {});
    if (!parsed.success) return invalidInput(parsed.error);
    const supabase = await createClient();
    const reauth = await supabase.auth.signInWithPassword({ email, password: parsed.data.currentPassword });
    if (reauth.error) {
      return actionError("invalid", "The current password was not accepted", { fieldErrors: { currentPassword: "The current password is incorrect" } });
    }
    const updated = await supabase.auth.updateUser({ password: parsed.data.newPassword });
    if (updated.error) {
      return actionError("failed", "The password could not be changed. Try again or contact support.");
    }
    revalidateDashboard();
    return actionOk({ changedAt: new Date().toISOString() });
  });
}

/** Begin TOTP enrollment with the identity provider and return its data. */
export async function startMfaEnrollment(): Promise<ActionResult<MfaEnrollment>> {
  return withAccount("start MFA enrollment", async () => {
    const supabase = await createClient();
    const factors = await supabase.auth.mfa.listFactors();
    if (!factors.error && factors.data?.totp.some((factor) => factor.status === "verified")) {
      return actionError("invalid", "An authenticator app is already enabled. Disable it before enrolling another.");
    }
    const enrolled = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: MFA_FACTOR_LABEL });
    if (enrolled.error || !enrolled.data) {
      return actionError("failed", "Enrollment could not be started. Try again or contact support.");
    }
    return actionOk({
      factorId: enrolled.data.id,
      qrSvg: svgFromQr(enrolled.data.totp.qr_code),
      secret: enrolled.data.totp.secret,
      issuer: MFA_ISSUER,
    });
  });
}

/** Verify a pending factor with a code; records the flag on the account after provider confirmation. */
export async function verifyMfaEnrollment(factorId: string, code: string): Promise<ActionResult<MfaStatus>> {
  return withAccount("verify MFA enrollment", async ({ userId }) => {
    const parsedId = idSchema.safeParse(factorId);
    if (!parsedId.success) return invalidInput(parsedId.error);
    const parsedCode = codeSchema.safeParse(code);
    if (!parsedCode.success) return actionError("invalid", "Check the highlighted fields", { fieldErrors: { code: parsedCode.error.issues[0]?.message ?? "Invalid code" } });
    const failure = await verifyFactorCode<MfaStatus>(parsedId.data, parsedCode.data);
    if (failure) return failure;
    try {
      await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
    } catch (error) {
      logFailure("record MFA flag", error);
    }
    revalidateDashboard();
    return actionOk({ state: "enabled", factorLabel: MFA_FACTOR_LABEL, verifiedAt: new Date().toISOString() });
  });
}

/** Disable a verified factor after a successful code challenge. */
export async function disableMfa(factorId: string, code: string): Promise<ActionResult<MfaStatus>> {
  return withAccount("disable MFA", async ({ userId }) => {
    const parsedId = idSchema.safeParse(factorId);
    if (!parsedId.success) return invalidInput(parsedId.error);
    const parsedCode = codeSchema.safeParse(code);
    if (!parsedCode.success) return actionError("invalid", "Check the highlighted fields", { fieldErrors: { code: parsedCode.error.issues[0]?.message ?? "Invalid code" } });
    const failure = await verifyFactorCode<MfaStatus>(parsedId.data, parsedCode.data);
    if (failure) return failure;
    const supabase = await createClient();
    const removed = await supabase.auth.mfa.unenroll({ factorId: parsedId.data });
    if (removed.error) return actionError("failed", "The factor could not be removed. Try again or contact support.");
    try {
      await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: false } });
    } catch (error) {
      logFailure("record MFA flag", error);
    }
    revalidateDashboard();
    return actionOk({ state: "not-enabled" });
  });
}
