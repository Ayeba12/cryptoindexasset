"use client";

import { Button } from "@/components/ui/button";
import type {
  AllocationView,
  AssetBalance,
  AttentionItem,
  TransactionView,
  Valuation,
} from "@/lib/dashboard/contracts";
import { formatDateTime, formatPercent, formatRelativeAge, formatUsdEstimate, typeLabel } from "@/lib/dashboard/format";
import { FIXTURE_CLOCK } from "@/lib/dashboard/fixtures/scenarios";

import { Amount } from "../amount";
import { DashboardLink } from "../dashboard-link";
import { EmptyState, ErrorState, NotFoundState, RegionSkeleton, UnavailableState } from "../data-state";
import { PageHeading } from "../page-heading";
import { KeyValueList, Panel, PanelRow, PanelRows } from "../panel";
import { StatusBadge } from "../status-badge";
import { useRegion, type LoadingRegion } from "./provider";
import type { PreviewViewProps } from "./routes";

/**
 * Overview placeholder shipped by Stage C so the shell can be reviewed with
 * fixture-shaped content. The Overview page builder replaces this file's
 * entry in `PREVIEW_ROUTES` with the real view (chart, period controls,
 * accessible data table).
 */
export function OverviewPreview(_props: PreviewViewProps) {
  const valuation = useRegion((data) => data.getValuation());
  const assets = useRegion((data) => data.getAssets());
  const allocations = useRegion((data) => data.listAllocations());
  const attention = useRegion((data) => data.getNeedsAttention());
  const activity = useRegion((data) => data.listRecentActivity(5));

  return (
    <>
      <PageHeading
        title="Overview"
        subtitle="Account balances and recent activity."
        actions={
          <>
            <Button asChild size="lg">
              <DashboardLink href="/dashboard/deposit">Deposit</DashboardLink>
            </Button>
            <Button asChild size="lg" variant="outline">
              <DashboardLink href="/dashboard/withdraw">Withdraw</DashboardLink>
            </Button>
          </>
        }
      />
      <div className="ca-sections">
        <SummaryGrid valuation={valuation} />
        <div className="ca-split-8-4">
          <Panel title="Account value" description="Estimated from timestamped quotes. Deposits raise the value without being profit.">
            <EmptyState
              region="Account value chart"
              title="Account history will appear here"
              description="The Overview page builder adds the 7D / 30D / 90D chart with its text summary and data table."
            />
          </Panel>
          <Panel
            title="Assets"
            action={
              <Button asChild variant="outline" size="default">
                <DashboardLink href="/dashboard/assets">View all assets</DashboardLink>
              </Button>
            }
          >
            <AssetsRegion result={assets} />
          </Panel>
        </div>
        <div className="ca-split-8-4">
          <Panel
            title="My copy trades"
            action={
              <Button asChild variant="outline" size="default">
                <DashboardLink href="/dashboard/copy-trades">View all</DashboardLink>
              </Button>
            }
          >
            <AllocationsRegion result={allocations} />
          </Panel>
          <Panel title="Needs attention">
            <AttentionRegion result={attention} />
          </Panel>
        </div>
        <Panel
          title="Recent activity"
          bleed
          action={
            <Button asChild variant="outline" size="default">
              <DashboardLink href="/dashboard/activity">View all activity</DashboardLink>
            </Button>
          }
        >
          <ActivityRegion result={activity} />
        </Panel>
      </div>
    </>
  );
}

type Region<T> = ReturnType<typeof useRegion<T>>;

