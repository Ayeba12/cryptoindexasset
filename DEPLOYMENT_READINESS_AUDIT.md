# Deployment Readiness Audit

**Project:** Crypto Index Asset  
**Audit date:** 12 September 2026  
**Decision:** **Not ready to deploy as a live financial service**

This was a read-only audit of the repository, Supabase/Prisma integration, authentication boundaries, customer and administrator workflows, build output, tests, dependency security, and public release content. No database or application code was changed during the audit.

The interface is substantially designed and the Next.js application can compile, but several release blockers affect source control, database migrations, customer funds, identity documents, administrator data, and legal publication. A private staging deployment is reasonable after the repository and migration blockers are fixed. A public production launch should wait until every P0 gate below is closed.

## Executive findings

| Area | Status | Main finding |
| --- | --- | --- |
| Source control | Blocked | `.env` is tracked and has history; most of the Next.js/Supabase application is untracked. |
| Supabase database | Blocked | Migration history is internally inconsistent, the ledger migration has incompatible foreign-key types, and the hosted migration state could not be verified. |
| Financial integrity | Blocked | Withdrawal quotes can be bypassed, concurrent mutations are unsafe, the ledger is not double-entry or immutable, and settlement is not connected to a payment or chain provider. |
| Admin portal | Blocked | Users, wallets, adjustments, notifications, settings, account security, audit views, and empty-data fallbacks still use in-memory fixtures. |
| Storage and KYC | Blocked | Live document upload is not connected and storage insert policies do not enforce owner folders. |
| Copy trading | Blocked | There is no exchange/broker execution contract; dormant code can manufacture random daily profit. |
| Legal and support | Blocked | Terms/privacy are drafts, operator details are absent, registration is disabled, and the contact form cannot deliver messages. |
| Build and dependencies | Partial pass | TypeScript, Prisma syntax, production build, and production dependency audit pass; lint and some test suites do not. |

## P0 — release blockers

### 1. Make Git the authoritative, secret-free application source

Evidence:

- `.env` is tracked and appears in four commits. It is also currently modified.
- `.gitignore` ignores only `node_modules` and `.next-public-check/`; it does not ignore `.env`, `.env.local`, `.next/`, or TypeScript build output.
- `app/`, `components/`, `lib/`, `prisma/`, `middleware.ts`, `next.config.ts`, `tsconfig.json`, and `.env.example` are untracked.
- 7,189 files under `node_modules` are tracked.
- The latest commit predates the Next.js/Supabase modernization. `Procfile` still starts the legacy Express/Mongo application with `node server.js`.

Required before any deployment:

1. Treat every secret ever stored in `.env` as exposed. Rotate the Mongo URI, database credentials, JWT secret, health/cron secrets, and any other private credentials. Review Supabase Auth/API secrets in the project dashboard as well.
2. Add complete ignore rules, remove `.env`, `.next/`, and `node_modules` from the Git index without deleting the local working files, and commit an example file containing names and safe placeholders only.
3. Commit the complete modern application and lockfile.
4. Choose one deployment target. For Vercel, remove or clearly retire the legacy `Procfile` and Express entry point. For a VPS, replace the Procfile/startup command with the correct Next.js standalone server.
5. Prove reproducibility in a fresh clone using the selected Node version, `npm ci`, Prisma generation, tests, and a production build.

Do not deploy from the current Git branch: it can expose credentials or publish the legacy application instead of the application being reviewed locally.

### 2. Rebuild and verify the migration chain

The current SQL files are not a safe linear migration history:

- `0_init` creates tables and policies. `20260911_unified_schema` then uses `CREATE TABLE IF NOT EXISTS`, which does not add its new columns to an existing table, and attempts to create many of the same policy names again without dropping them. A database starting from `0_init` will fail or remain incomplete.
- `20260912_financial_ledger` declares `wallet_id` and `user_id` as `TEXT`, then references UUID primary keys. PostgreSQL cannot create those foreign keys because the types are incompatible.
- The Prisma schema represents database UUID columns as ordinary `String` fields without `@db.Uuid`, so the declared client schema does not match the SQL schema.
- The ledger's `transaction_id` has no foreign key.
- There is no `prisma/migrations/migration_lock.toml`.
- `npx prisma migrate status` could not establish a connection to the configured hosted database, so the actual remote schema and applied migration list remain unknown.

