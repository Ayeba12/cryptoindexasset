/**
 * Fixture scenario catalogue (ids and labels only).
 *
 * The scenario ids and the fixed clock are frozen after Stage A. Stage D
 * fills in the data behind each id under `lib/dashboard/fixtures/`. Fixtures
 * are development-only: no production route can select one.
 */

/** Every fixture scenario id. */
export type ScenarioId =
  | "funded"
  | "empty"
  | "partial-support"
  | "no-quotes"
  | "pending-withdrawal"
  | "allocation-no-execution"
  | "trader-missing-metrics"
  | "signals-disabled"
  | "mfa-not-enabled"
  | "verification-in-review"
  | "read-error"
  | "write-failure"
  | "unknown-outcome"
  | "long-values"
  | "large-amounts"
  | "losing-outcome";

/** One scenario entry for the preview toolbar. */
export interface Scenario {
  id: ScenarioId;
  /** Short label for the scenario select. */
  label: string;
  /** What the scenario demonstrates. */
  description: string;
}

/** Fixed clock every fixture timestamp is relative to. */
export const FIXTURE_CLOCK = "2026-09-06T12:00:00Z";

/** Scenario selected when the preview has no `?scenario=` parameter. */
export const DEFAULT_SCENARIO_ID: ScenarioId = "funded";

/** Scenario catalogue in toolbar order. */
export const SCENARIOS: readonly Scenario[] = [
  { id: "funded", label: "Funded account", description: "Six assets with balances, recorded outcomes, allocations, signals and notifications." },
  { id: "empty", label: "New empty account", description: "Enabled zero wallets, no activity, no allocations and nothing pending." },
  { id: "partial-support", label: "Partially unsupported currencies", description: "LTC and XRP networks are not configured; other assets stay usable." },
  { id: "no-quotes", label: "Missing price feed", description: "Balances are ready but no fiat estimate can be produced." },
  { id: "pending-withdrawal", label: "Pending and declined withdrawals", description: "A withdrawal in review, a declined request with its reason and a cancelled request." },
  { id: "allocation-no-execution", label: "Allocation without execution service", description: "Copy trades exist but no start, pause or stop contract is available." },
  { id: "trader-missing-metrics", label: "Missing trader metrics", description: "Some traders lack rating, drawdown or risk methodology." },
  { id: "signals-disabled", label: "Signals not entitled", description: "The account cannot view signals; the page explains why." },
  { id: "mfa-not-enabled", label: "MFA not enabled", description: "Security shows Not enabled with enrollment available." },
  { id: "verification-in-review", label: "Verification in review", description: "Two documents submitted; the review has not concluded." },
  { id: "read-error", label: "Read error", description: "Assets, activity and valuation fail to load with Retry." },
  { id: "write-failure", label: "Write failure", description: "Every action fails and reports the failure in place." },
  { id: "unknown-outcome", label: "Unknown submission outcome", description: "A withdrawal times out and is reconciled by its idempotency key." },
  { id: "long-values", label: "Long names and addresses", description: "A 42-character name, an 88-character address and a large exact balance." },
  { id: "large-amounts", label: "Large amounts", description: "Large USDT totals that must wrap rather than clip." },
  { id: "losing-outcome", label: "Losing recorded outcome", description: "A recorded loss with explicit sign and label." },
];

/** Every scenario id in catalogue order. */
export const SCENARIO_IDS: readonly ScenarioId[] = SCENARIOS.map((scenario) => scenario.id);

/** Type guard for {@link ScenarioId}. */
export function isScenarioId(value: unknown): value is ScenarioId {
  return typeof value === "string" && (SCENARIO_IDS as readonly string[]).includes(value);
}

/** The scenario for an id, or the default scenario when the id is unknown. */
export function scenarioFor(id: unknown): Scenario {
  const found = isScenarioId(id) ? SCENARIOS.find((scenario) => scenario.id === id) : undefined;
  return found ?? SCENARIOS.find((scenario) => scenario.id === DEFAULT_SCENARIO_ID)!;
}
