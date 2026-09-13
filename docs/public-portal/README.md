# Public portal copy and layout pack

Editorial pack version 1.1 | Implementation status updated 4 September 2026

This pack contains the public website's editorial drafts, shared design specification and implementation records. Two local implementation batches now cover eight public information pages and three account entrances. Other page drafts remain proposals. No deployment has taken place.

Start with [the sitemap](./sitemap.md), then [the home page](./pages/home.md). The [shared layout and voice guide](./shared-layout-and-voice.md) applies to every page.

The [public portal visual direction](./visual-direction.md) records the user's Dovetail-first references, responsive type scale, spacing, homepage composition and motion plan. The first implementation extended the approved preview with shared public components and two account guides. The [second-batch brief](./second-batch-brief.md) extends that work with information pages, policy drafts, account entry and public motion. Space Grotesk, Geist Mono and dashboard controls are unchanged. Neither implementation batch changes the editorial page drafts or their manifest hashes.

The [editorial review](./editorial-review.md) includes alternative page titles and the final checks. The [handoff manifest](./handoff-manifest.json) records the version and content hash of each page.

## Current public implementation

The [first implementation brief](./implementation-brief.md) records the homepage and two guides. The homepage retains its centred two-line opening, CA-only navigation, asset marquee, product bento groups and one-time reveals. It now also includes the scoped [community and services extension](./community-brief.md): three honest service-principle rows, a fictional trader marquee with copy-guide actions, and a fictional testimonial marquee. The account and copy-trading guides use left-aligned openings, sequential steps and editorial rows. Shared public code and CSS live in `components/public-site/`.

| Local routes | Implemented composition | Current limit |
| --- | --- | --- |
| `/`, `/how-it-works`, `/copy-trading` | Homepage and public account/copy-trading guides | Product claims remain evidence-gated |
| `/about`, `/contact` | Left-aligned About opening; Contact guidance beside a labelled form | Operator details unconfirmed; contact form cannot send or save |
| `/terms`, `/policy`, `/cookie-policy` | Shared contents rail and stationary reading column | Terms/privacy are review drafts; cookie inventory is not compliance approval |
| `/login`, `/admin/login`, `/register` | Adapted installed shadcn `login-02` and `signup-02` blocks | Local sign-in unavailable without configuration; registration remains closed |

Public destinations are real links. About, Contact and policy pages are now linked; unbuilt fee and other proposed pages stay out of public navigation. The current header and footer have no Admin sign-in link. `/admin/login` remains directly accessible and linked from Contact. The exact `/copy-trading` route is a public explainer; its subpaths retain session checks. Dashboard links to that path still need an account-specific destination in the dashboard phase.

Account entry uses `LoginForm` and `SignupForm` directly, with the installed Field, Input, Button and Breadcrumb components. Desktop has equal form/artwork columns; below 1024px only the form remains. Home is the only outer-navigation breadcrumb link. These pages have no marketing header, footer, cookie overlay, social sign-in or placeholder actions. They retain the brand fonts, colours and shared radius. The auth submit control has a 44px minimum height; the marketing-button exception is unchanged.

The fixed-bottom cookie notice records acknowledgement of the current storage information, not consent to optional tracking. Cookie settings reopens it. Its layer sits below the mobile modal navigation. Public text/image entrances now support 60ms sibling staggering capped at 180ms; forms and legal clauses remain stationary.

The [public component specification](./components.md) records these public/auth extensions without replacing [DESIGN.md](../../DESIGN.md) or adding dashboard rules. Public theme selection starts at System, honours saved overrides and stores its preference in `ca-public-theme`. CSS and product images use the same resolved theme. The eight existing scenes have a light and dark version, with persistent concept/demo captions. No new raster artwork was produced. The 16 shipping WebPs now have adjacent provenance JSON files copied from the exact existing manifest prompts; their pixels are unchanged. Sources and edit prompts remain in the [artwork README](../../output/public-portal-preview/theme-assets/README.md) and [asset manifest](../../output/public-portal-preview/theme-assets/manifest.json). Archive PNGs retain that shared manifest.

The development-only `/design-preview` gallery and `/design-preview/home` review route remain available through compatibility wrappers. Their destination dialogs and local-only forms remain isolated; preview mode starts dark and does not read or write the public preference. Gallery forms and dashboard controls were not upgraded.

Read [second-batch verification](./second-batch-verification.md) for current checks, capture limits and release gates. The final isolated production build and HTTP smoke check passed for 11 routes, 16 themed image slots, 223 internal links and 33 JavaScript assets. The independent [second-batch finish review](../../.impeccable/review/batch2-finish-review.md) resolved its single scored cookie/modal layering fix and returned ship at that scope. It is not blanket production approval. [First-batch implementation verification](./implementation-verification.md) remains historical, including its two resolved scored fixes. [Preview verification](./preview-verification.md) records the earlier preview stage.

