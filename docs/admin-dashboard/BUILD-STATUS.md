# Admin dashboard build status

Updated 11 September 2026.

## Latest additions

- Trading signals now has an Add signal form with title, asset, direction, timeframe and analysis/risk text. New records start hidden, appear in the local list and create an audit entry. Show/hide remains a separate confirmation. These are in-memory preview operations, not customer publication.
- Customer trader portraits now use the same design-system radius as public and admin portraits, including the image, fallback and border layer. Account avatars are unchanged.
- `docs/SUPABASE-INTEGRATION-PLAN.md` records the cross-portal integration sequence and source-based gap report. Persistent trader creation/update/archive must drive both public and customer directories. That synchronization is not connected yet.
- The market-data plan now explicitly requires both informational equivalents and actual conversion. Execution remains disabled until provider, custody and settlement contracts are approved.

## Current state

The admin dashboard is ready for local design review with fictional records. It is not ready for live financial operations. The preview does not read customer data, transfer money, publish real traders or change account security.

Start the app with `npm run dev`. Open `/design-preview/admin` on the local server. The customer comparison is at `/design-preview/dashboard`.

The preview is development-only. Reloading or using Reset preview restores fixtures. Theme preference is the exception: it uses the existing browser-local dashboard theme setting, shared with the customer dashboard and separate from public-page preferences.

## Built for review

| Area | Available behavior |
| --- | --- |
| Navigation | Owned shadcn sidebar primitives, desktop sidebar, tablet icon rail, mobile navigation, breadcrumbs and theme selector |
| Overview | Fictional review counts, request queue, operational checks and recent audit activity |
| Users and wallets | Searchable users, individual details, currency wallets, add/remove profit review with exact amounts and before/after values |
| Trader profiles | Create/edit draft, image selection, validation, publish/unpublish, archive and two-consumer publication preview |
| Operations | Deposit/withdrawal decisions, verification review, notifications, signals and deposit-wallet drafts |
| Audit | In-memory activity from supported preview actions, not a production immutable ledger |
| Account profile | Editable fictional display name, phone and job title; read-only email and role; validation and failed-save feedback |
| Security | Clearly labelled 2FA demonstration states; disabled password and device-session controls with explanations |
| Preferences | Browser theme, preview table spacing and a demo review-alert preference |
| Help | Links to both dashboard previews, explanation of available actions and remaining integration work |
| Account menu | Header and sidebar menu with profile, security, preferences, help and logout |
| Logout | Preview exit confirmation navigates to the public home preview; live menu reuses the existing POST logout endpoint |

The existing `DESIGN.md` controls typography, colour, spacing and component treatment. Public marketing layout and button overrides do not apply to these admin screens. No new fonts or UI library were added.

## Preview and live boundary

`app/design-preview/admin` supplies fixtures to `AdminProvider`. All mutations stay in memory. The fault selector allows ready, empty, read-error, save-failure and read-only-role states.

`app/(admin)` and `AdminLivePage` require a verified administrator session through `lib/admin/access.server.ts`. The guard checks the server-managed `app_metadata.role`, not user-editable metadata. Live pages supply no fixtures and show an integration notice. Hiding navigation is not the authorization mechanism.

The live logout form uses `/api/auth/logout`, which currently redirects to `/login`. This build did not change that endpoint or test it against a real session. Preview exit never submits that form.

## Still required before live use

- Authorized trader persistence, validated image storage and shared public/customer reads. The publication preview does not update actual public or customer pages.
- Server-defined metric evidence and verification policy. Manual figures cannot become verified performance automatically.
- A settled wallet accounting policy, atomic balance/ledger writes, immutable audit history, reconciliation and staging concurrency tests. Client preview checks are not backend enforcement.
- Real approval services, private verification-document handling, notifications and signal management.
- Persisted administrator profile settings, verified email-change flow, password changes, MFA enrollment/removal, session management and sensitive-action reauthentication.
- Fine-grained staff permissions and end-to-end staging tests with authorized test accounts.

No database migrations, production writes, real security changes or deployment were performed for this preview.

## Next review

Compare admin and customer dashboards with the owner before changing their design. Start with navigation and overview, then users/wallets, trader management, request queues and account settings. Record approved design changes separately from backend integration requests.

See `REQUIREMENTS.md` for the intended live trader and wallet behavior and `VERIFICATION.md` for test evidence and limits.
