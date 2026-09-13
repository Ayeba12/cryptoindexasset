# Crypto Index Asset: user dashboard build instructions

Version 1.0 · 6 September 2026 · Prepared for Antigravity

## 1. Assignment and completion boundary

Build the complete customer dashboard described here inside the existing Next.js project. Treat this document as the architect's specification. Implement in the sequence in section 13, produce the evidence in section 14, and report against section 15. Do not substitute a generic finance template or stop after the overview screen.

This handoff authorizes the dashboard design and its implementation plan. The current deliverable is this Markdown file; application code has not been changed by this planning task. When instructed to execute it, Antigravity should complete the interface, reusable components, responsive states and isolated demo flows. Connect existing supported services only after checking their contracts. A missing service must not prevent the rest of the interface from being built.

Distinguish two completion states:

- **Interface complete:** every route, interaction, responsive layout and failure state in this specification is implemented and reviewable with deterministic fixtures. Production routes keep authentication. No demo mutation reaches a real account.
- **Live workflow complete:** authenticated reads and writes pass the ownership, accounting and integration checks for that workflow. A working demo is not evidence of this state.

Produce both light and dark versions of every screen. Preserve the public website, its approved About copy, public Dovetail direction, authentication templates and admin application. The customer dashboard uses the shared Mira design system. Public marketing scale, 48px marketing buttons, product-image presentations and marquees do not transfer into this workspace.

## 2. Read first and resolve conflicts correctly

Paths in this document are relative to the repository root. Read these sources before editing:

1. Applicable `AGENTS.md` instructions, `memory.md` and `report.md`.
2. `DESIGN.md`, `COMPONENTS.md`, `components.json`, `app/globals.css`, `tailwind.config.ts` and `app/layout.tsx`.
3. `app/(dashboard)/layout.tsx` and `app/(dashboard)/dashboard/page.tsx`.
4. `components/blocks/dashboard-01-preview.tsx`, `components/app-sidebar.tsx`, `components/ui/sidebar.tsx`, `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/chart.tsx` and `components/data-table.tsx`.
5. `prisma/schema.prisma`, `lib/services/wallet.service.ts`, `lib/services/trade.service.ts`, `lib/supabase/middleware.ts`, `middleware.ts` and `app/api/auth/logout/route.ts`.
6. `public/brand/README.md`, `docs/public-portal/components.md` and `docs/public-portal/community-verification.md` for brand assets and public boundaries.

Use the latest explicit user direction first, then the shared design contract, then the dashboard-specific decisions below. Source inspection determines what is actually installed or working. Old recommendations in `memory.md` are historical: do not adopt its emerald/glass aesthetic, old dependency targets, suggested schema, or broad database IP allowlist. Restrict any future database access to the required environment and identity.

### Repository evidence at handoff

| Observed source | Current reality | Instruction to builder |
| --- | --- | --- |
| `package.json` | Next.js 15 range, React 19, Tailwind 3.4, Prisma 6, Supabase SSR, Recharts, next-themes, Radix and Phosphor are declared | Inspect the lockfile for resolved versions. Keep the current stack; no framework or CSS-major upgrade in this dashboard build |
| `components.json` | `radix-mira`, zinc, Phosphor, CSS variables; two external registries configured | Preserve preset `b6VP8NA9AG` intent. Do not reapply the preset or initialize shadcn over owned source |
| Current dashboard layout/page | Hard-coded slate/emerald colors, lightning logo, static balances, unconditional 2FA/live labels, placeholder counts | Replace with the specified token-driven shell and data-dependent states |
| Dashboard routes | Only the overview page is present under `app/(dashboard)` at inspection | Build the route map below; current links alone do not mean pages exist |
| `dashboard-01-preview.tsx` | Imported shadcn composition and generic analytics/document fixtures exist | Reuse its structural patterns; remove revenue, churn, Acme, document-management and sample-user content from the customer implementation |
| Earlier `sidebar-07` request | Sidebar primitives exist; a separately named `sidebar-07` implementation was not found | Inspect existing shell source before downloading anything. Use its collapsible-sidebar pattern, not an assumed uninspected block |
| Some owned UI source | Contains newer Tailwind syntax such as `px-(--card-spacing)`, `--spacing()` and container utilities while Tailwind 3 is configured | Verify computed styles. Port required geometry into dashboard-scoped CSS or compatible utilities. A successful TS build does not prove those classes emit CSS |
| `WalletService.initializeWallets` | Creates BTC, ETH, USDT and USD only | Product design includes BTC, ETH, BCH, LTC, XRP and USDT. Do not initialize or migrate real wallets during the UI build; expose unsupported currencies accurately |
| Prisma wallets | `balance`, `lockedProfit`, `totalProfit`; no explicit general hold ledger | Do not rename `lockedProfit` to reserved balance or infer available funds from it |
| Prisma transactions | PENDING, APPROVED, REJECTED, CANCELLED; no settlement enum or recipient/network model | Separate processing status from transfer settlement; design the missing contract before enabling transfers |
| `TradeService` | Can generate positive random ROI and credit USD wallets; no inspected exchange execution connection | Never call this service to animate a demo or represent verified trading returns. Live copy execution needs a separate verified integration |
| Current auth middleware | Exact public `/copy-trading`; protected prefixes include `/dashboard` | Put customer routes under `/dashboard/*`; keep the marketing explainer at `/copy-trading` |
| Existing public traders | AI portraits and fictional statistics with explicit labels | Available as development fixtures only; never silently seed them into real trader records |
| Earlier build record | Auth route TypeScript errors were reported during homepage work | Recheck the baseline. Record existing failures separately; do not suppress types or claim an overall pass |

These observations are file evidence, not a live database audit. Reconcile subsequent changes before implementation.

## 3. Product and visual direction

The customer should answer four questions quickly: what do I own, what can I use, what is pending, and what should I do next?

Build a quiet, compact financial workspace. The overview begins with account value and funding actions, followed by asset balances, recorded performance, allocations and activity. Use flat zinc panels, careful alignment and a small number of yellow actions. Data and its units carry the hierarchy. Use the CA logo with no adjacent full business name; retain the business name in accessible labels.

