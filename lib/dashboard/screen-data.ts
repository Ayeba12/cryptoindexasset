/** Shared read orchestration. This module has no live or fixture imports. */
import * as C from "./contracts";
import { regionError, regionNotFound, type DashboardData } from "./data-source";
import type { RoutePattern } from "./navigation";

export interface ScreenData {
  capabilities: C.Capabilities;
  valuation?: C.RegionResult<C.Valuation>;
  history?: C.RegionResult<C.ValuationHistory>;
  assets?: C.RegionResult<C.AssetBalance[]>;
  asset?: C.RegionResult<C.AssetBalance>;
  settlement?: C.RegionResult<C.SettlementLedger>;
  activity?: C.RegionResult<C.TransactionView[]>;
  transactions?: C.RegionResult<C.Page<C.TransactionView>>;
  transaction?: C.RegionResult<C.TransactionDetail>;
  attention?: C.RegionResult<C.AttentionItem[]>;
  allocations?: C.RegionResult<C.AllocationView[]>;
  allocation?: C.RegionResult<C.AllocationDetail>;
  depositOptions?: C.RegionResult<C.DepositOption[]>;
  depositInstruction?: C.RegionResult<C.DepositInstruction>;
  depositProofRules?: C.RegionResult<C.UploadRules>;
  withdrawalOptions?: C.RegionResult<C.WithdrawalOptions>;
  traders?: C.RegionResult<C.TraderView[]>;
  trader?: C.RegionResult<C.TraderProfile>;
  signals?: C.RegionResult<C.SignalsFeed>;
  notifications?: C.RegionResult<C.Page<C.NotificationView>>;
  profile?: C.RegionResult<C.ProfileView>;
  security?: C.RegionResult<C.SecurityView>;
  verification?: C.RegionResult<C.VerificationView>;
}

export function transactionQuery(q: URLSearchParams): C.TransactionQuery {
  const member = <T extends string>(
    value: string | null,
    choices: readonly T[],
  ): T | "all" => (choices.includes(value as T) ? (value as T) : "all");
  return {
    type: member(q.get("type"), C.TRANSACTION_TYPES),
    currency: member(q.get("currency"), C.LEDGER_CURRENCIES),
    status: member(q.get("status"), C.REQUEST_STATUSES),
    from: /^\d{4}-\d{2}-\d{2}$/.test(q.get("from") ?? "")
      ? q.get("from")!
      : undefined,
    to: /^\d{4}-\d{2}-\d{2}$/.test(q.get("to") ?? "")
      ? q.get("to")!
      : undefined,
    page: Math.max(1, Math.min(100000, Math.trunc(Number(q.get("page"))) || 1)),
    pageSize: C.PAGE_SIZES.includes(Number(q.get("pageSize")) as C.PageSize)
      ? (Number(q.get("pageSize")) as C.PageSize)
      : 25,
  };
}

export async function loadScreen(
  data: DashboardData,
  route: RoutePattern,
  params: Record<string, string>,
  q: URLSearchParams,
): Promise<ScreenData> {
  const result: ScreenData = { capabilities: await data.getCapabilities() };
  const jobs: Promise<void>[] = [];
  function read<K extends Exclude<keyof ScreenData, "capabilities">>(
    key: K,
    promise: Promise<NonNullable<ScreenData[K]>>,
  ) {
    jobs.push(
      promise.then(
        (value) => {
          result[key] = value;
        },
        () => {
          result[key] = regionError(
            "This section could not be loaded. Please retry.",
          ) as ScreenData[K];
        },
      ),
    );
  }
  switch (route) {
    case "/dashboard": {
      const period = C.VALUATION_PERIODS.includes(
        q.get("period") as C.ValuationPeriod,
      )
        ? (q.get("period") as C.ValuationPeriod)
        : "30D";
      read("valuation", data.getValuation());
      read("history", data.getValuationHistory(period));
      read("assets", data.getAssets());
      read("allocations", data.listAllocations());
      read("attention", data.getNeedsAttention());
      read("activity", data.listRecentActivity(5));
      break;
    }
    case "/dashboard/assets":
      read("assets", data.getAssets());
      read("settlement", data.getSettlementLedger());
      break;
    case "/dashboard/assets/[currency]":
      if (C.isSupportedCrypto(params.currency)) {
        read("asset", data.getAsset(params.currency));
        read("activity", data.getAssetActivity(params.currency));
      } else result.asset = regionNotFound();
      break;
    case "/dashboard/activity":
      read("transactions", data.listTransactions(transactionQuery(q)));
      break;
    case "/dashboard/activity/[transactionId]":
      read("transaction", data.getTransaction(params.transactionId));
      break;
    case "/dashboard/deposit": {
      read("depositOptions", data.getDepositOptions());
      read("depositProofRules", data.getDepositProofRules());
      read("activity", data.listRecentDeposits());
      const currency = q.get("currency");
      if (C.isSupportedCrypto(currency) && q.get("network"))
        read(
          "depositInstruction",
          data.getDepositInstruction(currency, q.get("network")!),
        );
      break;
    }
    case "/dashboard/withdraw":
      read("withdrawalOptions", data.getWithdrawalOptions());
      break;
    case "/dashboard/traders":
      read(
        "traders",
        data.listTraders({
          search: q.get("search") ?? "",
          sort:
            q.get("sort") === "accuracy"
              ? "accuracy"
              : q.get("sort") === "copiers"
                ? "copiers"
                : "name",
        }),
      );
      break;
    case "/dashboard/traders/[traderId]":
      read("trader", data.getTrader(params.traderId));
      read("assets", data.getAssets());
      break;
    case "/dashboard/copy-trades":
      read("allocations", data.listAllocations());
      break;
    case "/dashboard/copy-trades/[allocationId]":
      read("allocation", data.getAllocation(params.allocationId));
      break;
    case "/dashboard/signals":
      read("signals", data.getSignals());
      break;
    case "/dashboard/notifications":
      read(
        "notifications",
        data.listNotifications(
          q.get("filter") === "unread" ? "unread" : "all",
          transactionQuery(q).page,
        ),
      );
      break;
    case "/dashboard/settings/profile":
      read("profile", data.getProfile());
      break;
    case "/dashboard/settings/security":
      read("security", data.getSecurity());
      break;
    case "/dashboard/settings/verification":
      read("verification", data.getVerification());
      break;
  }
  await Promise.all(jobs);
  return result;
}