function SummaryGrid({ valuation }: { valuation: Region<Valuation> }) {
  if (valuation.status === "loading") return <RegionSkeleton variant="summary" region="Account summary" />;
  if (valuation.status === "error") {
    return (
      <Panel title="Account summary" summary>
        <ErrorState region="Account summary" message={valuation.message} retryable={valuation.retryable} />
      </Panel>
    );
  }
  if (valuation.status === "unavailable") {
    return (
      <div className="ca-grid-summary">
        <SummaryCard label="Estimated account value" help={valuation.reason}>
          <Amount value={null} unit="USD" role="main" unavailableReason={valuation.reason} />
        </SummaryCard>
        <SummaryCard label="Available" help={valuation.reason}>
          <Amount value={null} unit="USD" role="metric" unavailableReason={valuation.reason} />
        </SummaryCard>
        <SummaryCard label="Reserved" help={valuation.reason}>
          <Amount value={null} unit="USD" role="metric" unavailableReason={valuation.reason} />
        </SummaryCard>
        <SummaryCard label="Recorded P/L" help="No recorded outcome for this period">
          <Amount value={null} unit="USD" role="metric" unavailableReason="No recorded outcome for this period" />
        </SummaryCard>
      </div>
    );
  }
  if (valuation.status !== "ready") {
    return (
      <Panel title="Account summary" summary>
        <EmptyState region="Account summary" title="No valuation yet" />
      </Panel>
    );
  }
  const value = valuation.data;
  const estimate = formatUsdEstimate(value.estimatedTotal, value.quotedAt);
  const pnl = value.recordedPnl;
  const percent = pnl ? formatPercent(pnl.percent, { sign: true }) : null;
  return (
    <div className="ca-grid-summary">
      <SummaryCard
        label="Estimated account value"
        help={
          <>
            {estimate.asOfText ?? "Quote time unknown"}
            {value.partial ? ` · Excludes ${value.excluded.join(", ")}` : ""}
          </>
        }
      >
        <Amount value={value.estimatedTotal} unit="USD" role="main" unavailableReason="No price quote is available" />
      </SummaryCard>
      <SummaryCard label="Available" help="Estimated, not a balance">
        <Amount value={value.availableTotal} unit="USD" role="metric" unavailableReason="The ledger does not define holds yet" />
      </SummaryCard>
      <SummaryCard label="Reserved" help="Copy-trade allocations and pending requests">
        <Amount value={value.reservedTotal} unit="USD" role="metric" unavailableReason="The ledger does not define holds yet" />
      </SummaryCard>
      <SummaryCard
        label={pnl ? `Recorded P/L, ${pnl.period}` : "Recorded P/L"}
        help={pnl ? `${pnl.method}${percent && !percent.unavailable ? ` · ${percent.text}` : ""}` : "No recorded outcome for this period"}
      >
        <Amount value={pnl ? pnl.amount : null} unit="USD" role="metric" sign unavailableReason="No recorded outcome for this period" />
      </SummaryCard>
    </div>
  );
}

function SummaryCard({ label, help, children }: { label: React.ReactNode; help?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Panel title={label} summary headingLevel={3} contentClassName="gap-2">
      <div>{children}</div>
      {help ? <p className="ca-help m-0">{help}</p> : null}
    </Panel>
  );
}

function AssetsRegion({ result }: { result: Region<AssetBalance[]> }) {
  if (result.status === "loading") return <RegionSkeleton variant="list" region="Assets" rows={6} />;
  if (result.status === "error") return <ErrorState region="Assets" message={result.message} retryable={result.retryable} />;
  if (result.status === "unavailable") return <UnavailableState region="Assets" reason={result.reason} alternative={result.alternative} />;
  if (result.status === "not-found") return <NotFoundState region="Assets" />;
  if (result.status === "empty") return <EmptyState region="Assets" title="No wallets yet" description={result.reason} />;
  return (
    <PanelRows>
      {result.data.map((asset) => (
        <PanelRow
          key={asset.currency}
          trailing={
            <div className="flex flex-col items-end gap-1 text-right">
              <Amount value={asset.total} unit={asset.currency} unavailableReason={asset.enabledReason ?? "Balance unknown"} />
              {asset.enabled ? (
                <span className="ca-help">
                  Available{" "}
                  <Amount value={asset.available} unit={asset.currency} role="id" unavailableReason={asset.reservedReason ?? "Not defined"} />
                </span>
              ) : (
                <span className="ca-help">{asset.enabledReason ?? "Not initialised"}</span>
              )}
            </div>
          }
        >
          <span className="ca-body font-medium">{asset.currency}</span>
          <span className="ca-help">{asset.name}</span>
        </PanelRow>
      ))}
    </PanelRows>
  );
}

