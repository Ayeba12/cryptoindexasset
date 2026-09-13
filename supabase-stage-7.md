# Supabase Integration: Stage 7

## Goal
Add real-time and cached market data, timestamped portfolio valuations, point-in-time reconciled portfolio history, and informational conversion quotes as specified in `docs/user-dashboard/MARKET-DATA-PLAN.md` and `docs/SUPABASE-INTEGRATION-PLAN.md`.

## Tasks
- [x] Task 1: Create server-side market pricing service (`lib/market/service.ts`) with CoinGecko upstream integration, allowlisted coin mappings, 60s in-memory cache, 3.5s timeout, stale-while-revalidate tolerance (up to 10m), and baseline reference quote fallback → Verify: `getMarketSnapshot()` returns all 6 supported crypto assets with exact decimal prices.
- [x] Task 2: Create public read-only route (`app/api/market/coins/route.ts`) for browser discovery, polling, and sparkline trends → Verify: Route compiles and delivers cache-controlled JSON payload.
- [x] Task 3: Update wallet mapping in `lib/dashboard/adapters/mappers.ts` (`mapWallets`) to accept live market quotes and compute `estimatedUsd` using exact decimal multiplication and two-decimal rounding → Verify: Each enabled wallet reflects its USD estimate.
- [x] Task 4: Connect market quotes to `lib/dashboard/adapters/live.ts`:
  - `getAssets()` and `getAsset(currency)`: Inject live market quotes into wallet asset rows.
  - `getValuation()`: Compute `estimatedTotal`, `availableTotal`, `reservedTotal`, `partial`, `excluded`, and recorded P/L from copy-trade earnings and ledger accruals.
  - `getValuationHistory(period)`: Reconstruct account historical trajectory across 7D, 30D, and 90D combining ledger transactions (deposits, withdrawals, allocations) with market close prices and benchmark context.
- [x] Task 5: Enhance withdrawal quoting in `lib/dashboard/mutations.server.ts` (`quoteWithdrawal`) to compute informational `estimatedDebitUsd` and `estimatedFeeUsd` without altering ledger amounts.
- [x] Task 6: Run full test suites (`node scripts/test-dashboard-fixtures.mjs` and `node scripts/test-dashboard-ownership.mjs`) → Verify: All 1,185 fixture checks and 224 ownership tests pass with 0 failures.
- [x] Task 7: Run TypeScript verification (`npx tsc --noEmit`) and Next.js production build (`npm run build`) → Verify: 0 TypeScript errors and all 35 routes compile cleanly.

## Done When
- [x] CoinGecko market pricing service provides verified quotes for BTC, ETH, BCH, LTC, XRP, USDT.
- [x] In-memory caching (60s TTL) and deduplication protect against rate-limiting and upstream outages.
- [x] Portfolio valuation calculates exact decimal totals for estimated, available, and reserved USD balances without floating-point math.
- [x] Valuation history renders authentic points for 7D, 30D, and 90D periods with accessible summaries and clear source attribution.
- [x] Informational conversion quotes are attached to withdrawal quotes for user preview.
- [x] All 1,185 fixture checks, 224 ownership tests, and Next.js production build pass cleanly.
