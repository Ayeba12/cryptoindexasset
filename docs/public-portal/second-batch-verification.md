# Public pages and account entry verification

Local implementation, 4 September 2026. No deployment, real account submission or financial action. Root DESIGN.md, global typography tokens and dashboard controls remain unchanged.

## Implemented scope

About, Contact, Terms and conditions, Privacy policy and Cookie policy join the existing three public pages. Navigation and footer links make these pages discoverable. The cookie information banner acknowledges the current storage inventory, not consent to optional tracking. It can be reopened through Cookie settings.

The user's follow-up requires the installed shadcn `login-02` and `signup-02` blocks on `/login`, `/admin/login` and `/register`. The implementation adapts and directly uses `components/login-form.tsx` and `components/signup-form.tsx`, with the installed Field, Input, Button and Breadcrumb primitives and a shared `AuthPasswordField`. The existing 24-component inventory is not a new-install count. The equal-width desktop form/artwork layout becomes form-only below 1024px. Home is the only outer-navigation breadcrumb link; there is no marketing header, footer or cookie overlay on account pages. Space Grotesk headings, Geist Mono prose, existing colour tokens, shared input radius and matched artwork themes remain authoritative. The compact auth submit has a 44px minimum height and shared radius; the marketing-button exception is unchanged. Unsupported social sign-in and placeholder destinations were removed.

The current public header and footer intentionally have no Admin sign-in links. Direct `/admin/login` and the Contact page's Admin sign-in link remain available. These public/auth patterns are recorded in `components.md`; they do not create new dashboard or global design rules.

The public motion extension uses one-time text/image entrances, 60ms sibling staggering capped at 180ms, and the existing 640ms reveal curve. Forms and legal clauses do not reveal on scroll. Focus, reduced-motion preference and hidden-tab changes finish active reveals.

## Automated checks

- The final isolated production build passed after the cookie/modal layer correction, including the earlier heading-class correction, TypeScript validation and all 18 static outputs.
- `test-public-pages.mjs` passed for 11 routes, branded metadata, one H1/main per page, 16 themed image slots, 223 internal links and 33 JavaScript assets. All account pages have breadcrumb navigation, no marketing chrome and installed shadcn field structure. This is an HTTP/rendered-markup check, not an authenticated workflow test.
- The final development smoke check also passed after the owned dev-server restart on port 3100: 11 routes, metadata/landmarks, 16 themed image slots, 223 internal links and 38 development page scripts. The production count remains 33 scripts.
- `test-public-routing.mjs`: 46 public, development-preview and protected-routing assertions.
- `test-account-routing.mjs`: 29 middleware scenarios. Missing configuration preserves protected-route redirects; ordinary users and user-editable metadata cannot grant admin access; trusted `app_metadata.role` is required. Supabase is stubbed and no network or account changes occur.
- `test-public-cookie-notice.mjs`: 13 storage-version, timestamp, expiry and malformed-input cases, plus two assertions that the banner stays below the modal overlay/sheet. The acknowledgement is current for 180 days; it is not optional-tracker consent.
- `test-public-theme.mjs`: eight public/preview preference scenarios, including operating-system preference, saved overrides and unavailable storage. It does not establish browser hydration behaviour.
- `test-public-motion.mjs`: text/image variants, capped staggering, one-time observation, focus/reduced-motion/hidden-tab completion and cleanup. DOM/WAAPI are stubbed; no frame-rate claim.
- One scoped design-detector run returned nine inherited CSS advisories, with no errors. See [the detector report](../../.impeccable/review/batch2-detector.md). No second detector run.

## Build isolation

A development run replaced the default `.next` output during the first production browser check, causing missing auth chunks. `CA_ISOLATED_BUILD=1` now uses `.next-public-check`, leaving ordinary development output at `.next`. The final verification server used port 3102, a fresh origin for the unacknowledged-cookie check; earlier checks used 3101. The user's development preview remains on port 3100. The smoke test now checks page scripts as well as HTML so missing chunks cannot pass unnoticed. `.env` was not read or edited. The custom build directory is ignored, and Next.js added its generated type path to tsconfig. A temporary stale development-route response required restarting the local dev server; it was not treated as valid page evidence.

