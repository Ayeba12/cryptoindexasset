# Public component specification

Status: two local batches covering eight public information pages and user/admin sign-in plus registration, with the development preview retained. Updated 4 September 2026. No deployment or production approval.

This is the public/auth layer of the existing system, not a replacement for dashboard tokens. [DESIGN.md](../../DESIGN.md) still governs the shared brand. [COMPONENTS.md](../../COMPONENTS.md) records the existing 24 installed shadcn primitives. That is an inventory count, not a new-install count for this batch. A configured registry is not an installed or approved component catalogue.

The homepage uses the approved preview composition. The guides, About, Contact and policies share its public frame, header and footer. Account entry uses a compact frame without marketing chrome. Public destinations use real links. `/design-preview` retains the component gallery and `/design-preview/home` retains the homepage review. Both review routes are development-only and excluded from indexing. Only preview destinations open explanatory dialogs; gallery forms still validate locally without submitting or saving data. The second batch adapts the installed auth blocks and updates route guards. Dashboard controls and database records remain unchanged; no real account or financial action was performed.

## Sources and ownership

| Decision | Governing source | Scope |
| --- | --- | --- |
| Space Grotesk headings; Geist Mono prose and controls | Existing design system and explicit user instruction | All public HTML; no reference-site fonts |
| Yellow actions, zinc surfaces, orange chart artwork | Existing semantic colour system | Public pages and preview, with both themes |
| Editorial hero, grouped navigation, logo marquee and product bento stories | Approved public preview, informed by the user's Dovetail references | Implemented public homepage and review route |
| Left-aligned guide openings, ordered steps and editorial rows | Existing page briefs and `implementation-brief.md` | Account and copy-trading guides only; no new global tokens |
| About, Contact and policy compositions | Existing drafts and `second-batch-brief.md` | Public information pages only; stationary forms and policy clauses |
| Equal-column account entry with Home breadcrumb | Explicit user override; installed shadcn `login-02` and `signup-02` blocks | User/admin sign-in and registration only; no marketing header/footer or social actions |
| Public button geometry | Dovetail computed styles, 3 September, 1440px viewport: 8px radius, hero padding 12px block / 16px inline | Public controls only; minimum 48px keeps the approved 14/20 text and comfortable touch area |
| Compact auth submit geometry | Existing shared radius and scoped account-entry CSS | 44px minimum height and shared radius; does not replace the marketing-button exception |
| Compact dashboard controls | Existing `components/ui` source | Unchanged |
| Logo and favicon | `public/brand/README.md` and supplied SVGs | Original proportions and 64px minimum monogram width |
| Product artwork | `output/public-portal-preview/theme-assets/manifest.json` | Eight scenes, each with dark and light variants; concepts only, not evidence of real performance |

Source owners: [public CSS](../../components/public-site/public.css), [frame and destination handling](../../components/public-site/frame.tsx), [header](../../components/public-site/header.tsx), [footer](../../components/public-site/footer.tsx), [homepage](../../components/public-site/home.tsx), [product blocks](../../components/public-site/product-blocks.tsx) and [theme-aware images](../../components/public-site/product-image.tsx). The [marketing layout](../../app/(marketing)/layout.tsx) composes the shared public frame. Guide markup lives in [how it works](../../app/(marketing)/how-it-works/page.tsx) and [copy trading](../../app/(marketing)/copy-trading/page.tsx). The [interactive gallery](../../components/public-preview/gallery.tsx) remains preview-only; [preview frame](../../components/public-preview/frame.tsx) and [homepage wrapper](../../components/public-preview/home.tsx) reuse the shared implementation.

Second-batch owners: [document layout](../../components/public-site/document-page.tsx), [contact form](../../components/public-site/contact-form.tsx), [cookie notice](../../components/public-site/cookie-notice.tsx), [account controller](../../components/public-site/account-entry.tsx), [LoginForm](../../components/login-form.tsx), [SignupForm](../../components/signup-form.tsx), [password field](../../components/auth-password-field.tsx) and [public motion](../../components/public-site/motion.tsx). The [auth layout](../../app/(auth)/layout.tsx) uses the compact public frame. The [second-batch brief](./second-batch-brief.md) and its [mapped brief](../../.impeccable/surfaces/app-marketing-about-page-tsx.md) record the page-specific direction, not new global design rules.

