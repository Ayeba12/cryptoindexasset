# Customer dashboard data reference (Stage D)

Version 1.0 · 7 September 2026 · What page builders can rely on from `lib/dashboard/fixtures`, `lib/dashboard/adapters`, `queries.server.ts` and `mutations.server.ts`.

Read with `BUILD-BRIEF.md` §8 (the specification of this stage) and `contracts.ts` (the frozen shapes). Nothing in this stage changed `contracts.ts`, `data-source.ts` or the scenario id list.

## 1. Files

| Path | Purpose |
| --- | --- |
| `lib/dashboard/fixtures/index.ts` | Public surface: `createFixtureStore`, `createFixtureActions`, `settlePendingOperations`, scenario catalogue re-exports, fixture constants. Client-safe. |
| `lib/dashboard/fixtures/store.ts` | `FixtureState`, `buildFixtureState(scenarioId)`, the `DashboardData` over mutable state, derived accounting helpers. |
| `lib/dashboard/fixtures/actions.ts` | `DashboardActions` over a store with simulated latency, validation and scenario behaviour. |
| `lib/dashboard/fixtures/{accounts,allocations,capabilities,clock,history,notifications,quotes,security,signals,traders,transactions,verification}.ts` | Deterministic seed modules. |
| `lib/dashboard/fixtures/scenarios.ts` | Frozen scenario ids, labels, `FIXTURE_CLOCK` (Stage A). |
| `lib/dashboard/adapters/mappers.ts` | Pure record → contract mappers, `LIVE_REASONS`, `ACCOUNT_SERVICE_ERROR`. Client-safe, tested. |
| `lib/dashboard/adapters/deposit-settings.ts` | `SystemSetting` deposit-instruction key and zod schema. |
| `lib/dashboard/adapters/explorers.ts` | Block-explorer allowlist (`bitcoin`, `ethereum`). |
| `lib/dashboard/adapters/live.ts` | `import "server-only"`. `getLiveSessionAccount`, `createLiveDashboardData`, `liveCapabilities`, `logFailure`. |
| `lib/dashboard/queries.server.ts` | `getSessionAccount()`, `getDashboardData()` (unchanged signatures). |
| `lib/dashboard/mutations.server.ts` | `"use server"` actions (unchanged names and signatures). |
| `scripts/test-dashboard-status.mjs` | 167 mapper checks. |
| `scripts/test-dashboard-ownership.mjs` | 251 checks with stubbed Prisma and Supabase. |
| `scripts/test-dashboard-fixtures.mjs` | 1185 fixture store and action checks. |

## 2. Fixture store and actions API

```ts
import { createFixtureStore, createFixtureActions, settlePendingOperations } from "@/lib/dashboard/fixtures";

const store = createFixtureStore(scenarioId);          // client-safe, in memory, deterministic
const actions = createFixtureActions(store);           // DashboardActions; default latency 250 ms
const unsubscribe = store.subscribe(() => rerender()); // called after every committed mutation
store.version;                                          // increments per commit (use with useSyncExternalStore)
store.data;                                             // DashboardData over the current state
store.state;                                            // mutable FixtureState (internal; do not mutate from views)
store.commit((state) => { ... });                        // apply a mutation, bump version, notify
settlePendingOperations(store);                         // confirm STOPPING → STOPPED and PENDING → ACTIVE now
```

`createFixtureStore(id)` falls back to `funded` for an unknown id. Reads resolve immediately (no latency); the preview toolbar's "Show loading skeletons" toggle is the place to demonstrate loading. Reads never bump the version.

`createFixtureActions(store, { latencyMs, confirmationDelayMs })`: `latencyMs` defaults to 250 and is clamped to 0–400; `confirmationDelayMs` defaults to 6000 and schedules `settlePendingOperations` after a stop or copy request (`null` disables the timer). Every action waits the latency, then validates (returning `invalid` with `fieldErrors` keyed like the input: `amount`, `address`, `tag`, `fields.iban`, `files.0`, `code`, `currentPassword` …), then commits. Only successful actions bump the version.

Money: every derived figure (USD estimates, P/L sums, settlement balance, fee totals, quote totals) is computed with `lib/dashboard/money.ts`; the fixtures never call `Number()`/`parseFloat` on money and never read the system clock or `Math.random` (asserted by the fixture test).