The approved public site supplies brand continuity, not the dashboard composition. Dashboard screens contain real HTML controls and charts. Marketing product screenshots remain inspiration assets, never the body of the operational dashboard. Do not copy numbers or labels embedded in those screenshots into production data.

### Visual rules that must survive every page

- Space Grotesk for headings. Geist Mono for navigation, body text, labels, data and controls. Use the existing font variables.
- Semantic tokens from `DESIGN.md` for every surface, border, focus indicator and chart series. Use yellow for the principal action, orange chart tokens for series, neutral labels for ordinary statuses and destructive for actual failures or dangerous actions.
- Primary yellow is not a profit or account-health color. Show signed changes with explicit labels. Do not introduce green/red trading conventions without updating the shared semantic system.
- Shared base radius is `0.45rem`. Preserve the shared `sm`, `md`, `lg` mappings where the primitive uses them. No pill panels, new corner family, gradients, glowing blobs, glass effects or shadows around every card.
- Phosphor icons, normally 16px in controls and 20px for navigation; regular weight, fill only for a deliberate selected state. No mixed Lucide and Phosphor icons in the finished dashboard.
- One principal filled action per task region. Table rows and cards are not all clickable; give explicit, named links or buttons.
- Prefer open rows inside a single panel. Do not wrap every metric, label and description in another card.

## 4. Exact geometry, type and theme contract

The values here are dashboard-specific implementation decisions using the existing 4pt grid. Document new contextual variants in `COMPONENTS.md` when implemented. Do not rewrite global defaults to force them.

### Typography

All sizes below are `font-size / line-height` in pixels at a 16px root; implement with rem.

| Role | ≥1200px viewport | 768–1199px | <768px | Weight / font |
| --- | --- | --- | --- | --- |
| Page H1 | 28/36 | 28/36 | 24/32 | 600 Space Grotesk |
| Main account value | 32/40 | 28/36 | 28/36 | 500 Geist Mono, tabular |
| Summary metric | 24/32 | 24/32 | 20/28 | 500 Geist Mono, tabular |
| Panel H2 | 20/28 | 20/28 | 20/28 | 500 Space Grotesk |
| Subsection H3 / dialog title | 16/24 | 16/24 | 16/24 | 500 Space Grotesk |
| Body / navigation / table values | 14/20 | 14/20 | 14/20 | 400 body, 500 selected navigation; Geist Mono |
| Field text | 14/20 | 14/20 | 16/24 | Geist Mono; 16px touch form text avoids mobile zoom |
| Label / help / compact control | 12/16 | 12/16 | 12/16 | 400 help, 500 label/control; Geist Mono |
| Identifier / timestamp | 12/16 | 12/16 | 12/16 | Geist Mono |

Keep monetary figures at their appropriate role; never shrink an eight-decimal balance to fit a card. Wrap the unit onto a second line or provide an exact-value detail. Single H1 per page; real heading elements, not merely styled card titles. No fixed-height text boxes. Ordinary prose is at most 65ch; explanatory forms use approximately 52ch.

### Layout and controls

| Element | Specification |
| --- | --- |
| Expanded sidebar | 256px; internal groups padded 8px; 40px rows with 12px icon/text gap |
| Collapsed rail | 48px; visible labels in accessible tooltips; centered icon and 44px touch hit region |
| Navigation sheet | 288px maximum, bounded by viewport minus 32px; at very narrow widths shrink instead of overflowing |
| Header | 64px minimum; sticky at top; 16px horizontal content padding mobile, 24px tablet, 32px desktop |
| Main workspace | Available width after sidebar; content maximum 1536px, centered; do not apply marketing shell widths |
| Page gutters | 16px below 768px, 24px at 768–1199px, 32px at ≥1200px |
| Page introduction → first content | 24px; title → subtitle 8px; action group gap 8px |
| Major page sections | 24px mobile, 32px desktop; card grid gap 16px mobile/tablet, 24px desktop |
| Summary card inset | 16px; label → number 8px; number → support line 8px |
| Chart / form / detail panel inset | 24px desktop/tablet, 16px mobile; compose with owned Card rather than double-padding CardContent |
| Compact controls | Existing sizes 20/24/28/32px; normal desk action `size=lg` 32px; dense table action 28px |
| Touch and consequential forms | Dashboard contextual wrapper grows action/input/select to at least 44px; 12px inline inset; existing radius and variants retained |
| Field stack | Label → input → error/help: 8px; field → field: 24px; grouped alternatives: 12px |
| Data table | 40px header; 48px minimum desk rows, 56px touch rows; 12px inline and 8px block cell padding |
| Tabs / filter controls | 32px desk minimum, 44px touch; wrap controls rather than clipping the principal action |
| Avatar | 32px rows, 40px trader cards, 64px trader profile; initials fallback |
| Dialog | 560px maximum, 16px viewport clearance, 24px inset desktop / 16px mobile; 100dvh-aware scroll constraint |
| Detail sheet | 480px maximum desktop; full viewport width below 768px; labeled title, scrollable content, close always reachable |
| Form composition | Maximum 960px: 7:5 form/summary split when each fits; one column otherwise; field column never narrower than 320px except on a viewport that requires it |

Borders can be 1px and focus rings 2px. These are optical exceptions. Touch targets must not overlap. Use logical properties and safe-area insets on sticky mobile actions. A footer must never cover validation errors, the final row or the focused input when the virtual keyboard opens.

### Responsive decisions

| Viewport | Shell | Workspace behavior |
| --- | --- | --- |
| 320–767px | Closed navigation sheet; header has menu, current page, notifications and user menu | One column; summary 2×2 only when each card has ≥160px, otherwise one; forms and split panels stack; full-width task actions within gutters |
| 768–1199px | 48px rail by default; expand navigation as an overlay sheet without stealing the reading width | Two summary columns; table remains a table in its own scroll region; charts/details usually stack |
| ≥1200px | 256px sidebar; optional collapse to rail | Four summary columns when each has ≥200px; 12-column overview grid and 8:4 panel split |
| ≥1920px | Same sidebar and maximum workspace | Keep content centered and readable; do not stretch chart labels, prose and columns indefinitely |

