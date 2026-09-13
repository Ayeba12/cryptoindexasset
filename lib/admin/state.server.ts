import "server-only";

import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "./access.server";
import { getAdminTradersAction } from "./traders.server";
import { getAdminSignalsAction } from "./signals.server";
import { CURRENCIES, type AdminState, type Currency } from "./model";

/**
 * Loads the live, database-backed operational state for the administration dashboard.
 * Queries Prisma directly for users, wallets, traders, transaction requests,
 * audit logs, notifications, and trading signals.
 */
export async function getLiveAdminState(): Promise<AdminState> {
  const admin = await requireAdmin();

  try {
    const [
      dbAdmin,
      users,
      wallets,
      traders,
      signalsResult,
      transactions,
      auditLogs,
      notifications,
    ] = await Promise.all([
      prisma.user.findFirst({
        where: { email: admin.email },
      }).catch(() => null),

      prisma.user.findMany({
        include: { kycDocument: true },
        orderBy: { createdAt: "desc" },
      }).catch(() => []),

      prisma.wallet.findMany({
        orderBy: { createdAt: "desc" },
      }).catch(() => []),

      getAdminTradersAction().catch(() => []),

      getAdminSignalsAction().catch(() => ({ success: false, signals: [] })),

      prisma.transaction.findMany({
        where: { type: { in: ["DEPOSIT", "WITHDRAWAL"] } },
        include: { user: true },
        orderBy: { createdAt: "desc" },
      }).catch(() => []),

      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      }).catch(() => []),

      prisma.notification.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      }).catch(() => []),
    ]);

    const adminUsers = users.map((u) => {
      const isApproved = u.kycDocument?.status === "APPROVED";
      const isDeclined = u.kycDocument?.status === "REJECTED";
      return {
        id: u.id,
        name: u.fullName || u.email.split("@")[0] || "Investor",
        email: u.email,
        status: (u.status === "ACTIVE" ? "Active" : "Suspended") as "Active" | "Suspended",
        verification: (isApproved
          ? "Approved"
          : isDeclined
            ? "Declined"
            : "Pending review") as "Pending review" | "Approved" | "Declined",
        joined: u.createdAt.toISOString().slice(0, 10),
      };
    });

    const adminWallets = wallets.map((w) => ({
      id: w.id,
      userId: w.userId,
      currency: (CURRENCIES.includes(w.currency as Currency) ? w.currency : "USDT") as Currency,
      available: w.balance.toString(),
      reserved: w.reserved.toString(),
      profit: w.totalProfit.toString(),
      version: 1,
    }));

    const adminRequests = transactions.map((t) => ({
      id: t.id,
      userId: t.userId,
      kind: (t.type === "DEPOSIT" ? "Deposit" : "Withdrawal") as "Deposit" | "Withdrawal",
      currency: (CURRENCIES.includes(t.currency as Currency) ? t.currency : "USDT") as Currency,
      amount: t.amount.toString(),
      network: t.currency === "USDT" ? "Tron (TRC20)" : `${t.currency} native network`,
      method: "Crypto wallet",
      destination: t.destinationAddress || t.txHash || "Deposit wallet",
      status: (t.status === "APPROVED"
        ? "Approved"
        : t.status === "REJECTED"
          ? "Declined"
          : "Pending review") as "Pending review" | "Approved" | "Declined",
      date: t.createdAt.toISOString().slice(0, 10),
      reason: t.notes || "",
    }));

    const adminAudit = auditLogs.map((a) => {
      let reason = "";
      if (typeof a.after === "object" && a.after !== null) {
        try {
          reason = JSON.stringify(a.after);
        } catch {
          reason = a.target || "";
        }
      } else if (a.target) {
        reason = a.target;
      }

      return {
        id: a.id,
        at: a.createdAt.toISOString(),
        actor: a.actor || "Platform Admin",
        action: a.action,
        target: a.target || "Platform",
        reason,
      };
    });

    const adminNotifications = notifications.map((n) => ({
      id: n.id,
      userId: n.userId,
      title: n.title,
      message: n.message,
    }));

    return {
      account: {
        name: dbAdmin?.fullName || admin.email.split("@")[0] || "Platform Administrator",
        email: admin.email,
        phone: dbAdmin?.phone || "",
        jobTitle: "Platform Administrator",
        density: "compact",
        reviewAlerts: true,
        twoFactorDemo: false,
      },
      users: adminUsers,
      wallets: adminWallets,
      traders: traders || [],
      requests: adminRequests,
      audit: adminAudit,
      credits: [],
      receipts: {},
      notifications: adminNotifications,
      signals: signalsResult.signals || [],
      addresses: CURRENCIES.map((currency) => ({
        id: `address-${currency}`,
        currency,
        network: currency === "USDT" ? "Tron (TRC20)" : `${currency} native network`,
        address: "",
        memo: "",
        enabled: false,
      })),
    };
  } catch (err) {
    console.error("[getLiveAdminState] Database query error:", err);
    return {
      account: {
        name: admin.email.split("@")[0] || "Administrator",
        email: admin.email,
        phone: "",
        jobTitle: "Platform Administrator",
        density: "compact",
        reviewAlerts: true,
        twoFactorDemo: false,
      },
      users: [],
      wallets: [],
      traders: [],
      requests: [],
      audit: [],
      credits: [],
      receipts: {},
      notifications: [],
      signals: [],
      addresses: CURRENCIES.map((currency) => ({
        id: `address-${currency}`,
        currency,
        network: currency === "USDT" ? "Tron (TRC20)" : `${currency} native network`,
        address: "",
        memo: "",
        enabled: false,
      })),
    };
  }
}