## Public typography

Sizes are pixels at a 16px root. CSS uses rem so browser text resizing remains possible. Font families, weights and the approved type roles are unchanged by the Dovetail layout revision.

| Role | Wide ≥1281 | Middle 800–1280 | Narrow 390–799 | Tiny ≤389 | Weight |
| --- | --- | --- | --- | --- | --- |
| Hero display | 112/112 | 72/80 | 56/60 | 48/52 | 600 |
| Inner-page H1 | 72/80 | 56/60 | 48/52 | 40/44 | 600 |
| Section H2 | 64/68 | 48/52 | 32/36 | 32/36 | 600 |
| Subheading H3 | 28/36 | 24/32 | 24/32 | 24/32 | 500 |
| Lead | 20/28 | 16/24 | 16/24 | 16/24 | 400 |
| Body/input | 16/24 | 16/24 | 16/24 | 16/24 | 400 |
| Button/label/help/risk | 14/20 | 14/20 | 14/20 | 14/20 | 500 controls, 400 prose |
| Existing section marker/badge | 12/16 | 12/16 | 12/16 | 12/16 | 400 |

Headings use balanced wrapping and no fixed text heights. Homepage prose generally stops at 60 to 64ch; guide leads and step copy allow up to 70ch. Critical instructions and risk text are real HTML, not text embedded in screenshots. No Dovetail pixel font, typeface substitution, or animated word scrambling is introduced. Existing homepage eyebrows and section markers are recorded as inherited implementation, not a rule for new pages; the guide openings do not add them.

## The 4pt layout contract

| Role | Wide | Middle | Narrow |
| --- | --- | --- | --- |
| Maximum shell, including padding | 1512px | 1512px | 100% |
| Inline gutters | 124px | 64px | 16px |
| Section block padding | 120px | 80px | 64px |
| Section introduction → content | 96px | 64px | 48px |
| Main grid gap | 32px | 24px | 16px |
| Card padding | 32px | 32px | 24px |
| Form fields | 24px gap | 24px | 24px |
| Label → control → hint | 8px gaps | 8px | 8px |
| Sibling actions | 12px gap | 12px | 12px |

Structural space follows multiples of four. One-pixel borders and padding compensation inside a fixed control are optical exceptions, not extra layout tokens. The shared 0.45rem radius remains on cards, inputs, overlays and auth submit controls. The user-approved marketing-button exception is 8px; it must not replace `--radius` globally. The tables below retain the first-batch public/gallery specification. Account-entry exceptions are listed separately.

Primary-button hover uses a 10% white mix of the existing yellow. It lightens the fill in both themes so the preset's darker foreground keeps its contrast; do not darken the fill against dark backgrounds.

## Component geometry and behaviour