These are initial thresholds derived from the specified sidebar and minimum content widths. Validate at 320, 390, 768, 1024, 1280, 1440 and 1920px and adjust locally if real text breaks earlier. Do not use the sidebar primitive's default 768px mobile breakpoint for a different rail policy without explicitly adapting the dashboard shell. Avoid changing a shared hook used by admin or preview pages.

Keep DOM and keyboard order identical to the visual order. Use this source order at every width: heading/actions, balance summaries, account chart, assets, allocations, needs attention, recent activity. On mobile reduce the chart plot to 224px high and retain its summary so asset balances are not buried beneath a desktop-sized plot. Never visually reorder focusable regions. No fixed tablet canvas and no scaled-down desktop screenshot.

### Theme implementation

Default to System and offer Light, Dark and System in the user menu/settings. Store only the dashboard preference, e.g. `ca-dashboard-theme`. A public preference may remain independent. A theme change must update the workspace, sidebar, menus, tooltips, dialogs, QR surroundings and chart tooltips together.

The current global stylesheet includes OS-dark defaults plus `.dark` but no matching explicit light override. Merely removing `.dark` will not guarantee Light under a dark OS. Implement an explicit, dashboard-scoped resolved light/dark token boundary and place portals in that boundary. A scoped next-themes provider or the existing preference approach can drive it; use one resolver, not competing effects. Do not modify the public preference controller. Honor later OS changes only while System is selected. Hydration must not show one user's content or the wrong theme briefly. A neutral initial shell is preferable to fabricated data.

## 5. Information architecture and route ownership

All new customer pages are nested beneath `/dashboard`. Route-group directories do not appear in URLs. Keep the existing `app/(dashboard)/dashboard/page.tsx` overview and place its child folders alongside it.

| Navigation group | Label | Route | Purpose |
| --- | --- | --- | --- |
| Overview | Overview | `/dashboard` | Balance summary and next actions |
| Account | Assets | `/dashboard/assets` | All six crypto balances and per-asset actions |
| Account | Deposit | `/dashboard/deposit` | Asset/network instructions and deposit history |
| Account | Withdraw | `/dashboard/withdraw` | Crypto or bank request workflow |
| Account | Activity | `/dashboard/activity` | Deposits, withdrawals, adjustments, fees and recorded outcomes |
| Copy trading | Discover traders | `/dashboard/traders` | Search, compare and inspect trader profiles |
| Copy trading | My copy trades | `/dashboard/copy-trades` | Allocations and their actual lifecycle |
| Copy trading | Signals | `/dashboard/signals` | Available trading signals or an explicit unavailable state |
| Account tools | Notifications | `/dashboard/notifications` | Account notices with truthful unread count |
| Account tools | Profile | `/dashboard/settings/profile` | Personal details |
| Account tools | Security | `/dashboard/settings/security` | Password, MFA and sessions if supported |
| Account tools | Verification | `/dashboard/settings/verification` | Identity submission and review status |
| Account tools | Help | `/dashboard/help` | Account help and supported contact destination |

Detail routes: `/dashboard/assets/[currency]`, `/dashboard/activity/[transactionId]`, `/dashboard/traders/[traderId]`, `/dashboard/copy-trades/[allocationId]`. Details need a durable URL and refresh/back behavior; a sheet may enhance navigation but cannot be the only way to reach a record.

Alias plan: authenticated `/deposit` → `/dashboard/deposit`, `/withdraw` → `/dashboard/withdraw`, `/transactions` → `/dashboard/activity`, `/settings` → `/dashboard/settings/profile`. Add redirects only after inspecting existing consumers. Preserve meaningful allowed query parameters. Do not redirect the public `/copy-trading` explainer. Legacy `/user/*` routes require a separately inspected compatibility decision; do not change legacy Express routing casually.

Avoid 13 equal-weight links. Show the first two groups directly, collapse the account-tools group or place Profile/Security/Verification in the user menu with a settings subnav. Notifications remains reachable from the header. Sidebar selection comes from the current route, including detail descendants. There is no fake team switcher, paid-plan upsell or admin link.

Header: sidebar trigger, breadcrumb/current page, notifications and user menu. Theme lives in the user menu. Omit a global search button until global search exists. Sign out must call the authenticated logout operation; navigating to `/login` alone is not logout. Verify provider failure handling before claiming sign-out success.

## 6. Screen designs

### 6.1 Overview

Desk reference, after the sidebar is subtracted:

```text
┌──────────────┬───────────────────────────────────────────────────┐
│ CA           │ Menu / Overview             Notifications   User  │
│              ├───────────────────────────────────────────────────┤
│ Overview     │ Overview                     Deposit    Withdraw  │
│ Account      │ Account balances and recent activity.             │
│ Copy trading │ [Value] [Available] [Reserved] [Recorded P/L]      │
│              │                                                   │
│              │ Account value chart ·········│ Assets              │
│              │ period + accessible summary │ six balance rows    │
│              │                             │ View all assets     │
│              │                                                   │
│              │ My copy trades ·············│ Needs attention     │
│              │ up to 3 allocation rows     │ pending next steps  │
│              │                                                   │
│ Settings     │ Recent activity                                   │
│ Help         │ Date | Type | Asset | Amount | Status | Details   │
│ User menu    │ View all activity                                 │
└──────────────┴───────────────────────────────────────────────────┘
```

Use a normal page heading, not a welcome hero card. Four compact summaries use consistent units and timestamps. When conversions or reservations are unavailable, show an em dash with specific help text, not zero. The large number must be labeled **Estimated account value**, not available cash. Recorded P/L has a period and method; suppress its percentage if the return method is not supplied.

The 8:4 main row holds a 320px chart and six asset rows. Asset summary rows show symbol/name, exact or abbreviated holdings with exact detail, and available value only when known. The next 8:4 row holds at most three allocations and a small task list. Needs attention includes only real pending withdrawals, incomplete security enrollment or verification action. If empty, show a short settled-state message; no manufactured urgency score. Recent activity shows five rows and a View all link.

