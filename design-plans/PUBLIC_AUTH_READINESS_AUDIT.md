# Public website and authentication readiness audit

**Project:** Crypto Index Asset  
**Audit date:** 12 September 2026  
**Decision:** Not ready to publish or open registration

This is a read-only supplement to `DEPLOYMENT_READINESS_AUDIT.md`. It covers the public website, user and administrator sign-in, registration, password recovery, account confirmation, public metadata, and the related support journey. It does not approve the product's legal or regulatory position.

## What is already implemented

- Public routes exist for the homepage, About, Contact, How it works, Copy trading, Terms, Privacy, and Cookie policy.
- User sign-in, admin sign-in, registration, forgot-password, reset-password, and Supabase callback routes exist.
- Account-entry pages omit the marketing navigation and footer and use a Home breadcrumb, as required.
- The pages use the project's Space Grotesk and Geist Mono roles and the public design tokens.
- The auth forms use labelled fields, password visibility controls, loading labels, generic sign-in errors, and focusable error summaries.
- The forgot-password success message does not reveal whether an email address has an account.
- Public motion has a reduced-motion branch. Marquees have pause and static-view controls.
- The public cookie notice accurately states that optional analytics and advertising are not currently enabled.
- Middleware protects customer and administrator areas and uses server-managed `app_metadata` for the admin role.

These are useful foundations. They do not make the journeys production-ready.

## P0 release blockers

### 1. Registration is safely closed, but opening it is still blocked

`components/public-site/account-entry.tsx` now opens registration only when `NEXT_PUBLIC_ENABLE_REGISTRATION=true`. The example environment keeps it false. The homepage and header still present Create account as a primary action, so the main conversion path ends at a closed form until the remaining release gates pass.

Before opening registration:

- keep the explicit release flag false until the legal, support, email and onboarding gates close;
- decide whether the closed state should offer a waitlist or remove Create account CTAs until launch;
- confirm Supabase's Allow new users to sign up and Confirm email settings;
- test confirmation delivery, resend, expired-link, already-confirmed, and changed-email paths;
- give the user a dedicated confirmation-pending page with resend cooldown and a way to correct the email address.

### 2. There are no active terms, privacy notice, or operator details

`app/(marketing)/terms/page.tsx:9` says the terms are not active. The legal operator, address, eligibility, countries, service conditions, fees, custody, governing law, complaints process, and effective date are unresolved. `app/(marketing)/policy/page.tsx:9` says the controller, privacy contact, purposes, recipients, retention, and rights are unresolved.

Registration must not open until approved versions exist. The application should store the accepted terms version and timestamp. A privacy notice is presented and acknowledged where appropriate; do not describe every processing basis as consent. Keep acceptance records separate from optional marketing consent.

The About page also claims the business was established in 2015 and describes it as a premier and institutional-grade platform. Substantiate or remove each factual and comparative claim before publication.

### 3. Contact capture exists, but support operations are not connected

The contact form now validates an enquiry, records up to 500 characters in the internal audit table, and returns a case reference. It does not notify a support queue, send confirmation email, expose a case-status workflow, or prove that anyone monitors the record. The Contact page also has no verified support address, response hours, escalation route, or complaints channel. This leaves users without a complete recovery route when email access or admin access fails.

Connect the form to a server-side endpoint or case-management provider with:

- schema validation and safe error messages;
- rate limiting and bot protection;
- a case reference and delivery confirmation;
- routing by enquiry type;
- retention and deletion rules;
- protection against secrets and unsafe attachments;
- monitored support, security, privacy, and complaints addresses.

Do not promise response times until the operating team can meet them.

### 4. Callback destination validation is implemented

`lib/auth/redirects.ts` now limits callback and post-login destinations to approved same-origin route families. It rejects protocol-relative, backslash, encoded-backslash, control-character and out-of-scope paths. `app/auth/callback/route.ts` uses this shared validator and constructs the redirect with `URL`.

The sign-in screen now displays a focused, user-readable message for `auth_code_error`. This code-side blocker is closed. It still needs a real Supabase confirmation and recovery test in staging.

### 5. Password reset now checks the authenticated recovery session

The `/reset-password` server page now calls `auth.getUser()` and only renders the update form for an authenticated Supabase user. Direct, expired and invalid visits receive a recovery-expired state with a new-link action. The form now requires matching 10-character passwords and uses the correct `reset-error` association.

Implement explicit states for:

- checking the recovery session;
- valid recovery session;
- expired, invalid, or already-used link;
- reset success;
- provider or network failure.

The remaining decision is whether a successful recovery revokes other sessions and whether the user must sign in again. A financial account should use the stricter choice unless the approved security policy says otherwise.

Supabase confirmation and recovery emails must point to `/auth/callback`, which exchanges the PKCE code before this page loads. The complete single-use and expiry path still needs staging evidence.