## 3. Scenario catalogue

All scenarios share the funded baseline unless stated. Clock `2026-09-06T12:00:00Z`. Account `user-fixture-0001`, "Jordan Avery", `jordan.avery@example.com`, ACTIVE, MFA enabled, verified.

| Scenario | What changes |
| --- | --- |
| `funded` | Six enabled wallets (BTC 0.10000000 = 0.08000000 + 0.02000000; ETH 2.00000000 = 1.50000000 + 0.50000000; USDT 1250.000000 = 1000.000000 + 250.000000; BCH/LTC/XRP zero). Fixture quotes BTC 60000.00, ETH 2500.00, BCH 300.00, LTC 80.00, XRP 0.50, USDT 1.00 → estimated 12250.00 / available 9550.00 / reserved 2700.00 USD, recorded 30-day P/L +120.00 USD (+0.98%, "Ledger: recorded copy-trade outcomes"). 35 ledger rows, USD settlement ledger 122.15, 4 allocations, 6 traders, 3 signals (one expired), 12 notifications (3 unread), all capabilities simulated (sessions unavailable). |
| `empty` | "New Customer", PENDING_KYC, zero enabled wallets, no rows (`listTransactions` → `empty`), no allocations, 2 notifications, MFA not enabled, verification not submitted, history `empty`, estimate 0.00. |
| `partial-support` | LTC and XRP wallets `enabled: false` ("Not supported in this environment: no network is configured"), their networks removed, valuation `partial: true` with `excluded: ["LTC","XRP"]`, deposit options exclude them. |
| `no-quotes` | `getValuation` and `getValuationHistory` → `unavailable`; assets stay `ready` with `estimatedUsd: null` and an `estimateReason`. |
| `pending-withdrawal` | Adds `tx-wdr-0004` (USDT 150.000000 pending, cancellable) so two withdrawals need attention alongside the declined `tx-wdr-0002` and cancelled `tx-wdr-0003`. |
| `allocation-no-execution` | `executionMode: "unavailable"` on traders and allocations, `permittedActions: []`, copy capabilities unavailable, `requestCopy`/pause/resume/stop → `unavailable`. |
| `trader-missing-metrics` | Leila Hassan lacks rating, drawdown and risk; Daniel Okafor lacks drawdown; Sam Rivera lacks risk. Alex Morgan's history is withheld. |
| `signals-disabled` | `getSignals` ready with `entitled: false` and an `entitlementReason`; `signals` capability unavailable. |
| `mfa-not-enabled` | Security `not-enabled`; attention shows `security-enrollment`; `startMfaEnrollment` works. |
| `verification-in-review` | State `in-review`, documents `doc-0003`/`doc-0004` (driving licence), submitted 2 days ago. |
| `read-error` | `getAssets`, `getAsset`, `getAssetActivity`, `listTransactions`, `listRecentDeposits`, `listRecentActivity` and `getValuation` → `error` (retryable). Other regions ready. |
| `write-failure` | Every action → `{ ok: false, code: "failed" }` after the latency; state unchanged. Verification is `changes-required` here so the resubmission form has a failure to show. |
| `unknown-outcome` | `submitWithdrawal` records the request but returns `unknown-outcome` with `reference = idempotencyKey`; `reconcileWithdrawal(key)` returns the receipt; resubmitting with the same key returns the same receipt (one row only). |
| `long-values` | 42-character name "Alexandria Catherine Montgomery-Whitfields", 88-character BTC address on `tx-wdr-0001` and on the BTC deposit instruction, BTC total `123456789.12345678`. |
| `large-amounts` | USDT `99999999991.123456` (available 98765432101.123456 + reserved 1234567890.000000), BTC 2250.00000000. |
| `losing-outcome` | Alex Morgan's 30-day outcomes become +30, −45, +10, −40 → recorded P/L `-45.00` USD with `percent: null`; `tx-pnl-0002` is a 45.00 USD debit. |

## 4. Fixture ids page builders can link to

Ledger (funded, newest first; `/dashboard/activity/<id>`):