Chart periods: 7D, 30D and 90D, with 30D initial. Use account valuation history when supplied. A balance increase after a deposit is not investment profit. Tooltip includes date, value and denomination. Include a textual summary and accessible data table toggle. One timestamp does not justify a line chart. Show “Account history will appear here” for insufficient data. Omit synthetic rises and animated balance counts.

At 1440×900, the page title, four summaries and beginning of chart/asset content should be visible without scrolling. At 390×844, the title, funding actions and initial summary values should be visible. These are composition targets, not reasons to crop content at larger text settings.

### 6.2 Assets and asset detail

Assets page: heading, currency search, availability filter, then one six-asset table. Columns are Asset, Total holdings, Available, Reserved, Estimated USD value, Actions. Display BTC, ETH, BCH, LTC, XRP and USDT. Distinguish an enabled zero wallet from an unsupported or uninitialized one. USD may appear as a separate settlement ledger only if the service actually exposes it; it is not a seventh crypto coin or assumed bank balance.

Asset detail: currency/name and actions, holding breakdown, current supported networks, and filtered activity. Network is a separate field from currency. Never assume USDT always means TRC20 or map token holdings to a network by display name. Full exact balances are available here. Keep row actions named, e.g. “Deposit BTC.”

Mobile: show asset, units and availability in a stacked semantic list; use a details disclosure for estimates/reservations. Activity still has its own table or record list. Avoid a horizontal strip of six cards.

### 6.3 Deposit

Use a full page with a two-step form and adjacent instructions. Steps: **Choose asset and network → View deposit details**. Validate selection before revealing an address. Display the exact returned network, deposit address, destination tag/memo if applicable, minimum deposit, confirmation policy and any expiry from the service. Missing policies display as unavailable; do not invent a confirmation count.

Address area: 192px QR at desktop and up to 192px within mobile width, full wrapping address, Copy address action, separate tag/memo copy action and a network reminder. Generate QR from the exact validated destination payload with a maintained local QR library selected at implementation; do not call an external QR-image endpoint or embed a generic crypto address. Address is selectable if the clipboard API fails. Announce copy success only after the clipboard write succeeds. QR is supplementary to text and may retain its necessary black-on-white scan field in both themes.

Changing asset or network immediately clears the previous destination, QR and instruction state. Ignore late responses for the old selection. If the provider supplies an expiry, invalidate the address at expiry and request a refresh. Do not invent per-user or rotating addresses when the backend returns a shared admin-configured address.

If proof submission is supported: show transaction hash, optional note and accepted proof upload types/limits from configuration. The action is “Submit deposit proof.” Confirmation says “Proof submitted for review,” with request reference. It must not credit the balance locally or say funds arrived. With no submission service, the live UI explains unavailability and retains usable deposit instructions only when those instructions are real.

Below the form, show recent deposits and their statuses. Required states: no asset selected, loading details, details ready, network unavailable, expired details, copy failed, invalid proof, submitting, submitted for review and server failure with preserved input.

### 6.4 Withdraw

Full-page step flow: **Method and details → Review request → Request submitted**. Use RadioGroup for Crypto wallet / International bank wire. Expose a method as active only when its service capability is available; retain the unavailable method with explanation in preview.

Crypto fields: source asset, source network, destination address, required tag/memo, amount. Bank fields come from the supported payout scheme: recipient, bank, country, account/IBAN, routing/SWIFT and denomination as required. Do not require every banking field for every country. Never store bank details in query strings, analytics or localStorage.

Show available units, server-quoted fee, total debit and recipient amount with units. Max uses available funds minus applicable fee/reserve rules supplied by the server. No float subtraction in the browser. Review repeats destination, network, tag, amount, fee and expected total debit. Show a shortened recipient in general history, full details only to the owner inside the review/detail view.

Use an explicit final confirmation naming the asset, amount, destination and consequence. Final button: **Submit withdrawal request**. One operation idempotency key survives retry of the same request. On timeout, reconcile by that key before offering resubmission. A session expiry returns the user to authentication without replaying the withdrawal automatically. Submission success shows request ID and “Pending review.” Approval does not mean network settlement.

Edits to amount/network/destination invalidate any fee quote and confirmation. Disable submit during validation and submission. Preserve form input on correctable failure. A request decline shows the actual reason when available and any independently confirmed hold release; never claim a balance release from UI state alone.

### 6.5 Activity and transaction detail

One ledger-style table with Type, Asset, Status and Date filters, explicit Reset filters, server-backed pagination and page size 10/25/50 when supported. Default is newest first, 25 rows. Persist non-sensitive filter state in the URL. Reset to page 1 after a filter change.

Columns: Date/time, Type, Asset/network, signed Amount, Fee, Status, Reference, Details. Funding is not income. Manual credits/adjustments retain their actual source label. Search, export and cancellation appear only when implemented. Do not ship decorative filter/export buttons.

Detail: reference, created/updated timestamps, monetary breakdown, request state, separate settlement state, network/hash when present, masked destination summary and readable reason or next step. Link to a block explorer only through an allowlisted network-to-explorer mapping. An arbitrary transaction field must not become an external URL.

Render a semantic table on large screens. At mobile size either provide a labeled, keyboard-scrollable local table region or an equivalent record list with every field accessible. The browser page itself must never scroll sideways. Status stays visible in the first visible columns. No drag-to-reorder financial transactions.

### 6.6 Discover traders

Heading, search and filters, then a stationary grid: three columns when cards are at least 280px, two when they fit, one on phones. Sort by a defined field with an explicit default, e.g. Name until an audited ranking exists. No marquee or moving financial card.

Card order: portrait/name; strategy description; performance window; accuracy/win rate with closed-trade count; copiers; rating with review count if present; drawdown/risk label if supported; minimum allocation and fee if supplied; **View trader** and **Copy trader**. Both actions lead into the relevant customer flow, not the marketing guide. Missing ratings/drawdown render “Not available,” never invented defaults.

Accuracy means winning closed trades divided by all closed trades for a supplied period. It is not expected return, risk score or a verification badge. Do not use the schema's hard-coded ROI defaults as measured performance. Risk labels require a source/methodology. A portrait is identity illustration, not verification.

The live route shows real records or an appropriate empty state. Development fixtures may reuse the six generated portrait assets with clear demo context. Do not migrate fixture profiles, reviews or copiers into production.

