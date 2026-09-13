# Public implementation verification

4 September 2026. Scope: the first public-site batch, not a production release or financial/security audit.

## Implemented

- `/`: approved homepage promoted from the design preview, replacing the older marketing draft and unsupported statistics.
- `/how-it-works`: sequential account guide, funding checks, proposed status definitions and pre-funding questions.
- `/copy-trading`: educational guide, strategy evaluation, labelled concept images and service questions. No fabricated trader records or enquiry endpoint.
- Shared public frame, CA branding, desktop/mobile navigation, footer, theme controls, product images, cards and existing motion under `components/public-site/`.
- The component gallery and review homepage still use isolated preview destinations. Public pages use actual links.
- Public mode starts at System, honours valid saved overrides and persists only `ca-public-theme`. Preview mode starts dark and does not read or write the public preference. Product images and CSS share the resolved theme.
- Existing paired artwork was reused. No new images were generated in this batch; provenance remains in the [artwork README](../../output/public-portal-preview/theme-assets/README.md) and [manifest](../../output/public-portal-preview/theme-assets/manifest.json).

## Automated checks

| Check | Result |
| --- | --- |
| `npx tsc --noEmit --incremental false` | Passed |
| `npm run build` | Passed with Next.js 15.5.25; public routes statically rendered |
| `node scripts/test-public-pages.mjs` against the final local production build | Passed: all three public routes return 200 without a session; one H1 and main per page; branded titles; noindex; 12 themed product-image slots; 67 internal links |
| `node scripts/test-public-routing.mjs` | Passed: 36 assertions for public route allowlisting and retained session checks; not a test of Supabase authorization itself |
| `node scripts/test-public-theme.mjs` | Passed: eight scenarios exercising the actual frame with hook/browser doubles, including fresh light/dark OS preferences, saved light/dark/system choices, OS changes, invalid/blocked storage and preview isolation. Not browser rendering or hydration coverage |
| Impeccable static detector, before the review fixes | Exit 0, nine advisory findings in inherited public CSS. Grid/background, overlay alpha colours and gallery radii remain governed by the approved public specification. No second detector run after the fixes |

Type checking, the build and both page/routing scripts passed after the two review fixes. No database or account submissions were performed. Standalone deployment packaging was not tested. The build was served locally through `npm run start`; it warns that a standalone deployment should use the generated standalone server.

The development server was restored on port 3100 after production-mode testing, with the homepage open for local review.

## Browser checks

The production-mode capture matrix checked all three routes at desktop 1440, mobile 390, tablet 768 and the current in-app width 602. Capture helpers assert the route and actual viewport width before saving. No horizontal overflow was observed at those widths. After the system-default fix, the homepage desktop, mobile and tablet captures were replaced. That fix changed preference handling, not page geometry; the other final captures remain evidence from the initial matrix.

- Existing heading and body font families retained; no global/dashboard type or control changes.
- Dark and light themes select the corresponding product image sources. All eight light homepage images loaded after scrolling. Browser System selection resolved to the current dark OS preference. Fresh light-OS selection and OS changes are covered by deterministic frame tests, not browser-emulated light OS.
- Theme survived navigation and a reload; only the public `ca-public-theme` preference is stored.
- Mobile menu initially focuses Home; Escape closes it and returns focus to Open menu.
- Navigation reached both new guides. The copy-trading evaluation anchor moved focus to its target.
- No broken in-page anchors in the tested pages. Illustrations remain labelled demo/concept content.

Authoritative screenshots are `.impeccable/review/final-*.png`, including the replacement `final-home-desktop.png`, `final-home-mobile.png` and `final-home-tablet.png`. These are viewport captures, not full-page screenshots. Earlier non-final images are invalid review evidence: the browser's full-page stitching produced repeated fragments, and rapid resize captures could observe stale dimensions. They were excluded from the final review. Below-fold verification uses page interaction, selected section captures and source checks; do not claim a complete full-page pixel audit.

Literal 200% browser zoom, forced-colour mode, a screen reader and a full automated accessibility scan were not tested in this batch. Reduced motion is retained in CSS and the existing reveal component; emulated reduced-motion behaviour was not tested here.

## Independent finish review

The [finish review](../../.impeccable/review/finish-review.md) used an independent reviewer with the fallback role definition. It opened all 14 named final captures and limited visual findings to their captured regions. No browser or extra detector pass was part of that review.

The reviewer scored two fixes: public mode initially defaulted to Dark despite the existing system-default rule, and `PRODUCT.md` linked to a missing provenance README. One fix batch changed the public default to System while preserving preview isolation and saved overrides, and pointed the product record at the existing artwork README and manifest. The actual-frame theme test passed all eight scenarios. The reviewer checked replacement homepage captures and confirmed both provenance targets exist.

The final disposition is `ship` for those two scored fixes only, with no regressions observed in the replacement captures or changed areas. It is not a whole-site audit or launch approval. The existing `DESIGN.md`, dashboard design, editorial drafts and handoff manifest remain unchanged. This documentation pass updates only this record, the [pack README](./README.md) and the [public component specification](./components.md). Earlier [preview verification](./preview-verification.md) remains historical evidence.

## Release blockers and boundaries

- Local Supabase URL and key are missing. Sign-in and registration destinations exist, but fail before their flows can be verified. Configure them locally; do not paste secret keys into chat. Authentication and credentials were not changed.
- `/copy-trading` is now the static public explainer. Only this exact path bypasses session work; subpaths retain the existing session gate. Existing dashboard links will need their own account-specific copy-trading route in the dashboard phase.
- Fees, legal identity, eligibility, custody, networks, settlement timing, support delivery and verified execution/trader information still require confirmation under [the evidence register](./evidence-and-decisions.md). No support endpoint, partner, rating or return claim was invented.
- Public pages deliberately remain `noindex, nofollow`. No deployment, database migration or financial action was performed.
- Gallery forms and the 24 installed shadcn primitives retain their previous scope. This batch does not upgrade account forms or dashboard controls.
