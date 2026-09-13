/**
 * Account-value history derived from holdings and fixture quotes.
 *
 * For each day in the period the holdings are reconstructed from the current
 * totals by reversing the approved ledger rows that happened after that day
 * (deposits, withdrawals, credits in a crypto currency). Each point is the
 * sum of holdings × fixed fixture price, computed with `money.ts`. Deposits
 * therefore appear as steps; nothing rises on its own and no point is
 * investment profit.
 */

import {
  SUPPORTED_CRYPTO,
  isSupportedCrypto,
  type DecimalString,
  type SupportedCrypto,
  type TransactionView,
  type ValuationHistory,
  type ValuationPeriod,
  type ValuationPoint,
} from "../contracts";
import { formatAmount } from "../format";
import { add, multiplyByDecimal, subtract, sum, toFixed } from "../money";
import { atDay } from "./clock";
import { FIXTURE_PRICES, FIXTURE_QUOTE_SOURCE } from "./quotes";

/** Number of days covered by each period (points are inclusive of both ends). */
export const PERIOD_DAYS: Record<ValuationPeriod, number> = { "7D": 7, "30D": 30, "90D": 90 };

/** USD estimate of a set of holdings at the fixture prices, two decimals, half-up. */
export function estimateUsd(holdings: Partial<Record<SupportedCrypto, DecimalString | null>>): DecimalString {
  const parts: DecimalString[] = [];
  for (const currency of SUPPORTED_CRYPTO) {
    const units = holdings[currency];
    if (units === undefined || units === null) continue;
    parts.push(multiplyByDecimal(units, FIXTURE_PRICES[currency]));
  }
  return toFixed(sum(parts), 2, "half-up");
}

/** Holdings reconstructed at `atIso` by reversing approved rows created after it. */
export function holdingsAt(
  current: Partial<Record<SupportedCrypto, DecimalString | null>>,
  rows: readonly TransactionView[],
  atIso: string,
): Partial<Record<SupportedCrypto, DecimalString | null>> {
  const result: Partial<Record<SupportedCrypto, DecimalString | null>> = { ...current };
  const cutoff = Date.parse(atIso);
  for (const row of rows) {
    if (row.status !== "APPROVED") continue;
    if (Date.parse(row.createdAt) <= cutoff) continue;
    if (!isSupportedCrypto(row.currency)) continue;
    const currency = row.currency;
    const units = result[currency];
    if (units === undefined || units === null) continue;
    // Reverse the row: a credit after the cutoff was not yet held; a debit was still held.
    result[currency] = row.direction === "credit" ? subtract(units, row.amount) : add(units, row.amount);
  }
  return result;
}

/** History points for a period (inclusive of the clock day). */
export function buildHistoryPoints(
  current: Partial<Record<SupportedCrypto, DecimalString | null>>,
  rows: readonly TransactionView[],
  period: ValuationPeriod,
): ValuationPoint[] {
  const days = PERIOD_DAYS[period];
  const points: ValuationPoint[] = [];
  for (let day = -days; day <= 0; day += 1) {
    const at = atDay(day, 12);
    points.push({ at, value: estimateUsd(holdingsAt(current, rows, at)) });
  }
  return points;
}

/** Full history region data for a period. */
export function buildValuationHistory(
  current: Partial<Record<SupportedCrypto, DecimalString | null>>,
  rows: readonly TransactionView[],
  period: ValuationPeriod,
): ValuationHistory {
  const points = buildHistoryPoints(current, rows, period);
  const first = formatAmount(points[0].value, "USD").full;
  const last = formatAmount(points[points.length - 1].value, "USD").full;
  return {
    period,
    points,
    summary: `Estimated value moved from ${first} to ${last} over ${PERIOD_DAYS[period]} days. Deposits raise the value and are not profit. ${FIXTURE_QUOTE_SOURCE}.`,
    source: FIXTURE_QUOTE_SOURCE,
  };
}
