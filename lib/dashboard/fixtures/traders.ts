/**
 * Operator-approved trader profiles for the customer design preview.
 *
 * These are the same six profiles used by the admin preview and public site.
 * Fields that were not supplied stay absent instead of being invented.
 */

import type { ExecutionMode, TraderMetric, TraderProfile, TraderView, ValuationHistory } from "../contracts";
import { APPROVED_CONTENT_DATE, APPROVED_TRADERS } from "@/lib/content/approved-people";
import { fromUnits } from "../money";
import { atDay } from "./clock";
import type { ScenarioId } from "./scenarios";

/** Disclosure text from the community portrait provenance files. */
export const PORTRAIT_DISCLOSURE = "Profile portrait supplied and approved by the platform operator.";

/** Provenance label attached to every fixture trader. */
export const TRADER_PROVENANCE = `Operator-approved profile · ${APPROVED_CONTENT_DATE}; performance not independently measured`;

const ACCURACY_PERIOD = "90 days, closed trades";
const ACCURACY_METHOD = "Winning closed trades divided by all closed trades (fixture)";
const DRAWDOWN_METHOD = "Peak-to-trough decline of recorded allocation value over 90 days (fixture)";
const RISK_METHOD = "Fixture banding by 90-day drawdown: Low under 5%, Medium 5% to 15%, High above 15%";

interface TraderSeed {
  slug: string;
  name: string;
  strategy: string;
  description: string;
  approach: string[];
  wins: number;
  losses: number;
  copiers: number;
  rating: number;
  reviews: number;
  drawdown: string;
  risk: "Low" | "Medium" | "High";
  minimum: string;
  feePercent: string;
}

const SEEDS: TraderSeed[] = [
  {
    slug: "alex-morgan",
    name: "Alex Morgan",
    strategy: "BTC and ETH swing positions held for 3 to 10 days",
    description:
      "Trades the two largest assets on weekly structure, adding on confirmed breaks and cutting positions that fail within two sessions.",
    approach: ["Two assets only: BTC and ETH", "Position size capped at 20% of the allocation", "No leverage"],
    wins: 42,
    losses: 18,
    copiers: 128,
    rating: 4.6,
    reviews: 37,
    drawdown: "-8.40",
    risk: "Medium",
    minimum: "100.000000",
    feePercent: "15.00",
  },
  {
    slug: "maya-chen",
    name: "Maya Chen",
    strategy: "Intraday range trading on major pairs",
    description: "Works defined ranges on BTC, ETH and LTC with fixed targets and a hard daily loss limit.",
    approach: ["Closes every position before the daily settlement", "Daily loss limit of 1.5% of the allocation"],
    wins: 69,
    losses: 23,
    copiers: 96,
    rating: 4.4,
    reviews: 21,
    drawdown: "-4.20",
    risk: "Low",
    minimum: "50.000000",
    feePercent: "12.00",
  },
  {
    slug: "daniel-okafor",
    name: "Daniel Okafor",
    strategy: "Momentum entries on large caps with a weekly review",
    description: "Enters strong weekly trends on large-cap assets and reviews every position on Monday.",
    approach: ["Up to four open positions", "Weekly review and rebalancing"],
    wins: 27,
    losses: 23,
    copiers: 44,
    rating: 3.9,
    reviews: 12,
    drawdown: "-19.60",
    risk: "High",
    minimum: "200.000000",
    feePercent: "20.00",
  },
  {
    slug: "elena-rossi",
    name: "Elena Rossi",
    strategy: "Long-only accumulation with monthly rebalancing",
    description: "Accumulates BTC and ETH on a schedule and rebalances once a month; no short positions.",
    approach: ["Scheduled purchases", "Monthly rebalancing to target weights"],
    wins: 19,
    losses: 6,
    copiers: 210,
    rating: 4.8,
    reviews: 64,
    drawdown: "-6.10",
    risk: "Medium",
    minimum: "100.000000",
    feePercent: "10.00",
  },
  {
    slug: "leila-hassan",
    name: "Leila Hassan",
    strategy: "ETH ecosystem rotation held for 2 to 4 weeks",
    description: "Rotates between ETH and USDT depending on network activity, holding each position for several weeks.",
    approach: ["ETH and USDT only", "One position at a time"],
    wins: 24,
    losses: 16,
    copiers: 58,
    rating: 4.1,
    reviews: 9,
    drawdown: "-11.30",
    risk: "Medium",
    minimum: "150.000000",
    feePercent: "15.00",
  },
  {
    slug: "sam-rivera",
    name: "Sam Rivera",
    strategy: "Conservative BTC accumulation with a quarterly review",
    description: "Buys BTC on a fixed schedule and reviews the plan each quarter; rarely sells.",
    approach: ["BTC only", "Quarterly review"],
    wins: 8,
    losses: 2,
    copiers: 305,
    rating: 4.7,
    reviews: 88,
    drawdown: "-3.80",
    risk: "Low",
    minimum: "100.000000",
    feePercent: "8.00",
  },
];