## Browser evidence

The three final account-entry layouts were inspected at 1440px and 390px in dark mode. The shared login layout was also inspected at 1024px in light mode with matching artwork, at 768px in its form-only layout, and at the earlier user viewport width of 602px. Computed fonts confirmed Space Grotesk for the H1 and Geist Mono for form prose. No horizontal page overflow was found in these captures. Account captures include the development indicator; it is not product UI.

About and Contact were inspected at 1440px and 390px. Terms was inspected at both widths, and the shared policy layout also has mobile Privacy/Cookie captures. The current fixed-bottom cookie banner was inspected at 390px. All captures are under `.impeccable/review`. These are viewport captures, not a full-page or complete device/theme matrix. The earlier inline-banner desktop/user captures are obsolete and were excluded from the review packet.

The Home breadcrumb navigated to `/`. The Terms contents link moved focus to its target heading. Mobile-menu Escape returned focus to Open menu. Cookie settings reopened the notice and focused its heading; Got it closed it and returned focus to Cookie settings; the notice stayed dismissed after reload. No form credentials were entered or submitted.

The independent reviewer identified one layering defect: the fixed banner was above the modal navigation. The fix changes its z-index to 70, below the overlay at 80 and sheet at 81. In a fresh-origin 390px production check, the unacknowledged banner remained behind the open menu while keyboard focus reached its lower Create account link, at y638–695. Closing the menu, acknowledging, reloading and reopening retained the expected behaviour. Captures `batch2-cookie-menu-mobile.png` and `batch2-cookie-reopened-mobile.png` show this focused menu state and the reopened notice. The final build passed after the correction.

## Release dependencies

Sign-in is deliberately unavailable when the local Supabase configuration is missing. The admin entrance sits outside the protected admin dashboard layout. Middleware preserves protected-route redirects when configuration is missing, and protected admin requests require trusted `app_metadata.role=admin`. Provisioning that role and database policies still need a production audit. This route-guard work is not a full RLS or financial-security audit. The registration UI stays closed until authentication, final terms and privacy information are ready. Its client flag is not a substitute for disabling signups in the auth service.

Contact delivery has no verified destination, so the form is disabled and says it cannot send or save an enquiry. Terms and privacy remain clearly labelled review drafts. The operator must supply its verified legal identity, support destination, eligibility, fees, custody, data-retention and other required business facts. The cookie policy describes this codebase and is not a compliance certification. No optional analytics or advertising tools were found in the current Next.js public implementation; a deployed environment must be inventoried separately.

All pages remain `noindex, nofollow`. No live authentication, email delivery, rate limiting, password recovery, database migration, screen-reader audit or performance benchmark was verified. Existing product imagery remains labelled concept/demo artwork, with provenance recorded in `output/public-portal-preview/theme-assets/README.md` and its manifest. No new raster artwork was produced. The 16 shipping WebP files now have adjacent provenance JSON files containing the exact existing prompts; their pixels are unchanged. The provenance scan reports zero missing records for the shipping directory. Archive PNGs retain their existing shared manifest rather than embedded metadata.

## Review status

The independent [finish review](../../.impeccable/review/batch2-finish-review.md) identified one material issue, the cookie notice above the mobile modal navigation. Its verdict records that issue as resolved after the single layering fix and the three focused recaptures. Final disposition is ship at the scored-fix scope, not blanket production or whole-site approval.

The scoped documentation update records the implemented public/auth extensions in [README.md](./README.md) and [components.md](./components.md), plus this verification record. Root DESIGN.md, PRODUCT.md, the global design sidecar, tokens, editorial drafts and handoff manifest are unchanged by the documentation pass. [First-batch implementation verification](./implementation-verification.md) remains historical and was not overwritten. No additional UI review or detector run was performed for documentation.
