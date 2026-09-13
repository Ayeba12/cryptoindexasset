# Supabase integration plan and gap report

Updated 11 September 2026. Status: implementation plan, not a completed production connection.

## Confirmed scope

Connect the public website, customer dashboard and admin dashboard to one source of truth. Admin-created, updated and removed trader profiles must reach both the homepage directory and customer trader directory. Admins must be able to create and publish signals. Support both timestamped USD equivalents and actual currency conversion, with separate release gates.

Keep the existing typography, status colours, coin identities, shadcn dashboard/sidebar components and theme behaviour. Trader portraits use `var(--radius)` everywhere. No redesign is needed for this integration.

This inspection covered repository source, not the hosted database or live account data. Configuration, migration history, deployed policies, credentials, backups and balances have not been verified. No database changes or real financial transactions were performed.

## Current implementation and missing work

| Area | Evidence in repository | Missing or unsafe to assume |
| --- | --- | --- |
| Supabase clients | `lib/supabase/{client,server,middleware,config}.ts` | Environment and hosted project health not verified. Do not print secrets during diagnosis. |
| Customer identity | `lib/dashboard/adapters/live.ts` verifies Supabase user, then resolves `User.supabaseUid` to internal `User.id` | Provisioning and deployed schema must be validated. Auth UUID and internal user UUID are not interchangeable. |
| Customer reads | Live adapter has owner-scoped Prisma reads for balances, transactions, allocations, traders, notifications and profile | Reads do not prove the current database matches Prisma. Several contract regions deliberately return unavailable. |
| Customer writes | `lib/dashboard/mutations.server.ts` implements profile, notification, password and MFA operations | Deposit proof, withdrawals, copy actions and KYC uploads deliberately return unavailable. Test the implemented actions against isolated staging accounts. |
| Admin | `lib/admin/access.server.ts`, `components/admin/provider.tsx`, `components/admin/screen.tsx` | Protected live pages exist but reads/writes are not connected. CRUD, wallet adjustments, signals, reviews and preferences use preview state. Refresh discards preview edits. |
| Public traders | Local fictional array in `components/public-site/community.tsx` | No shared live trader query, stable live trader links, publication cache invalidation or cross-portal subscription. Keep demo disclosures until real evidence replaces examples. |
| Customer traders | Fixtures in preview; Prisma `CopyTrader` in live adapter | Neither consumes admin preview state. Admin's publication preview only shows local projections. |
| Schema parity | `prisma/schema.prisma` uses camelCase fields without column `@map`; `prisma/migrations/0_init/migration.sql` creates snake_case columns | Examples: `supabaseUid` versus `supabase_uid`, `userId` versus `user_id`, `winRate` versus `win_rate`. UUID and timestamp definitions also need reconciliation. Do not replay initial SQL to fix this. |
| Trader data | Prisma has basic name, avatar, win rate, risk, minimum and followers | Missing publication lifecycle, featured order, version, strategy details, rating evidence, performance period/source, archive metadata and admin audit links. `isActive` alone is insufficient. |
| Signals | New admin preview form saves title, asset, direction, timeframe and analysis as hidden; separate show/hide review | No persisted signal model, publisher permissions, expiry rules, customer feed or receipt of publication. Signals are not trade executions. |
| Wallets | Decimal balance, locked profit and total profit exist | No durable available/reserved model, immutable balanced ledger, idempotent holds, adjustment/reversal attribution or settlement state machine. `lockedProfit` is not a general withdrawal reservation. |
| Asset coverage | UI supports BTC, ETH, BCH, LTC, XRP and USDT | Initial SQL trigger and `lib/services/wallet.service.ts` only initialize BTC, ETH, USDT and USD. Missing BCH/LTC/XRP provisioning and explicit per-network metadata. |
| Prices and conversion | `docs/user-dashboard/MARKET-DATA-PLAN.md` | Live price feed, market charts, historical account valuation, estimates, executable quotes and exchange provider are not connected. USDT must not be hardcoded equal to USD. |
| RLS | Initial migration includes ownership SELECT policies and service-role policies | No hosted policy verification. Trader SELECT permits every authenticated row, not just published profiles. User self-update policy does not restrict privileged columns if table UPDATE grants exist. Review actual grants before declaring this exploitable. |
| Roles | Admin guard trusts server-managed `app_metadata.role === "admin"`; Prisma also has USER/ADMIN/SUPERADMIN | No unified revocation/provisioning contract or granular finance/editor/reviewer permissions. Stale claims and suspended administrators must be handled. Never authorize from user metadata. |
| Uploads | Admin preview accepts local portrait files; schema has document/proof URL fields | Storage buckets, upload policy tests, image re-encoding, signed private access, malware checks, retention and cleanup jobs are missing from the reviewed integration. |
| Profit engine | `lib/services/trade.service.ts` can choose random daily ROI and credit followers | Do not wire this to production. Returns need verified execution/settlement evidence. A manual correction must be labelled as an adjustment, not invented trading performance. |
| Data retention | Prisma/initial SQL use cascading deletes for financial relations | Review retention and remove destructive cascades through approved additive migration work. Deleting a trader/user must not erase allocation or transaction history. |
| Operations | Local fixture tests and preview fault states exist | Hosted RLS tests, migration rehearsal, restore drill, provider reconciliation, abuse limits, production alerts and end-to-end staging proof are still required. |

