"use client";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ValuationHistory } from "@/lib/dashboard/contracts";
import { formatDate, formatDateTime } from "@/lib/dashboard/format";
import { Amount } from "../amount";

export function HistoryChart({ history }: { history: ValuationHistory }) {
  const [table, setTable] = useState(false);
  // Floating point is ONLY a chart-coordinate projection. Exact balances and tooltips retain the source string.
  const points = history.points
    .map((point) => ({ ...point, plot: Number(point.value) }))
    .filter((point) => Number.isFinite(point.plot));
  if (points.length < 2)
    return (
      <p className="ca-body py-12">
        Account history will appear here after at least two recorded values.
      </p>
    );
  return (
    <>
      <div
        className="h-56 min-w-0 md:h-80"
        role="img"
        aria-label={history.summary}
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 640, height: 320 }}
        >
          <AreaChart
            data={points}
            margin={{ top: 16, right: 8, bottom: 0, left: 8 }}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="at"
              tickFormatter={formatDate}
              minTickGap={60}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              width={52}
              tickFormatter={(value) =>
                new Intl.NumberFormat("en", { notation: "compact" }).format(
                  value,
                )
              }
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.[0] ? (
                  <div className="rounded-lg border border-border bg-popover p-3 text-popover-foreground">
                    <p className="ca-help">
                      {formatDateTime(payload[0].payload.at)}
                    </p>
                    <Amount value={payload[0].payload.value} unit="USD" exact />
                  </div>
                ) : null
              }
            />
            <Area
              type="linear"
              dataKey="plot"
              stroke="var(--chart-1)"
              fill="var(--chart-1)"
              fillOpacity={0.08}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="ca-help">
        {history.summary} Source: {history.source}. Changes include deposits and
        withdrawals; they are not investment returns.
      </p>
      <Button
        variant="outline"
        size="lg"
        onClick={() => setTable(!table)}
        aria-expanded={table}
      >
        {" "}
        {table ? "Hide" : "Show"} chart data
      </Button>
      {table && (
        <div
          className="ca-table-region"
          tabIndex={0}
          aria-label="Account value history"
        >
          <Table className="ca-table">
            <TableHeader>
              <TableRow>
                <TableHead>Date (UTC)</TableHead>
                <TableHead>Estimated value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.points.map((point) => (
                <TableRow key={point.at}>
                  <TableCell>{formatDateTime(point.at)}</TableCell>
                  <TableCell>
                    <Amount value={point.value} unit="USD" exact />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