Required:

1. Take a verified, restorable snapshot of all existing MongoDB and Supabase users, balances, transactions, wallet mappings, and authentication identifiers before changing schemas.
2. Inspect the hosted Supabase schema and `_prisma_migrations` table. Do not assume the files match the database.
3. Produce one reviewed baseline for a new environment or a forward-only repair migration for a populated environment. Never edit an already-applied production migration.
4. Align all IDs and foreign keys as UUIDs in SQL and Prisma, add the transaction relation, and add the migration lock file.
5. Apply the chain to an empty disposable database and a restored staging copy. Run `prisma migrate status`, `prisma validate`, `prisma generate`, application smoke tests, and rollback/restore drills.
6. Verify checksums and record who approved the production migration.

Prisma's parser passing only confirms that `schema.prisma` is syntactically valid; it does not prove that these SQL migrations can apply or that the hosted database matches it.

### 3. Replace the wallet mutation path with a concurrency-safe accounting contract

The current money-moving actions are not safe under crafted requests or concurrent activity:

- `submitWithdrawal` ignores `_quoteId` and does not repeat the amount, currency, method, network, address/tag, bank-field, fee, expiry, or KYC validation performed by `quoteWithdrawal`. A caller can invoke the server action without using the UI.
- The idempotency lookup is not scoped to the user and does not bind the key to a request fingerprint.
- Deposit, withdrawal, cancellation, allocation, stop, and trader-archive operations read wallet/transaction state and then write absolute values without row locking or conditional status/version updates. Two concurrent requests can lose updates, double-settle, over-release, or double-increment follower counts.
- `Prisma.Decimal.max(0, …)` hides an insufficient reservation instead of failing closed.
- Deposit transaction hashes are not unique by asset/network. The same proof can be submitted and credited more than once.
- There are no database checks for positive amounts, supported currencies, non-negative balances, `0 <= reserved <= balance`, bounded percentages/ratings, or valid string states.
- Withdrawal approval marks a request “dispatched” without an on-chain transaction hash, bank provider reference, signed payout instruction, or confirmation state.
- A deposit begins at amount zero and the administrator manually enters the credited amount; no chain indexer or custody/provider confirmation is connected.

Required contract:

1. Persist a server-created quote containing a canonical request fingerprint, fee source/version, expiry, and one-time use state. Re-validate everything inside submission.
2. Use serializable database transactions or atomic SQL/RPC functions with row locks/conditional updates. Status changes must be compare-and-set operations such as `PENDING -> APPROVED` exactly once.
3. Make idempotency keys unique per authenticated actor and bind them to the exact payload. A reused key with a different payload must fail.
4. Add database constraints and a supported asset/network model.
5. Separate requested, compliance-approved, dispatched, chain/bank-confirmed, failed, and reversed states. Store provider references and evidence.
6. Add adversarial integration tests: two simultaneous withdrawals, simultaneous approval/cancel, duplicate deposit hash, stale quote, negative/over-precision values, unsupported network, repeated copy request, and retry after uncertain response.

Until this is complete, real deposits, withdrawals, manual credits, profit accruals, and copy allocations must remain disabled.

### 4. Replace the ledger and reconciliation implementation

The table named `ledger_entries` is a balance-change journal, not a double-entry ledger. It has no journal/batch, accounts, balanced debit/credit postings, asset liability account, or enforced balancing rule. It can be updated or deleted by privileged application code and is deleted by cascade when a user or wallet is removed. Audit logs and transactions also cascade with users, allowing financial history to disappear.

Additional correctness problems:

