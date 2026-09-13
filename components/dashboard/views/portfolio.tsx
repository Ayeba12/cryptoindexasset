"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { RegionSkeleton } from "../data-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LEDGER_CURRENCIES,
  REQUEST_STATUSES,
  TRANSACTION_TYPES,
  VALUATION_PERIODS,
  type AssetBalance,
  type TransactionView,
} from "@/lib/dashboard/contracts";
import { formatDateTime, typeLabel } from "@/lib/dashboard/format";
import type { ScreenData } from "@/lib/dashboard/screen-data";
import { Amount } from "../amount";
import { CoinIdentity } from "../coin-identity";
import { useDashboardActions } from "../actions-context";
import { ConfirmDialog } from "../confirm-dialog";
import { DashboardLink } from "../dashboard-link";
import { PageHeading } from "../page-heading";
import { KeyValueList, Panel, PanelRow, PanelRows } from "../panel";
import { StatusBadge } from "../status-badge";
import {
  ActionLink,
  Choice,
  Pager,
  Region,
  useFilters,
  useOperation,
} from "./shared";

export function ActivityTable({ rows }: { rows: TransactionView[] }) {
  if (!rows.length)
    return <p className="ca-body py-4">No transactions match these filters.</p>;
  return (
    <div
      className="ca-table-region"
      tabIndex={0}
      role="region"
      aria-label="Transactions, scroll horizontally for all columns"
    >
      <Table className="ca-table">
        <TableHeader>
          <TableRow>
            <TableHead>Activity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Asset / network</TableHead>
            <TableHead>Fee</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>
              <span className="sr-only">Details</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="min-w-[11rem] max-w-[13rem] whitespace-normal">
                <p>{typeLabel(row.type)}</p>
                <p className="ca-help">{formatDateTime(row.createdAt)}</p>
                <p className="ca-help">{row.sourceLabel}</p>
              </TableCell>
              <TableCell>
                <StatusBadge status={row.status} domain="request" />
              </TableCell>
              <TableCell>
                <Amount
                  value={row.amount}
                  unit={row.currency}
                  direction={row.direction}
                />
              </TableCell>
              <TableCell>
                <CoinIdentity currency={row.currency} />
                <p className="ca-help">
                  {row.network?.name ?? "Not specified"}
                </p>
              </TableCell>
              <TableCell>
                <Amount value={row.fee} unit={row.currency} />
              </TableCell>
              <TableCell className="ca-id">{row.reference}</TableCell>
              <TableCell>
                <DashboardLink
                  className="underline underline-offset-4"
                  href={`/dashboard/activity/${row.id}`}
                  aria-label={`View transaction ${row.reference}`}
                >
                  Details
                </DashboardLink>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function AssetRows({ rows }: { rows: AssetBalance[] }) {
  return (
    <PanelRows>
      {rows.map((asset) => (
        <PanelRow
          key={asset.currency}
          trailing={<Amount value={asset.total} unit={asset.currency} />}
        >
          <DashboardLink
            href={`/dashboard/assets/${asset.currency}`}
            className="ca-body underline decoration-border underline-offset-4"
          >
            <CoinIdentity currency={asset.currency}>{asset.name}</CoinIdentity>
          </DashboardLink>
          <p className="ca-help">
            {asset.enabled
              ? asset.currency
              : (asset.enabledReason ?? "Wallet unavailable")}
          </p>
        </PanelRow>
      ))}
    </PanelRows>
  );
}

function AssetTable({ rows }: { rows: AssetBalance[] }) {
  return (
    <div
      className="ca-assets-table ca-table-region"
      role="region"
      aria-label="Asset balances, scroll horizontally for all columns"
      tabIndex={0}
    >
      <Table className="ca-table">
        <TableHeader>
          <TableRow>
            <TableHead>Asset</TableHead>
            <TableHead>Total holdings</TableHead>
            <TableHead>Available</TableHead>
            <TableHead>Reserved</TableHead>
            <TableHead>Estimated USD</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((asset) => (
            <TableRow key={asset.currency}>
              <TableCell>
                <DashboardLink
                  className="underline underline-offset-4"
                  href={`/dashboard/assets/${asset.currency}`}
                >
                  <CoinIdentity currency={asset.currency}>
                    {asset.name}
                  </CoinIdentity>
                </DashboardLink>
                <p className="ca-help">
                  {asset.enabled
                    ? asset.currency
                    : (asset.enabledReason ?? "Wallet unavailable")}
                </p>
              </TableCell>
              <TableCell>
                <Amount value={asset.total} unit={asset.currency} />
              </TableCell>
              <TableCell>
                <Amount
                  value={asset.available}
                  unit={asset.currency}
                  unavailableReason={asset.reservedReason}
                />
              </TableCell>
              <TableCell>
                <Amount
                  value={asset.reserved}
                  unit={asset.currency}
                  unavailableReason={asset.reservedReason}
                />
              </TableCell>
              <TableCell>
                <Amount
                  value={asset.estimatedUsd}
                  unit="USD"
                  unavailableReason={asset.estimateReason}
                />
              </TableCell>
              <TableCell>
                <ActionLink
                  href={`/dashboard/deposit?currency=${asset.currency}`}
                >
                  Deposit {asset.currency}
                </ActionLink>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export const HistoryChart = dynamic(
  () => import("./history-chart").then((module) => module.HistoryChart),
  {
    loading: () => <RegionSkeleton region="Account history" variant="chart" />,
  },
);

export function Overview({
  data,
  retry,
}: {
  data: ScreenData;
  retry?: () => void;
}) {
  const { q, change } = useFilters();
  return (
    <>
      <PageHeading
        title="Overview"
        subtitle="Account balances and recent activity."
        actions={
          <>
            <ActionLink href="/dashboard/deposit" primary>
              Deposit
            </ActionLink>
            <ActionLink href="/dashboard/withdraw">Withdraw</ActionLink>
          </>
        }
      />
      <div className="ca-sections">
        <Region
          name="Account valuation"
          value={data.valuation}
          variant="summary"
          retry={retry}
        >
          {(value) => (
            <>
              <div className="ca-grid-summary">
                {[
                  {
                    title: "Estimated account value",
                    value: value.estimatedTotal,
                    help: value.partial
                      ? `Partial estimate. Excludes ${value.excluded.join(", ")}.`
                      : "USD estimate, not withdrawable cash",
                  },
                  {
                    title: "Available estimate",
                    value: value.availableTotal,
                    help: "Unreserved holdings, estimated in USD",
                  },
                  {
                    title: "Reserved estimate",
                    value: value.reservedTotal,
                    help: "Holdings committed to pending activity",
                  },
                  {
                    title: "Recorded P/L",
                    value: value.recordedPnl?.amount ?? null,
                    help: value.recordedPnl
                      ? `${value.recordedPnl.period} · ${value.recordedPnl.method}`
                      : "No recorded return supplied",
                  },
                ].map((item, i) => (
                  <Panel
                    key={item.title}
                    title={
                      <span className="ca-label text-muted-foreground">
                        {item.title}
                      </span>
                    }
                    summary
                  >
                    <Amount
                      value={item.value}
                      unit="USD"
                      role={i === 0 ? "main" : "metric"}
                      sign={i === 3}
                    />
                    <p className="ca-help">{item.help}</p>
                  </Panel>
                ))}
              </div>
              <p className="ca-help">
                {value.source} · {formatDateTime(value.quotedAt)}
              </p>
            </>
          )}
        </Region>
        <div className="ca-split-8-4">
          <Panel
            title="Account value"
            action={
              <div
                className="flex gap-1"
                role="group"
                aria-label="Chart period"
              >
                {VALUATION_PERIODS.map((period) => (
                  <Button
                    key={period}
                    size="lg"
                    variant={
                      (q?.get("period") ?? "30D") === period
                        ? "secondary"
                        : "ghost"
                    }
                    aria-pressed={(q?.get("period") ?? "30D") === period}
                    onClick={() => change({ period })}
                  >
                    {period}
                  </Button>
                ))}
              </div>
            }
          >
            <Region
              name="Account history"
              value={data.history}
              variant="chart"
              retry={retry}
            >
              {(history) => <HistoryChart history={history} />}
            </Region>
          </Panel>
          <Panel
            title="Assets"
            action={<ActionLink href="/dashboard/assets">View all</ActionLink>}
          >
            <Region name="Assets" value={data.assets} retry={retry}>
              {(assets) => <AssetRows rows={assets} />}
            </Region>
          </Panel>
        </div>
        <div className="ca-split-8-4">
          <Panel
            title="My copy trades"
            action={
              <ActionLink href="/dashboard/copy-trades">View all</ActionLink>
            }
          >
            <Region name="Copy trades" value={data.allocations} retry={retry}>
              {(rows) => (
                <PanelRows>
                  {rows.slice(0, 3).map((row) => (
                    <PanelRow
                      key={row.id}
                      trailing={
                        <StatusBadge status={row.status} domain="allocation" />
                      }
                    >
                      <DashboardLink
                        href={`/dashboard/copy-trades/${row.id}`}
                        className="underline underline-offset-4"
                      >
                        {row.traderName}
                      </DashboardLink>
                      <Amount
                        value={row.allocated.amount}
                        unit={row.allocated.currency}
                      />
                    </PanelRow>
                  ))}
                </PanelRows>
              )}
            </Region>
          </Panel>
          <Panel title="Needs attention">
            <Region name="Pending tasks" value={data.attention} retry={retry}>
              {(items) => (
                <PanelRows>
                  {items.map((item) => (
                    <PanelRow key={item.id}>
                      <DashboardLink
                        href={item.href}
                        className="underline underline-offset-4"
                      >
                        {item.title}
                      </DashboardLink>
                      <p className="ca-help">{item.description}</p>
                    </PanelRow>
                  ))}
                </PanelRows>
              )}
            </Region>
          </Panel>
        </div>
        <Panel
          title="Recent activity"
          bleed
          action={
            <ActionLink href="/dashboard/activity">
              View all activity
            </ActionLink>
          }
        >
          <Region
            name="Activity"
            value={data.activity}
            variant="table"
            retry={retry}
          >
            {(rows) => <ActivityTable rows={rows} />}
          </Region>
        </Panel>
      </div>
    </>
  );
}

export function Assets({
  data,
  detail = false,
  retry,
}: {
  data: ScreenData;
  detail?: boolean;
  retry?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [availability, setAvailability] = useState("all");
  return (
    <>
      <PageHeading
        title={
          detail && data.asset?.status === "ready"
            ? data.asset.data.name
            : "Assets"
        }
        subtitle="Native asset balances. USD values are estimates."
      />
      <div className="ca-sections">
        {detail ? (
          <>
            <Region name="Asset" value={data.asset} retry={retry}>
              {(asset) => (
                <Panel
                  title={asset.currency}
                  action={
                    <div className="flex gap-2">
                      <ActionLink
                        href={`/dashboard/deposit?currency=${asset.currency}`}
                        primary
                      >
                        Deposit {asset.currency}
                      </ActionLink>
                      <ActionLink href="/dashboard/withdraw">
                        Withdraw
                      </ActionLink>
                    </div>
                  }
                >
                  <KeyValueList
                    layout="inline"
                    items={[
                      {
                        label: "Total holdings",
                        value: (
                          <Amount
                            value={asset.total}
                            unit={asset.currency}
                            exact
                          />
                        ),
                      },
                      {
                        label: "Available",
                        value: (
                          <Amount
                            value={asset.available}
                            unit={asset.currency}
                            exact
                          />
                        ),
                        help: asset.reservedReason,
                      },
                      {
                        label: "Reserved",
                        value: (
                          <Amount
                            value={asset.reserved}
                            unit={asset.currency}
                            exact
                          />
                        ),
                      },
                      {
                        label: "Estimated value",
                        value: <Amount value={asset.estimatedUsd} unit="USD" />,
                        help: asset.estimateReason,
                      },
                      {
                        label: "Networks",
                        value:
                          asset.networks.map((n) => n.name).join(", ") ||
                          "No supported networks configured",
                      },
                      { label: "As of", value: formatDateTime(asset.asOf) },
                    ]}
                  />
                </Panel>
              )}
            </Region>
            <Panel title="Asset activity" bleed>
              <Region name="Activity" value={data.activity} retry={retry}>
                {(rows) => <ActivityTable rows={rows} />}
              </Region>
            </Panel>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="asset-search">Search assets</Label>
                <Input
                  id="asset-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name or symbol"
                />
              </div>
              <Choice
                label="Wallet availability"
                value={availability}
                onChange={setAvailability}
                options={[
                  { value: "all", label: "All wallets" },
                  { value: "enabled", label: "Enabled" },
                  { value: "disabled", label: "Unavailable" },
                ]}
              />
            </div>
            <Panel title="Your assets">
              <Region name="Assets" value={data.assets} retry={retry}>
                {(assets) => {
                  const rows = assets.filter(
                    (asset) =>
                      `${asset.name} ${asset.currency}`
                        .toLowerCase()
                        .includes(search.toLowerCase()) &&
                      (availability === "all" ||
                        asset.enabled === (availability === "enabled")),
                  );
                  return rows.length ? (
                    <>
                      <AssetTable rows={rows} />
                      <div className="ca-asset-list ca-assets-mobile">
                        {rows.map((asset) => (
                          <div key={asset.currency} className="ca-asset-record">
                            <div>
                              <DashboardLink
                                href={`/dashboard/assets/${asset.currency}`}
                                className="ca-h3 underline underline-offset-4"
                              >
                                {asset.name}
                              </DashboardLink>
                              <p className="ca-help">
                                {asset.enabled
                                  ? asset.currency
                                  : (asset.enabledReason ??
                                    "Wallet unavailable")}
                              </p>
                            </div>
                            <div>
                              <p className="ca-label text-muted-foreground mb-2">
                                Total holdings
                              </p>
                              <Amount
                                value={asset.total}
                                unit={asset.currency}
                              />
                            </div>
                            <details>
                              <summary className="ca-body cursor-pointer underline underline-offset-4">
                                Balance breakdown
                              </summary>
                              <KeyValueList
                                className="mt-4"
                                items={[
                                  {
                                    label: "Available",
                                    value: (
                                      <Amount
                                        value={asset.available}
                                        unit={asset.currency}
                                      />
                                    ),
                                    help: asset.reservedReason,
                                  },
                                  {
                                    label: "Reserved",
                                    value: (
                                      <Amount
                                        value={asset.reserved}
                                        unit={asset.currency}
                                      />
                                    ),
                                  },
                                  {
                                    label: "Estimated USD",
                                    value: (
                                      <Amount
                                        value={asset.estimatedUsd}
                                        unit="USD"
                                      />
                                    ),
                                    help: asset.estimateReason,
                                  },
                                ]}
                              />
                            </details>
                            <ActionLink
                              href={`/dashboard/deposit?currency=${asset.currency}`}
                            >
                              Deposit {asset.currency}
                            </ActionLink>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="ca-body">No assets match your filters.</p>
                  );
                }}
              </Region>
            </Panel>
            {data.settlement?.status === "ready" && (
              <Panel
                title="USD settlement ledger"
                description="Separate accounting balance, not a seventh crypto asset."
              >
                <Amount
                  value={data.settlement.data.balance}
                  unit="USD"
                  role="metric"
                />
                <p className="ca-help">
                  {formatDateTime(data.settlement.data.asOf)}
                </p>
              </Panel>
            )}
          </>
        )}
      </div>
    </>
  );
}

export function Activity({
  data,
  detail = false,
  retry,
}: {
  data: ScreenData;
  detail?: boolean;
  retry?: () => void;
}) {
  const { q, change } = useFilters();
  const { actions } = useDashboardActions();
  const operation = useOperation();
  const [cancel, setCancel] = useState(false);
  return (
    <>
      <PageHeading
        title={detail ? "Transaction details" : "Activity"}
        subtitle="Deposits, withdrawals, and ledger adjustments."
      />
      <div className="ca-sections">
        {detail ? (
          <Region name="Transaction" value={data.transaction} retry={retry}>
            {(row) => (
              <>
                <Panel
                  title={row.reference}
                  action={<StatusBadge status={row.status} domain="request" />}
                >
                  <KeyValueList
                    layout="inline"
                    items={[
                      {
                        label: "Type",
                        value: typeLabel(row.type),
                        help: row.sourceLabel,
                      },
                      {
                        label: "Amount",
                        value: (
                          <Amount
                            value={row.amount}
                            unit={row.currency}
                            exact
                            direction={row.direction}
                          />
                        ),
                      },
                      {
                        label: "Fee",
                        value: (
                          <Amount value={row.fee} unit={row.currency} exact />
                        ),
                      },
                      {
                        label: "Settlement",
                        value: (
                          <StatusBadge
                            status={row.settlement}
                            domain="settlement"
                          />
                        ),
                      },
                      {
                        label: "Network",
                        value: row.network?.name ?? "Not supplied",
                      },
                      {
                        label: "Destination",
                        value: row.destinationFull ?? "Not supplied",
                      },
                      { label: "Tag / memo", value: row.tag ?? "Not supplied" },
                      {
                        label: "Transaction hash",
                        value: row.txHash ?? "Not supplied",
                      },
                      {
                        label: "Updated",
                        value: formatDateTime(row.updatedAt),
                      },
                    ]}
                  />
                  {row.reason && <p className="ca-body">{row.reason}</p>}
                  {row.nextStep && <p className="ca-body">{row.nextStep}</p>}
                  {row.explorerUrl && (
                    <a
                      className="underline"
                      href={row.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View on block explorer
                    </a>
                  )}
                  {row.permittedActions.includes("cancel") && (
                    <Button variant="outline" onClick={() => setCancel(true)}>
                      Cancel request
                    </Button>
                  )}
                </Panel>
                <Panel title="Timeline">
                  <ol className="flex flex-col gap-4">
                    {row.timeline.map((item, i) => (
                      <li key={i}>
                        <p className="ca-body">{item.label}</p>
                        <p className="ca-help">{formatDateTime(item.at)}</p>
                      </li>
                    ))}
                  </ol>
                </Panel>
                <ConfirmDialog
                  open={cancel}
                  onOpenChange={setCancel}
                  title="Cancel this request?"
                  description="Cancellation is subject to the current request state. A released hold is shown only after the ledger confirms it."
                  confirmLabel="Cancel request"
                  destructive
                  busy={operation.busy}
                  onConfirm={() =>
                    operation
                      .run(
                        () => actions.cancelTransaction(row.id),
                        "Request cancelled.",
                        () => setCancel(false),
                      )
                      .then(() => {})
                  }
                >
                  {operation.feedback}
                </ConfirmDialog>
              </>
            )}
          </Region>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-4">
              {[
                {
                  key: "type",
                  label: "Type",
                  values: TRANSACTION_TYPES.map((v) => ({
                    value: v,
                    label: typeLabel(v),
                  })),
                },
                {
                  key: "currency",
                  label: "Asset",
                  values: LEDGER_CURRENCIES.map((v) => ({
                    value: v,
                    label: v,
                  })),
                },
                {
                  key: "status",
                  label: "Status",
                  values: REQUEST_STATUSES.map((v) => ({
                    value: v,
                    label: v.toLowerCase(),
                  })),
                },
              ].map((filter) => (
                <Choice
                  key={filter.key}
                  label={filter.label}
                  value={q?.get(filter.key) ?? "all"}
                  options={[{ value: "all", label: "All" }, ...filter.values]}
                  onChange={(value) => change({ [filter.key]: value })}
                />
              ))}
              {["from", "to"].map((key) => (
                <div key={key} className="flex flex-col gap-2">
                  <Label htmlFor={`date-${key}`}>
                    {key === "from" ? "From" : "To"} date
                  </Label>
                  <Input
                    id={`date-${key}`}
                    type="date"
                    value={q?.get(key) ?? ""}
                    onChange={(e) => change({ [key]: e.target.value })}
                  />
                </div>
              ))}
              <Choice
                label="Rows per page"
                value={q?.get("pageSize") ?? "25"}
                options={[10, 25, 50].map((v) => ({
                  value: String(v),
                  label: String(v),
                }))}
                onChange={(value) => change({ pageSize: value })}
              />
              <Button
                variant="outline"
                size="lg"
                onClick={() =>
                  change({
                    type: null,
                    currency: null,
                    status: null,
                    from: null,
                    to: null,
                    pageSize: null,
                  })
                }
              >
                Reset filters
              </Button>
            </div>
            <Panel title="Transactions" bleed>
              <Region
                name="Transactions"
                value={data.transactions}
                variant="table"
                retry={retry}
              >
                {(page) => (
                  <>
                    <ActivityTable rows={page.items} />
                    <div className="px-4 md:px-6">
                      <Pager
                        page={page.page}
                        hasMore={page.hasMore}
                        total={page.total}
                      />
                    </div>
                  </>
                )}
              </Region>
            </Panel>
          </>
        )}
      </div>
    </>
  );
}
