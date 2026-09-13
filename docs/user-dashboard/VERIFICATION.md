# Dashboard verification — 7 September 2026

Scope: resumed the interrupted frontend build. Tests use fixtures or stubbed providers, never private customer accounts.

## Automated checks

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed |
| `node scripts/test-dashboard-screens.mjs` | 743 checks; 17 routes × 16 scenarios, valid funded trader detail, route wiring, query normalization and independent read failures |
| `node scripts/test-dashboard-fixtures.mjs` | 1,185 checks; exact accounting, request idempotency, timeout reconciliation and fixture lifecycle |
| `node scripts/test-dashboard-money.mjs` | 134 checks |
| `node scripts/test-dashboard-format.mjs` | 124 checks |
| `node scripts/test-dashboard-status.mjs` | 167 checks |
| `node scripts/test-dashboard-navigation.mjs` | 91 checks |
| `node scripts/test-dashboard-ownership.mjs` | 251 checks with stubbed Prisma/Supabase |
| `node scripts/test-account-routing.mjs` | 29 checks |
| `node scripts/test-public-routing.mjs` | 46 checks |
| `node scripts/test-public-theme.mjs` | 8 scenarios |

The final isolated production build (`$env:CA_ISOLATED_BUILD='1'; npm run build`) passed with exit code 0 after compilation, type checking, page generation and build tracing. Windows sandbox worker spawning initially failed with EPERM; the authorized build ran outside that restriction. Build output is isolated in `.next-public-check`, not the active dev server's `.next` directory.

The final build reports approximately 197 KB first-load JavaScript for the live dashboard routes, compared with 299 KB before chart code was deferred. These are build-reported bundle sizes, not measured real-user load times. `git diff --check` on the scoped changes also passed.

Build-time masked session-lookup warnings occur without an authenticated request; they are not evidence of a working authenticated connection. No credentials or record payloads were printed.

## Browser checks performed

- Overview inspected at 1440×900, 768×1024 and 390×844: desktop sidebar, tablet rail, stacked phone cards and no measured page-level horizontal overflow.
- Dark and light dashboard rendering inspected; fonts and brand tokens retained.
- Asset list and BTC detail rendered; deposit instructions with BTC/Bitcoin rendered with QR and exact address.
- Activity rendered with status text and real fixture pagination; allocation detail rendered with fees, timeline and activity.
- Discover traders and Alex Morgan's fixture profile rendered without nested headings or phone overflow. Metrics carry their provided provenance.
- Withdrawal tested at 390×844 in light theme: selected USDT/Tron, entered an explicitly fictional recipient, requested a 25 USDT quote, reviewed 1 USDT fee and 26 USDT total debit.
- Submitted only in the isolated unknown-outcome fixture. The timeout changed the action to Check request status. Reconciliation returned the original request WDR-2026-0004; no live transfer occurred.
- Profile, security, verification, signals and notifications rendered. Security password fields have visible labels and password input types. No real credentials were entered.
- Help accordion expanded through its button.
- The preview read-error toggle displayed six independent error regions with retry controls and could be cleared.

Some development navigations exceeded browser automation deadlines while compilation was active; the resulting pages were inspected after loading. Do not count an intermediate skeleton as a completed screen check.

## Not verified / remaining acceptance work

- No live-account integration tests, monetary writes, real MFA/password changes, private uploads, deployments, or database migrations.
- No full automated WCAG audit or screen-reader certification. Keyboard/dialog primitives and accessible labels were reviewed, but the complete keyboard-only matrix remains open.
- The full specification's viewport, 200% zoom, RTL, reduced-motion, every-scenario/every-screen visual and performance matrix has not been completed. Unit coverage across scenarios is not visual coverage.
- No fresh screenshot files were saved for this takeover; earlier screenshot artifacts remain historical shell/component evidence, not evidence of these new screens. Current visual inspections were through the browser.
- Live service gaps and frontend follow-ups are listed in BUILD-STATUS.md. Do not mark this product launch-ready from a successful compile alone.

## Design review guidance applied

The layout and accessibility skills informed the responsive asset table/disclosures, readable monetary/status labels, shadcn confirmation dialogs and focus restoration. React performance guidance moved chart code behind a dynamic import. The existing typography, spacing and colour contracts take precedence over generic skill defaults.
