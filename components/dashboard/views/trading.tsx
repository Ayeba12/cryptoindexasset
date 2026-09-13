"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type {
  AllocationAction,
  Capabilities,
  CopyRequestReceipt,
  SignalView,
  TraderProfile,
  TraderView,
} from "@/lib/dashboard/contracts";
import {
  formatCount,
  formatDateTime,
  initialsFor,
} from "@/lib/dashboard/format";
import type { ScreenData } from "@/lib/dashboard/screen-data";
import { useDashboardActions } from "../actions-context";
import { Amount } from "../amount";
import { ConfirmDialog } from "../confirm-dialog";
import { DashboardLink } from "../dashboard-link";
import { PageHeading } from "../page-heading";
import { KeyValueList, Panel, PanelRow, PanelRows } from "../panel";
import { StatusBadge } from "../status-badge";
import { ActivityTable, HistoryChart } from "./portfolio";
import { ActionLink, Choice, Region, useFilters, useOperation } from "./shared";

function TraderIdentity({ trader }: { trader: TraderView }) {
  return (
    <span className="flex items-center gap-3">
      <Avatar className="size-12 rounded-[var(--radius)] after:rounded-[var(--radius)]">
        <AvatarImage
          className="rounded-[var(--radius)]"
          src={trader.portrait ?? undefined}
          alt=""
        />
        <AvatarFallback className="rounded-[var(--radius)]">
          {initialsFor(trader.name)}
        </AvatarFallback>
      </Avatar>
      <span>
        <span className="ca-h2 block">{trader.name}</span>
        <span className="ca-help block">{trader.strategy}</span>
      </span>
    </span>
  );
}

function TraderMetrics({ trader }: { trader: TraderView }) {
  return (
    <>
      <KeyValueList
        className="ca-trader-metrics"
        items={[
          {
            label: `Accuracy · ${trader.accuracy.period ?? "Period not supplied"}`,
            value:
              trader.accuracy.value === null
                ? "Not available"
                : `${trader.accuracy.value}%`,
            help: trader.accuracy.method ?? "Method not supplied",
          },
          {
            label: "Closed trades",
            value:
              trader.accuracy.wins !== null && trader.accuracy.losses !== null
                ? `${trader.accuracy.wins} wins / ${trader.accuracy.losses} losses`
                : "Not available",
          },
          { label: "Copiers", value: formatCount(trader.copiers) },
          {
            label: "Rating",
            value:
              trader.rating.value === null
                ? "Not available"
                : `${trader.rating.value} / 5 · ${formatCount(trader.rating.reviews)} reviews`,
          },
          {
            label: "Drawdown",
            value:
              trader.drawdown.value === null
                ? "Not available"
                : `${trader.drawdown.value}%`,
            help: trader.drawdown.method ?? undefined,
          },
          {
            label: "Risk",
            value: trader.risk.method
              ? (trader.risk.label ?? "Not available")
              : "Not available",
            help: trader.risk.method ?? undefined,
          },
          {
            label: "Minimum allocation",
            value: trader.minimumAllocation ? (
              <Amount
                value={trader.minimumAllocation.amount}
                unit={trader.minimumAllocation.currency}
              />
            ) : (
              "Not supplied"
            ),
          },
          {
            label: "Fee",
            value: trader.fee
              ? `${trader.fee.percent}% · ${trader.fee.basis}`
              : "Not supplied",
          },
        ]}
      />
      <p className="ca-help">
        {trader.provenance}
        {trader.portraitDisclosure ? ` · ${trader.portraitDisclosure}` : ""}
      </p>
    </>
  );
}