| Component | Public geometry | States and interaction | Implementation |
| --- | --- | --- | --- |
| Primary/outline/ghost button | ≥48px high; 12px block/16px inline padding; 8px radius; 12px icon gap; 20px icon | Default, hover, pressed, focus-visible, disabled, loading; labels wrap and height grows | Existing shadcn Button + scoped public class |
| Icon action | 44×44px minimum; 24px glyph; 8px radius | Accessible name required; same keyboard/focus states | Existing Button + public class |
| Text action | ≥44px high; 8px block padding; 12px arrow gap; 14/20 text | Underline + visible focus, never colour alone | Native anchor or preview dialog button |
| Header | 104px minimum wide, 80px narrow; 24px block/32px inline wide, 16px narrow | Full navigation at ≥1180px; grouped Product/Resources panels; collapse below | Supplied logo, Button, Radix NavigationMenu and Dialog sheet |
| Brand | Original monogram at 64px width | CA mark alone, no adjacent full name; home link retains an accessible name | Supplied theme-specific SVGs |
| Desktop navigation panel | 640px width; 24px inset; two columns; 16px item padding | Keyboard entry, Escape, descriptive links; preview destinations restore focus to group trigger | Installed Radix NavigationMenu |
| Mobile menu/sheet | ≤400px or viewport width; 32px padding, 64px top allowance; ≥56px link rows | Focus trap, Escape, close control, focus restoration; internal scrolling | Radix Dialog from installed package |
| Input | ≥48px high; 16/24 text; 16px horizontal content inset including border; shared radius | Empty, entered, invalid, disabled, read-only, focus; visible associated label | Existing Input + scoped class |
| Native select | Same input geometry; room for native affordance | Placeholder, selected, invalid, disabled, keyboard/OS picker | Native select; no simulated combobox |
| Textarea | ≥128px high; same inset/type as input; vertical resize | Empty, filled, invalid, disabled, focus; length hint | Native textarea |
| Field/group | 8px internal and 24px inter-field gap | Label, hint, required marker, linked error; never placeholder-only label | Semantic label/fieldset/legend |
| Checkbox | 20px visible square, 4px radius, ≥44px labelled row | Checked/unchecked/invalid/disabled states; Space toggles | Existing Radix-based Checkbox + scoped class |
| Radio choice | 20px native circle; ≥44px labelled row; 12px label gap | Exclusive selection and native keyboard behaviour | Native fieldset and radio group |
| Switch | 48×28px track; 20px thumb; 44px expanded hit height | On/off in text, keyboard toggle; does not collect consent | Installed Radix Switch |
| Form error summary | 16px padding; 2px error border | Focus on failed submission; linked fields; role=alert; retains entered content | Gallery local validation |
| Dialog | ≤560px, 16px viewport clearance; 32px padding, 24px narrow; viewport-height scroll limit | Labelled title/description; focus trap; Escape/outside close; focus return | Installed Radix Dialog |
| Confirmation dialog | Same geometry; 12px action gap | Clear cancellation; initial focus on cancel; explicit example action | Installed Radix AlertDialog |
| Accordion | ≥64px trigger; 20px vertical padding; 20px chevron; 24px answer bottom padding | Multiple items may open; Enter/Space, aria-expanded; no animated height | Installed Radix Accordion |
| Tabs | ≥48px triggers; 12/16px padding; 2px selected underline | Arrow keys and selected panel association; no automatic page navigation | Installed Radix Tabs |
| Tooltip | ≤280px; 12px padding; 14/20 text; 8px offset | Focus/hover, 300ms delay; never only source of essential information | Installed Radix Tooltip |
| Notice/alert | 16px padding; 12px icon gap; 20px icon | Neutral information; error includes icon/text and border; no fake success | Semantic content; live role only for actual updates |
| Status badge | ≥28px; 4/8px padding; 4px radius; 12/16 text | Text names status; no yellow-as-profit or colour-only status | Scoped semantic span |
| Feature card | 32px padding, 24px narrow; shared radius; 1px boundary | Flat grouping; no hover treatment on non-interactive panels | Semantic article |
| Product figure | Native aspect ratio; top bento image slots use 4:3 contain framing, never cropping | Eight matching scenes in each theme; informative alt + persistent demo caption | Theme-aware Next Image with one source per slot |
| Product bento | Two equal panels plus a full-width 4:8 copy/image panel; 32/24/16px gaps | One column below 800px; full-width panel stacks below 1024px | Semantic articles, shared card radius |
| Asset marquee | Four supplied asset marks; 40px icons; 104px strip; 42s horizontal loop | Labelled as assets, not partners; pause button, hover/focus pause, offscreen/hidden pause; reduced-motion static list | CSS transform with IntersectionObserver lifecycle |
| Service principles | Open 5:7 editorial split; sticky heading at middle/wide sizes; three 48px icon rows with 32px block padding and one-pixel separators | One column below 800px; statements avoid instant-processing, profit and absolute-security guarantees | Semantic section and articles; public homepage only |
| People marquee | Three cards per set; 384px cards wide, 32px padding, 72s transform loop; static three/two/one-column grid by breakpoint | Pause/Resume, View all, fine-pointer hover/focus pause, offscreen/hidden stop; reduced-motion and no-JS static | CSS transform and IntersectionObserver; duplicate list is aria-hidden and inert |
| Trader profile card | Portrait/name, strategy, assets, copier count, defined accuracy, rating, demo disclosure and ≥48px Copy trader action | Copy action has a persona-specific accessible name and opens `/copy-trading`; no live copy transaction | Fictional demo content and AI-generated portrait; primary marquee list only exposes links |
| Testimonial card | Quote-led card with portrait/name/use-case and visible sample disclosure | No claim of customer status, return or endorsement; opposite marquee direction | Fictional sample quote and AI-generated portrait |
| Process | Open ordered list; 24px top padding; 16px title/body gap | Same reading order when stacked; no invented completion time | Semantic ordered list |
| Decision row | 32px vertical padding; 24px title/arrow separation | Descriptive text wraps; only actual destinations receive link and focus behaviour | Static public detail row where the destination is unbuilt; preview destination button in review mode |
| Table | 16px cells, 12px narrow; 14/20 text; 1px rules | Caption, column/row headers; local overflow region keyboard-focusable | Native table |
| Empty state | Card padding, 16px internal gaps | Clear explanation and meaningful next action | Semantic content |
| Skeleton | 20px bars, 12px gaps; 4px radius | Static example; hidden from accessibility tree; adjacent real loading text when used | Scoped CSS |
| Spinner | 20px circle; 2px stroke | Text and aria-busy accompany loading; static under reduced motion | Scoped CSS |
| Footer | 64px top wide /48px narrow; 32px bottom; 32/24/16px gaps | Public Explore/Legal/Your account groups; theme selector, Cookie settings and full risk statement; no admin link | Semantic footer/nav/list; review mode retains its preview-only Explore/Help/Legal groups |