- `transactionId` is not a foreign key or indexed.
- Trader archive records capital plus profit as a `PROFIT_ACCRUAL` transaction while the wallet is credited only with profit.
- Dashboard P/L sums both `UserCopyTrade.totalEarned` and approved `PROFIT_ACCRUAL` transactions, which can count the same outcome twice.
- Reconciliation calls itself “cryptographic” but performs ordinary arithmetic.
- The “circuit breaker” is in-memory state. It is neither persisted across serverless instances nor consulted by money-moving actions, so it does not stop writes.
- Health can report healthy before any reconciliation has run.
- Auto-backfill manufactures opening credit entries from current balances; this needs an independently approved migration snapshot, not an ordinary admin button.

Required:

1. Define the accounting model with a qualified accountant/financial systems engineer: accounts, journals, postings, holds, settlement, reversals, fees, realized P/L, and asset precision.
2. Make journal postings append-only and balanced at the database boundary. Preserve records under user closure through restricted/anonymized retention rather than cascaded deletion.
3. Use one canonical source for P/L and position state.
4. Persist reconciliation runs and discrepancies; make the breaker an enforced database/feature gate checked by every financial mutation.
5. Require dual control for manual credits, withdrawals, reversals, and trader liquidations. Store actor IDs rather than email strings.
6. Reconcile against independent custody/bank records, not only tables written by the same application.

### 5. Connect or disable incomplete customer financial features

- “Copy trader” does not execute or mirror trades through an exchange, broker, custody provider, or execution worker. Live trader mappers still mark execution as unavailable.
- `TradeService` is dormant but dangerous: it chooses a random percentage between configured daily ROI bounds and credits it as customer profit. Remove this code and the automatic-profit fields before production. Never derive customer returns from random values or a promised daily range.
- Repeating `requestCopy` overwrites the allocation amount, adds the full new amount to reserved funds, and increments followers again.
- There is no conversion quote/order/fill/settlement model. Current prices provide USD estimates only; they do not support live conversion during deposits or withdrawals.
- The historical value chart reconstructs past account value using today's quote, and falls back to `$1.00` for an unknown asset. It is not historical valuation.
- Market outages use fixture prices stamped with the current time. The dashboard consumes the quotes without preserving the fallback warning, so a fabricated reference value can look current.

Required:

1. Decide whether this release is an informational/manual-review product or an executing copy-trading product. The UI and terms must match the actual service.
2. For execution, integrate a licensed provider, custody/key-management model, signed webhooks, order and fill records, reconciliation, slippage/fee disclosure, and failure/retry handling.
3. Store timestamped historical quotes or portfolio snapshots. Never label a reconstruction from current prices as historical performance.
4. On market-data failure, show valuation as unavailable or clearly stale. Do not substitute fixture prices in live account totals.
5. Build conversion as a separate quoted transaction with rate source, expiry, spread/fee, user acceptance, fill, and settlement—not as a display calculation.

### 6. Remove fixture state from the live admin portal

The authenticated admin layout always initializes from `createAdminFixture()`. Only traders and signals are overlaid when live rows exist. If their live queries return zero rows or fail, fictional traders/signals are shown. Users, wallets, manual adjustments, account suspension, notifications, deposit addresses, audit history, administrator profile/security, and much of the overview remain preview-only local state.

This can make an administrator believe a change affected a customer when it only changed React memory. It also makes “no rows” indistinguishable from “service failed.”

Required:

1. Replace every live admin section with authenticated server queries and mutations. Do not import fixtures anywhere under `app/(admin)`.
2. Represent empty, unavailable, and error states explicitly. Never fall back from a production query to sample financial/customer data.
3. Implement real user suspension/session revocation, wallet adjustment workflow, deposit address management, notification delivery, audit querying, admin profile security, and role/permission management.
4. Add maker-checker approval, reason codes, optimistic concurrency, immutable audit events, and alerts for sensitive actions.
5. Keep fixtures only under `/design-preview`, which correctly returns 404 in production.

### 7. Complete secure Storage and KYC