| Id | Reference | What it is |
| --- | --- | --- |
| `tx-wdr-0001` | WDR-2026-0003 | Pending ETH withdrawal 0.50000000, fee 0.00020000, masked `0x9a2f…A5f2`, `permittedActions: ["cancel"]`. |
| `tx-wdr-0002` | WDR-2026-0002 | Declined USDT withdrawal, reason "Destination address failed compliance review". |
| `tx-wdr-0003` | WDR-2026-0001 | Cancelled BTC withdrawal. |
| `tx-wdr-0004` | WDR-2026-0004 | Pending USDT withdrawal (`pending-withdrawal` only). |
| `tx-dep-0001` … `tx-dep-0006` | DEP-2026-000n | Approved deposits with `settlement: "confirmed"` and explorer links (BTC → mempool.space, ETH → etherscan). |
| `tx-dep-0007` | DEP-2026-0007 | Approved USDT deposit with `settlement: "unconfirmed"`. |
| `tx-pnl-0001` … `tx-pnl-0004` | PNL-2026-000n | Alex Morgan recorded outcomes inside the 30-day window (sum +120.00 in `funded`, −45.00 in `losing-outcome`). |
| `tx-pnl-0005` … `tx-pnl-0010` | | Daniel Okafor outcomes (net −12.00). `tx-pnl-0011`/`0012` Maya Chen (+18.00), `tx-pnl-0013` Elena Rossi (+5.00). |
| `tx-fee-0001` … `tx-fee-0010` | FEE-2026-00nn | Copy fees (USD debits) tagged with their allocation. |
| `tx-bonus-0001` | BON-2026-0001 | Welcome credit (operator). |
| `tx-adj-0001` | ADJ-2026-0001 | "Manual adjustment by operator", +5.00 USD. |
| `tx-missing` | | Does not exist → `getTransaction` returns `not-found`; linked from notification `ntf-0006`. |
| `tx-wdr-req-0001` … | WDR-2026-0004 … | Created by `submitWithdrawal` in preview (`funded` numbering continues from 0004). |

Allocations (`/dashboard/copy-trades/<id>`): `alloc-0001` Alex Morgan ACTIVE 250.000000 USDT (P/L +120.00, fees 18.00); `alloc-0002` Maya Chen PAUSED 0.02000000 BTC; `alloc-0003` Daniel Okafor STOPPED 200.000000 USDT (P/L −12.00); `alloc-0004` Elena Rossi STOPPING 0.50000000 ETH with `pendingOperation: { kind: "stop" }`. `requestCopy` creates `alloc-0005`, `alloc-0006`, … (PENDING) with receipt `COPY-REQ-0001`, ….

Traders (`/dashboard/traders/<id>`): `trader-alex-morgan` (accuracy 70.00%, 128 copiers, Medium, with history), `trader-maya-chen` (75.00%, Low), `trader-daniel-okafor` (54.00%, High), `trader-elena-rossi` (76.00%, 210), `trader-leila-hassan` (60.00%), `trader-sam-rivera` (80.00%, 305, Low). Portraits `/images/community/<slug>.webp` with `portraitDisclosure`.

Notifications: `ntf-0001` (unread, → `tx-wdr-0001`), `ntf-0002` (unread, → `alloc-0004`), `ntf-0003` (unread, → `tx-pnl-0004`), `ntf-0004` … `ntf-0012` read; `ntf-0006` links to `/dashboard/activity/tx-missing` (`MISSING_RECORD_HREF`). Actions add `ntf-0013`, … as unread.

Signals: `sig-0001` BTC long (expires in 2 days), `sig-0002` ETH neutral, `sig-0003` XRP short, expired. Source "Operator desk (fixture)".

Verification documents: `doc-0001`/`doc-0002` (funded, verified passport), `doc-0003`/`doc-0004` (`verification-in-review`), `doc-0005` (`write-failure`, changes required). Uploads create `doc-0006`, ….

Deposit instructions: any enabled asset + configured network (`FIXTURE_NETWORKS`: BTC `bitcoin`, ETH `ethereum`, BCH `bitcoin-cash`, LTC `litecoin`, XRP `xrp-ledger` (tag required, fixture tag `10000005`), USDT `ethereum` and `tron`). Addresses are deterministic fixture strings with the notice "Fixture address for design review. Do not send funds to it."; Tron adds a 20-confirmation notice. Proof submissions return `DEP-REQ-0001`, … and add a `deposit-review` attention item without touching balances.