### 6. Registration does not record agreement or eligibility

The form currently collects only full name, email, password, and password confirmation. It links to draft documents and explicitly says no agreement is accepted. There is no stored document version or acceptance time.

Before launch, define the minimum onboarding contract with legal and compliance owners. It will likely include:

- acceptance of the active terms version;
- acknowledgement of the privacy notice and risk disclosure;
- country and age or eligibility checks where required;
- a clear post-registration email-verification and identity-verification journey;
- a server-side initial account state that cannot withdraw or copy until required checks pass.

Do not collect extra identity data on the first screen unless it is required. The dashboard can continue the verified onboarding journey after account creation.

### 7. Production Supabase Auth settings are not evidenced in the repository

The code alone cannot prove the hosted Auth configuration. Record screenshots or exported configuration for the release evidence and test them against staging.

Verify:

- the production Site URL and exact redirect allowlist;
- custom SMTP, sending-domain SPF, DKIM and DMARC, and disabled link tracking;
- branded confirmation, invitation, email-change, recovery, and reauthentication templates;
- email confirmation and reasonable OTP expiry;
- password length and strength policy plus leaked-password protection;
- CAPTCHA for sign-up, sign-in, and password recovery;
- endpoint rate limits and alerting;
- user-facing handling for delayed and bounced authentication emails;
- MFA/AAL2 enforcement for administrators and sensitive financial actions.

Supabase's default mail service is not intended for production, and the default Site URL must not remain localhost. See [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha), and the [production checklist](https://supabase.com/docs/guides/deployment/going-into-prod).

### 8. Admin role denial is fixed; administrator recovery is still missing

When an ordinary user signs in through the administrator form, the client now signs that session out before displaying the denial. Middleware still performs the server-managed `app_metadata` role check on every protected administrator request.

The admin form also has no password-recovery path. The only alternative is Contact, which is disabled. Define a secure administrator recovery process. It should not be the same unverified public support process used for ordinary enquiries.

## P1 functionality and user-experience gaps

### Intended destinations are now preserved and constrained

Middleware now stores the requested protected path in `returnUrl`. Customer and administrator sign-in use separate allowlists before redirecting. Malicious and cross-area destinations fall back to `/dashboard` or `/admin`.

### Fix public trader actions and claims

Resolved in code: live Copy trader actions now open `/dashboard/traders/[traderId]`, which middleware preserves through sign-in. Missing ratings, reviews, accuracy, assets, and strategy descriptions are shown as unavailable instead of being replaced with plausible-looking values. The public card now says the profile was published by the platform operator rather than claiming institutional verification.

Still required before treating a trader as verified: every displayed metric needs a source, method, reporting period, freshness timestamp, and approval record.

Six operator-approved trader profiles and portraits now provide the public fallback and the admin design-preview records. An idempotent Prisma seed is available through `npm run content:seed-traders`, but the configured direct Supabase database host was unreachable on 12 September 2026, so the live database was not changed.

Trader cards are also missing information needed to judge risk: reporting period, drawdown, loss profile, risk score or definition, fees, execution mode, and verification date. Do not compress these into a single accuracy percentage.

### Add the missing public decision pages

The homepage defines Fees, Account security, and Risk disclosure destinations at `components/public-site/home.tsx:16-19`, but the live version renders them as non-interactive blocks. There are no `/fees`, `/security`, or `/risk-disclosure` routes.

Add approved pages for:

- fee schedules, calculation methods, spreads, commissions, withdrawal and network charges;
- custody, account protection, 2FA, incident reporting, and what the platform cannot protect against;
- market, liquidity, execution, copy-trading, custody, counterparty, and total-loss risks;
- supported and restricted jurisdictions;
- complaints and service-status information.

These pages need named content owners and effective dates.

### Approved testimonials are present; retain their permission records

Nine operator-approved testimonials and their supplied portraits now replace the fictional examples. Keep the underlying consent, attribution and image-usage records outside the public repository, and verify every product claim remains accurate at launch.

### The requested trust-logo marquee is not implemented

The homepage has a scrolling asset strip for Bitcoin, Ethereum, Litecoin, and XRP. It does not have the requested customer, partner, custodian, or provider logo marquee. Do not fill this gap with decorative logos. Add logos only after the relationship, trademark permission, destination, and wording are verified.

### Finish account-entry states

Add visible, tested states for:

- loading the auth configuration;
- offline and provider-unavailable errors;
- email not confirmed and resend confirmation;
- temporarily rate-limited attempts with safe retry guidance;
- suspended, blocked, pending-KYC, and closed accounts;
- expired sessions and forced reauthentication;
- maintenance and planned registration closure.

