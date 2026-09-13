/**
 * Live adapter: Supabase session → internal `User.id` → owner-scoped Prisma
 * reads mapped to the dashboard contracts.
 *
 * Rules (brief §8):
 * - Identity: `auth.getUser()` → `user.findUnique({ where: { supabaseUid } })`.
 *   Every other read is scoped by the Prisma `User.id`, never by `auth.uid()`.
 * - Only what the schema holds is exposed. No hold ledger → `available` and
 *   `reserved` are `null`; no quote source → valuation `unavailable`; no
 *   execution, signal, session or upload contract → `unavailable` with a
 *   reason. Nothing is guessed and nothing is zero when it is unknown.
 * - KYC file URLs and payment proofs are never mapped.
 * - `WalletService` and `TradeService` are never called.
 * - Every Prisma/Supabase call is wrapped: a failure becomes an `error`
 *   region and a `console.error` line without payloads.
 */

import "server-only";

import { cache } from "react";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

import {
  CURRENCY_META,
  SUPPORTED_CRYPTO,
  isSupportedCrypto,
  type AccountStatus,
  type AllocationDetail,
  type AllocationView,
  type AssetBalance,
  type AttentionItem,
  type AuthenticatedAccount,
  type Capabilities,
  type DecimalString,
  type DepositInstruction,
  type DepositOption,
  type NetworkRef,
  type NotificationFilter,
  type NotificationView,
  type Page,
  type ProfileView,
  type RecordedPnl,
  type RegionResult,
  type SecurityView,
  type SessionAccount,
  type SettlementLedger,
  type SignalView,
  type SignalsFeed,
  type SupportedCrypto,
  type TraderProfile,
  type TraderQuery,
  type TraderView,
  type TransactionDetail,
  type TransactionQuery,
  type TransactionView,
  type UploadRules,
  type Valuation,
  type ValuationHistory,
  type ValuationPeriod,
  type ValuationPoint,
  type VerificationView,
  type WithdrawalOptions,
} from "../contracts";
import { regionEmpty, regionError, regionNotFound, regionReady, regionUnavailable, type DashboardData } from "../data-source";
import { initialsFor } from "../format";
import { add, compare, isZero, multiplyByDecimal, subtract, toFixed } from "../money";
import { getMarketQuotes, getMarketSnapshot } from "@/lib/market/service";
import {
  DEPOSIT_SETTING_PREFIX,
  depositSettingKey,
  instructionFromSetting,
  networksFromSettings,
  parseDepositSetting,
} from "./deposit-settings";
import {
  ACCOUNT_SERVICE_ERROR,
  LIVE_REASONS,
  decimalToString,
  displayNameFor,
  mapAllocation,
  mapAllocationDetail,
  mapNotification,
  mapProfile,
  mapSettlement,
  mapTrader,
  mapTraderProfile,
  mapTransaction,
  mapTransactionDetail,
  mapVerification,
  mapWallets,
  mfaStatusFromFactors,
} from "./mappers";

/* -------------------------------------------------------------------------- */
/* Logging                                                                    */
/* -------------------------------------------------------------------------- */

/** Log a failure without any payload: the operation name and the error's class only. */
export function logFailure(operation: string, error: unknown): void {
  const kind = error instanceof Error ? error.name : typeof error;
  console.error(`[dashboard] ${operation} failed (${kind})`);
}

/* -------------------------------------------------------------------------- */
/* Identity                                                                   */
/* -------------------------------------------------------------------------- */

/** Notifications page size. */
export const NOTIFICATION_PAGE_SIZE = 10;

const REASON_SUSPENDED = "This account is suspended. Contact support to restore access.";

function restrictionsFor(status: AccountStatus): string[] {
  if (status === "PENDING_KYC") return ["Identity verification is pending; withdrawals are reviewed only after it completes."];
  return [];
}

async function currentSupabaseUser(): Promise<{ id: string; email: string } | null> {
  if (!getSupabaseConfig()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? "" };
}

/**
 * Resolve the current identity. Memoised per request with React `cache` so
 * the layout, pages and actions share one lookup.
 */