Withdrawal quotes: crypto fee table `WITHDRAWAL_FEES` (BTC 0.00020000, ETH 0.00020000, BCH 0.00010000, LTC 0.00100000, XRP 0.200000, USDT 5.000000 on Ethereum / 1.000000 on Tron); bank wire fee 2.50 (USD or USDT source); `BANK_SCHEME` fields `accountHolder`, `country`, `iban`, `swift`, denominations USD/EUR/GBP; quotes `quote-0001`, … expire 10 minutes after the clock and are consumed by a submission; any edit to the input invalidates the quote.

Credentials accepted only in preview: current password `fixture-password` (`FIXTURE_CURRENT_PASSWORD`), MFA code `123456` (`FIXTURE_MFA_CODE`), fixture factor `factor-fixture-0001`, secret "FIXTURE SECRET NOT REAL 2345".

## 5. Live adapter behaviour per region

Identity: `auth.getUser()` → `prisma.user.findUnique({ where: { supabaseUid } })`. No Supabase config or user → `unauthenticated`; no row → `unprovisioned`; `SUSPENDED` → `restricted`; else `authenticated` with `userId` = Prisma id (PENDING_KYC adds a restriction note). Memoised per request with React `cache`. A failing lookup logs and resolves `unprovisioned`, never `authenticated`.

| Region | Live behaviour |
| --- | --- |
| `getCapabilities` | Deposit instructions, MFA, password change, notifications and profile save available; deposit proof, withdrawals, quotes, copy start/pause/stop, signals, sessions and KYC upload unavailable with `LIVE_REASONS`. |
| `getValuation` / `getValuationHistory` | `unavailable` ("No price feed is configured" / "No valuation history source is configured"). Never zero. |
| `getAssets` / `getAsset` | `wallet.findMany({ where: { userId } })`; `total = balance.toFixed(precision)`; `available`/`reserved` `null` ("The ledger does not define holds yet"); `estimatedUsd` `null`; missing wallet → `enabled: false` ("Wallet not initialised for this account"); networks from valid deposit-instruction settings. |
| `getSettlementLedger` | USD wallet row → `ready`, none → `empty`. |
| `listTransactions` | Prisma filters (type, currency, status, inclusive date range), `orderBy createdAt desc`, skip/take, count. `ADJUSTMENT` type or `UNKNOWN` status filters return a ready empty page (not expressible in the enum). Rows in a currency the contract does not know are excluded. Unknown enum → `status: "UNKNOWN"` + `rawStatus`. Settlement `unconfirmed` for approved deposits/withdrawals, else `not-applicable`. `permittedActions: []`. `reference` = `<PREFIX>-<first 8 id chars>`. |
| `getTransaction` | `findFirst({ where: { id, userId } })` → foreign or unknown → `not-found`. Destination parsed from `notes` only when a recognised `to|destination|address <value>` pattern exists; declined rows surface `notes` as `reason`. `paymentProof` is never selected. |
| Explorer links | Only BTC (`bitcoin`) and ETH (`ethereum`) via the allowlist and hash pattern; `network` is set for those two single-network assets, `null` otherwise. |
| `getDepositOptions` / `getDepositInstruction` | `SystemSetting` rows `deposit-instruction:<CURRENCY>:<networkId>` with JSON `{ networkName, address, tag?, minimumDeposit?, confirmations?, notice?, expiresAt? }` validated by zod; invalid or missing → `unavailable`. |
| `getDepositProofRules` | `unavailable`. |
| `getWithdrawalOptions` | Methods unavailable with reason; assets listed with `available: null`; `bankScheme: null`. |
| `listTraders` / `getTrader` | `copyTrader.findMany({ where: { isActive: true } })`; accuracy/rating/drawdown/risk `null`; `copiers` from `totalFollowers`; minimum from `minCapital` (USD); fee from `profitShare` "of recorded outcomes"; portrait only for same-origin `avatar` paths; provenance "Operator-entered record; performance not independently measured"; `executionMode: "unavailable"`. Sort by name or copiers (accuracy sort falls back to name). |
| `listAllocations` / `getAllocation` | `userCopyTrade.findMany({ where: { userId }, select: { …, trader } })`; status ACTIVE/PAUSED/STOPPED else `ERROR` + `rawStatus`; `recordedPnl` from `totalEarned` labelled "Recorded credits (operator accrual)"; `permittedActions: []`; activity/fees empty (the ledger does not link rows to allocations). |
| `getSignals` | `unavailable`. |
| `listNotifications` / `getUnreadCount` | Scoped `findMany`/`count`; `kind: "system"`, `href: null` (no columns). Page size 10. |
| `getProfile` | `user.findUnique({ where: { id: userId } })`; editable fullName/phone/country. |
| `getSecurity` | `supabase.auth.mfa.listFactors()`: verified TOTP → `enabled`, unverified → `enrollment-pending`, none → `not-enabled` (the `twoFactorEnabled` flag is never trusted). Sessions `null` with reason. |
| `getVerification` | `kycDocument.findUnique({ where: { userId } })`: PENDING → in-review, APPROVED → verified, REJECTED → changes-required with `rejectionMsg`, other/CANCELLED → changes-required with a resubmission message, none → not-submitted. Documents show presence only; `frontUrl`/`backUrl` never leave the adapter. Upload rules `null`. |
| `getNeedsAttention` | Pending withdrawals and deposits, MFA not enabled, verification not submitted / changes required. |
| Failures | Every Prisma/Supabase call is wrapped: `{ status: "error", message: "The account service did not respond", retryable: true }`; `getUnreadCount` falls back to 0; log line `[dashboard] <operation> failed (<ErrorName>)` with no payload. |