## Architecture decision

Keep one Next.js application with server-side modules and one Supabase PostgreSQL database. Retain Prisma for server database access after schema parity is verified. Use Supabase Auth, Storage and Realtime for their specific roles. Do not rewrite working customer contracts or add a second ORM.

Alternatives considered: separate databases for each portal would introduce conflicting trader and wallet records. Separate microservices are unnecessary for the current repo and would make financial coordination harder. Browser-only database writes are inappropriate for privileged actions and funds.

```text
Public homepage -----> public trader query -----+
Customer dashboard --> owner-scoped queries ----+--> PostgreSQL in Supabase
Admin dashboard -----> authorized commands -----+
                              |
                              +--> audit record + durable publication event
                                      |
                                      +--> invalidate public cache
                                      +--> notify clients to refetch

Auth -> verified identity and permission checks
Storage -> approved portraits / private evidence
Market provider -> estimates only
Execution provider -> confirmed fills and settlement -> ledger
```

Every command has validated input, authenticated actor, permission, target, expected version, idempotency key where applicable, and a structured result. Return safe field errors and actionable conflicts. Realtime tells clients to fetch current state; it never authorizes an action or adjusts a wallet locally.

Prisma's direct connection does not automatically carry the Supabase user's JWT or enforce user ownership. Keep explicit server authorization and owner predicates on every query. Use a least-privilege application role; audit any connection that bypasses RLS. Separate the migration role from application credentials.

## Build order with release gates

### 1. Establish staging and protect existing data

1. Identify the deployed runtime, Supabase project, MongoDB source and migration history without exposing connection strings. Check only configuration presence first.
2. Obtain permission for a staging project and any billable services. Use synthetic test accounts. Keep preview fixtures separate from staging and production.
3. Take encrypted offline exports of legacy users, bcrypt hashes, wallet mappings, exact balances and transaction histories before migration work. Record counts and checksums. Restrict database network access to required hosts, not the whole internet.
4. Compare hosted columns/types/constraints with Prisma and SQL. Choose the existing deployed schema as evidence. Prefer explicit Prisma column mappings where appropriate; plan additive migrations for new fields.
5. Keep a single reviewed migration history. Do not run reset, push destructive changes, replay seed returns or overwrite existing users. Rehearse on a restored staging snapshot.

Gate: schema parity tests and read-only adapter smoke tests pass; recovery has been rehearsed. Hosted state remains unknown until these checks run.

### 2. Make identity, provisioning and permissions consistent

1. Keep `auth.users.id -> users.supabase_uid -> users.id` as the identity mapping. Ensure uniqueness and references. Provision supported wallets idempotently, including BCH/LTC/XRP.
2. Keep server-managed role claims for routing, but recheck current stored admin status and action permissions for sensitive writes. Require fresh MFA for finance/security changes. Define who can edit traders, publish signals, review KYC and adjust funds.
3. Remove generic client UPDATE access to protected profile fields. Allowlist editable name/phone/country fields; reject changes to roles, suspension, ownership, balances and verification state.
4. Test registration, confirmation, login, callback, logout, recovery and MFA with configured redirects and SMTP. Check existing admin/customer settings writes, expired sessions and role revocation.
5. Review `handle_new_user` trigger, safe search path, execution privileges, failure recovery and supported assets. Treat any security-definer code as privileged code, not an RLS workaround.

Gate: anonymous, customer A, customer B, suspended user, editor, finance admin and revoked admin tests prove both allowed and denied operations. No self-promotion or cross-user reads/writes.

### 3. Connect trader publication across all three portals first

This is the first complete vertical integration to build after identity and schema checks.

