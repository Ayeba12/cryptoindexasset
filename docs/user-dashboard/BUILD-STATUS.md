# Customer dashboard build status

Updated 7 September 2026 — Codex takeover from the interrupted Claude Code / Antigravity build.

## Actual starting point

The shell, reusable components, data contracts, fixture store, and owner-scoped live adapters existed. The main customer page files still returned `Route under construction.`, and only an overview placeholder was registered in the preview.

The previous version of this status file incorrectly marked every stage complete and listed unsupported currencies and verified trader claims. This file supersedes those claims.

## Implemented in this takeover

- Replaced all 13 main page placeholders with shared screen implementations.
- Added the four detail pages: asset, transaction, trader, and allocation.
- Registered all 17 screen patterns in the development preview.
- Kept protected pages on the live data adapter. No fixture selector is available on live customer routes.
- Added a shared screen loader, route loading/error boundaries, URL-based activity filters and pagination.
- Preserved Space Grotesk headings, Geist Mono UI/numbers, zinc surfaces, yellow primary actions, orange chart tokens, compact radii, and the 4pt spacing system.
- Used the retained shadcn/ui SidebarProvider, Sidebar and SidebarInset, plus owned Card, Table, Select, RadioGroup, AlertDialog and other components. The layout follows the dashboard-01 summary/chart/table composition and sidebar-07 navigation pattern. The original generic block demo files are no longer present in this checkout; no replacement preset was applied.
- Added the missing Radix-backed Accordion wrapper for dashboard help.
- Added responsive asset tables/disclosures, stationary trader cards, exact amount formatting, explicit status text, local QR codes and confirmation dialogs.
- Deferred chart-library loading to the chart component. No animated money counters or marketing marquees were added.
- Left the public portal, admin UI, authentication-page designs, database schema and environment configuration unchanged.

Supported crypto assets are **BTC, ETH, BCH, LTC, XRP and USDT**. An actual USD settlement ledger is shown separately when supplied; USD is not a seventh crypto asset.

## Screen coverage

| Screen | Implementation |
| --- | --- |
| Overview | Four valuation summaries, 7D/30D/90D history with data-table disclosure, assets, allocations, attention items and recent activity |
| Assets and asset detail | Search/availability filter, desktop table, mobile breakdowns, exact balances, supported networks and activity |
| Deposit | Asset/network selection, matching returned address, QR, tag/memo, policy/expiry, copy action, hash-proof review receipt and recent deposits |
| Withdraw | Crypto/bank method, provider-defined fields, quote/review/submission, expiry, repeated-click guard and unknown-outcome reconciliation |
| Activity and transaction detail | URL filters, 10/25/50 page sizes, pagination, signed amounts, separate request/settlement status and timeline |
| Discover traders and profile | Search/sort, supplied metrics with provenance, stationary cards, profile/history/activity and allocation review |
| My copy trades and detail | Allocation status, recorded outcomes, permitted pause/resume/stop confirmations, fees and timeline |
| Signals | Entitlement/unavailable state, source, publication/expiry and expandable details |
| Notifications | All/unread filter, pagination, individual and bulk mark-as-read |
| Profile | Editable-field whitelist, validation feedback and save action |
| Security | Confirmed MFA state, enrollment/verification UI, password-change form and honest session-history state |
| Verification | Status and document metadata; simulated metadata submission in preview only, no pretended live upload |
| Help | Accessible question disclosures, contact and relevant account links |

`/dashboard/settings` still redirects to Profile. Legacy funding/activity aliases and public routes are preserved.

## Service boundary — not launch complete

Frontend implementation is not proof that real financial services work. The existing live adapter intentionally reports these features unavailable:

- Fiat quotes, valuation history and a reconciled available/reserved hold ledger.
- Withdrawal quote/submission/reconciliation and request cancellation.
- Copy execution and its lifecycle.
- Deposit proof and private file upload.
- KYC document upload/removal.
- Signals and session history.

Existing live profile, notification and MFA/password actions are connected through the provided action boundary, but were **not exercised against real accounts** during this work. Deposit instructions are usable only when the operator has configured valid asset/network settings.

Remaining UI/service follow-ups:
- Expose a verified factor identifier and recovery policy before adding existing-factor removal/replacement controls.
- Add secure upload contracts carrying actual document bytes or scoped upload receipts; the present file-metadata contracts are not uploads.
- Add trader risk filtering only with a supported methodology/filter contract; current discovery provides search and name/copier/accuracy sorting.
- Add page-specific private-route metadata and finish the full accessibility/device acceptance matrix before launch.
- Review authenticated production reads and mutations in an explicitly authorized staging account.

## Verification

See `VERIFICATION.md` for commands, results, browser coverage and checks not performed. The new isolated test is `node scripts/test-dashboard-screens.mjs`.

Development review: http://127.0.0.1:3000/design-preview/dashboard
Protected account entry: /dashboard

No real withdrawals, copy allocations, credential changes, document uploads, database migrations or deployments were performed.
