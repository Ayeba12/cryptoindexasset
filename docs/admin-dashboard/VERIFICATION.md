# Admin dashboard verification

Updated 11 September 2026 using isolated fixtures. No real accounts or funds were used.

## 11 September follow-up

Passed TypeScript and 110 admin checks, including signal field validation, hidden-by-default creation, duplicate rejection, an audit entry, unchanged wallet state and trader radius source assertions. Also passed 743 customer-screen, 167 status, 134 exact-money, 124 formatting and 36 semantic colour/coin checks. Total: 1,314 checks.

Interactive browser automation was not available for this follow-up. Signal form keyboard interaction, visual radius consistency and live customer synchronization are not established by the unit tests. The previous browser and production-build evidence below is dated 9 September, not a new result for the signal form.

HTTP smoke checks returned 200 for `/design-preview/admin/signals` and `/design-preview/dashboard/traders`. The server-rendered signals page contains Add signal and the fixture analysis. The customer HTML response alone did not expose the updated portrait class, so it is not visual verification of the client-rendered portraits.

## 9 September baseline

## Automated checks

| Command | Result |
| --- | --- |
| `node scripts/test-admin-dashboard.mjs` | 88 checks passed: exact amounts, duplicate submissions, targeting, stale adjustments, reversals, reserved funds, trader validation/public whitelist, account validation, route presence and stubbed admin authorization |
| `node scripts/test-dashboard-screens.mjs` | 743 existing customer-screen checks passed |
| `node scripts/test-dashboard-navigation.mjs` | 91 existing navigation checks passed |
| `node scripts/test-account-routing.mjs` | 29 stubbed middleware scenarios passed |
| `node scripts/test-public-routing.mjs` | 46 routing checks passed |
| `node scripts/test-public-theme.mjs` | 8 theme-state scenarios passed |
| `node node_modules/typescript/bin/tsc --noEmit` | Passed |
| Isolated `npm run build` with `CA_ISOLATED_BUILD=1` | Passed; 19 protected admin routes generated. Admin first-load JavaScript approximately 234 kB |

The build emits existing customer session-lookup warnings while generating pages. They do not establish live authentication or database connectivity. Preview routes have a development-only guard; production route generation is not evidence they are publicly accessible.

## Browser checks

The local admin preview was inspected at desktop, 768px tablet and 390px mobile widths, in light and dark themes. The observed pages did not overflow horizontally. Tables retain local horizontal scrolling when needed.

Account additions checked in this pass:

- Saving a fictional display name updates the account menu.
- A blank/whitespace display name displays a linked validation message and an alert.
- Simulated save failure shows no success and retains the previously saved profile. Discard edits restores that saved value.
- Read-only role disables profile saving.
- Theme switching and comfortable-spacing preference update the preview.
- 2FA demonstration enrollment changes the labelled demo state only. Password and other-device logout controls remain disabled.
- The logout confirmation initially focuses Keep reviewing. Cancelling returns focus to the account menu button.
- Confirming Leave preview navigates to `/design-preview/home`. No real logout was submitted.
- Help shows links to the admin and customer previews.

Earlier checks in the same build verified a fictional USDT profit credit with its review and audit entry; trader editing, draft creation, archive and two-consumer publication projection; failed-save isolation; and navigation to the operational pages. This is not an exhaustive browser test of every financial decision path.

## Limits

- The authorization tests use isolated stubs. Real MFA, sessions, role provisioning and logout have not been exercised.
- Financial tests cover preview logic only, not transaction isolation, persistent idempotency or concurrent database writes.
- Public/customer trader synchronization remains unconnected.
- Browser checks are focused manual checks, not a full WCAG audit, assistive-technology certification or exhaustive device matrix.
- No live credentials, uploaded identity documents, database migrations or real balances were involved.