function CopyForm({
  trader,
  capabilities,
}: {
  trader: TraderProfile;
  capabilities: Capabilities;
}) {
  const { actions, mode } = useDashboardActions();
  const operation = useOperation();
  const [amount, setAmount] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [review, setReview] = useState(false);
  const [receipt, setReceipt] = useState<CopyRequestReceipt | null>(null);
  // Without a conversion quote, use only the denomination of the supplied minimum.
  const currency = trader.minimumAllocation?.currency;
  const available =
    capabilities.copyStart.available &&
    trader.executionMode !== "unavailable" &&
    Boolean(currency);
  if (receipt)
    return (
      <div className="flex flex-col items-start gap-4">
        <p role="status" className="ca-body">
          {mode === "preview"
            ? "Copy request simulated."
            : "Copy request submitted."}{" "}
          Reference: {receipt.reference}
        </p>
        <StatusBadge status={receipt.status} domain="allocation" />
        <ActionLink href={`/dashboard/copy-trades/${receipt.allocationId}`}>
          View allocation
        </ActionLink>
      </div>
    );
  return (
    <>
      <form
        className="ca-touch flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (available && acknowledged) setReview(true);
        }}
      >
        <p className="ca-body">
          Execution:{" "}
          {trader.executionMode === "manual-allocation"
            ? "Manual allocation — not automatic exchange execution"
            : trader.executionMode === "exchange-execution"
              ? "Exchange execution"
              : "Not connected"}
        </p>
        <Label htmlFor="copy-amount">
          Allocation amount {currency && `(${currency})`}
        </Label>
        <Input
          id="copy-amount"
          inputMode="decimal"
          required
          value={amount}
          disabled={!available}
          onChange={(e) => setAmount(e.target.value)}
          aria-invalid={Boolean(operation.fieldErrors.amount)}
          aria-describedby={
            operation.fieldErrors.amount ? operation.errorId : undefined
          }
        />
        <p className="ca-help">
          {currency
            ? `Source ledger: ${currency}. No currency conversion is performed.`
            : "An allocation denomination has not been supplied."}
        </p>
        <div className="flex items-start gap-3 py-2">
          <Checkbox
            id="copy-risk"
            checked={acknowledged}
            onCheckedChange={(v) => setAcknowledged(v === true)}
            disabled={!available}
          />
          <Label htmlFor="copy-risk" className="leading-5">
            I understand that capital is at risk and past performance does not
            guarantee future returns.
          </Label>
        </div>
        <Button
          type="submit"
          disabled={!available || !acknowledged || operation.busy}
        >
          Review copy request
        </Button>
        {!available && (
          <p className="ca-help">
            {capabilities.copyStart.reason ??
              "Copy execution or allocation terms are not connected."}
          </p>
        )}
        {!review && operation.feedback}
      </form>
      <ConfirmDialog
        open={review}
        onOpenChange={setReview}
        title={`Copy ${trader.name}?`}
        description="Review the allocation and charges. The service determines when funds are reserved. Stopping an allocation does not imply an immediate sale or withdrawal."
        confirmLabel={
          mode === "preview" ? "Simulate copy request" : "Start copying"
        }
        busy={operation.busy}
        details={[
          {
            label: "Allocation",
            value: currency ? (
              <Amount value={amount} unit={currency} exact />
            ) : (
              "Not available"
            ),
          },
          {
            label: "Fee basis",
            value: trader.fee
              ? `${trader.fee.percent}% · ${trader.fee.basis}`
              : "Not supplied",
          },
          { label: "Execution", value: trader.executionMode },
        ]}
        onConfirm={async () => {
          if (!currency) return;
          await operation.run(
            () =>
              actions.requestCopy(trader.id, {
                currency,
                amount,
                executionMode: trader.executionMode,
                riskAcknowledged: acknowledged,
              }),
            "Copy request submitted.",
            (value) => {
              setReceipt(value);
              setReview(false);
            },
          );
        }}
      >
        {operation.feedback}
      </ConfirmDialog>
    </>
  );
}

