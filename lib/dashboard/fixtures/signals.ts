/**
 * Signal feed fixtures. Every signal names its source and timestamps; an
 * expired signal is marked expired and cannot start an action. Nothing here
 * is derived from prices, chart slopes or randomness.
 */

import type { SignalsFeed, SignalView } from "../contracts";
import { FIXTURE_NETWORKS } from "./accounts";
import { atDay, isPast, FIXTURE_CLOCK } from "./clock";
import type { ScenarioId } from "./scenarios";

/** Source label of the fixture feed. */
export const SIGNAL_SOURCE = "Operator desk (fixture)";

function signal(
  id: string,
  asset: SignalView["asset"],
  networkId: string | null,
  direction: SignalView["direction"],
  publishedDay: number,
  expiresDay: number | null,
  summary: string,
  detail: string,
): SignalView {
  const network = asset && networkId ? FIXTURE_NETWORKS[asset].find((entry) => entry.id === networkId) ?? null : null;
  const expiresAt = expiresDay === null ? null : atDay(expiresDay, 12);
  return {
    id,
    source: SIGNAL_SOURCE,
    market: asset ? `${asset}/USD` : "Market note",
    asset,
    network,
    direction,
    publishedAt: atDay(publishedDay, 8),
    expiresAt,
    expired: isPast(expiresAt, FIXTURE_CLOCK),
    summary,
    detail,
  };
}

/** Signals feed for a scenario. */
export function buildSignals(scenarioId: ScenarioId): SignalsFeed {
  if (scenarioId === "signals-disabled") {
    return {
      entitled: false,
      entitlementReason: "Signals are not enabled for this account. Contact support if you expected access.",
      source: null,
      signals: [],
    };
  }
  if (scenarioId === "empty") {
    return { entitled: true, source: SIGNAL_SOURCE, signals: [] };
  }
  return {
    entitled: true,
    source: SIGNAL_SOURCE,
    signals: [
      signal(
        "sig-0001",
        "BTC",
        "bitcoin",
        "long",
        -1,
        2,
        "BTC: weekly structure holds above the prior range high",
        "The desk notes that BTC closed the week above its previous range high with rising spot volume. This note is informational and expires in two days. It is not a recommendation and does not execute anything.",
      ),
      signal(
        "sig-0002",
        "ETH",
        "ethereum",
        "neutral",
        -3,
        4,
        "ETH: no directional view while the range holds",
        "ETH remains inside the range observed for the last three weeks. The desk has no directional view until a daily close outside that range.",
      ),
      signal(
        "sig-0003",
        "XRP",
        "xrp-ledger",
        "short",
        -10,
        -3,
        "XRP: failed retest of the monthly level",
        "This note expired three days ago and is kept for the record. Expired notes cannot start any action.",
      ),
    ],
  };
}