1. Extend one canonical trader record with stable ID/slug, publication status, version, featured position, approved portrait key and the fields already required by `lib/admin/model.ts`. Store private notes/evidence separately from public fields. Record metrics with period, sample size, provenance and last verification time; unknown values stay unknown.
2. Implement server-only `createTrader`, `updateTrader`, `publishTrader`, `unpublishTrader` and `archiveTrader` commands. Validate again on the server. Require an expected version on edits and return a conflict if another admin saved first.
3. Save the trader revision, audit entry and publication event in one database transaction. Use a worker with retries to process undelivered events. A committed write must survive a cache invalidation failure.
4. Implement one public-field mapper and published-trader repository for BOTH `TopTradersSection` and the customer trader directory/detail. The homepage can filter featured profiles, but it must not maintain its own copies of trader records. Internal notes, upload paths and private evidence never enter client props.
5. Replace the homepage constant array with server-provided directory data. Replace the customer live adapter's basic mapping with the same publication rules. Admin preview remains isolated; do not publish fictional fixture identities as real profiles.
6. Public copy buttons must carry the stable trader identity through sign-in to the correct detail page. Copy requests recheck that the trader is still published and eligible at submission.
7. After a committed edit, invalidate affected public and trader detail caches. Notify subscribed customer/admin pages to refetch. Public clients use a minimal public revision feed or bounded polling, never subscribe to private trader rows. Refetch on reconnect and focus; show errors rather than old data as current.
8. Treat removal as archive/unpublish by default. Remove the profile from both discovery lists, block new copy requests and retain historical allocation references. Existing allocations need an explicit pause/close policy; never delete them as a side effect.

Proposed acceptance target: under healthy connections, both open directories show the committed revision within five seconds. Polling fallback refreshes within thirty seconds. These are test targets, not current guarantees. Use no-store directory reads initially to avoid a second public cache source; add caching only with tested invalidation. Refetching after archive must exclude that trader, including its direct discovery URL.

Gate: create hidden -> publish -> update photo/metrics -> unpublish -> archive works in three separate browser sessions. Test non-featured records, simultaneous edits, rejected uploads, lost events, reconnection and empty directories. Historical customer allocations remain readable.

### 4. Persist signals and connect the customer feed

1. Add signals with title, asset, direction, timeframe, analysis/risk text, status, author, created/updated/published timestamps, expiry and version. If price levels are added, define quote currency, decimal precision, entry range, stop and targets explicitly.
2. Connect the new preview form through an admin server action. Save hidden by default; publishing is a separate reviewed command with an audit trail. Support update, withdraw and expiry. Set expiry rules before production publication.
3. Implement `getSignals` for eligible signed-in customers. Filter hidden, withdrawn and expired signals on the server. Limit public visibility to an explicitly approved marketing projection, if wanted; public signal exposure is not assumed.
4. Notify customers to refetch on publication/withdrawal. Use the same reconnect/fallback rules as traders. Notification failure must not duplicate publication.
5. Treat Buy/Sell as signal direction, not an instruction to move funds. A later execution engine needs separate user consent, risk limits, order receipts and settlement evidence.

Gate: an authorized admin can add and publish; a customer sees only eligible signals; revocation and expiry remove them; customers cannot insert/edit signals or access hidden rows. No wallet balance changes occur.

### 5. Implement storage and evidence workflows

Use separate storage policies for approved public trader portraits and private KYC/payment evidence. Public portrait URLs must contain no sensitive data. Store draft portraits privately until approval. Validate signature/MIME, size and dimensions on the server; re-encode images, strip metadata and reject active content. Use versioned keys so photo replacements invalidate caches.

Use short-lived signed URLs for private evidence after owner/admin permission checks. Never place evidence URLs in public trader projections, analytics or logs. Implement orphan upload cleanup and retention. Storage needs its own policies; table RLS does not protect an incorrectly public bucket. [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control).

Gate: cross-user and anonymous upload/read/replace attempts fail; editors cannot read KYC just because they can upload portraits. Failed saves leave recoverable drafts without publishing orphaned files.

### 6. Build financial accounting before enabling financial buttons

1. Add ledger accounts and immutable entries with asset precision, source reference and balanced postings. Add reservations, unique idempotency keys, operation receipts, provider events and audit records. Preserve existing balances as reconciled opening entries, not new profit.
2. Model available and reserved funds explicitly. An atomic transaction verifies permissions, balance and version, then reserves/debits once. Concurrent requests cannot overspend. Same key/different payload is rejected; retries with the same payload return the original receipt.
3. Implement manual credits/debits with reason, evidence, actor, before/after and linked reversal. Removing a profit credit cannot consume someone else's funds or a withdrawal reservation. Require a second reviewer above a business-approved threshold.
4. Model deposit evidence, observed chain transfer, confirmations and final credit separately. Verify asset, network, destination/tag, unique tx/output identity and reorg policy. A screenshot never proves settlement.
5. Model withdrawals as requested, reviewed, reserved, submitted, confirmed, failed or cancelled. Approved is not settled. Unknown provider outcomes require reconciliation before release/retry. Preserve reservations until a definitive outcome.
6. Implement copy allocation consent, holds, pause/stop transitions, fees and fill attribution. Do not connect `TradeService` random ROI. Real profit/loss comes from reconciled execution; admin corrections remain visibly separate.

