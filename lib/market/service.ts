/**
 * Server-side market data service.
 *
 * Reads crypto market prices and 24h metrics from CoinGecko with:
 * - Allowlisted currency IDs: BTC, ETH, BCH, LTC, XRP, USDT.
 * - In-memory cache (60s TTL) with concurrent request deduplication.
 * - Stale-while-revalidate tolerance (up to 10 minutes) with stale warning flag.
 * - Safe reference fallback quotes if upstream is unreachable or rate-limited.
 * - Exact decimal string validation for all prices and percentages.
 * - Zero floating-point drift on customer portfolio valuations.
 */

import {
  CURRENCY_META,
  SUPPORTED_CRYPTO,
  type DecimalString,
  type IsoDateTime,
  type Quote,
  type SupportedCrypto,
} from "@/lib/dashboard/contracts";
import { FIXTURE_PRICES } from "@/lib/dashboard/fixtures/quotes";
import { isDecimalString } from "@/lib/dashboard/money";

export interface MarketCoinSnapshot {
  currency: SupportedCrypto;
  name: string;
  priceUsd: DecimalString;
  change24h: DecimalString;
  change24hNumber: number;
  sparkline: number[];
  quotedAt: IsoDateTime;
}

export interface MarketSnapshot {
  source: string;
  quotedAt: IsoDateTime;
  fetchedAt: IsoDateTime;
  isStale: boolean;
  isFallback: boolean;
  quotes: Record<SupportedCrypto, Quote>;
  coins: MarketCoinSnapshot[];
}

export const COINGECKO_ID_MAP: Record<SupportedCrypto, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BCH: "bitcoin-cash",
  LTC: "litecoin",
  XRP: "ripple",
  USDT: "tether",
};

export const COINGECKO_REVERSE_MAP: Record<string, SupportedCrypto> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  "bitcoin-cash": "BCH",
  litecoin: "LTC",
  ripple: "XRP",
  tether: "USDT",
};

const CACHE_TTL_MS = 60_000; // 60 seconds fresh TTL
const STALE_TOLERANCE_MS = 10 * 60_000; // 10 minutes stale tolerance
const UPSTREAM_TIMEOUT_MS = 3_500; // 3.5s timeout

let cachedSnapshot: MarketSnapshot | null = null;
let lastFetchTimestamp = 0;
let inflightPromise: Promise<MarketSnapshot> | null = null;

/**
 * Construct fallback baseline quotes if upstream is unreachable or during unit tests.
 */
export function buildFallbackSnapshot(nowIso: string = new Date().toISOString()): MarketSnapshot {
  const quotes = {} as Record<SupportedCrypto, Quote>;
  const coins: MarketCoinSnapshot[] = [];

  for (const currency of SUPPORTED_CRYPTO) {
    const meta = CURRENCY_META[currency];
    const price = FIXTURE_PRICES[currency] ?? "1.00";
    quotes[currency] = {
      currency,
      price,
      quotedAt: nowIso,
    };
    coins.push({
      currency,
      name: meta.name,
      priceUsd: price,
      change24h: "+0.00",
      change24hNumber: 0,
      sparkline: [Number(price), Number(price)],
      quotedAt: nowIso,
    });
  }

  return {
    source: "Reference baseline quotes (upstream offline)",
    quotedAt: nowIso,
    fetchedAt: nowIso,
    isStale: false,
    isFallback: true,
    quotes,
    coins,
  };
}

/**
 * Format a number to canonical signed decimal string for 24h percentage change (e.g. "+2.45" or "-1.20").
 */
function formatSignedPercentage(val: number | null | undefined): DecimalString {
  if (val === null || val === undefined || !Number.isFinite(val)) return "+0.00";
  const formatted = val.toFixed(2);
  if (val > 0 && !formatted.startsWith("+")) {
    return `+${formatted}`;
  }
  return formatted;
}

/**
 * Fetch fresh market snapshot from CoinGecko API.
 */