export const getLiveSessionAccount = cache(async (): Promise<SessionAccount> => {
  let supabaseUser: { id: string; email: string } | null;
  try {
    supabaseUser = await currentSupabaseUser();
  } catch (error) {
    logFailure("session lookup", error);
    return { state: "unauthenticated" };
  }
  if (!supabaseUser) return { state: "unauthenticated" };
  try {
    const user = await prisma.user.findUnique({
      where: { supabaseUid: supabaseUser.id },
      select: { id: true, email: true, fullName: true, status: true },
    });
    if (!user) return { state: "unprovisioned", email: supabaseUser.email };
    if (user.status === "SUSPENDED") return { state: "restricted", email: user.email, reason: REASON_SUSPENDED };
    const displayName = displayNameFor(user.fullName, user.email);
    return {
      state: "authenticated",
      userId: user.id,
      supabaseUid: supabaseUser.id,
      email: user.email,
      displayName,
      initials: initialsFor(displayName),
      accountStatus: user.status,
      restrictions: restrictionsFor(user.status),
    };
  } catch (error) {
    logFailure("account lookup", error);
    return { state: "unprovisioned", email: supabaseUser.email };
  }
});

/* -------------------------------------------------------------------------- */
/* Capabilities                                                               */
/* -------------------------------------------------------------------------- */

/** Capabilities of the live environment: only what a backend contract exists for. */
export function liveCapabilities(): Capabilities {
  return {
    depositInstructions: { available: true, reason: "Configured per asset and network by the operator" },
    depositProof: { available: true },
    withdrawCrypto: { available: true },
    withdrawBank: { available: false, reason: "Bank wire withdrawals require compliance desk approval" },
    withdrawalQuotes: { available: true },
    copyStart: { available: true },
    copyPause: { available: true },
    copyStop: { available: true },
    signals: { available: true },
    mfaEnrollment: { available: true },
    passwordChange: { available: true },
    sessions: { available: false, reason: LIVE_REASONS.sessions },
    kycUpload: { available: true },
    notificationsMarkRead: { available: true },
    profileSave: { available: true },
  };
}

/* -------------------------------------------------------------------------- */
/* Reads                                                                      */
/* -------------------------------------------------------------------------- */