function AllocationsRegion({ result }: { result: Region<AllocationView[]> }) {
  if (result.status === "loading") return <RegionSkeleton variant="list" region="My copy trades" rows={3} />;
  if (result.status === "error") return <ErrorState region="My copy trades" message={result.message} retryable={result.retryable} />;
  if (result.status === "unavailable") return <UnavailableState region="My copy trades" reason={result.reason} alternative={result.alternative} />;
  if (result.status === "not-found") return <NotFoundState region="My copy trades" />;
  if (result.status === "empty") {
    return (
      <EmptyState
        region="My copy trades"
        title="No copy trades yet"
        description={result.reason ?? "Allocations you start appear here with their status."}
        action={
          <Button asChild variant="outline" size="lg">
            <DashboardLink href="/dashboard/traders">Discover traders</DashboardLink>
          </Button>
        }
      />
    );
  }
  return (
    <PanelRows>
      {result.data.slice(0, 3).map((allocation) => (
        <PanelRow
          key={allocation.id}
          trailing={
            <>
              <StatusBadge status={allocation.status} domain="allocation" />
              <Button asChild variant="outline" size="default">
                <DashboardLink href={`/dashboard/copy-trades/${allocation.id}`}>Details</DashboardLink>
              </Button>
            </>
          }
        >
          <span className="ca-body font-medium">{allocation.traderName}</span>
          <span className="ca-help">
            Allocated <Amount value={allocation.allocated.amount} unit={allocation.allocated.currency} role="id" />
            {allocation.recordedPnl ? (
              <>
                {" · "}
                {allocation.recordedPnl.label}{" "}
                <Amount value={allocation.recordedPnl.amount} unit={allocation.recordedPnl.currency} role="id" sign />
              </>
            ) : null}
          </span>
        </PanelRow>
      ))}
    </PanelRows>
  );
}

function AttentionRegion({ result }: { result: Region<AttentionItem[]> }) {
  if (result.status === "loading") return <RegionSkeleton variant="list" region="Needs attention" rows={2} />;
  if (result.status === "error") return <ErrorState region="Needs attention" message={result.message} retryable={result.retryable} />;
  if (result.status === "unavailable") return <UnavailableState region="Needs attention" reason={result.reason} alternative={result.alternative} />;
  if (result.status === "not-found") return <NotFoundState region="Needs attention" />;
  if (result.status === "empty" || result.data.length === 0) {
    return <p className="ca-body ca-prose m-0 text-muted-foreground">Nothing needs your attention. Pending requests and security steps appear here.</p>;
  }
  return (
    <PanelRows>
      {result.data.map((item) => (
        <PanelRow
          key={item.id}
          trailing={
            <Button asChild variant="outline" size="default">
              <DashboardLink href={item.href}>Open</DashboardLink>
            </Button>
          }
        >
          <span className="ca-body font-medium">{item.title}</span>
          <span className="ca-help">
            {item.description} · {formatRelativeAge(item.since, FIXTURE_CLOCK)}
          </span>
        </PanelRow>
      ))}
    </PanelRows>
  );
}

function ActivityRegion({ result }: { result: Region<TransactionView[]> }) {
  if (result.status === "loading") return <RegionSkeleton variant="table" region="Recent activity" rows={5} className="px-4 md:px-6" />;
  if (result.status === "error") return <ErrorState region="Recent activity" message={result.message} retryable={result.retryable} className="px-4 md:px-6" />;
  if (result.status === "unavailable") return <UnavailableState region="Recent activity" reason={result.reason} alternative={result.alternative} className="px-4 md:px-6" />;
  if (result.status === "not-found") return <NotFoundState region="Recent activity" className="px-4 md:px-6" />;
  if (result.status === "empty") {
    return (
      <EmptyState
        region="Recent activity"
        title="No activity yet"
        description={result.reason ?? "Deposits, withdrawals, fees and recorded outcomes appear here."}
        className="px-4 md:px-6"
      />
    );
  }
  return (
    <div className="ca-table-region" tabIndex={0} role="region" aria-label="Recent activity table">
      <table className="ca-table min-w-[44rem]">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Type</th>
            <th scope="col">Asset</th>
            <th scope="col" data-align="end">
              Amount
            </th>
            <th scope="col">Status</th>
            <th scope="col">
              <span className="ca-sr-only">Details</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {result.data.map((row) => (
            <tr key={row.id}>
              <td className="whitespace-nowrap">{formatDateTime(row.createdAt)}</td>
              <td>
                <span className="block">{typeLabel(row.type)}</span>
                <span className="ca-help block">{row.sourceLabel}</span>
              </td>
              <td>{row.currency}</td>
              <td data-align="end" className="whitespace-nowrap">
                <Amount value={row.amount} unit={row.currency} direction={row.direction} />
              </td>
              <td>
                <StatusBadge status={row.status} domain="request" />
              </td>
              <td data-align="end">
                <Button asChild variant="outline" size="default">
                  <DashboardLink href={`/dashboard/activity/${row.id}`}>Details</DashboardLink>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Keep the KeyValueList import used for builders copying this file as a template.
export const OVERVIEW_PLACEHOLDER_PARTS = { KeyValueList };
export type { LoadingRegion };