### 6.7 Trader profile and allocation review

Profile: breadcrumb, identity, description, metrics with period/method, performance history if supported, approach/holdings, fee information and allocation panel. Tabs may be Overview / Performance / Activity, but render only populated capabilities. Missing history has an honest empty state.

Allocation form: source asset/wallet, amount, available funds, minimum, conversion quote where applicable, fee basis, execution mode and risk acknowledgement. Review names trader, amount/denomination, charges, reserve effect and what start/pause/stop actually does. No leverage, stop-loss, instant settlement or automatic sell-all controls unless their backend semantics exist.

In the isolated preview, final action is “Simulate copy request” and changes only session demo state. In live mode, “Start copying” is enabled only with a verified execution contract and owner-authorized endpoint. If unavailable, provide a clear explanation without a fake success response. A manual account allocation should be named as such when that is the actual product mode.

### 6.8 My copy trades and allocation detail

List actual allocations with trader, allocated amount/asset, recorded P/L, current status, created date and View details. Support Active, Paused, Stopped only when backend values confirm them; retain Pending/Stopping/Error as separate operation states if the service supplies them.

Detail shows timeline, amount, fee accounting, activity and supported actions. Pause/Resume/Stop use explicit confirmation and server results. Stop must explain whether it stops new copying, closes positions or releases capital. Never imply all three. A pending stop remains visible after refresh until confirmed. Do not replace a rejected operation with an optimistic terminal badge.

### 6.9 Signals

Treat a market-price chart and a trading signal as different content. A signal needs an identified source, asset/network or market, direction if defined, published/expiry timestamps and explanatory content. Filter by asset/status when data exists. Expired signals must look expired and cannot initiate actions.

The inspected Prisma User model does not expose the legacy signal visibility field. Define `canViewSignals` and feed availability in the server adapter before enabling this page. Show a reasoned empty/unavailable state when access or a feed is absent. Do not create BUY/SELL signals from random data, chart slopes or the legacy visibility toggle. Any optional external market widget must load lazily, fit both themes and respect the existing storage/privacy policy.

### 6.10 Notifications

Inbox list with All / Unread filter, meaningful timestamps and explicit Mark read actions. Unread count equals unread owned records. Show no dot when zero. Each notification navigates to an owned transaction, allocation or setting; missing linked records get a recoverable not-found view. Mark-all requires a supported endpoint and shows failure if saving fails. Financial statuses come from records, never from notification text alone.

### 6.11 Profile, security and verification

Use the common settings subnavigation and a 720px maximum form reading width. Profile fields use `fullName`, phone and country if supported. Email changes must follow the identity provider workflow; editing a profile row must not silently change authentication identity. Save/cancel controls and unsaved changes handling are explicit.

Security shows confirmed MFA state: Not enabled, Enrollment pending or Enabled. A `twoFactorEnabled` Boolean is not proof that a verified factor exists. Enrollment includes provider-issued QR/secret, code verification and supported recovery guidance. Do not invent backup codes. Password changes use provider reauthentication where required. Sessions and revoke actions appear only with an actual session source. No unconditional “2FA Protected” label.

Verification shows Not submitted, In review, Verified or Changes required based on server data. Explain required document types, upload size/type limits and retention policy through approved content. Private upload previews are owner-scoped; do not create public storage URLs. Replace/remove actions need confirmation and real provider support. Never infer Verified from a successful upload or invent a review duration. A review status must not imply instant withdrawals.

### 6.12 Help

Provide concise answers for deposit networks, pending withdrawal requests, copying and account access, with links to the existing public guides. Include a supported contact destination. If ticket submission is not implemented, omit a fake chat/ticket composer. Existing contact-page limitations remain relevant; route users to a confirmed channel when supplied.

## 7. Financial data and service boundary

Keep the existing application as one deployable Next.js project. Use server-side adapters between service/database records and the dashboard. There is no need for a new frontend app, microservices, event bus or a second ORM to deliver this interface.

Proposed directory structure, not files to assume already exist:

```text
app/(dashboard)/layout.tsx                 authenticated composition
app/(dashboard)/dashboard/                 overview + routes in section 5
app/design-preview/dashboard/              isolated development review routes
components/dashboard/
  shell.tsx  sidebar.tsx  header.tsx  theme-provider.tsx
  page-heading.tsx  amount.tsx  status-badge.tsx  data-state.tsx
  overview/ assets/ funding/ activity/ traders/ settings/
  dashboard.css                            scoped geometry and compatibility
lib/dashboard/
  contracts.ts  navigation.ts  format.ts
  queries.server.ts  mutations.server.ts    server-only ownership boundary
  adapters/                                verified record mappings
  fixtures/                                development-only deterministic data
```

Keep screen rendering shared between live and preview modes. Select a data source at the server boundary. No query parameter or localStorage key can enable fixtures on production account routes. Preview is development-only and must be unavailable in production even on direct requests. Never bypass the live dashboard guard to take screenshots.

Read pages should be Server Components where possible. Small client components own tabs, filters, forms, theme and chart interaction. Do not mark the whole application client-side for one menu. Keep Prisma/database clients and privileged keys server-only. Use decimal strings at the client boundary and tested decimal operations server-side.

### Contracts the builder must define

| Contract | Required information | Missing-data behavior |
| --- | --- | --- |
| SessionAccount | Authenticated identity mapped to internal `User.id`, display name, account restrictions, confirmed capabilities | No identity means authentication; unmapped/restricted account gets a specific access state |
| AssetBalance | Currency, exact total/available/reserved decimal strings where defined, enabled flag, precision, timestamp | Unknown is null/Unavailable; never conflate with zero |
| Valuation | Display currency, quote prices, source, quotedAt, estimated totals and history | Missing quotes do not count as zero; partial totals labeled partial with excluded assets |
| TransactionView | Owned ID, type, asset, amount, fee, created/updated time, request status, settlement evidence, permitted actions | Preserve raw unexpected status for diagnostics; show “Status unavailable” to customer |
| DepositInstruction | Asset, network, address, tag/memo requirement, expiry/minimum/confirmations if defined | Missing instruction disables funding details for that selection |
| WithdrawalQuote | Validated recipient reference, source currency/network, fee, total debit, recipient amount, expiry/quote ID | Expired/changed quote requires revalidation |
| TraderView | Identity, strategy, verified source provenance, period, win/loss counts, followers, optional rating/drawdown/fee data | Missing measures remain absent or unavailable; no fallback performance |
| AllocationView | Owner, trader, allocated units/currency, status, execution mode, recorded P/L, permitted actions | Do not infer executable actions from a string badge |
| Capabilities | Deposit networks, withdrawal methods, proof upload, copy start/pause/stop, signals, MFA, KYC, notifications | Unsupported actions clearly unavailable; server rechecks every live action |