export function Traders({
  data,
  detail = false,
  retry,
}: {
  data: ScreenData;
  detail?: boolean;
  retry?: () => void;
}) {
  const { q, change } = useFilters();
  const [search, setSearch] = useState(q?.get("search") ?? "");
  return (
    <>
      <PageHeading
        title={detail ? "Trader profile" : "Discover traders"}
        subtitle="Compare strategies and their reported performance before allocating funds."
      />
      <div className="ca-sections">
        {detail ? (
          <Region name="Trader" value={data.trader} retry={retry}>
            {(trader) => (
              <>
                <div className="ca-split-8-4">
                  <Panel title={<TraderIdentity trader={trader} />}>
                    <p className="ca-body">{trader.description}</p>
                    <TraderMetrics trader={trader} />
                    <h3 className="ca-h3">Approach</h3>
                    <ul className="list-disc ps-4 ca-body space-y-2">
                      {trader.approach.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </Panel>
                  <Panel title="Copy trader" id="copy">
                    <CopyForm
                      trader={trader}
                      capabilities={data.capabilities}
                    />
                    <Region
                      name="Funding balances"
                      value={data.assets}
                      retry={retry}
                    >
                      {(assets) => (
                        <PanelRows>
                          {assets
                            .filter(
                              (asset) =>
                                asset.currency ===
                                trader.minimumAllocation?.currency,
                            )
                            .map((asset) => (
                              <PanelRow key={asset.currency}>
                                <p className="ca-help">
                                  Available {asset.currency}
                                </p>
                                <Amount
                                  value={asset.available}
                                  unit={asset.currency}
                                  exact
                                />
                              </PanelRow>
                            ))}
                        </PanelRows>
                      )}
                    </Region>
                  </Panel>
                </div>
                <Panel title="Performance history">
                  {trader.history ? (
                    <HistoryChart history={trader.history} />
                  ) : (
                    <p className="ca-body">
                      No performance history has been supplied.
                    </p>
                  )}
                </Panel>
                {trader.activity && (
                  <Panel title="Reported activity" bleed>
                    <ActivityTable rows={trader.activity} />
                  </Panel>
                )}
              </>
            )}
          </Region>
        ) : (
          <>
            <form
              className="flex flex-wrap items-end gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                change({ search });
              }}
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="trader-search">Search traders</Label>
                <Input
                  id="trader-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name or strategy"
                />
              </div>
              <Button type="submit" variant="outline" size="lg">
                Search
              </Button>
              <Choice
                label="Sort by"
                value={q?.get("sort") ?? "name"}
                onChange={(sort) => change({ sort })}
                options={[
                  { value: "name", label: "Name" },
                  { value: "copiers", label: "Copiers" },
                  { value: "accuracy", label: "Reported accuracy" },
                ]}
              />
            </form>
            <Region name="Traders" value={data.traders} retry={retry}>
              {(traders) =>
                traders.length ? (
                  <div className="ca-trader-grid">
                    {traders.map((trader) => (
                      <Panel
                        key={trader.id}
                        title={<TraderIdentity trader={trader} />}
                        footer={
                          <div className="flex flex-wrap gap-2">
                            <ActionLink
                              href={`/dashboard/traders/${trader.id}`}
                            >
                              View trader
                            </ActionLink>
                            <ActionLink
                              href={`/dashboard/traders/${trader.id}#copy`}
                              primary
                            >
                              Copy trader
                            </ActionLink>
                          </div>
                        }
                      >
                        <TraderMetrics trader={trader} />
                      </Panel>
                    ))}
                  </div>
                ) : (
                  <p className="ca-body">No traders match your search.</p>
                )
              }
            </Region>
          </>
        )}
        <p className="ca-help">
          Reported accuracy is not a promised return or a verification badge.
          Cryptocurrency trading can result in loss of capital.
        </p>
      </div>
    </>
  );
}

