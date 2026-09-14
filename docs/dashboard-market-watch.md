# Dashboard market watch

The dashboard overview includes current USD quotes and signed 24-hour changes for BTC, ETH, BCH, LTC, XRP and USDT. Selecting a coin changes the seven-day chart, period change and low/high summary. Historical samples come from CoinGecko's seven-day sparkline; they are not execution quotes or account returns.

The client refreshes every minute while visible, deduplicates pending requests, times out after 15 seconds and cancels on unmount. Users can pause and resume. Failed updates retain the last successful prices with a warning. Reference fallback snapshots are never displayed as live prices. The server rejects incomplete provider results instead of mixing reference prices into live results.

The existing market endpoint caches provider requests. Optional COINGECKO_API_KEY uses the demo API; COINGECKO_PRO_API_KEY uses the Pro host. Keep keys server-side in hosting environment settings. No new service or database migration is required.

Verified locally: TypeScript and targeted lint pass; live API returned six non-fallback coins with 168 samples each; dashboard preview rendered prices and chart; coin selection and pause controls worked in the browser.