Capabilities are UX hints, never authorization. Middleware is not sufficient protection for a database query or mutation. On every server operation validate the current session, map `supabaseUid` to internal `User.id`, check restrictions and scope records by that internal owner. Do not assume `auth.uid()` equals the Prisma row's `userId`. Any RLS policy must account for that mapping. Prisma privileged connections may bypass RLS, so application ownership checks still apply.

Do not implement migrations, restore backups, query real private records, change admin policy or turn on money-moving endpoints solely to satisfy a visual acceptance check. Complete the interface and document required backend contracts. Future integration requires a separately verified environment, safe fixtures and matching authorization.

### Monetary and status invariants

1. Never add BTC, ETH and USDT units together. Estimate fiat totals only using quotes with explicit timestamps. USDT is not hard-coded to exactly one USD.
2. Preserve stored precision. The current Decimal(18,8) schema cannot represent arbitrary chain-native precision. Do not widen schema in a UI task or truncate incoming values silently; respect the supported service precision.
3. Available + reserved = total only when the ledger defines those terms and uses disjoint buckets. Allocation/locked profit may overlap other balances; do not double count them.
4. Deposit/withdrawal cash flows are not profit. Daily and lifetime P/L require actual ledger/execution evidence. Do not derive an investment return percentage from account-value movement.
5. No browser-calculated balance becomes authoritative. On confirmed mutation, fetch the authoritative snapshot and history.
6. For live funding integration, positive amount validation, sufficient available funds, atomic holds/debits, idempotency and ownership checks belong on the server. The current debit service's read-then-update and lack of positive-amount enforcement are not sufficient evidence of concurrency safety.
7. Current enum mapping: PENDING → Pending review; APPROVED → Approved; REJECTED → Declined; CANCELLED → Cancelled. These labels do not manufacture blockchain settlement. Show Completed only with separately confirmed terminal evidence.
8. A write timeout is an unknown outcome, not automatically failure. Reconcile the request reference/idempotency key. Do not create a second withdrawal on retry.
9. Never invoke `TradeService.runAutomatedDailyAccrual` or `distributeTraderProfit` from the dashboard or preview. Its random accruals do not establish actual market returns.

## 8. State and interaction specification

Every data region implements Loading, Ready, Empty, Error and Unavailable. Distinguish loading from no records, and no records from no permission. Skeletons hold actual geometry; do not skeleton the entire shell after every filter change.

| Event / state | Required response |
| --- | --- |
| Read failed | Inline reason and Retry for that region; keep other successful panels usable |
| Cached/stale data | Retain readable snapshot and its timestamp; disable operations requiring a fresh quote/balance |
| Form invalid | Inline error linked to field; focus first invalid field or linked error summary; preserve correct input |
| Form submitting | Busy text, prevent duplicate submit, maintain button width and layout |
| Mutation confirmed | Persistent updated record/reference plus brief toast if useful |
| Mutation failed | Persistent error at task location; toast alone is insufficient |
| Unsupported capability | Plain explanation and available alternative; no dead CTA or false success |
| Expired session | Safe sign-in return path; no auto-replay of a financial submission |
| Unknown record / other owner's record | Safe not-found/forbidden behavior without revealing another account |
| Long name/address/large balance | Wrap text or offer explicit exact detail; never clip principal action or amount |
| Empty filter result | “No activity matches these filters” and Reset filters; do not claim the account has no activity |

Selected filters must affect the data. Pagination must change records. Browser back must restore non-sensitive route state. Save buttons must persist or explicitly simulate inside preview. A static label styled as an enabled button is unfinished.

## 9. Motion and accessibility

Use the installed animation skills selectively when implementing controls. This is an operational workspace; generous animation means complete feedback for meaningful actions, not continuous movement.

| Interaction | Motion |
| --- | --- |
| Button hover/press | 100–120ms color/opacity; no positional jump for financial amounts |
| Menu / tooltip | 120ms opacity, at most 4px offset |
| Sheet / dialog | 180–200ms transform/opacity; `cubic-bezier(0.22,1,0.36,1)` |
| Tabs/filter result | Update without moving headings; optional 100ms opacity |
| Chart period | 150–200ms transition only with real comparable data; keep axes truthful |
| Balance/status update | Replace text without counting animation; preserve layout and focus |
| Reduced motion | Remove translation, scale and chart interpolation; keep all content and feedback |

No scroll reveals on balances/forms/tables, no marquee, no scroll hijacking, no entrance staggering across transaction rows and no auto-advancing trader cards. Do not add GSAP for ordinary dashboard controls. Dispose observers/listeners and stop background polling when hidden where appropriate.

Accessibility acceptance: one main landmark, labeled navigation, skip link, `aria-current` active route, named icon actions, semantic tables, associated field errors, keyboard-operated menus/tabs and reliable overlay focus return. Financial status needs text and sign, not hue alone. Aim for 4.5:1 normal-text contrast and 3:1 large-text/control boundaries; test actual token combinations. Keep the shared palette, strengthen only documented dashboard semantic roles if contrast fails. Do not globally recolor the public site.

Use an unobscured visible focus outline. Test Tab/Shift+Tab, Enter/Space, Escape and arrow navigation where the primitive specifies it. A sticky header, banner or mobile action area must not cover focus. Announce clipboard completion and submitted requests through a polite status region; do not announce every quote refresh. Charts need text/table equivalents. Test 200% zoom, 320px reflow, long labels and reduced motion.

## 10. Reuse and installation rules