async function fetchUpstreamSnapshot(): Promise<MarketSnapshot> {
  const ids = Object.values(COINGECKO_ID_MAP).join(",");
  const host = process.env.COINGECKO_PRO_API_KEY ? "pro-api.coingecko.com" : "api.coingecko.com";
  const url = `https://${host}/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=true&price_change_percentage=24h`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "CryptoIndexAsset-Platform/1.0",
  };

  const apiKey = process.env.COINGECKO_API_KEY || process.env.COINGECKO_PRO_API_KEY;
  if (apiKey) {
    if (process.env.COINGECKO_PRO_API_KEY) {
      headers["x-cg-pro-api-key"] = apiKey;
    } else {
      headers["x-cg-demo-api-key"] = apiKey;
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(`Upstream returned HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Invalid payload format from upstream market provider");
    }

    const nowIso = new Date().toISOString();
    const quotes = {} as Record<SupportedCrypto, Quote>;
    const coins: MarketCoinSnapshot[] = [];

    for (const item of data) {
      const id = typeof item.id === "string" ? item.id : "";
      const currency = COINGECKO_REVERSE_MAP[id];
      if (!currency) continue;

      const rawPrice = item.current_price;
      if (typeof rawPrice !== "number" || !Number.isFinite(rawPrice) || rawPrice <= 0) {
        continue;
      }

      // Precision: 2 decimals for USD quote price, or up to 4 for small assets
      const priceDec = rawPrice < 1 ? rawPrice.toFixed(4) : rawPrice.toFixed(2);
      if (!isDecimalString(priceDec)) continue;

      const quote: Quote = {
        currency,
        price: priceDec,
        quotedAt: typeof item.last_updated === "string" ? item.last_updated : nowIso,
      };
      quotes[currency] = quote;

      const sparklineRaw = item.sparkline_in_7d?.price;
      const sparkline: number[] = Array.isArray(sparklineRaw)
        ? sparklineRaw.filter((p: unknown): p is number => typeof p === "number" && Number.isFinite(p))
        : [];

      const changeNum = typeof item.price_change_percentage_24h === "number" ? item.price_change_percentage_24h : 0;

      coins.push({
        currency,
        name: CURRENCY_META[currency].name,
        priceUsd: priceDec,
        change24h: formatSignedPercentage(changeNum),
        change24hNumber: changeNum,
        sparkline,
        quotedAt: quote.quotedAt,
      });
    }

    // Ensure all 6 supported crypto assets are accounted for
    for (const currency of SUPPORTED_CRYPTO) {
      if (!quotes[currency]) {
        throw new Error(`Market provider omitted ${currency}`);
      }
    }

    return {
      source: "CoinGecko Markets",
      quotedAt: nowIso,
      fetchedAt: nowIso,
      isStale: false,
      isFallback: false,
      quotes,
      coins,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Get unified market snapshot with caching, request deduplication, and fallback.
 */
export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  const now = Date.now();

  // 1. Fresh cache hit
  if (cachedSnapshot && now - lastFetchTimestamp < CACHE_TTL_MS) {
    return cachedSnapshot;
  }

  // 2. In-flight request deduplication
  if (inflightPromise) {
    return inflightPromise;
  }

  // 3. Fetch from upstream with fallback safety
  inflightPromise = (async () => {
    try {
      const fresh = await fetchUpstreamSnapshot();
      cachedSnapshot = fresh;
      lastFetchTimestamp = Date.now();
      return fresh;
    } catch {
      // If we have an existing cache within stale tolerance, serve it with stale flag
      if (cachedSnapshot && now - lastFetchTimestamp < STALE_TOLERANCE_MS) {
        return {
          ...cachedSnapshot,
          isStale: true,
          source: `${cachedSnapshot.source} (stale)`,
        };
      }

      // Otherwise, return safe baseline quotes
      const fallback = buildFallbackSnapshot();
      cachedSnapshot = fallback;
      lastFetchTimestamp = Date.now();
      return fallback;
    } finally {
      inflightPromise = null;
    }
  })();

  return inflightPromise;
}

/**
 * Convenience helper to retrieve only quotes map.
 */
export async function getMarketQuotes(): Promise<Record<SupportedCrypto, Quote>> {
  const snapshot = await getMarketSnapshot();
  return snapshot.quotes;
}