Public and auth pages deliberately retain `noindex, nofollow`. Missing local Supabase configuration still blocks live sign-in verification. Registration is gated pending final terms/privacy and authentication readiness; its UI flag is not server security. Middleware preserves protected-route checks when configuration is missing and requires trusted `app_metadata.role=admin` for protected admin pages. Stubbed checks cover those branches, not a full RLS or financial-security audit. Legal and commercial facts, custody, fees, support delivery, eligibility and verified trader data remain release dependencies. The homepage trader counts, accuracy, ratings, profiles, quotes and portraits are visibly fictional demo content; Copy trader opens the public guide and does not initiate copying. No real account submission, database change or financial action was performed.

## Page drafts

| Page | File | Purpose |
| --- | --- | --- |
| Home | [home.md](./pages/home.md) | Introduce the platform and guide the next step |
| How it works | [how-it-works.md](./pages/how-it-works.md) | Explain the account journey |
| Copy trading | [copy-trading.md](./pages/copy-trading.md) | Explain the concept and trader information |
| For investors | [investors.md](./pages/investors.md) | Help visitors assess an investment option |
| Fees | [fees.md](./pages/fees.md) | Explain costs and required disclosures |
| About | [about.md](./pages/about.md) | Explain the platform's purpose and company identity |
| Security | [security.md](./pages/security.md) | Explain account protection and custody questions |
| FAQs | [faq.md](./pages/faq.md) | Answer common questions before registration |
| Contact | [contact.md](./pages/contact.md) | Route enquiries and account problems |
| Risk disclosure | [risk-disclosure.md](./pages/risk-disclosure.md) | Explain material risks in plain language |
| Terms of service | [terms.md](./pages/terms.md) | Provide a structured draft for confirmed service terms |
| Privacy policy | [privacy.md](./pages/privacy.md) | Provide a structured draft for actual data practices |
| Create account | [register.md](./pages/register.md) | Set expectations and reduce form friction |
| Sign in | [login.md](./pages/login.md) | Help returning users access their account |
| Forgot password | [forgot-password.md](./pages/forgot-password.md) | Request an account recovery email |
| Reset password | [reset-password.md](./pages/reset-password.md) | Complete recovery |
| Page not found | [not-found.md](./pages/not-found.md) | Recover from a broken link |

## How to read these files

Only text under **Page copy** and the quoted strings in **Interface states** is intended for visitors. Layout instructions, source notes and publication dependencies are internal. Square-bracket placeholders are internal fields to complete, never text to ship.

Public-facing copy describes the proposed product experience. A feature present in legacy code is not proof that the current Next.js version delivers it. The [evidence and decisions register](./evidence-and-decisions.md) records this distinction and identifies claims that need business confirmation.

Terms and privacy contain complete section structures and draft language where facts are available. Contracting entity, jurisdiction, custody, fees, retention and other business terms remain unconfirmed. Those documents are editorial working drafts, not final legal policies.

## Editorial-stage skills

| Skill | Source | Application |
| --- | --- | --- |
| content-writer | aaron-he-zhu/aaron-marketing-skills | Page intent, headlines, metadata, structured copy and evidence boundaries |
| ux-writing | content-designer/ux-writing-skill | Navigation, labels, help, errors, loading and success messages |
| verve | dbhq-uk/verve-skill | Professional British English and a final pass for natural prose |
| unslop | Existing project skill | Removal of stock phrases and inflated claims |
| ui-skills-root and better-layout | Existing project skills | Layout selection, grouping, reading order and responsive behaviour |

During editorial drafting, the three requested skills were installed for Codex in `.agents/skills/` using the supplied repositories and recorded in `skills-lock.json`. This table records that earlier editorial work, not the skill set used for every later implementation batch.

The editorial draft used content-writer mode `new`: it was based on existing product evidence, not a measured search-traffic recovery project. No approved narrative or claims projections were available. The user-requested exploratory draft therefore used `dependency_status: approved-fallback`. Missing material claims remain blocked individually in the evidence register. No ranking, conversion or legal-readiness score is claimed.

## Revision workflow

Refer to a page and section ID, such as `home H01` or `investors I03`, when requesting changes. Keep the route, page purpose and primary action with the revised copy. Changes to fees, withdrawal wording or service availability should also update the shared copy and FAQs.

Next editorial inputs are listed in the evidence register. The drafts can be revised independently while those details are gathered.