Start with owned Sidebar, SidebarProvider, SidebarInset, Sheet, Button, Card, Field, Input, Select, Table, Tabs, Badge, Avatar, Skeleton, Tooltip, DropdownMenu and Chart components. Use the `dashboard-01` preview as a composition reference. Create customer-specific sidebar/header modules under `components/dashboard`; avoid changing generic demo components consumed by the design gallery.

Needed wrappers may include Alert, AlertDialog, Dialog, Textarea, RadioGroup, Switch and Pagination. Check actual files first: `COMPONENTS.md` lists missing wrappers even where public code already composes a Radix primitive directly. Reuse a suitable owned wrapper; otherwise inspect registry source before adding only the required component. Record additions and contextual geometry in `COMPONENTS.md`.

Do not run `add --all`, force overwrite, `init`, or preset apply. Do not install a new chart or animation library when an existing one covers the behavior. Keep `radix-mira`; generic skill preferences for new-york, Geist Sans, Lucide or dark-only screens are overridden by this project. Current public shadcn documentation may default to Base UI: select the Radix variant and inspect the installed API. No blind copy of latest examples into an older locked stack.

Use installed skills for the work they improve: `better-layout` for grouping/resizing, `better-typography` for readable numeric/text hierarchy, `fixing-accessibility` for interactive forms, `accessible-animation` and `fixing-motion-performance` for motion, and `supabase` before any real auth/data integration. Read each skill before applying it and preserve user instructions over generic defaults. Design or review skills must not silently broaden a dashboard task into a brand redesign.

## 11. Demo content that makes the design reviewable

Create deterministic fixtures outside production adapters. Use a fixed clock, explicit demo IDs and consistent amounts across overview, assets, history and allocation detail. No `Math.random()` for returns, status, charts or identity. Demo controls may simulate success/failure in memory, clearly labeled in the preview toolbar. Production bundles must not expose a switch that selects demo money.

Example accounting fixture for layout only: BTC total 0.10000000 = available 0.08000000 + reserved 0.02000000; ETH total 2.00000000 = available 1.50000000 + reserved 0.50000000; USDT total 1250.00000000 = available 1000.00000000 + reserved 250.00000000. BCH/LTC/XRP may be zero enabled wallets in one scenario and unavailable in another. If a fixture chart shows USD totals, include explicit fixture quotes and derive totals consistently from these holdings. Do not portray example prices as live.

Required fixture scenarios: funded account, new empty account, partially unsupported currencies, missing price feed, pending/declined withdrawal, allocation without execution service, missing trader metrics, disabled signals, MFA not enabled, verification in review, read error, write failure, unknown submission outcome, long name/address and large amount. Include a profitable and losing recorded outcome when modeling P/L. Zero, null and failure are separate examples.

Reuse `public/images/community/*.webp` only for fictional preview personas. Use supplied `ca-on-light.svg` and `ca-on-dark.svg` for an expanded sidebar at ≥64px width. In a 48px rail use the supplied fixed-theme favicon in a 24–32px slot rather than squeezing the full monogram. Do not create extra product screenshots or avatars merely to fill the dashboard.

## 12. Known gaps and how to continue

| Missing or unresolved contract | Antigravity can complete now | Required before live activation |
| --- | --- | --- |
| Six-asset wallet support | All layouts, filters and capability states | Confirm currency/network catalogue and wallet semantics |
| General available/reserved balances | Typed null-aware views and fixtures | Ledger mapping, hold rules and reconciliation |
| Recipient, network and settlement records | Full withdrawal form/review/history UI | Validated storage/transfer contracts and concurrency/idempotency behavior |
| Exchange copy execution | Discovery, profiles, simulated allocation lifecycle | Real execution/fee/stop semantics and ownership-tested endpoints |
| Performance, ratings, risk methodology | Missing-data and fixture designs | Audited source/window/method per metric |
| Signals visibility/feed | Full route and available/unavailable designs | Server entitlement and actual feed |
| MFA/KYC/private upload integration | Enrollment/review UI and failure states | Provider configuration, verified enrollment, private access and approved upload rules |
| Support delivery | Help content and confirmed links | Working contact/ticket service before showing Send success |

Record questions in a builder progress file and continue independent interface work. Never replace a missing contract with a guessed financial default. The current task does not request a database migration or admin redesign.

## 13. Build order with stage gates

### Stage 0: establish the baseline

Run `git status --short`; inspect current routes and local component APIs. Read section 2 sources and resolved dependency versions. Record what changed since this handoff. Check TypeScript/build baseline using existing dependencies; do not run migrations or read secrets into logs. Record failures precisely.

Create `docs/user-dashboard/BUILD-STATUS.md` with stage status, changed files, known baseline failures, current blockers and next step. Mark every route “not started,” “preview complete,” “live read verified” or “live write verified.” Do not mark planned work as complete.

Gate: documented source inventory and chosen live/fixture adapter boundary. Verify authentication protection before creating new routes.

### Stage 1: build the shell and component reference

Implement dashboard theme boundary, sidebar/rail/sheet, header, breadcrumbs, user menu, logout handling and page container. Add reusable amount, status, empty/error and page-heading components. Build a development-only component reference showing compact and form controls in both themes, long values and overlay states. Validate Tailwind-generated geometry before composing pages.

Gate: shell works at 390, 768, 1024 and 1440px, themes include portals, keyboard navigation works, explicit Light works on dark OS, no public/admin visual regression. No Acme, lightning logo, placeholder live badge or dead `#` link.

### Stage 2: establish contracts and fixtures

Implement the typed data boundary, null/zero formatting, deterministic scenario catalogue, capability handling and a preview renderer using the same customer components. Keep all fixture mutations isolated. Add focused tests for monetary formatting, ownership mapping and status interpretation when those functions exist.

Gate: missing data cannot become zero, incorrect unit totals or false status; fixtures remain unavailable from production routes.

### Stage 3: build overview, assets and activity

Follow sections 6.1, 6.2 and 6.5 exactly. Implement chart periods, accessible summary, table filtering/pagination, durable detail URLs and complete empty/error states. Connect real reads only through verified adapters.

