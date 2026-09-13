# Market prices, conversion and dashboard logic

11 September 2026. Implementation plan, not a claim of live integration.

## Current code and this delivery

The dashboards now share labelled status badges and feedback colours. Coin identities cover BTC, ETH, BCH, LTC, XRP and USDT. USD uses a bank icon, not the Tether logo. Unknown assets and image failures use a generic icon and retain the currency label. No exchange or partner endorsement logos are added without a confirmed relationship.

The live adapter currently returns unavailable for valuation and history because no price source is configured. `Quote` and `Valuation` exist in `lib/dashboard/contracts.ts`. `WithdrawalQuote` already distinguishes fee, total debit, recipient amount, quote ID and expiry. Preserve these contracts and extend deliberately; do not replace them with browser-calculated balances.

## Phase 1: read-only market service

Use CoinGecko as the proposed aggregated market-data provider. Its [coins/markets endpoint](https://docs.coingecko.com/reference/coins-markets) supplies prices, change percentages, update times and optional seven-day sparklines. Its [simple/price endpoint](https://docs.coingecko.com/reference/simple-price) can supply compact timestamped price estimates. Confirm the chosen API tier, usage allowance, attribution and commercial terms before enabling it. No plan purchase or credential setup is included here.

1. Keep the provider key on the server. Never use a `NEXT_PUBLIC_` key, include it in URLs, or accept arbitrary upstream URLs from the browser.
2. Map BTC to `bitcoin`, ETH to `ethereum`, BCH to `bitcoin-cash`, LTC to `litecoin`, XRP to `ripple`, and USDT to `tether`. Verify IDs before activation. Use IDs rather than ambiguous tickers; keep network identifiers separate.
3. Add a shared read-only `/api/market/coins` endpoint. Batch the allowlisted coins, validate the response, apply an upstream timeout and limit request sizes. A provider failure must not make account balances unavailable.
4. Cache snapshots server-side. Proposed initial refresh is 60 seconds, subject to the selected plan; this is polling, not tick-by-tick streaming. Pause browser polling in hidden tabs, deduplicate requests and back off on rate limits.
5. Return currency, decimal-string USD price, signed percentage change, provider update time, fetch time, source, freshness state and timestamped chart points. Reject malformed, negative, zero or implausibly future-dated prices. Never replace a missing price with zero or assume USDT equals one USD.
6. Proposed freshness policy: show an estimate as current only within two minutes of its provider update. Retain the last valid display as stale for up to ten minutes with its timestamp and a warning; after that show unavailable. These are proposed product settings, not provider guarantees. Stale data never becomes an executable quote.
7. Connect the validated snapshot to live asset estimates and `getValuation`. Sum with exact decimal arithmetic. If a held asset lacks a quote, disclose the partial total and the excluded assets.

## Phase 2: price indicators and charts

- Add market-price, signed 24h change and seven-day sparkline columns to asset discovery. Keep wallet holdings and market price separate.
- Use green/up and red/down indicators with explicit signs; zero is neutral. Do not draw only rising lines. Missing history gets an unavailable label, not a fabricated or flat line.
- Every chart identifies its asset, quote currency, period, provider and timestamp. Include a textual change summary and an accessible data view. Chart height remains reserved while loading.
- Coin-price history is not account-value history. Historical portfolio value requires historical holdings and cash flows, not today's balance multiplied by old prices. Existing account charts must not be relabelled as trading performance.
- Preserve the dashboard typography and chart spacing. Avoid flashing prices and announce only meaningful user-triggered updates to assistive technology.

## Phase 3: deposit and withdrawal estimates

Start with informational conversion only. A timestamped USD equivalent changes neither the coin amount nor ledger balances. Label it `Estimated USD value`, include its source/time, and state that it is not an exchange or guaranteed payout quote.

1. For deposits, validate the asset/network and any destination tag. Display the entered coin amount and its fresh estimate. Credit only the verified received amount after the required confirmations. A screenshot or price calculation is not proof of settlement.
2. For withdrawals, show the coin amount, network fee, total debit and recipient amount separately. Estimate each in USD using the same snapshot; disclose rounding. Do not use the USD estimate to approve spendable balance.
3. Bind any actual executable quote to the authenticated user, wallet, asset/network, recipient, amount, fees, rate, expiry and balance version. Changing any input invalidates it. The server rechecks the quote, available funds, permission and authentication at submission.
4. Require explicit reconfirmation for changed fees/rates or expired quotes. Persist a quote/receipt ID and reconcile unknown outcomes before retrying. Use idempotency plus atomic reservation and ledger writes to prevent duplicates and overspending.
5. An actual coin swap or fiat payout conversion needs an execution/liquidity provider, supported jurisdictions, slippage/spread policy and custody/settlement contracts. A market-data API cannot perform that conversion.

## Phase 4: logic hardening across both dashboards

- Keep approval, submission, settlement and reversal distinct. Approved does not mean completed.
- Recheck admin permissions on every mutation. Separate trader editing, KYC review and financial-adjustment permissions; audit actor, reason and before/after state.
- Persist traders once and project an explicit public-field whitelist to both public and customer consumers. Publishing cannot infer verification or performance evidence.
- Preserve reserved funds, exact decimal precision and linked reversals. Deposits and manual credits must not inflate reported trading returns.
- Test stale reads, role denial, cross-user targeting, duplicate callbacks, provider outages, malformed amounts, rate limiting, expired/changed quotes and simultaneous withdrawals in staging.
- Roll out read-only prices first, then informational estimates, then separately approved execution. Feature flags must disable unavailable services without inventing fallback data.

## Decisions needed before live conversion

Confirmed on 11 September 2026: the product requires BOTH informational USD equivalents AND actual currency conversion. Deliver estimates first, then executable conversion after the settlement and accounting checks pass. Neither requirement is optional; they have separate release gates.

Still needed: market-data API tier/key, supported conversion pairs and jurisdictions, settlement currencies/networks, execution provider, fees/spread, quote lifetime and custody/accounting policy. Do not enter API secrets into this document or chat; configure them through the project's secret-management process. See `docs/SUPABASE-INTEGRATION-PLAN.md` for the cross-portal build sequence and missing backend work.

No live prices, new financial endpoints, exchange execution, schema migrations or real balance changes are enabled by this delivery.