/** Trader id for a persona slug. */
export function traderId(slug: string): string {
  return `trader-${slug}`;
}

/** Percentage of `part` in `total` at two decimals, half-up, without floats. */
export function percentOf(part: number, total: number): string {
  if (total <= 0) return "0.00";
  const scaled = BigInt(part) * BigInt(10000);
  const divisor = BigInt(total);
  let quotient = scaled / divisor;
  const remainder = scaled % divisor;
  if (remainder * BigInt(2) >= divisor) quotient += BigInt(1);
  return fromUnits(quotient, 2);
}

/** Personas whose optional metrics are missing in `trader-missing-metrics`. */
const MISSING_METRICS: Record<string, Array<"rating" | "drawdown" | "risk">> = {
  "leila-hassan": ["rating", "drawdown", "risk"],
  "daniel-okafor": ["drawdown"],
  "sam-rivera": ["risk"],
};

function unavailableMetric(): TraderMetric {
  return { value: null, period: null, method: null };
}

function viewFor(seed: TraderSeed, scenarioId: ScenarioId): TraderView {
  const missing = scenarioId === "trader-missing-metrics" ? MISSING_METRICS[seed.slug] ?? [] : [];
  return {
    id: traderId(seed.slug),
    name: seed.name,
    portrait: `/images/community/${seed.slug}.webp`,
    portraitDisclosure: PORTRAIT_DISCLOSURE,
    strategy: seed.strategy,
    accuracy: {
      value: percentOf(seed.wins, seed.wins + seed.losses),
      period: ACCURACY_PERIOD,
      method: ACCURACY_METHOD,
      wins: seed.wins,
      losses: seed.losses,
    },
    copiers: seed.copiers,
    rating: missing.includes("rating") ? { value: null, reviews: null } : { value: seed.rating, reviews: seed.reviews },
    drawdown: missing.includes("drawdown")
      ? unavailableMetric()
      : { value: seed.drawdown, period: "90 days", method: DRAWDOWN_METHOD },
    risk: missing.includes("risk") ? { label: null, method: null } : { label: seed.risk, method: RISK_METHOD },
    minimumAllocation: { amount: seed.minimum, currency: "USDT" },
    fee: { percent: seed.feePercent, basis: "of recorded outcomes" },
    provenance: TRADER_PROVENANCE,
  };
}

/** Recorded allocation value for Alex Morgan (alloc-0001) built from its recorded outcomes. */
function alexHistory(): ValuationHistory {
  return {
    period: "90D",
    points: [
      { at: atDay(-40, 12), value: "250.00" },
      { at: atDay(-25, 16), value: "280.00" },
      { at: atDay(-18, 16), value: "320.00" },
      { at: atDay(-11, 16), value: "340.00" },
      { at: atDay(-4, 16), value: "370.00" },
      { at: atDay(0, 12), value: "370.00" },
    ],
    summary:
      "Recorded allocation value moved from 250.00 USD to 370.00 USD over 40 days (recorded outcomes before copy fees, fixture).",
    source: "Ledger: recorded copy-trade outcomes (fixture)",
  };
}

/** Execution mode for a scenario. */
export function executionModeFor(scenarioId: ScenarioId): ExecutionMode {
  return scenarioId === "allocation-no-execution" ? "unavailable" : "manual-allocation";
}

/** Every persona as a full profile (activity is filled by the store from the ledger). */
export function buildTraders(scenarioId: ScenarioId): TraderProfile[] {
  const executionMode = executionModeFor(scenarioId);
  return APPROVED_TRADERS.map((trader, index) => {
    const preview = SEEDS[index];
    const base = viewFor(preview, scenarioId);
    const metricMissing = scenarioId === "trader-missing-metrics" && index === 4;
    return {
      ...base,
      name: trader.name,
      portrait: trader.avatar,
      portraitDisclosure: PORTRAIT_DISCLOSURE,
      strategy: `${trader.strategy} · ${trader.assets}`,
      accuracy: metricMissing
        ? { value: null, period: null, method: null, wins: null, losses: null }
        : {
            value: trader.accuracy.toFixed(1),
            period: "Reporting period not supplied",
            method: `Approved operator submission · ${APPROVED_CONTENT_DATE}`,
            wins: null,
            losses: null,
          },
      copiers: trader.copiers,
      rating: metricMissing
        ? { value: null, reviews: null }
        : { value: trader.rating, reviews: null },
      description: `${trader.strategy} profile covering ${trader.assets}. Additional execution and risk details have not been supplied.`,
      approach: [
        `Strategy: ${trader.strategy}`,
        `Markets: ${trader.assets}`,
        "Review the full risk and execution terms before allocating funds.",
      ],
      history: index === 0 && scenarioId !== "trader-missing-metrics" ? alexHistory() : null,
      activity: null,
      executionMode,
    };
  });
}