The existing `components/ui` inventory remains 24. The shared public frame, navigation, footer, product cards and motion live under `components/public-site/`. Accordion, AlertDialog, Switch, form fields and other gallery demonstrations still compose the installed APIs locally. Their presence in this table does not mean those gallery forms or dashboard controls were upgraded. Account entry uses the actual installed LoginForm/SignupForm blocks and shared Field, Input, Button and Breadcrumb components.

## Guide patterns

These are public-page compositions using the incumbent type, spacing, colour and radius roles. They do not add global tokens or dashboard requirements.

| Pattern | Implemented form | Semantics and use |
| --- | --- | --- |
| Guide opening | Left-aligned inner-page H1; heading up to 1120px, lead up to 70ch; existing section and introduction spacing | One H1 per page; paired actions stack below 800px; risk text stays HTML |
| Contents strip | Wrapping links; 8px row /32px column gap; 16px block padding; 44px minimum links | Named on-page navigation to the account steps |
| Sequential guide steps | Number and copy use 1:11 columns with a 48px minimum number column; 48px block padding and shared grid gap | Ordered list with focusable step targets; one column, 16px gap and 32px block padding below 800px |
| Step callout | 24px padding, muted background and shared radius | Funding warning inside its relevant step, with no invented status colour |
| Definition rows | 32px block padding, bottom rule and 16px term-to-description gap; description up to 70ch | Definition list for proposed request statuses; approval stays distinct from transfer confirmation |
| Question rows | 24px block padding, bottom rule and prose up to 70ch | Open unordered list of checks; no checkbox or implied completion state |
| Concept sequence | Three equal columns with the shared gap; 24px block padding and top rules; one column below 800px | Ordered explanation of trader decision, copying process and account outcome; explicitly not the platform's verified execution design |

The existing 5:7 editorial layout pairs guide headings with definition, question or answer rows, then stacks below 1024px. First and last row edge spacing removes unnecessary outer padding. Product figures reuse `ProductImage` and `ConceptCaption`; no guide-specific image theme or caption system exists.

## Second-batch public and auth extensions

These patterns apply to the implemented information pages and account entrances. They do not set new dashboard or global rules.