Gate: consistent figures across screens, all six assets accounted for, genuine filter behavior, correct back navigation and no horizontal page overflow. Capture the overview in both themes before progressing to financial forms.

### Stage 4: build deposit and withdrawal

Implement asset/network reset behavior, QR/copy controls, proof UI if supported, validation, quote expiry, review, request confirmation and transaction detail. Simulate the full success/failure flow in preview. Do not wire to the current wallet service solely because its methods exist.

Gate: all required states demonstrated; no duplicate request after timeout, no stale address after switching network, no unconfirmed credit/settlement. Live activation requires section 7 checks and an integration environment.

### Stage 5: build copy trading and signals

Implement discovery filters, metrics with context, profile/detail routes, allocation review, My copy trades and supported lifecycle actions. Build signals with explicit entitlement/feed states.

Gate: dashboard Copy trader actions stay in the customer flow; no fictional live ratings or random returns; simulated stop/pause results never mutate real balances.

### Stage 6: build account tools

Implement notifications, profile, security, verification and help. Derive unread/MFA/KYC labels from data. Reuse the existing auth provider integration only after inspecting its supported API.

Gate: save and read-state behavior match actual capability; no false MFA success, public identity-upload link, fabricated session or nonfunctional support submission.

### Stage 7: complete verification and handoff

Run the matrix in section 14, fix scoped defects, capture final renders, update component documentation and build status. Review public homepage/About/login and admin shell for shared-style regressions. Preserve dashboard controls at their compact defaults outside touch/form contexts.

Gate: every route has evidence, all introduced blockers are fixed, and live integration gaps are labeled. Request visual approval only with a running preview and completed evidence. Do not deploy merely because the visual review passes.

## 14. Acceptance matrix and evidence

Use the existing local test scripts where relevant. Do not create tests that only assert CSS class strings or repeat static copy. New tests should verify contracts, guards, money formatting, retries and interactive behavior. Existing scripts include `test-account-routing.mjs`, `test-public-routing.mjs`, `test-public-theme.mjs`, `test-public-motion.mjs`, `test-public-cookie-notice.mjs`, `test-public-community.mjs` and `test-public-pages.mjs`; inspect their accepted arguments before running.

| Check | Pass condition | Evidence |
| --- | --- | --- |
| Route completion | Every section 5 route and detail works via direct load, refresh and back; no dead navigation | Route results in BUILD-STATUS |
| Authentication | Anonymous access fails closed; production preview inaccessible; restricted account handled | Integration/guard checks |
| Ownership | User A cannot read or mutate user B's record, including detail IDs and uploads | Two-user integration evidence in a safe environment |
| Monetary display | Precision/units/quotes correct; null ≠ zero; totals reconcile; deposits ≠ P/L | Unit and adapter tests |
| Funding flow | Network switch clears stale details; quote changes invalidate review; duplicate/timeout path reconciles | Interaction/integration tests |
| Theme parity | Every page and overlay supports light/dark/system, including light on a dark OS | Screenshots and preference checks |
| Responsive | 320, 390, 768, 1024, 1280, 1440, 1920px; no clipped actions or page overflow | Render checks with actual widths |
| Accessibility | Keyboard order/focus, 200% zoom, reduced motion and automated page scan checked | Findings and resolutions; automated clean is not a full audit |
| Honest capability state | No fabricated protection, performance, settlement, availability or active-service label | Review populated/empty/error/unavailable fixtures |
| Production quality | TypeScript and production build run; no introduced failures; no hydration or console errors in tested routes | Exact commands, exit results and pre-existing failures |
| Regression | Public homepage/About/auth and admin boundary retain their approved behavior | Representative route/render checks |

Capture at least one full-page image of every primary route in desktop dark and desktop light. Additionally capture Overview, Deposit, Withdrawal review, Trader profile, Activity and Security at 390px and 1024px in both themes. Include a sheet/dialog, open mobile navigation, error state and long-value case. Store captures under `docs/user-dashboard/evidence/` with route, viewport, theme and state in filenames. Capture the rendered UI, not a design mockup. These are QA artifacts, not new production marketing assets.

Review each capture against sections 3–6: type role, spacing, surface token, logo, density, column order, unit visibility and action prominence. Fix a material mismatch before moving on. Do not report “pixel perfect” without comparative evidence or use a subjective score as proof of correctness.

For local checks, use the existing Node/npm runtime and a free local port. `npm run build` and `npx tsc --noEmit` are useful baseline commands, but inspect `next.config` before running production output alongside the active dev server. Use an isolated build directory if supported. The configured `npm run lint` currently calls `next lint`; verify its compatibility with the locked Next version before treating failure as a new source defect. Do not run `prisma:migrate` as a build check.

## 15. Builder completion report

Return a short implementation summary plus these artifacts:

- Running local preview URL and working production customer-route behavior.
- `docs/user-dashboard/BUILD-STATUS.md` with the per-route status table.
- `docs/user-dashboard/VERIFICATION.md` with commands, browser widths/themes, failures, fixes and exact live-workflow limits.
- `docs/user-dashboard/evidence/` captures described above.
- Updated `COMPONENTS.md` for any added wrappers or contextual density behavior, without rewriting the public exception or shared brand.
- File-change summary and a list of backend contracts still required for live activation.

Do not leave pending work hidden behind “polish later.” State whether the interface is complete and separately which live workflows are verified. If a workflow is blocked, give the precise missing input and continue all independent work. Keep product screens focused on customer decisions; implementation notes, task IDs and backend checklists belong in developer documentation, not dashboard banners.

## 16. Reference use

The local sources in section 2 govern this build. Official references supplement implementation details and must be matched to the project's installed versions:

- [shadcn Sidebar](https://ui.shadcn.com/docs/components/sidebar): provider, sidebar groups, trigger and inset composition. The current landing documentation defaults to Base UI, so select Radix and compare local source before using examples.
- [Supabase server-side client guidance](https://supabase.com/docs/guides/auth/server-side/nextjs): server/browser client separation and session handling. Current documentation can target a newer Next version; preserve this project's version-appropriate middleware and verify the locked SSR API.

No new brand palette, typography family, external registry animation or infrastructure migration is needed to execute this dashboard design.