export function Allocations({
  data,
  detail = false,
  retry,
}: {
  data: ScreenData;
  detail?: boolean;
  retry?: () => void;
}) {
  const { actions, mode } = useDashboardActions();
  const operation = useOperation();
  const [action, setAction] = useState<AllocationAction | null>(null);
  return (
    <>
      <PageHeading
        title={detail ? "Allocation details" : "My copy trades"}
        subtitle="Track allocations, recorded outcomes, and pending changes."
        actions={
          <ActionLink href="/dashboard/traders">Discover traders</ActionLink>
        }
      />
      <div className="ca-sections">
        {detail ? (
          <Region name="Allocation" value={data.allocation} retry={retry}>
            {(allocation) => (
              <>
                <Panel
                  title={allocation.traderName}
                  action={
                    <StatusBadge
                      status={allocation.status}
                      domain="allocation"
                    />
                  }
                >
                  <KeyValueList
                    layout="inline"
                    items={[
                      {
                        label: "Allocated",
                        value: (
                          <Amount
                            value={allocation.allocated.amount}
                            unit={allocation.allocated.currency}
                            exact
                          />
                        ),
                      },
                      {
                        label: "Execution mode",
                        value: allocation.executionMode,
                      },
                      {
                        label: "Recorded P/L",
                        value: (
                          <Amount
                            value={allocation.recordedPnl?.amount ?? null}
                            unit={
                              allocation.recordedPnl?.currency ??
                              allocation.allocated.currency
                            }
                            sign
                          />
                        ),
                        help: allocation.recordedPnl?.method,
                      },
                      {
                        label: "Updated",
                        value: formatDateTime(allocation.updatedAt),
                      },
                    ]}
                  />
                  {allocation.pendingOperation && (
                    <p role="status">
                      {allocation.pendingOperation.kind} requested ·{" "}
                      {formatDateTime(allocation.pendingOperation.since)}
                    </p>
                  )}
                  <div className="ca-touch flex flex-wrap gap-2">
                    {allocation.permittedActions.map((value) => (
                      <Button
                        key={value}
                        variant="outline"
                        disabled={
                          operation.busy || Boolean(allocation.pendingOperation)
                        }
                        onClick={() => setAction(value)}
                      >
                        {value === "pause"
                          ? "Pause allocation"
                          : value === "resume"
                            ? "Resume allocation"
                            : "Stop allocation"}
                      </Button>
                    ))}
                  </div>
                  {operation.feedback}
                </Panel>
                <Panel title="Fees and timeline">
                  <KeyValueList
                    items={allocation.fees.map((fee) => ({
                      label: fee.label,
                      value: (
                        <Amount value={fee.amount} unit={fee.currency} exact />
                      ),
                    }))}
                  />
                  <ol className="space-y-4">
                    {allocation.timeline.map((item, i) => (
                      <li key={i}>
                        <p className="ca-body">{item.label}</p>
                        <p className="ca-help">{formatDateTime(item.at)}</p>
                      </li>
                    ))}
                  </ol>
                </Panel>
                <Panel title="Allocation activity" bleed>
                  <ActivityTable rows={allocation.activity} />
                </Panel>
                <ConfirmDialog
                  open={Boolean(action)}
                  onOpenChange={(open) => {
                    if (!open) setAction(null);
                  }}
                  title={`${action ?? "Change"} allocation with ${allocation.traderName}?`}
                  description={
                    action === "stop"
                      ? allocation.stopExplanation
                      : "This requests a change to the allocation state. Existing positions and committed funds follow the service's execution rules."
                  }
                  confirmLabel={`${mode === "preview" ? "Simulate " : "Confirm "}${action ?? "change"}`}
                  destructive={action === "stop"}
                  busy={operation.busy}
                  onConfirm={async () => {
                    if (!action) return;
                    await operation.run(
                      () =>
                        action === "pause"
                          ? actions.pauseAllocation(allocation.id)
                          : action === "resume"
                            ? actions.resumeAllocation(allocation.id)
                            : actions.stopAllocation(allocation.id),
                      "Allocation updated.",
                      () => setAction(null),
                    );
                  }}
                >
                  {operation.feedback}
                </ConfirmDialog>
              </>
            )}
          </Region>
        ) : (
          <Panel title="Your allocations">
            <Region name="Allocations" value={data.allocations} retry={retry}>
              {(rows) => (
                <PanelRows>
                  {rows.map((row) => (
                    <PanelRow
                      key={row.id}
                      trailing={
                        <StatusBadge status={row.status} domain="allocation" />
                      }
                    >
                      <DashboardLink
                        href={`/dashboard/copy-trades/${row.id}`}
                        className="ca-h3 underline underline-offset-4"
                      >
                        {row.traderName}
                      </DashboardLink>
                      <Amount
                        value={row.allocated.amount}
                        unit={row.allocated.currency}
                      />
                      <p className="ca-help">
                        {row.executionMode} · Updated{" "}
                        {formatDateTime(row.updatedAt)}
                      </p>
                    </PanelRow>
                  ))}
                </PanelRows>
              )}
            </Region>
          </Panel>
        )}
      </div>
    </>
  );
}

