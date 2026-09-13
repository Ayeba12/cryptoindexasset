/**
 * Fixture quotes. Fixed prices used only to derive USD estimates in the
 * design preview. They are labelled as fixtures everywhere they appear and
 * never presented as live prices.
 */

import type { DecimalString, Quote, SupportedCrypto } from "../contracts";
import { FIXTURE_CLOCK } from "./clock";

/** Quote source label shown next to every fixture estimate. */
export const FIXTURE_QUOTE_SOURCE = "Fixture quotes, not live prices";

/** Price of one unit in USD per asset. */
export const FIXTURE_PRICES: Record<SupportedCrypto, DecimalString> = {
  BTC: "60000.00",
  ETH: "2500.00",
  BCH: "300.00",
  LTC: "80.00",
  XRP: "0.50",
  USDT: "1.00",
};

/** Quotes with their timestamp (the fixture clock). */
export function fixtureQuotes(): Quote[] {
  return (Object.keys(FIXTURE_PRICES) as SupportedCrypto[]).map((currency) => ({
    currency,
    price: FIXTURE_PRICES[currency],
    quotedAt: FIXTURE_CLOCK,
  }));
}
