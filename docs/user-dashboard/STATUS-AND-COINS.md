# Status colours and coin identities

11 September 2026.

## Shared implementation

Customer `StatusBadge` retains the existing domain-aware labels. Admin `Status` now uses the same semantic badge. Success, danger, warning, information and neutral colours are defined once in `components/dashboard/status-colors.css`, scoped to dashboard pages and their dialogs. Public-page styles are unchanged.

Exact status-label mapping lives in `lib/dashboard/status-tone.ts`. Unknown labels stay neutral. Approved and completed retain different text even though both are green. Pending states use a clock; warnings use a warning icon. Colour is never the only cue.

Admin feedback and customer action feedback use `SemanticNotice`. Successful actions are green, errors red, information blue and restricted-role warnings amber. Read errors and unavailable-data headings also receive semantic emphasis.

`CoinIdentity` pairs a local coin mark with visible text. BTC, ETH, BCH, LTC, XRP and USDT are supported. USD uses a bank icon; unknown or failed assets use a generic coin icon. Logos are decorative beside labels. They appear in customer asset lists/tables, transaction assets and deposit details, plus admin wallet records, request amounts, review summaries and signal assets. They do not claim network compatibility or a commercial partnership.

## Checks

- 36 status mapping, asset and contrast checks passed. All ten light/dark foreground-on-background pairs exceed 4.5:1; the lowest measured ratio is 6.61:1.
- 167 status/enum, 743 customer-screen, 88 admin, 134 exact-money and 124 formatting checks passed.
- TypeScript passed. The current change did not run a fresh production build.
- Status colours were confirmed from rendered admin badges in the local preview. Automated colour checks do not replace a full accessibility audit.
- All six coin-logo images loaded successfully on the customer assets preview and the rendered asset list was visually inspected.

## Deferred work

Live market prices, growth/decline sparklines, fresh conversion estimates and executable conversion remain planned, not enabled. See `MARKET-DATA-PLAN.md` for the staged integration and decisions needed. No balances, authentication rules or financial services were changed.