- Live deposit proof submission stores a hash and optional filename; it does not upload a proof file.
- Live KYC upload is not rendered. The available form is explicitly preview-only and submits filename/type/size metadata, not file bytes.
- The storage helper is not called by these customer actions.
- If the service key is absent, the storage helper falls back to an anonymous key and then may store base64 document data in a database text field. Sensitive identity documents must never use that fallback.
- Storage INSERT policies check only the bucket. Any authenticated user can choose any object path; the policy does not require their Auth UID folder or ownership.
- No malware scanning, image/document content verification, retention/deletion job, or privacy access audit is implemented.

Required:

1. Use authenticated direct-to-storage uploads or short-lived signed upload URLs, with a server-issued path rooted in the caller's Auth UID.
2. Enforce the UID folder and owner in Storage RLS. Add only the SELECT/UPDATE/DELETE policies actually required.
3. Fail closed when storage is unavailable. Remove all base64 and arbitrary-URL fallbacks for KYC and evidence.
4. Validate MIME by file signature, scan uploads, strip unsafe metadata where appropriate, encrypt/private-store documents, log reviewer access, and implement approved retention/deletion.
5. Add end-to-end tests proving one user cannot upload to or read another user's path.

Supabase documents owner-folder policies using `storage.foldername(name)` and Auth claims; use that pattern and test it ([Storage access control](https://supabase.com/docs/guides/storage/security/access-control)).

### 8. Close authentication and authorization gaps

- The `users_update_own_profile` RLS policy allows the owner row before and after the update but does not restrict columns. Because application suspension is read from `public.users.status`, a project with UPDATE grants could let a suspended user set themselves back to `ACTIVE` through the Data API. Explicit grants are absent from migrations, so hosted privileges must be treated as unknown.
- Admin authorization uses server-managed `app_metadata`, which is the correct trust domain, but no audited provisioning/revocation process keeps it synchronized with the database role.
- Middleware accepts only `admin`; the server guard also accepts `superadmin`, producing inconsistent access.
- MFA can be enrolled but AAL2 is not required for administrators, withdrawals, KYC review, wallet adjustments, or other sensitive actions.
- KYC is not enforced: new accounts start `ACTIVE`, and `PENDING_KYC` adds a message but does not block withdrawal or copy actions.
- Session listing/revocation is not implemented.
- Registration is hard-disabled with `registrationReady = false`.

Required:

1. Revoke broad default privileges and grant only required operations/columns. Move role/status changes behind privileged server functions. Add pgTAP RLS tests for anon, ordinary users, suspended users, admins, and cross-user attempts.
2. Require AAL2/step-up authentication for admin access and sensitive financial actions. Supabase recommends checking the session assurance level and can enforce `aal2` with restrictive RLS policies ([MFA guidance](https://supabase.com/docs/guides/auth/auth-mfa)).
3. Enforce account and KYC state in every server mutation and, where possible, in database policy/functions.
4. Document bootstrap, role grant/revoke, staff offboarding, break-glass access, and periodic access review.
5. Configure and test Supabase Site URL, redirect allowlist, custom SMTP, email confirmation, password policy, breached-password protection, CAPTCHA/rate limits, recovery, and security-change notifications.

Supabase now recommends explicitly pairing grants, policies, and database policy tests; RLS alone does not remove existing grants ([RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security)).

### 9. Obtain legal, compliance, and content approval

The public release currently says:

- terms are “not active service terms”;
- privacy is “not a final privacy notice”;
- operator identity, address, eligibility, countries, fees, custody, complaints, retention, and regulatory status are unconfirmed;
- no verified support address exists;
- the contact form cannot send a message;
- public pages are `noindex, nofollow`.

There are also high-risk claims such as “Established in 2015,” “premier,” “verified performance,” “institutional,” and “safe, transparent, and trusted.” Database seed data contains very high win rates and daily ROI ranges. Live trader cards invent a 4.8 rating and 36 reviews when those fields are missing, then label the profile verified.

Required:

1. Have qualified counsel confirm the legal entity, jurisdictions, licences/registrations, product classification, eligibility, sanctions/AML/KYC obligations, custody disclosures, risk warnings, consumer rights, complaints route, governing law, and record retention.
2. Approve final terms, privacy/cookie notices, fee schedule, risk disclosures, and consent/version records.
3. Substantiate every performance, history, security, rating, review, and institutional claim with dated evidence. Never invent missing metrics. Remove or permanently label all seeded/sample data.
4. Connect a verified support channel and incident/complaints process.
5. Open registration and search indexing only after the service, documents, and support operation are approved.

## P1 — required engineering and operations before production

### Database and platform

- Use the Supabase shared transaction pooler for serverless runtime traffic, with Prisma-compatible pooling parameters, SSL, and a small connection limit. Keep a separate verified direct/session connection for migrations. Supabase recommends transaction mode for serverless functions and direct connections for migrations ([connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres)).
- The configured direct host at port 5432 was unreachable during both the production build and migration-status check. The build silently produced a home page without live trader data.
- Add indexes for transaction/user queries, notification/user queries, copy-trade trader queries, ledger transaction IDs, published trader ordering, signal feed filtering, and audit lookup. Validate with staging query plans.
- Add state and domain constraints instead of relying on comments around free-text columns.
- Harden `handle_new_user()` with an explicit safe `search_path`, explicit privileges, deterministic retry behavior, and tests for partial provisioning. Reconcile existing users missing BCH/LTC/XRP wallets.
- Review the September 2026 Supabase changelog before cutover. Data API exposure defaults changed in 2026, so explicitly configure exposed schemas/tables instead of relying on historical defaults ([Supabase changelog](https://supabase.com/changelog)).

### Web security

- Add a Content Security Policy and reviewed production headers: HSTS at the HTTPS edge, `X-Content-Type-Options`, frame protection via CSP, referrer policy, and permissions policy. Next.js supports route-wide response headers in configuration ([Next.js headers](https://nextjs.org/docs/15/app/api-reference/config/next-config-js/headers)).
- Replace the `next/image` remote hostname wildcard with the exact Supabase Storage/CDN hosts and any other approved image sources.
- Remove health secrets from query parameters; URLs commonly reach logs. Accept a header only and use a timing-safe comparison.
- Add abuse controls for public market endpoints, auth flows, password recovery, contact delivery, and all mutation endpoints.
- Return generic client errors while sending structured, payload-redacted errors to monitoring.

### Reliability and observability

- Persist reconciliation status. A module variable is not shared reliably across serverless instances.
- Add error reporting, structured audit/event logs, metrics, alerting, uptime checks, queue/provider monitoring, and on-call ownership.
- Health must fail when reconciliation has never run, the market source is fallback/stale beyond policy, migrations are pending, or required providers are unavailable.
- Configure Supabase backups/PITR appropriate to the risk, test restore, define RPO/RTO, and export a final legacy-data snapshot before cutover.
- Add timeouts/retries with bounded backoff and idempotency for every external call and webhook.
- Pin the Node runtime. Current local tests ran on Node 24.11.1; the repository has no `engines` field. Current Supabase client releases require Node 22 or later according to the September 2026 changelog.

### CI and quality gates

- Replace `next lint`; it launches an interactive deprecated setup and exits without linting. Add a committed ESLint configuration and non-interactive lint command.
- Add `typecheck`, `test`, `test:integration`, and `test:e2e` scripts. There is currently no aggregate test script, and the manual PowerShell loop can return success even when individual test processes fail.
- Fix the failing admin test: the live admin layout imports fixtures.
- Update the dashboard status test to the intentional hold model or fix the implementation.
- Fix the public smoke test's route allowlist (`/forgot-password` is built but rejected by the test) and run it against a production server in CI.
- Add real database integration tests, Supabase RLS/Storage tests, authenticated browser tests for user/admin roles, concurrent financial tests, and accessibility tests on representative desktop/tablet/mobile sizes.
- Add CI that installs from the lockfile, generates Prisma, verifies migrations against a disposable database, lints, type-checks, tests, builds, runs production smoke tests, scans dependencies/secrets, and blocks deployment on failure.

## Verification results from this audit

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Pass |
| `npx prisma validate` | Pass (schema syntax only) |
| `npm run build` | Pass after sandbox permission; database connection failed during prerender and was swallowed |
| `npm audit --omit=dev --json` | Pass: 0 known production dependency vulnerabilities across 490 production dependencies |
| `npm run lint` | Fail: deprecated interactive `next lint`; no lint result |
| Unit/static script suite | Most scripts pass; `test-admin-dashboard` and `test-dashboard-status` fail |
| Public production smoke | Pages initially pass rendering checks, then the test fails on its incomplete `/forgot-password` allowlist |
| Production route probes | `/`, `/login`, `/register` = 200; `/dashboard` -> `/login`; `/admin` -> `/admin/login`; `/design-preview` = 404; `/api/health` = 503 while DB unavailable |
| Market feed probe | Live CoinGecko response returned six assets at audit time; outage behavior remains unsafe because it uses fixture quotes |
| Hosted Supabase migration status | Unverified; connection/schema engine check failed |
| Authenticated user/admin E2E | Not run; no staging test accounts or verified hosted DB connection |
| RLS/Storage isolation | Not run against hosted Supabase; repository SQL review found gaps |

## Environment contract to finalize

Production code refers to these variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` or, preferably for new Supabase projects, the current server secret-key model
- `DATABASE_URL`
- `DIRECT_URL`
- `COINGECKO_API_KEY` or `COINGECKO_PRO_API_KEY`
- `HEALTHCHECK_SECRET`
- `CRON_SECRET` if a real protected scheduled job is added

The current `.env` does not contain all of them, while `.env.example` contains an unused `NEXTAUTH_SECRET` and omits the market and health keys. After secret rotation, document which variables are required at build time, runtime, preview, staging, and production. Keep server secrets out of every `NEXT_PUBLIC_*` variable and out of Git. Vercel environment values should be set per environment rather than committed ([Vercel environment variables](https://vercel.com/docs/environment-variables)).

## Recommended release order

1. Freeze money-moving features and take offline legacy/Supabase snapshots.
2. Rotate secrets and repair Git/deployment hygiene.
3. Inventory the hosted database, rebuild the migration chain, and prove it in disposable and restored staging databases.
4. Replace the accounting, idempotency, locking, reconciliation, and settlement contracts.
5. Connect real admin data and remove all production fixture fallbacks.
6. Complete Storage/KYC ownership, scanning, retention, and access logging.
7. Enforce KYC, MFA/AAL2, privileges, RLS, and staff role lifecycle.
8. Decide and implement the real copy-trading/execution and conversion scope; remove random/fabricated financial behavior.
9. Obtain legal/compliance/content approval and connect support.
10. Add CI, staging E2E/concurrency/security/accessibility tests, monitoring, backups, and an incident runbook.
11. Run a final go/no-go review from a clean clone and a production-like staging environment.

## Go-live definition of done

Production is ready only when all of the following are evidenced, not merely asserted:

- clean, reproducible Git commit with no secrets or tracked dependencies;
- restorable backups and a reconciled migration/cutover report;
- zero pending migrations and zero unexplained schema drift;
- passing RLS and Storage cross-user isolation tests;
- passing concurrent/idempotent financial workflow tests;
- independent ledger/custody reconciliation with zero unexplained discrepancies;
- no fixture, fallback, or random value can appear as live account or performance data;
- every admin screen reads/writes authorized live data or clearly reports unavailable;
- AAL2 and role controls pass user, admin, superadmin, suspended, and revoked-session tests;
- approved terms, privacy, fees, risk, operator, support, and regulatory disclosures;
- passing lint, types, unit, integration, E2E, accessibility, security, build, and production smoke gates;
- monitoring, alerting, backups, rollback, incident response, and named operational owners are active.

Until those gates close, restrict any deployment to private staging with test accounts and valueless test data.
