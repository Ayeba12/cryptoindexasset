# Homepage community and service sections verification

Local work, 4 September 2026. No deployment, account submission or financial action. The existing public typography, global design system and dashboard styling are unchanged.

## Implementation

The homepage and its shared development preview now include an open service-principles section after the account story, three fictional trader profiles after the copy-trading story and three sample testimonial cards before the FAQ. Service principles cover 2FA/authenticated access, request visibility with network-dependent timing, and copy-trading risk. The supplied first-confirmation, guaranteed-growth and absolute-security claims were not published because they are not verified.

Trader cards show generated portraits, names, trading styles, asset examples, copier counts, accuracy and ratings. Accuracy has a visible 90-day closed-trade definition and limitation. Each card has a visible **Copy trader** action whose accessible name includes the fictional persona. It opens the public `/copy-trading` guide; it cannot start a live financial action. No verified rank, live copy action or real customer endorsement is claimed.

Every card visibly identifies its demo/sample content and generated portrait. Testimonials express hypothetical needs, not experienced financial gains. Real profiles, performance methodology, consented quotes and appropriate portraits are still publication dependencies.

The two rows use 72-second CSS transform loops in opposite directions. Each has Pause/Resume and View all controls. View all displays a grid and hides duplicate cards. Fine-pointer hover and keyboard focus pause motion; offscreen/hidden state stops it. Reduced motion, missing IntersectionObserver and no-JavaScript rendering use a static grid. Duplicated lists are aria-hidden and inert. Only the primary trader list exposes the copy-guide links.

## Automated evidence

- `scripts/test-public-community.mjs` passes stubbed lifecycle checks for pause/resume, static mode, reduced-motion updates, offscreen/hidden state, reverse direction, duplicate inertness and cleanup. Its HTTP checks pass for the service and people sections, safer service wording, six copy-guide link instances across primary/inert loop copies, card disclosures, six WebP/provenance files, eight page scripts, ten linked routes and homepage anchors.
- The AccessLint live-page scan ran 94 automated rules and reported zero violations. Source mapping was therefore not needed. This is a mechanical scan, not a screen-reader or legal/commercial review.
- Existing public motion, theme and cookie-notice tests pass.
- Shipping portrait provenance scan: six rasters, zero missing.
- Scoped `git diff --check` passes.
- One scoped detector run reports nine inherited CSS advisories and no primary errors, in `.impeccable/review/community-detector.json`. None comes from the new people-section rules. No second detector run.

The isolated production bundle compiles, but the overall build fails type validation at `app/api/auth/logout/route.ts:16`, where `cookiesToSet` is implicitly any. The standalone TypeScript check also reports related errors in `app/auth/callback/route.ts`. Those files were outside this homepage task and remain untouched.

The older full-public smoke test stops at its allowlist check for the newly added `/forgot-password` link. The route exists and returned HTTP 200; this is a stale test expectation, not evidence of a broken homepage. Its allowlist and unrelated auth files were not edited here. No blanket build or whole-site test pass is claimed.

## Browser evidence

Current screenshots are in `.impeccable/review/`, all prefixed `community-`:

- `traders-desktop`, `traders-desktop-grid`, `testimonials-desktop`: 1440 × 1000, dark.
- `traders-mobile`, `testimonials-mobile`, `testimonials-mobile-card`: 390 × 844, dark. The last capture shows the complete quote card and its disclosure below the section's first viewport.
- `traders-tablet-light`, `testimonials-tablet-light`: 1024 × 1000, light.
- `traders-user-1280`, `testimonials-user-1280`: 1280 × 720, dark, card-focused captures matching the initially observed browser width.
- `services-desktop`, `traders-actions-desktop`: 1440 × 1000, dark, showing the final service copy and card actions.
- `services-mobile`, `traders-actions-mobile`, `traders-action-mobile-static`: 390 × 844, dark. The static capture shows the complete first card and action after View all.
- `services-tablet-light`: 1024 × 900, light.

These are intentionally scrolled viewport captures, not whole-page screenshots. All portrait slots loaded and none of these viewports had horizontal page overflow. Partial cards at the row edges are the marquee window, not page overflow. View all makes all cards available without motion. The development indicator is tooling, not product UI.

Live checks confirmed Pause/Resume, a three-column desktop static grid and one-column phone grid, hidden duplicates, a changing running transform, offscreen stopping and a fully visible trader action navigating to `/copy-trading`. Reduced-motion changes and hidden tabs were covered by deterministic tests, not OS-setting automation. No frame-rate benchmark or screen-reader audit was performed.

## Assets and review

The built-in image generator produced six distinct fictional portraits. Original PNGs, exact prompts and generation notes are in `output/community-portraits/`; 256px WebPs and prompt sidecars ship from `public/images/community/`. Source images and derivatives were visually inspected. No external customer photos were sourced.

The required independent finish-review agent could not run because the account agent limit was reached. A bounded in-thread substitute is recorded in `.impeccable/review/community-finish-review.md` with a scoped `ship` disposition. This is explicitly not independent review or production approval for the financial service.