Avoid exposing whether an arbitrary email is registered. Keep focus on the error summary and associate field-specific errors with `aria-invalid` and `aria-describedby`.

### Align password rules

Registration and reset currently enforce only eight characters in the UI, while another account-security flow uses a different minimum. The UI, Supabase Auth policy, reset flow, and change-password flow need one rule and one reusable description. Validate on the provider or server as the authority; client validation is guidance, not enforcement.

## P1 metadata, discovery, and platform polish

All marketing pages currently set `noindex, nofollow` in `app/(marketing)/layout.tsx:12`. Keep that for staging and until legal approval. Before public launch:

- make production indexing an explicit environment-aware decision;
- add `metadataBase` using the canonical production origin;
- add canonical URLs for every public page;
- add Open Graph and Twitter metadata with an approved, absolute share image;
- add `app/robots.ts` and `app/sitemap.ts`;
- add an Apple touch icon and, if the product is installable, a valid web manifest and theme color;
- add verified Organization/WebSite structured data only after operator details are approved;
- never add aggregate ratings or financial performance to structured data unless real and eligible.

The current repository has page titles, descriptions, and an SVG favicon, but none of the items above. Next.js supports these through its metadata API and metadata file conventions. See [Next.js metadata and Open Graph images](https://nextjs.org/docs/15/app/getting-started/metadata-and-og-images).

Also add public/auth error boundaries and a branded global 404. At present, custom loading, error, and not-found experiences exist only inside dashboard-oriented areas.

Restrict `next.config.ts` image hosts. The current `hostname: "**"` accepts any HTTPS host, which is broader than the known avatar and product-image sources.

## Accessibility status

Source inspection found good baseline semantics: one main landmark per page, labelled form controls, a skip link, focusable error summaries, native controls, reduced-motion handling, and labelled marquee controls.

The following work remains:

- repair the reset-password error ID mismatch described above;
- set `aria-invalid` on failed fields and connect field-level errors rather than attaching every error only to the email or password field;
- test keyboard focus through the mobile menu, cookie notice, form failures, and authentication redirects;
- test at 200% and 400% zoom, Windows high contrast, mobile screen readers, and desktop screen readers;
- run WCAG 2.2 automated scans on every public and auth route from a production build;
- manually verify contrast in both themes because static source review cannot prove rendered contrast.

An automated live-DOM accessibility scan was not completed in this pass. The local server was not running, and the installed scan skill is missing its referenced shared methodology file. Treat browser accessibility as unverified, not passed.

## Test coverage gaps

`scripts/test-account-routing.mjs` passed 29 stubbed middleware scenarios. It does not contact Supabase.

The public-page smoke suite now includes `/forgot-password` and `/reset-password`, checks their account-entry shell, and verifies the safe unauthenticated reset state. The redirect unit test covers approved customer and admin returns plus malicious external values. No test yet submits a real login, creates a user, confirms an email, resends confirmation, requests a reset, exchanges a recovery code, changes a password, enforces CAPTCHA, or checks rate-limit states against hosted Supabase.

Add staging end-to-end tests for these stories before launch:

1. Register, accept the current terms, confirm email, complete required onboarding, and reach the correct dashboard state.
2. Attempt duplicate registration without revealing account existence.
3. Sign in successfully, fail safely, resume a validated intended route, and reject external return paths.
4. Request recovery, handle unknown email identically, use the link once, reject reuse and expiry, set matching passwords, and follow the approved session-revocation policy.
5. Deny an ordinary user on admin sign-in without leaving an unintended session; require the approved admin MFA level.
6. Submit a contact request, receive a case reference, and verify delivery, throttling, retention, and failure handling.
7. Crawl every public link, canonical, sitemap entry, image, and share card from the production hostname.

## Recommended implementation order

1. Approve the operator, legal, risk, fee, eligibility, privacy, and support contracts.
2. Prove the completed callback and reset-session code against hosted Supabase in staging.
3. Configure and prove Supabase production Auth, SMTP, redirect, password, CAPTCHA, rate-limit, and MFA settings.
4. Connect support and administrator recovery.
5. Implement registration acceptance records, account state, email confirmation, resend, and KYC handoff.
6. Add sourced trader measurement periods, risk and loss metrics, verification dates, fees, and approval records.
7. Add the missing Fees, Security, Risk, jurisdiction, complaints, and service-status content.
8. Complete metadata, indexing, sitemap, robots, share cards, restricted image hosts, public error states, and 404.
9. Run authenticated end-to-end, abuse, accessibility, responsive, email-delivery, and production-host smoke tests.
10. Open registration only after the release evidence is reviewed and signed off.

## Launch gate

The public visual direction can continue. Do not publish the site as an operating financial service or enable registration yet. The current build is best described as a staged product presentation with partial Supabase authentication, draft legal content, fictional social proof, and unavailable support.