Gate: ledger totals reconcile exactly, duplicate webhooks do not double-credit, simultaneous withdrawals cannot overspend, and reversals retain history. Test provider timeout after acceptance and delayed confirmations before live funds.

### 7. Add market data, then real conversion

Follow `docs/user-dashboard/MARKET-DATA-PLAN.md`. First connect a server-cached price feed, signed changes, genuine price history and timestamped estimates. Missing/stale prices are explicit. Historical portfolio performance needs holdings and cash-flow history, not a market chart relabelled as profits.

Actual conversion is a separate feature with a selected execution provider. Persist a quote bound to user, source/destination asset, networks, exact amounts, fees/spread, slippage limit, recipient, expiry and wallet version. Requote after changes and require confirmation. Reserve once, record provider order/fill identifiers and settle only confirmed outcomes. Reconcile partial fills, failed exchanges and network fees. Market data is never an execution receipt.

Gate: stale quote, changed recipient, changed fee, expired quote, duplicate submit, timeout and partial-fill cases pass with provider sandbox records. Keep execution disabled until custody, supported pairs, jurisdictions, fees and settlement ownership are approved.

### 8. Release, migration and operations

- Migrate legacy accounts through an audited mapping, preserving bcrypt hashes, ownership, wallet addresses and exact amounts. Validate the current Supabase import path in staging; if a hash cannot be imported faithfully, stop for an approved recovery process. Never silently reset passwords.
- Compare source/target record counts, aggregate totals per currency and each user's balances/transactions. Freeze legacy writes at cutover or use a reconciled change capture process. Never allow two independent systems to write the same balances.
- Use additive migrations and separate feature flags for shared traders, signals, estimates and execution. Roll back application reads/writes through flags without dropping new data. After financial writes begin, reconcile before reverting the writer.
- Assign named owners before release: application/auth, database/backup, finance reconciliation and publication/content. Record deploy authority and on-call contacts; do not assume agents own production incidents.
- Monitor auth failures, denied commands, publication lag, missing events, stale prices, upload failures, pending settlements and ledger mismatches. Alert immediately on a ledger mismatch. Logs contain operation IDs and error categories, not secrets or full financial/identity payloads.
- Agree recovery objectives and verify backups/restore independently of dashboard indicators. Run a daily reconciliation job once financial flows exist. Record incident steps for provider outage, leaked credentials and delayed withdrawal settlement.
- CI gates: type checks, unit tests, migration parity, RLS allow/deny suite, storage policies, contract tests and separate-session browser flows. Check desktop, tablet, mobile, dark/light themes and keyboard navigation.

Do not build a custom exchange, custody service, microservice fleet or new ORM as part of this first integration. Keep bank-wire execution disabled until a separate banking provider and review workflow are approved.

## Access-control and Realtime rules

Use explicit minimal grants plus RLS for every exposed table. Ownership policies must resolve the internal user ID correctly. Public users get approved directory fields only. Customers get their own records and eligible published signals/traders, never arbitrary rows. Financial writes go through reviewed server commands. Views require explicit security review because default views can bypass underlying RLS. [Supabase RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security).

New-table API exposure is changing; do not assume creating a table makes it readable by Supabase clients. Include reviewed grants with the schema change and verify them in staging. Direct Prisma connections are a separate path. [Data API exposure change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically).

Subscriptions need publication/configuration and permission testing. Do not expose raw private-row changes to anonymous visitors. Prefer archive updates and safe revision notifications over relying on DELETE payloads. Refetch from an authorized query after every invalidation and after reconnection. [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes).

Do not alter Supabase's managed `realtime` schema to implement application events. Keep the outbox in the application's schema. [Realtime schema restrictions](https://supabase.com/changelog/realtime-schema-locked-down-against-modification).

## Decisions still required

1. Which Supabase staging/production projects and deployment environments are authoritative, and who approves migrations?
2. Which crypto networks and conversion pairs are supported? What remains crypto-only, and is USD a display currency or a redeemable balance?
3. Which custody/execution and market-data providers will be used, with what fees, quote expiry and slippage limits?
4. Who can publish traders/signals, approve large adjustments, and revoke admin privileges? What happens to active allocations when a trader is archived?
5. What evidence supports trader metrics and real testimonials, and what are the retention, recovery and support policies?

The next implementation milestone is stages 1–3: schema/identity verification, then persistent trader publication proven across all three portals. Signals follow using the same permissions and publication mechanism.