| Pattern | Implemented form | Semantics and use |
| --- | --- | --- |
| About | Existing left-aligned guide opening, paired actions, account concept image and 5:7 editorial rows | Explains intended experience and missing operator facts; existing demo captions remain visible |
| Contact | 5:7 guidance/form columns; 80px gap, 48px at ≤1280px; one column below 1024px | Guidance precedes the form on mobile; labelled native fields and a disabled fieldset explicitly state delivery is not connected |
| Policy reading layout | Contents rail of at least 180px beside an 8fr reading column; 80px gap, 48px at ≤1280px; prose up to 70ch | Named contents navigation and focusable section targets; no scroll entrances on clauses |
| Policy contents | Sticky desktop rail with 32px top offset; static two-column contents below 1024px; one column below 600px | Links move to labelled sections; review notice and date remain real HTML |
| Policy clauses and notices | 48px section padding, 32px below 800px; 24px prose gaps; shared-radius muted notices | Terms and privacy stay visibly marked as drafts; no assumed agreement or compliance claim |
| Account shell | Equal desktop columns and 100svh minimum height; artwork hidden below 1024px | Home breadcrumb is the only outer navigation; no marketing header, footer or cookie notice |
| Auth form | 416px maximum width; 24px field-group gaps; centred heading and help links | `LoginForm` serves user/admin sign-in; `SignupForm` serves registration; both are used directly |
| Auth typography | Space Grotesk H1 at 40/44, 32/36 below 800px; Geist Mono prose; labels/help at 14/20 | Existing font roles retained; this compact auth H1 does not change the public display scale |
| Auth submit | Full width; 44px minimum height; 12px block/16px inline padding; shared radius; wrapping 14/20 label | Existing Button with disabled/loading state; marketing buttons retain their separate ≥48px/8px rule |
| Password field | Existing Input with a separate 44px minimum visibility action and 8px gap | Associated label; named Show/Hide password button with pressed state; registration hint and confirmation field |
| Auth artwork | Existing theme-matched closing mockup, concept caption and HTML risk statement | Desktop-only supporting content; no new image or verified account-data claim |
| Cookie information | Fixed bottom notice; z-index 70 below modal overlay 80 and sheet 81; stacked content at ≤1280px | Acknowledgement only; Cookie policy and Got it actions; Cookie settings reopens and focuses the heading |

Sign-in is unavailable without local auth configuration. Registration also has an explicit UI release gate pending final terms/privacy and auth readiness. Disabled fieldsets and submit guards prevent these unavailable UI actions. The registration flag is not server security. Protected-route middleware handles missing configuration and requires trusted `app_metadata.role=admin` for admin pages; this documentation does not claim a complete RLS or financial-security audit.

No social-login or placeholder actions remain in the adapted auth blocks. The header and footer intentionally have no Admin sign-in link in the current source. Direct `/admin/login` and the Contact page's Admin sign-in link remain available. Auth has no separate visible theme selector; it uses the public frame's resolved preference and matching artwork.

## Responsive rules, including tablets

- **390px phone:** one-column reading order and stacked hero actions. The overview remains a product illustration, with a separate mobile-view card below.
- **768px portrait tablet:** narrow spacing/type band; a single-column bento and process. No forced desktop navigation.
- **800–1023px tablet:** middle gutters/type; two upper bento cards, with the full-width card's copy and image stacked. Process stays one column.
- **1024px landscape tablet:** two-column bento with a full-width 4:8 copy/image row; three open process steps. Navigation remains collapsed.
- **1281px and wider:** wide type/spacing; 5:7 editorial sections. Full header navigation begins at 1180px, after checking the CA-only header and actual labels.
- **1440px and ultra-wide:** shell stops growing at 1512px including padding. Product views remain prominent without stretched prose.
- Centre the homepage hero, account-story introduction and closing copy. Guide openings and explanatory sections stay left-aligned. Do not place a floating conversion bar over text.

## States, accessibility and motion

Use 2px foreground focus outlines with 4px offset. Public input borders use a stronger zinc than decorative separators. Light-theme secondary text is zinc-600 to keep smaller help/risk copy readable on light-zinc panels. These adjustments stay inside `.public-site`; they do not change global tokens.

The in-tree portal root keeps navigation overlays and preview dialogs in the selected public theme. Public destinations are Next.js links, including sign-in and registration links; live account flows were not verified by this work. About, Contact and policy routes are linked. Unbuilt fee and other proposed destinations stay out of public navigation. In preview mode, destination buttons disclose the planned route without running an account action. The gallery form checks sample input locally, focuses a linked error summary when invalid, and reports "Nothing was sent or saved" when valid. It has no server action or API submission.