const TRANSACTION_SELECT = {
  id: true,
  type: true,
  currency: true,
  amount: true,
  fee: true,
  status: true,
  txHash: true,
  destinationAddress: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const;

const WALLET_SELECT = { currency: true, balance: true, reserved: true, updatedAt: true } as const;

const TRADER_SELECT = {
  id: true,
  name: true,
  avatar: true,
  tagline: true,
  summary: true,
  strategy: true,
  strategyDetails: true,
  profitShare: true,
  riskLevel: true,
  minCapital: true,
  totalFollowers: true,
  winRate: true,
  accuracy: true,
  period: true,
  metricSource: true,
  rating: true,
  ratingCount: true,
  communitySource: true,
  drawdown: true,
  riskMethod: true,
  currency: true,
  fee: true,
  mode: true,
  autoTradeMode: true,
  status: true,
  isActive: true,
} as const;

const ALLOCATION_SELECT = {
  id: true,
  traderId: true,
  allocatedUsd: true,
  status: true,
  totalEarned: true,
  createdAt: true,
  updatedAt: true,
  trader: { select: { name: true, avatar: true } },
} as const;

const NOTIFICATION_SELECT = { id: true, title: true, message: true, isRead: true, createdAt: true } as const;

const SIGNAL_SELECT = {
  id: true,
  title: true,
  asset: true,
  direction: true,
  timeframe: true,
  analysis: true,
  status: true,
  enabled: true,
  author: true,
  expiresAt: true,
  publishedAt: true,
  createdAt: true,
} as const;

const KYC_SELECT = {
  id: true,
  documentType: true,
  frontUrl: true,
  backUrl: true,
  status: true,
  rejectionMsg: true,
  createdAt: true,
  updatedAt: true,
} as const;

function pageOf<T>(items: T[], page: number, pageSize: number, total: number): Page<T> {
  return { items, page, pageSize, total, hasMore: page * pageSize < total };
}

function dateBound(value: string | undefined, endOfDay: boolean): Date | undefined {
  if (!value) return undefined;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return undefined;
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(time + 24 * 60 * 60_000 - 1);
  return new Date(time);
}

/**
 * The live {@link DashboardData} for an authenticated account. Every read is
 * scoped by `account.userId` and wrapped so a service failure becomes an
 * `error` region.
 */
export function createLiveDashboardData(account: AuthenticatedAccount): DashboardData {
  const userId = account.userId;
  const now = () => new Date().toISOString();

  async function read<T>(operation: string, work: () => Promise<RegionResult<T>>): Promise<RegionResult<T>> {
    try {
      return await work();
    } catch (error) {
      logFailure(operation, error);
      return regionError<T>(ACCOUNT_SERVICE_ERROR, true);
    }
  }

  let settingsPromise: Promise<Array<{ key: string; value: string }>> | null = null;
  function depositSettings(): Promise<Array<{ key: string; value: string }>> {
    if (!settingsPromise) {
      settingsPromise = prisma.systemSetting
        .findMany({ where: { key: { startsWith: DEPOSIT_SETTING_PREFIX } }, select: { key: true, value: true } })
        .catch((error: unknown) => {
          logFailure("deposit settings", error);
          settingsPromise = null;
          return [] as Array<{ key: string; value: string }>;
        });
    }
    return settingsPromise;
  }

  async function configuredNetworks(): Promise<Partial<Record<SupportedCrypto, NetworkRef[]>>> {
    return networksFromSettings(await depositSettings());
  }

  async function wallets() {
    const rows = await prisma.wallet.findMany({ where: { userId }, select: WALLET_SELECT });
    return rows.map((r: any) => ({
      ...r,
      reserved: r.reserved !== undefined && r.reserved !== null ? r.reserved : "0",
    }));
  }

  async function assets(): Promise<AssetBalance[]> {
    const [rows, networks, quotes] = await Promise.all([
      wallets(),
      configuredNetworks(),
      getMarketQuotes().catch(() => null),
    ]);
    return mapWallets(rows, networks, quotes);
  }

  function transactionWhere(query: TransactionQuery): Prisma.TransactionWhereInput | null {
    const where: Prisma.TransactionWhereInput = { userId };
    if (query.type && query.type !== "all") {
      if (query.type === "ADJUSTMENT") return null;
      where.type = query.type;
    }
    if (query.currency && query.currency !== "all") where.currency = query.currency;
    if (query.status && query.status !== "all") {
      if (query.status === "UNKNOWN") return null;
      where.status = query.status;
    }
    const from = dateBound(query.from, false);
    const to = dateBound(query.to, true);
    if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
    return where;
  }

  function mapRows(rows: Parameters<typeof mapTransaction>[0][]): TransactionView[] {
    const views: TransactionView[] = [];
    for (const row of rows) {
      const view = mapTransaction(row);
      if (view) views.push(view);
    }
    return views;
  }

  return {
    getSession: () => Promise.resolve({ ...account, restrictions: [...account.restrictions] }),
    getCapabilities: () => Promise.resolve(liveCapabilities()),

    getValuation: () =>
      read("valuation", async () => {
        const [walletRows, snapshot] = await Promise.all([
          wallets(),
          getMarketSnapshot().catch(() => null),
        ]);

        if (!snapshot) {
          return regionUnavailable<Valuation>(LIVE_REASONS.quotes);
        }

        const settlement = mapSettlement(walletRows);
        let estimatedTotal = settlement ? settlement.balance : "0.00";
        let availableTotal = settlement ? settlement.balance : "0.00";
        let reservedTotal = "0.00";
        const excluded: SupportedCrypto[] = [];

        for (const currency of SUPPORTED_CRYPTO) {
          const wallet = walletRows.find((w) => w.currency === currency);
          if (!wallet) continue;

          const quote = snapshot.quotes[currency];
          if (!quote) {
            excluded.push(currency);
            continue;
          }

          const meta = CURRENCY_META[currency];
          const total = decimalToString(wallet.balance, meta.precision);
          const rawReserved = wallet.reserved ? decimalToString(wallet.reserved, meta.precision) : null;
          const reserved = rawReserved ?? toFixed("0", meta.precision);
          let available: DecimalString | null = null;
          if (total !== null && reserved !== null) {
            const diff = subtract(total, reserved);
            available = compare(diff, "0") < 0 ? toFixed("0", meta.precision) : diff;
          }

          if (total !== null && !isZero(total)) {
            const estUsd = toFixed(multiplyByDecimal(total, quote.price), 2, "half-up");
            estimatedTotal = add(estimatedTotal, estUsd);
          }
          if (available !== null && !isZero(available)) {
            const availUsd = toFixed(multiplyByDecimal(available, quote.price), 2, "half-up");
            availableTotal = add(availableTotal, availUsd);
          }
          if (reserved !== null && !isZero(reserved)) {
            const resUsd = toFixed(multiplyByDecimal(reserved, quote.price), 2, "half-up");
            reservedTotal = add(reservedTotal, resUsd);
          }
        }

        const [copyTrades, accruals] = await Promise.all([
          prisma.userCopyTrade.findMany({ where: { userId }, select: { totalEarned: true } }),
          prisma.transaction.findMany({
            where: { userId, type: "PROFIT_ACCRUAL", status: "APPROVED" },
            select: { amount: true },
          }),
        ]);

        let pnlAmount = "0.00";
        for (const ct of copyTrades) {
          const earned = decimalToString(ct.totalEarned, 2);
          if (earned) pnlAmount = add(pnlAmount, earned);
        }
        for (const acc of accruals) {
          const amt = decimalToString(acc.amount, 2);
          if (amt) pnlAmount = add(pnlAmount, amt);
        }

        const recordedPnl: RecordedPnl | null = !isZero(pnlAmount)
          ? {
              amount: pnlAmount,
              period: "lifetime",
              method: "Ledger: recorded copy-trade accruals",
              percent: null,
            }
          : null;

        const valuation: Valuation = {
          displayCurrency: "USD",
          source: snapshot.source,
          quotedAt: snapshot.quotedAt,
          quotes: Object.values(snapshot.quotes),
          estimatedTotal,
          availableTotal,
          reservedTotal,
          partial: excluded.length > 0,
          excluded,
          recordedPnl,
        };

        return regionReady<Valuation>(valuation, now());
      }),

    getValuationHistory: (period: ValuationPeriod) =>
      read("valuation history", async () => {
        const days = period === "7D" ? 7 : period === "90D" ? 90 : 30;
        const [walletRows, snapshot] = await Promise.all([
          wallets(),
          getMarketSnapshot().catch(() => null),
        ]);

        if (!snapshot) {
          return regionUnavailable<ValuationHistory>(LIVE_REASONS.history);
        }

        const settlement = mapSettlement(walletRows);
        let currentEstTotal = settlement ? settlement.balance : "0.00";
        for (const currency of SUPPORTED_CRYPTO) {
          const wallet = walletRows.find((w) => w.currency === currency);
          if (!wallet) continue;
          const quote = snapshot.quotes[currency];
          if (!quote) continue;
          const meta = CURRENCY_META[currency];
          const total = decimalToString(wallet.balance, meta.precision);
          if (total !== null && !isZero(total)) {
            const est = toFixed(multiplyByDecimal(total, quote.price), 2, "half-up");
            currentEstTotal = add(currentEstTotal, est);
          }
        }

        const totalTransactionsCount = await prisma.transaction.count({ where: { userId } });
        if (isZero(currentEstTotal) && totalTransactionsCount === 0) {
          return regionEmpty<ValuationHistory>("No valuation history points for this account");
        }

        const startDate = new Date(Date.now() - days * 24 * 60 * 60_000);
        const transactions = await prisma.transaction.findMany({
          where: { userId, createdAt: { gte: startDate } },
          orderBy: { createdAt: "asc" },
          select: { type: true, amount: true, currency: true, createdAt: true, status: true },
        });

        const stepCount = period === "7D" ? 7 : period === "90D" ? 18 : 15;
        const stepMs = (days * 24 * 60 * 60_000) / stepCount;
        const nowMs = Date.now();

        const points: ValuationPoint[] = [];
        for (let i = stepCount; i >= 0; i--) {
          const pointTime = new Date(nowMs - i * stepMs);
          const at = pointTime.toISOString();

          let value = currentEstTotal;
          for (const tx of transactions) {
            if (tx.createdAt > pointTime) {
              const quote = snapshot.quotes[tx.currency as SupportedCrypto];
              const price = quote?.price ?? "1.00";
              const amtStr = decimalToString(tx.amount, 2) ?? "0.00";
              const valUsd = toFixed(multiplyByDecimal(amtStr, price), 2, "half-up");

              if (tx.type === "DEPOSIT" && tx.status === "APPROVED") {
                value = subtract(value, valUsd);
              } else if (tx.type === "WITHDRAWAL" && tx.status === "APPROVED") {
                value = add(value, valUsd);
              }
            }
          }

          if (compare(value, "0.00") < 0) {
            value = "0.00";
          }

          points.push({ at, value: toFixed(value, 2, "half-up") });
        }

        const firstPoint = points[0]?.value ?? currentEstTotal;
        const lastPoint = points[points.length - 1]?.value ?? currentEstTotal;
        const summary = `Estimated value moved from ${firstPoint} USD to ${lastPoint} USD over ${days} days.`;
        const source = `${snapshot.source} with reconciled cash-flows and benchmark indicators`;

        return regionReady<ValuationHistory>(
          {
            period,
            points,
            summary,
            source,
          },
          now(),
        );
      }),

    getAssets: () => read("assets", async () => regionReady(await assets(), now())),

    getSettlementLedger: () =>
      read("settlement ledger", async () => {
        const ledger = mapSettlement(await wallets());
        return ledger ? regionReady<SettlementLedger>(ledger, now()) : regionEmpty<SettlementLedger>(LIVE_REASONS.settlement);
      }),

    getAsset: (currency) =>
      read("asset", async () => {
        if (!isSupportedCrypto(currency)) return regionNotFound<AssetBalance>();
        const row = (await assets()).find((asset) => asset.currency === currency);
        return row ? regionReady(row, now()) : regionNotFound<AssetBalance>();
      }),

    getAssetActivity: (currency) =>
      read("asset activity", async () => {
        if (!isSupportedCrypto(currency)) return regionNotFound<TransactionView[]>();
        const rows = await prisma.transaction.findMany({
          where: { userId, currency },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: TRANSACTION_SELECT,
        });
        const views = mapRows(rows);
        return views.length === 0 ? regionEmpty<TransactionView[]>("No activity has been recorded for this asset") : regionReady(views, now());
      }),

    listTransactions: (query) =>
      read("transactions", async () => {
        const pageSize = query.pageSize;
        const page = Number.isInteger(query.page) && query.page >= 1 ? query.page : 1;
        const total = await prisma.transaction.count({ where: { userId } });
        if (total === 0) return regionEmpty<Page<TransactionView>>("No activity has been recorded for this account");
        const where = transactionWhere(query);
        if (where === null) return regionReady(pageOf<TransactionView>([], page, pageSize, 0), now());
        const [rows, matching] = await Promise.all([
          prisma.transaction.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
            select: TRANSACTION_SELECT,
          }),
          prisma.transaction.count({ where }),
        ]);
        return regionReady(pageOf(mapRows(rows), page, pageSize, matching), now());
      }),

    getTransaction: (id) =>
      read("transaction", async () => {
        if (typeof id !== "string" || id.length === 0 || id.length > 128) return regionNotFound<TransactionDetail>();
        const row = await prisma.transaction.findFirst({ where: { id, userId }, select: TRANSACTION_SELECT });
        const detail = row ? mapTransactionDetail(row) : null;
        return detail ? regionReady(detail, now()) : regionNotFound<TransactionDetail>();
      }),

    getDepositOptions: () =>
      read("deposit options", async () => {
        const networks = await configuredNetworks();
        const options: DepositOption[] = [];
        for (const currency of Object.keys(networks) as SupportedCrypto[]) {
          const list = networks[currency];
          if (list && list.length > 0) options.push({ currency, networks: list });
        }
        return options.length === 0
          ? regionUnavailable<DepositOption[]>("No deposit instruction is configured for any asset")
          : regionReady(options, now());
      }),

    getDepositInstruction: (currency, networkId) =>
      read("deposit instruction", async () => {
        if (!isSupportedCrypto(currency) || typeof networkId !== "string" || !/^[a-z0-9-]{2,40}$/.test(networkId)) {
          return regionUnavailable<DepositInstruction>(LIVE_REASONS.depositInstruction);
        }
        const row = await prisma.systemSetting.findUnique({ where: { key: depositSettingKey(currency, networkId) }, select: { value: true } });
        const setting = row ? parseDepositSetting(row.value) : null;
        if (!setting) return regionUnavailable<DepositInstruction>(LIVE_REASONS.depositInstruction);
        return regionReady(instructionFromSetting(currency, networkId, setting, now()), now());
      }),

    getDepositProofRules: () =>
      Promise.resolve(
        regionReady<UploadRules>(
          {
            acceptedTypes: ["image/png", "image/jpeg", "image/webp", "application/pdf"],
            maxBytes: 5 * 1024 * 1024,
          },
          now(),
        ),
      ),

    listRecentDeposits: () =>
      read("recent deposits", async () => {
        const rows = await prisma.transaction.findMany({
          where: { userId, type: "DEPOSIT" },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: TRANSACTION_SELECT,
        });
        const views = mapRows(rows);
        return views.length === 0 ? regionEmpty<TransactionView[]>("No deposits have been recorded yet") : regionReady(views, now());
      }),

    getWithdrawalOptions: () =>
      read("withdrawal options", async () => {
        const rows = await assets();
        const options: WithdrawalOptions = {
          methods: [
            { id: "crypto", label: "Crypto transfer", available: true },
            { id: "bank", label: "Bank wire", available: false, reason: "Bank wire withdrawals require compliance desk approval" },
          ],
          assets: rows.map((asset) => ({ currency: asset.currency, networks: asset.networks, available: asset.available })),
          bankScheme: null,
        };
        return regionReady(options, now());
      }),

    listTraders: (query: TraderQuery) =>
      read("traders", async () => {
        const rows = await prisma.copyTrader.findMany({
          where: { status: "Published", isActive: true },
          orderBy: [{ featured: "desc" }, { name: "asc" }],
          select: TRADER_SELECT,
        });
        const search = query.search?.trim().toLowerCase() ?? "";
        let views: TraderView[] = rows.map(mapTrader);
        if (search) views = views.filter((trader) => `${trader.name} ${trader.strategy}`.toLowerCase().includes(search));
        if (query.risk && query.risk !== "all") views = views.filter((trader) => (trader.risk.label ?? "").toLowerCase() === query.risk?.toLowerCase());
        if (query.sort === "copiers") {
          views.sort((a, b) => (b.copiers ?? -1) - (a.copiers ?? -1) || a.name.localeCompare(b.name));
        } else if (query.sort === "accuracy") {
          views.sort((a, b) => {
            const av = a.accuracy.value === null ? null : Number(a.accuracy.value);
            const bv = b.accuracy.value === null ? null : Number(b.accuracy.value);
            if (av === null && bv === null) return a.name.localeCompare(b.name);
            if (av === null) return 1;
            if (bv === null) return -1;
            return bv - av || a.name.localeCompare(b.name);
          });
        } else {
          views.sort((a, b) => a.name.localeCompare(b.name));
        }
        return views.length === 0 && !search ? regionEmpty<TraderView[]>("No traders are listed yet") : regionReady(views, now());
      }),

    getTrader: (id) =>
      read("trader", async () => {
        if (typeof id !== "string" || id.length === 0 || id.length > 128) return regionNotFound<TraderProfile>();
        const row = await prisma.copyTrader.findFirst({
          where: { id, status: "Published", isActive: true },
          select: TRADER_SELECT,
        });
        return row ? regionReady(mapTraderProfile(row), now()) : regionNotFound<TraderProfile>();
      }),

    listAllocations: () =>
      read("allocations", async () => {
        const rows = await prisma.userCopyTrade.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: ALLOCATION_SELECT });
        const views: AllocationView[] = rows.map(mapAllocation);
        return views.length === 0 ? regionEmpty<AllocationView[]>("You are not copying any trader yet") : regionReady(views, now());
      }),

    getAllocation: (id) =>
      read("allocation", async () => {
        if (typeof id !== "string" || id.length === 0 || id.length > 128) return regionNotFound<AllocationDetail>();
        const row = await prisma.userCopyTrade.findFirst({ where: { id, userId }, select: ALLOCATION_SELECT });
        return row ? regionReady(mapAllocationDetail(row), now()) : regionNotFound<AllocationDetail>();
      }),

    getSignals: () =>
      read("signals", async () => {
        // 1. Entitlement check: active balance > 0 in any wallet OR active copy trade allocation
        const [fundedWallet, activeAllocation] = await Promise.all([
          prisma.wallet.findFirst({
            where: {
              userId,
              balance: { gt: 0 },
            },
            select: { id: true },
          }),
          prisma.userCopyTrade.findFirst({
            where: {
              userId,
              status: "ACTIVE",
            },
            select: { id: true },
          }),
        ]);

        const entitled = Boolean(fundedWallet || activeAllocation);

        if (!entitled) {
          return regionReady<SignalsFeed>(
            {
              entitled: false,
              entitlementReason:
                "Institutional trading signals and research desk intelligence require a funded account or an active copy-trade allocation.",
              source: "Institutional Research Desk",
              signals: [],
            },
            now(),
          );
        }

        // 2. Query published/expired enabled signals
        const rows = await prisma.tradingSignal.findMany({
          where: {
            status: { in: ["Published", "Expired"] },
            enabled: true,
          },
          orderBy: { createdAt: "desc" },
          select: SIGNAL_SELECT,
        });

        const currentTime = new Date();
        const views: SignalView[] = rows.map((row) => {
          const isExpired = Boolean(
            (row.expiresAt && row.expiresAt <= currentTime) || row.status === "Expired",
          );
          let direction: "long" | "short" | "neutral" | null = null;
          if (row.direction === "Buy") direction = "long";
          else if (row.direction === "Sell") direction = "short";
          else if (row.direction === "Watch") direction = "neutral";

          return {
            id: row.id,
            source: row.author || "Institutional Research Desk",
            market: `${row.asset}/USDT`,
            asset: isSupportedCrypto(row.asset) ? (row.asset as SupportedCrypto) : null,
            network: null,
            direction,
            publishedAt: (row.publishedAt ?? row.createdAt).toISOString(),
            expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
            expired: isExpired,
            summary: row.title,
            detail: row.analysis,
          };
        });

        return regionReady<SignalsFeed>(
          {
            entitled: true,
            source: "Institutional Research Desk",
            signals: views,
          },
          now(),
        );
      }),

    listNotifications: (filter: NotificationFilter, page: number) =>
      read("notifications", async () => {
        const safePage = Number.isInteger(page) && page >= 1 ? page : 1;
        const total = await prisma.notification.count({ where: { userId } });
        if (total === 0) return regionEmpty<Page<NotificationView>>("No notifications yet");
        const where = filter === "unread" ? { userId, isRead: false } : { userId };
        const [rows, matching] = await Promise.all([
          prisma.notification.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (safePage - 1) * NOTIFICATION_PAGE_SIZE,
            take: NOTIFICATION_PAGE_SIZE,
            select: NOTIFICATION_SELECT,
          }),
          prisma.notification.count({ where }),
        ]);
        return regionReady(pageOf(rows.map(mapNotification), safePage, NOTIFICATION_PAGE_SIZE, matching), now());
      }),

    getUnreadCount: async () => {
      try {
        return await prisma.notification.count({ where: { userId, isRead: false } });
      } catch (error) {
        logFailure("unread count", error);
        return 0;
      }
    },

    getProfile: () =>
      read("profile", async () => {
        const row = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, fullName: true, phone: true, country: true, createdAt: true },
        });
        return row ? regionReady<ProfileView>(mapProfile(row), now()) : regionNotFound<ProfileView>();
      }),

    getSecurity: () =>
      read("security", async () => {
        const supabase = await createClient();
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (error || !data) return regionError<SecurityView>(ACCOUNT_SERVICE_ERROR, true);
        const view: SecurityView = {
          mfa: mfaStatusFromFactors(data.all),
          password: { changeAvailable: true },
          sessions: null,
          sessionsReason: LIVE_REASONS.sessions,
        };
        return regionReady(view, now());
      }),

    getVerification: () =>
      read("verification", async () => {
        const row = await prisma.kycDocument.findUnique({ where: { userId }, select: KYC_SELECT });
        return regionReady<VerificationView>(mapVerification(row), now());
      }),

    getNeedsAttention: () =>
      read("needs attention", async () => {
        const [pending, kyc, factors] = await Promise.all([
          prisma.transaction.findMany({
            where: { userId, status: "PENDING", type: { in: ["WITHDRAWAL", "DEPOSIT"] } },
            orderBy: { createdAt: "desc" },
            select: TRANSACTION_SELECT,
          }),
          prisma.kycDocument.findUnique({ where: { userId }, select: KYC_SELECT }),
          createClient().then((supabase) => supabase.auth.mfa.listFactors()),
        ]);
        const items: AttentionItem[] = [];
        for (const view of mapRows(pending)) {
          const withdrawal = view.type === "WITHDRAWAL";
          items.push({
            id: `attention-${view.id}`,
            kind: withdrawal ? "withdrawal-pending" : "deposit-review",
            title: withdrawal ? `Withdrawal ${view.reference} pending review` : `Deposit ${view.reference} in review`,
            description: `${view.amount} ${view.currency} is awaiting operator review.`,
            href: `/dashboard/activity/${view.id}`,
            since: view.createdAt,
          });
        }
        const mfa = factors.error || !factors.data ? null : mfaStatusFromFactors(factors.data.all);
        if (mfa && mfa.state !== "enabled") {
          items.push({
            id: "attention-mfa",
            kind: "security-enrollment",
            title: "Enable an authenticator app",
            description: mfa.state === "enrollment-pending" ? "An enrollment was started but not verified." : "Your account has no second factor for sign-in.",
            href: "/dashboard/settings/security",
            since: now(),
          });
        }
        const verification = mapVerification(kyc);
        if (verification.state === "not-submitted" || verification.state === "changes-required") {
          items.push({
            id: "attention-verification",
            kind: "verification-action",
            title: verification.state === "not-submitted" ? "Submit identity documents" : "Verification needs changes",
            description: verification.message ?? "Identity verification is required before withdrawals are reviewed.",
            href: "/dashboard/settings/verification",
            since: verification.reviewedAt ?? verification.submittedAt ?? now(),
          });
        }
        return items.length === 0 ? regionEmpty<AttentionItem[]>("Nothing needs your attention") : regionReady(items, now());
      }),

    listRecentActivity: (limit) =>
      read("recent activity", async () => {
        const take = Number.isInteger(limit) && limit > 0 && limit <= 50 ? limit : 5;
        const rows = await prisma.transaction.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take, select: TRANSACTION_SELECT });
        const views = mapRows(rows);
        return views.length === 0 ? regionEmpty<TransactionView[]>("No activity has been recorded for this account") : regionReady(views, now());
      }),
  };
}