Server actions (`mutations.server.ts`): `session-expired` without a session, `forbidden` for restricted/unprovisioned; zod validation with `fieldErrors`; `revalidatePath("/dashboard", "layout")` only after a successful write. Live: `saveProfile` (name/phone/country, email stripped), `markNotificationRead` (`updateMany` scoped by `userId`; foreign → `not-found`), `markAllNotificationsRead`, `changePassword` (`signInWithPassword` with the account email, then `updateUser`), `startMfaEnrollment` (`mfa.enroll` TOTP; QR data URI decoded to SVG markup when possible), `verifyMfaEnrollment` and `disableMfa` (`mfa.challenge` + `mfa.verify`, then `mfa.unenroll` for disable; the `twoFactorEnabled` flag is recorded best-effort). All money-moving, copy and upload actions return `unavailable` with the `LIVE_REASONS` text. `WalletService` and `TradeService` are never imported.

## 6. Backend contracts still required for live activation

| Capability | Required before the corresponding preview behaviour can go live |
| --- | --- |
| Available / reserved balances | A hold ledger with disjoint buckets and reconciliation rules; until then both are `null`. |
| Fiat estimates and history | A quote source with timestamps and a stored valuation history; `USDT` must not be assumed to equal 1 USD. |
| Deposit proof | Private upload storage, accepted types and size limit, and a review queue; `paymentProof` URLs must stay private. |
| Withdrawal quotes and submission | Recipient/network/fee validation, server-side quote expiry, idempotency-keyed submission with reconcile-by-key, atomic holds; the existing debit service is not concurrency-safe. |
| Cancel request | A server operation that cancels only owned PENDING rows atomically. |
| Copy start / pause / stop | An execution contract with confirmed state transitions (`PENDING`, `STOPPING`), fee semantics and ownership checks; ledger rows linked to allocations for per-allocation P/L and fees. |
| Trader metrics | Audited accuracy/drawdown/rating sources with period and method per metric; risk methodology text. |
| Signals | Entitlement check and a feed with source, timestamps and expiry. |
| Notification categories and links | `kind` and `href` columns (or a derivation rule) on `Notification`. |
| Sessions | A session source; none exists in Supabase SSR today. |
| KYC upload | Private storage, approved upload rules and a document-removal policy. |
| Explorer links for multi-network assets | A network column on `Transaction` (USDT and others cannot be linked without one). |
| Deposit instructions | Operator-maintained `SystemSetting` rows in the documented JSON shape (already consumable). |