Public mode starts with System, reads valid saved Light/Dark/System overrides and stores only `ca-public-theme` when the user makes a choice. The header toggle chooses Light or Dark; the footer selector also offers System. System tracks operating-system changes. Missing, invalid or unreadable stored preferences leave System selected. Preview mode starts dark and neither reads nor writes that public preference. One resolved value drives public CSS and product image selection. Deterministic state/effect tests cover these rules; they do not establish browser hydration behaviour or a flash-free first paint.

Product panels and story introductions reveal once on entry over 640ms with `cubic-bezier(0.22, 1, 0.36, 1)`. Text starts at 0.35 opacity and a 24px vertical offset. Image entrances start at 0.65 opacity, a 16px offset and 0.98 scale. Direct reveal siblings in an opted-in group stagger by 60ms, capped at 180ms. IntersectionObserver triggers the sequence; there is no per-frame scroll handler. Content is visible before JavaScript and when motion is reduced. Keyboard focus, reduced-motion changes or hidden-tab state finish active reveals. Forms and legal clauses remain stationary. Button feedback remains 120ms and overlays ≤200ms.

Cookie acknowledgement lasts 180 days and is versioned separately from the public theme preference. Missing, expired or malformed acknowledgement shows the notice. Reopening focuses its heading; Got it closes it and restores focus to Cookie settings, or to the main content when no opener exists. A storage failure hides it only for the current visit and logs the failure. The notice stays below modal navigation so it cannot obscure focused menu links. This is an information acknowledgement, not optional-tracker consent.

The asset marquee runs as a 42s CSS transform loop. The trader and testimonial marquees run as 72s CSS transform loops in opposite directions. Duplicate lists are hidden from assistive technology and inert. They pause on hover, focus, their visible pause controls, offscreen state and hidden tabs. View all and reduced motion replace people loops with static grids. No animated balances, continuous headlines, scroll hijacking or autoplay video.

Mobile section links move focus and scroll to their destination after the menu closes; route links navigate after closing. Escape returns focus to the menu trigger. The public mobile menu starts with Home. Planned page destinations open the explanatory dialog only in preview mode.

## Artwork and release gates

The supplied campaign images contain fictional trader names, amounts, chart results and some assets outside the confirmed project currency list. They are acceptable here only as clearly labelled design concepts. They must not be presented as screenshots of verified product functionality, trader performance or available markets. The original assets are unchanged.

The original brief proposed a 2:1 hero and 4:5 mobile image; the supplied assets use other ratios. The implementation preserves their compositions without stretching or cropping. All eight scenes have complete dark and light variants, including surrounding backgrounds and inset cards. Each version uses the CA mark without the full name. `ProductImage` uses one selected source per slot, without recolouring product images through filters. No new raster artwork was produced. The 16 shipping WebPs gained adjacent provenance JSON records containing the exact existing manifest prompts, with no pixel changes. The shipping scan found 16 records and zero missing. Archive PNGs retain the shared [asset manifest](../../output/public-portal-preview/theme-assets/manifest.json) and [artwork README](../../output/public-portal-preview/theme-assets/README.md).

Still outside this stage: live authentication, registration/contact/withdrawal workflows; legal/commercial claim approval; verified product screenshots; video production; public pages beyond the eight implemented routes; a full automated accessibility and assistive-technology audit. Market tickers, pricing calculators, testimonials, returns and verification badges remain evidence-gated.

See [second-batch verification](./second-batch-verification.md) for current results and limitations. The final isolated build and HTTP smoke passed; the independent [finish review](../../.impeccable/review/batch2-finish-review.md) resolved the cookie/modal layering defect and returned ship only at that scored-fix scope. Nine inherited CSS detector advisories remain documented after one detector run; they are not new design rules. [First-batch implementation verification](./implementation-verification.md) preserves its two resolved scored fixes as history. [Preview verification](./preview-verification.md) is earlier evidence, not a fresh pass of the current routes. Public and auth routes remain `noindex, nofollow`; design completion is not production readiness.
