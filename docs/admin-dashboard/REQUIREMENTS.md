# Admin dashboard requirements

Recorded 8 September 2026. These are build requirements, not implemented features. This document adds trader management and individual wallet profit adjustments to the planned admin dashboard.

## Design and scope

- Follow the repository `DESIGN.md` and the established customer dashboard component patterns. Retain the approved typography, tokens, 4pt spacing, light/dark themes and responsive layouts.
- Reuse the owned shadcn sidebar and dashboard components. Public marketing layouts and button overrides do not apply here.
- Keep all admin reads and writes behind server-enforced role and permission checks. A hidden button or a restricted-area label is not access control.
- Do not migrate data or alter real user balances while designing or testing the preview. Use isolated fixtures until staging integration is explicitly authorized.

## Trader management

Provide a trader list with search, status filters, add, edit, preview, publish, unpublish and remove actions. Provide a full profile editor, not only a name and percentage form.

### Profile information

- Stable trader ID, display name, profile picture with alternative text, short summary and biography.
- Trading strategy category and description, traded markets/assets, experience and typical holding period.
- Accuracy/win rate with its definition, measurement period, sample size, source and last-updated date.
- Risk classification with methodology; returns and drawdown only when supported by records and a stated measurement period.
- Copier count and ratings with their sources and rating count. Prefer actual platform counts. Imported or manually supplied values must be identifiable as such, not presented as platform-generated evidence.
- Copy mode, eligibility, minimum allocation and currency, fees and applicable limits when supported by the execution service.
- Draft/published/archived status and public featured placement. Internal notes and evidence remain private.

Allow manual profile and metric entry. Manual entry must not automatically confer a verified badge. Missing metrics remain unavailable rather than defaulting to impressive values. Validate percentages, counts and amounts on the server. Distinguish win rate from return, and do not invent either from the other.

Use an authenticated image-upload flow with file type, size and content validation, generated storage names and appropriate image processing. Publish only the approved profile image, never private evidence documents. Require rights to use the image and do not represent a generated identity as a verified real trader.

### Shared publication

The admin editor, user dashboard discovery/profile pages and public trader sections must use the same persisted trader record and ID. Do not maintain separate editable copies or leave production pages connected to fixture arrays.

- Saving a draft does not publish it. Publishing makes the approved public fields available to both customer discovery and the public website.
- Editing a published profile updates both consumers after successful persistence and cache invalidation. Open customer pages revalidate through a defined refresh or subscription mechanism.
- Failed saves must not show success or change either consumer. Define and test the cache freshness bound before shipping.
- Public reads expose an explicit public-field whitelist. Never expose account associations, copier identities or internal notes.
- Removing a published trader archives/unpublishes it and prevents new copy requests. Preserve historical allocations, activity and audit records. Explain affected active allocations before confirmation; do not silently liquidate or cancel them.
- Existing allocation pages retain an identifiable historical trader reference even after removal from discovery.

## Individual wallet profit adjustments

Within each user's detail page, provide their wallet list and explicit `Add profit` and `Remove profit` actions for the selected wallet. Support BTC, ETH, BCH, LTC, XRP and USDT where the corresponding wallet exists. Treat a supplied USD settlement ledger separately.

### Review flow

1. Select the user and an existing currency wallet. Show a stable user identifier and wallet currency throughout the flow.
2. Select add or remove, enter a positive exact amount, and provide a mandatory reason and supporting reference where applicable.
3. Retrieve current balances and eligibility from the server. Show before/after values and any available/reserved restrictions. Never trust client-calculated totals.
4. Present a confirmation with user, wallet, currency, signed adjustment, reason and effect on balances. Require an authorized financial-adjustment permission and recent authentication appropriate to the action.
5. Submit with an idempotency key. Show confirmed success only after the financial transaction and audit entry commit. A timeout requires status reconciliation before retrying.
6. Update the user's wallet and activity views from the committed result. Record a customer-visible description such as `Manual profit credit` or `Profit correction`, without exposing private operator notes.

### Accounting requirements

- Record an append-only ledger adjustment with actor, user, wallet, currency, amount, direction, reason, reference, timestamp and before/after balances. Never overwrite balances without a corresponding ledger event.
- Correct mistakes with linked reversals, not deleted or edited financial history. A removal of previously credited profit must identify the original credit when applicable and prevent reversing more than its remaining unreversed amount.
- Use exact decimal arithmetic and currency precision. Reject invalid, zero, negative input amounts, unsupported precision and insufficient available funds.
- Do not consume reserved withdrawals, copy allocations or locked funds. If profit has already been spent or withdrawn, block the simple reversal and surface the need for a separately authorized reconciliation process.
- Commit balance changes and ledger/audit records atomically. Handle concurrent withdrawals and adjustments without negative spendable balances or duplicate application.
- Define how balance, locked profit and total profit relate before implementing writes. Existing field names alone are not an accounting policy. Preserve principal and distinguish a profit correction from a deposit, withdrawal, fee or general balance correction.
- Manual credits are operator-recorded adjustments, not proof of executed trades or independently verified investment performance. Do not feed them into trader win rates or audited-return claims.
- No bulk adjustments, automated profit generation, on-chain transfers or deletion of financial records are authorized by this requirement.

## Build sequence and acceptance checks

1. Audit existing trader records, wallet services, authentication and the public/customer read paths. Document gaps before schema changes.
2. Build admin profile and wallet-adjustment screens against isolated fixtures, including loading, empty, validation, permission-denied and failed-save states.
3. Implement authorized trader persistence, validated image upload and shared public/customer reads. Test create, edit, publish, unpublish and removal across both consumers.
4. Establish the accounting policy and implement atomic, idempotent wallet adjustments with immutable history.
5. Test cross-user targeting, denied roles, malformed amounts, concurrent operations, duplicate submissions, unknown outcomes, reversals and reserved-fund protection in isolated tests.
6. Verify that trader removal preserves existing allocation history and that public responses cannot reveal private fields.
7. Verify light/dark themes, mobile/tablet/desktop layouts, keyboard operation and confirmation focus handling. Complete staging integration before enabling real financial actions.

These features remain pending until their implementation and verification are recorded in an admin build-status document.