function SignalFeedList({
  signals,
  emptyText,
}: {
  signals: SignalView[];
  emptyText: string;
}) {
  if (signals.length === 0) {
    return <p className="ca-body py-4 text-muted-foreground">{emptyText}</p>;
  }

  return (
    <PanelRows>
      {signals.map((signal) => {
        const isLong = signal.direction === "long";
        const isShort = signal.direction === "short";
        const directionColor = isLong
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
          : isShort
            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
            : "bg-muted text-muted-foreground border-border";

        const directionLabel = isLong
          ? "BUY / LONG"
          : isShort
            ? "SELL / SHORT"
            : "WATCH / NEUTRAL";

        return (
          <PanelRow key={signal.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="font-semibold text-foreground">{signal.market}</span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold",
                    directionColor,
                  )}
                >
                  {directionLabel}
                </span>
              </div>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  signal.expired
                    ? "bg-muted text-muted-foreground"
                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                )}
              >
                {signal.expired ? "Expired" : "Active Signal"}
              </span>
            </div>
            <p className="ca-body font-medium text-foreground mt-2">{signal.summary}</p>
            <p className="ca-help text-xs">
              {signal.source} · Published {formatDateTime(signal.publishedAt)} · Expires:{" "}
              {signal.expiresAt ? formatDateTime(signal.expiresAt) : "Open"}
            </p>
            <details className="group mt-2">
              <summary className="ca-body cursor-pointer text-sm font-medium text-primary hover:underline">
                Market Analysis & Setup Details
              </summary>
              <div className="mt-2 rounded-lg bg-muted/40 p-3 text-sm leading-relaxed text-foreground/90 whitespace-pre-line border border-border/50">
                {signal.detail}
              </div>
            </details>
          </PanelRow>
        );
      })}
    </PanelRows>
  );
}

export function Signals({
  data,
  retry,
}: {
  data: ScreenData;
  retry?: () => void;
}) {
  return (
    <>
      <PageHeading
        title="Signals"
        subtitle="Institutional research desk market observations and setups. Signals are analytical intelligence, not guaranteed orders."
      />
      <Panel title="Institutional Signal Feed">
        <Region name="Signals" value={data.signals} retry={retry}>
          {(feed) =>
            !feed.entitled ? (
              <div className="space-y-4 py-2">
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center gap-2 rounded-md bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                        Institutional Research Locked
                      </div>
                      <h3 className="text-base font-semibold text-foreground">
                        Funded Account or Copy Allocation Required
                      </h3>
                      <p className="max-w-xl text-sm text-muted-foreground">
                        {feed.entitlementReason ??
                          "Institutional trading signals require a funded deposit or active copy-trade allocation."}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Button asChild size="sm">
                        <DashboardLink href="/dashboard/deposit">Deposit Funds</DashboardLink>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <DashboardLink href="/dashboard/traders">Copy Traders</DashboardLink>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
                  <p className="ca-help text-xs">
                    Source: <span className="font-medium text-foreground">{feed.source ?? "Institutional Desk"}</span>
                  </p>
                </div>
                <Tabs defaultValue="active" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="active">
                      Active Signals ({feed.signals.filter((s) => !s.expired).length})
                    </TabsTrigger>
                    <TabsTrigger value="history">
                      Signal History ({feed.signals.filter((s) => s.expired).length})
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="active">
                    <SignalFeedList
                      signals={feed.signals.filter((s) => !s.expired)}
                      emptyText="No active signals currently open. Research desk updates post as trade setups meet institutional criteria."
                    />
                  </TabsContent>
                  <TabsContent value="history">
                    <SignalFeedList
                      signals={feed.signals.filter((s) => s.expired)}
                      emptyText="No archived or expired signals on record."
                    />
                  </TabsContent>
                </Tabs>
              </div>
            )
          }
        </Region>
      </Panel>
    </>
  );
}

