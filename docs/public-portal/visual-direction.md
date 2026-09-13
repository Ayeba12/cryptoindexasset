# Public portal visual direction

Version 1.2 | 4 September 2026 | Public design preview, not a shipped interface

## Current implementation note

The 4 September public preview at `/design-preview/home` follows the supplied Dovetail screenshots and a fresh inspection of its hero, navigation dropdown and product presentation. It keeps the approved Space Grotesk/Geist Mono type scale and shared dashboard design system. The following public-only decisions supersede earlier composition proposals in this brief:

- CA-only brand mark in the header and footer, with the full business name retained for accessible link names and copyright.
- Two-line hero, quiet edge grid, paired actions, risk copy, then a horizontally moving asset-logo strip and the dominant product overview image.
- Grouped Product/Resources navigation. Full navigation at 1180px and above; a keyboard-accessible menu below that width.
- An editorial statement, centred account introduction, two-plus-one product bento groups, copy-trading story, account process, decision details, questions and closing tablet image.
- Eight distinct product scenes with eight dark and eight light variants. Each theme uses matching backgrounds, screens and inset cards. Source compositions are preserved; no CSS inversion or mixed-theme fallback.
- One-time 640ms opacity/24px scroll reveals. The 42s logo loop pauses on hover, focus, user request, offscreen state and hidden tabs; reduced motion uses a static list. These are project timings, not a claim to reproduce Dovetail's internal animation values.

The moving logos are supplied cryptocurrency asset marks, labelled “Assets in focus”. They do not represent customers or partners. No ratings, adoption statistics, verified-return claims or competitor brand assets are copied. See [the current component specification](./components.md) and [verification report](./preview-verification.md) for implementation details. Earlier measurements below remain reference evidence, not a pixel-identical specification.

## Direction and scope

Dovetail is the primary reference. Use its homepage's large headings, generous section spacing, bounded grids, and product-led presentation as the basis for this portal. Tenor and the supplied images contribute specific details, not competing visual themes.

Keep Space Grotesk for headings and Geist Mono for body and interface text. Keep the zinc surfaces, semantic yellow actions, Phosphor icons, shared radii, and light/dark support from [DESIGN.md](../../DESIGN.md). This brief does not replace the dashboard's compact density or change the preset.

The measurements below describe the references. The implementation tables that follow are proposed project rules. They are not CSS already installed in the app. The distinction matters where the reference's fonts, heading treatment, or control sizes would not work unchanged here.

## Reference hierarchy

| Reference | Adopt | Leave out |
| --- | --- | --- |
| [Dovetail homepage](https://dovetail.com/) | Overall composition, type hierarchy, section rhythm, visual panels, restrained grid decoration, product image below the hero | Its fonts, blue/purple brand assets, company claims, customer logos, promotional popup, and literal page copy |
| [Tenor homepage](https://www.tenor.finance/) | Room around media, self-contained explanatory video scenes, posters before playback, mobile-specific framing | Its serif type, lending claims, protocol diagrams, and full-page video treatment as our main identity |
| `download (3).jpg`, supplied image | Unequal card sizes, large graphic fields, one strong accent, expressive words within a headline | Red/orange replacement palette, fake statistics, investor logos, oversized circles around the hero |
| `crypto.jpg`, supplied image | A prominent, carefully framed dashboard image that explains the product | Lime replacement palette, fabricated customer proof, fake balances or pricing, repeated equal-card sections |

When references conflict, use Dovetail's composition and the project's existing fonts and semantic colours. The two JPEGs establish visual treatment only. Still images do not establish animation timing or actual character movement.

Original local image references: [download (3).jpg](<C:/Users/Ayeba/Downloads/download (3).jpg>) and [crypto.jpg](C:/Users/Ayeba/Downloads/crypto.jpg). These files have not been copied into the project's public assets.

## Measured reference evidence

Inspected the live homepages on 2 September 2026 using rendered DOM, computed styles, and screenshots. Dovetail was sampled at 1440 × 1000 and 390 × 844 CSS pixels. Tenor was sampled at 1280 × 720 and 390 × 844. The measurements describe these homepages, not every page on either website. Scrollbars reduce the available document width slightly.

### Dovetail

The following values have both computed-style evidence and matching declarations in the page's loaded stylesheets. Middle-range values were read from media queries, not independently rendered at a third width.

| Role | Wide sample | Middle declaration, up to 1280px | Narrow sample, up to 799px | Evidence / recurrence |
| --- | --- | --- | --- | --- |
| Main hero heading | 112px size, 80px line-height, -2px tracking, weight 600 | 72px / 80px, -1.5px | 56px / 60px, -1px | Rendered H1, `.css-1vqdudj`; homepage hero only |
| Section display heading | 64px / 68px, -2px, weight 600 | 48px / 52px, -1px | 32px / 36px, -0.25px | `.css-e3yfba` and `.css-1xikrsd`; repeated section introductions |
| Editorial statement | 56px / 60px, -2px, weight 600 | 40px / 44px, -1px | 32px / 36px, -0.25px | `.css-1xedsha`; one statement block |
| Lead paragraph | 20px / 28px, weight 400 | 16px / 24px | 16px / 24px | `.css-d0u743` and `.css-1ue91oe`; hero and section copy |
| Bounded outer shell | Maximum 1512px; 124px inline padding | 64px inline padding | 16px inline padding | `.css-16ufn4r` and `.css-wd3a5f`; repeated containers |
| Major section padding | 120px top and bottom | 80px top and bottom | 64px top and bottom | `.css-tu7px3`; repeated sections |
| Section introduction to feature group | 96px | 64px | 48px | `.css-wd3a5f`; repeated feature groups |
| Feature grid | 32px gap; two or three columns | 24px gap; two columns | One column; 48px row gap | `.css-12juu7i` and `.css-14ffg2m` |
| Hero product image | Maximum 1264px, intrinsic height | Same maximum | Separate mobile image treatment | `.css-8zpfgs`; desktop image hidden in narrow CSS |
| Hero action | 14px / 16px text, 12px vertical and 16px horizontal padding; 150ms opacity transition | Same base declaration | Same base declaration | `.css-pehjph`; observed hero action, not a universal button contract |

Confidence is high for these sampled values. Generated selector names identify this inspection only and must not become selectors in our app. A 1512px border-box shell with 124px padding has 1264px usable width at its maximum. Do not mistakenly use 1512px as the text width.

The desktop H1's compressed line-height accompanies custom line wrappers, a graphic, and a contrasting decorative font. Copying that line-height into ordinary Space Grotesk text risks overlap. Retain its size hierarchy with the safer line-height below. Character spans were present, but the inspected resting state did not expose a reproducible entrance timeline. No exact Dovetail stagger or animation duration is claimed.

### Tenor

The desktop feature-copy wrappers repeatedly computed to 64px vertical padding, 40px horizontal padding, and 28px internal gaps. A section-introduction wrapper used 80px vertical padding. This supports giving visual scenes their own space rather than packing them around the text.

The page contained one hero video and three product videos. Their DOM attributes showed muted autoplay, looping, and poster images. The hero supplied large, medium, and small MP4 sources. This is evidence for responsive media production, not permission to reuse their files. Playback smoothness, data-saving behaviour, and the site's accessibility were not audited.

## Proposed public-portal type scale

Use these roles in the public portal only. Values are CSS pixels, with rem equivalents used during implementation so browser text sizing remains effective. Breakpoints start from Dovetail's observed ranges; verify them against our longer labels and different font metrics.

| Role | 320–389px | 390–799px | 800–1280px | 1281px and wider | Font / weight |
| --- | --- | --- | --- | --- | --- |
| Home display H1 | 48 / 52 | 56 / 60 | 72 / 80 | 112 / 112 | Space Grotesk 600 |
| Inner-page H1 | 40 / 44 | 48 / 52 | 56 / 60 | 72 / 80 | Space Grotesk 600 |
| Major section H2 | 32 / 36 | 32 / 36 | 48 / 52 | 64 / 68 | Space Grotesk 600 |
| Editorial statement | 32 / 36 | 32 / 36 | 40 / 44 | 56 / 60 | Space Grotesk 500 |
| Card heading H3 | 24 / 32 | 24 / 32 | 24 / 32 | 28 / 36 | Space Grotesk 500 |
| Lead paragraph | 16 / 24 | 16 / 24 | 16 / 24 | 20 / 28 | Geist Mono 400 |
| Standard body | 16 / 24 | 16 / 24 | 16 / 24 | 16 / 24 | Geist Mono 400 |
| Navigation and actions | 14 / 20 | 14 / 20 | 14 / 20 | 14 / 20 | Geist Mono 500 |
| Caption, eyebrow, supporting note | 14 / 20 | 14 / 20 | 14 / 20 | 14 / 20 | Geist Mono 400 |

Each pair is font-size / line-height. This table is an adaptation, not a claim that Dovetail uses every role listed here.

- Home display tracking starts at -2px wide, -1.5px middle, and -1px narrow. Section tracking starts at -2px wide, -1px middle, and -0.25px narrow. Body and control tracking stays normal. Adjust only after rendering the actual fonts and copy.
- Keep the home H1 within the main shell. Aim for two lines on wide screens, allowing more on mobile without shrinking below the narrow role to force a fit. Do not hard-code desktop line breaks on mobile.
- Use at most one accented phrase per headline. Set it in Space Grotesk too. Colour, a quiet underline, or one small graphic can provide the contrast without introducing another font.
- Keep the hero lead within 760px and ordinary reading columns within 60ch. At the wide lead size, Geist Mono fits fewer characters than Dovetail's proportional body font. Allow an extra line rather than tightening its tracking.
- Use real H1/H2/H3 semantics even where a reference uses a paragraph styled as a heading. Risk disclosures remain normal, readable body copy.

## Proposed spacing and layout contract

The base unit remains 4 CSS pixels. This is the project's 4pt grid convention, not literal CSS `pt` units. Every structural dimension below is a whole multiple of that unit. Borders and optical tracking are exceptions, not new spacing steps.

| Role | 320–799px | 800–1280px | 1281px and wider |
| --- | --- | --- | --- |
| Outer shell | Full available width, 16px inline padding | Maximum 1512px, 64px inline padding | Maximum 1512px, 124px inline padding |
| Major section padding, each edge | 64px | 80px | 120px |
| Introduction to visual group | 48px | 64px | 96px |
| Feature columns | One | Two when copy fits | Two or three according to content |
| Gap between feature columns | Not applicable | 24px | 32px |
| Gap between independent stacked features | 48px | 48px | 64px |
| Internal bento gap | 16px | 24px | 32px |
| Card content padding | 24px | 32px | 32px |
| Heading to paragraph | 16px | 24px | 24px |
| Paragraph to related action | 24px | 32px | 32px |
| Label to related content | 8px | 8px | 8px |
| Sibling actions | 12px | 12px | 12px |

Use one section wrapper to own vertical padding. Do not add a second generic margin between already padded siblings. Two major sections intentionally produce 128px, 160px, or 240px between their content edges. Closely related subsections belong inside the same wrapper and use the smaller group gaps instead.

The hero is content-height, not a forced full-screen viewport. After a normal-flow header, give the hero the major section's top padding. Keep 24px between the headline and lead, 32px before actions, 16px before the risk line, then 48px narrow or 64px wide before its product image. The image stays in normal flow and becomes the hand-off into the first product story rather than a decorative background.

Follow Dovetail's product-led narrative rhythm across the home page: statement, large product view, short explanation, next product view. Use restrained numbered kickers to make the sequence legible. Alternate wide product frames with asymmetric copy-and-product compositions so imagery punctuates the page instead of repeating the same card grid. Keep every screenshot as a real figure with an informative alt description and an adjacent concept/demo caption.

The dashboard image may use a separate media shell up to 1264px, with at least 16px outside it on narrow screens and 32px on wider screens. Do not nest the padded text shell inside that media shell. Use intrinsic dimensions and a dedicated mobile composition instead of shrinking an entire desktop dashboard until its labels are unreadable.

Keep text and controls on shared leading edges within sections. Centre only the home hero and closing CTA; paragraphs in the remaining sections stay leading-aligned. Use logical inline spacing properties. Allow rows and labels to grow without fixed text heights.

## Home page composition

Keep the existing H01–H07 copy IDs, route, metadata, and actions from [home.md](./pages/home.md). Change its layout, not its product claims.

```text
Shared header
             H01: centred heading, lead, actions, risk
             wide dashboard image below the text

H02: section introduction
┌─────────────────────────────┬──────────────────────┐
│ Asset balances              │ Request status       │
│ Large product-detail panel  │ Smaller detail panel │
│                             ├──────────────────────┤
│                             │ Account-process link │
└─────────────────────────────┴──────────────────────┘

H03: numbered account journey, ordinary open layout
H04: copy-trading explanation beside a conceptual visual
H05: Fees / Account security / Risk disclosure link rows
H06: visible questions and answers
             H07: closing action
Shared footer
```

| Section | Desktop treatment | Mobile treatment | Evidence boundary |
| --- | --- | --- | --- |
| H01 | Centred display heading and wide dashboard frame below it | Copy, actions, risk, then purpose-made narrow product view | Caption proposed UI "Illustrative account view"; no invented totals, gains, or customers |
| H02 | Asymmetric 7:5 grid; balances panel spans the height of the smaller request panel and its process-link area | Balances, requests, then the process link; one column | Preserve the two existing H3 topics; do not add a fake trading-performance card to fill space |
| H03 | Three numbered steps across the shell, separated by space | Vertical sequence in the same DOM order | Steps explain an account journey, not guaranteed activation or settlement times |
| H04 | Copy first, visual second, roughly 5:7 split | Explanation and link before visual | Label the visual as a conceptual explanation; no implied working replication engine |
| H05 | Three open link rows with consistent title, explanation, and arrow positions | Same rows with wrapped text | Keep costs and risks easy to find; no low-contrast footnote treatment |
| H06 | Heading column plus two visible answers | Heading followed by both answers | Keep the two material answers open; no accordion dependency for this section |
| H07 | One short heading, supporting sentence, primary action, contact link | Stack actions within the page gutters | Registration action remains gated on a functioning registration flow |

For H02, let graphics carry the unequal heights. Keep both captions fully visible. The compact process-link area is a link, not a third product claim. Inactive illustrations must not look like working controls.

Do not add customer logos, ratings, market tickers, testimonials or return counters without evidence. The explicitly requested 4 September logo strip uses supplied cryptocurrency asset marks with a clear asset label and availability note; it must never be relabelled as customer or partner proof.

## Cards, colour, and depth

Use large graphic regions with quieter captions, drawing from the supplied card image. Give the main panel more space than its neighbour. Do not repeat the same boxed layout for every section.

Keep card backgrounds tied to `card`, `muted`, and `background`, with `border` providing restrained separation. Yellow retains its action/selection meaning. A decorative yellow object may appear inside non-interactive artwork, but must not look like an unlabelled button or a positive financial status. Orange chart roles represent data only, not a second general-purpose brand palette.

Use the existing shared radius contract for cards and product frames. The large rounding in the supplied image is inspiration for grouping, not approval to silently replace Mira's radii. Any future large-media radius must be an explicit shared decision rather than a page-local value.

Keep content cards flat. Let overlapping artwork or the photographed/rendered product frame supply depth inside an illustration. Do not add independent glows, glass panels, or a different shadow to every block. Subtle background grid marks may sit at section edges, never behind small text, labels, or chart values.

Both themes use the same hierarchy. A light theme must not be a dark screenshot placed in every section without consideration of its surrounding panel. Supply theme-appropriate media or use a clearly bounded product frame.

## Controls and reusable sections

These are planned compositions, not newly installed shadcn components. See [COMPONENTS.md](../../COMPONENTS.md) for the existing inventory.

| Composition | Reuse | Public-portal requirements |
| --- | --- | --- |
| Marketing header | Shared Button, Sheet, Separator | Brand and navigation; mobile Menu; return focus after closing; no decorative announcement strip |
| Marketing action | Shared Button/link behaviour with a public size variant | Minimum 48px height, 12px block and 16px inline padding, 8px radius, 14/20 text; minimum 44px icon-only targets; grow for wrapped labels |
| Home hero | Heading, lead, actions, figure | Stable readable text without JavaScript; reserve media dimensions |
| Product frame | Figure, image/video, caption | Wide and narrow asset slots; no screenshot text as the only explanation |
| Feature bento | Shared Card treatment, semantic headings | Content-first DOM order, asymmetric spans at wide widths only |
| Numbered steps | Ordered list | Persistent numbers and full step descriptions |
| Decision links | Ordinary links | Whole descriptive labels; visible keyboard focus |
| FAQ preview | Headings and paragraphs | Two visible answers; no new accordion required |
| Public form | Field, Label, Input, Button | Minimum 48px text controls, 16/24 input text, associated errors; existing compact inputs are not ready unchanged |
| Closing CTA and footer | Existing action and link primitives | Consistent sitemap labels, readable risk text, no administrator link |

Keep compact dashboard defaults unchanged when adding marketing variants. Do not install a registry's entire component catalogue. Add only components the approved pages need. The current Tailwind 3 configuration must compile and render the chosen styles; copying Tailwind 4-only syntax is not sufficient.

The approved CA-only header now has a smaller brand footprint. Collapse navigation below 1180px after checking the actual labels. Keep Sign in and Menu accessible at 320px. Use the supplied CA monogram at its native proportions; do not create a replacement glyph or add the full name beside it.

## Motion and video brief

The following timings are project proposals. They were not extracted from either reference's animation engine.

| Element | Purpose and proposed behaviour | Reduced-motion / failure alternative |
| --- | --- | --- |
| Accented hero phrase | One entrance only; maximum 8px vertical travel; 400ms transform/opacity with `cubic-bezier(0.23, 1, 0.32, 1)`; if staggered, 30ms per character and 600ms total maximum | Static complete heading; no delay before text can be read |
| Product frame | One 8px rise and fade on entry, 400ms; no continuous tilt | Static poster with caption |
| Feature artwork | Optional short explanatory scene showing an existing or clearly labelled conceptual process | Still image plus the same surrounding explanation |
| Interactive card or arrow | Pointer-only 2px movement, 160ms; do not animate static cards as though they are clickable | Immediate focus/hover treatment with no movement |
| Button press | 120ms, subtle scale down to 0.98 for pointer activation | Immediate state feedback; no animated keyboard action |
| Menu disclosure | At most 200ms opacity/transform; escape and focus restoration remain immediate | Open/close without spatial animation |

Do not animate financial amounts, imply incoming profits with count-ups, scramble words, or keep headings moving as visitors read. Keep an unsplit accessible heading available if decorative character spans are used. Text and controls must remain usable when enhancement scripts fail. Do not ship essential content at permanent zero opacity awaiting an observer.

Start with a static hero product image. Produce a short, original Tenor-inspired explanatory clip for H02 only after the dashboard layout is approved. Suggested scene: asset labels organise into the account view, then the request panel shows a persistent review label. Never animate a request automatically changing to completed without presenting it as a separate, explained example.

For each clip, supply a poster, narrow crop, muted inline playback, and an intentional end frame. Do not reuse the reference websites' files. If playback loops or lasts longer than five seconds, provide a visible keyboard-accessible Pause/Play control. Stop offscreen and hidden-tab playback. Honour reduced-motion and available data-saving preferences with the poster. Avoid downloading all videos on initial load; only the active scene should play.

Proposed asset budget: hero poster at most 300KB desktop and 150KB mobile; below-fold clip at most 2MB desktop and 1MB mobile. These are delivery targets to verify after encoding, not measurements of the reference sites. Avoid a new animation framework for effects that CSS and a small visibility controller can handle.

## Asset brief

| Asset | Composition | Content requirements |
| --- | --- | --- |
| Home dashboard preview | Approximately 2:1 wide frame; dedicated 4:5 narrow frame | Our own interface; asset list, activity, request status; anonymised real data or clearly illustrative empty values |
| Balances detail | Asset labels and grouping, with enough surrounding UI to explain context | Use BTC, ETH, BCH, LTC, XRP, USDT only as supported/confirmed; no invented balance values or live prices |
| Request detail | Clear text status within a compact product crop | Review is distinct from transfer completion |
| Copy-trading concept | Decision, copying process, outcome as a simple labelled sequence | Explicitly conceptual until execution is verified; no invented trader or win rate |
| Accent artwork | One small geometric object or typographic marker | Project colours, no new logo or competitor mascot |

Use actual app screenshots only when they depict the current available product. Until then, create an original labelled interface illustration. Keep source files editable. HTML remains the source for important labels and explanations rather than relying on tiny text in a bitmap.

## Apply the direction across the sitemap

Do not replicate the home hero and bento on all 17 pages.

| Page family | Routes | Layout rule |
| --- | --- | --- |
| Product introduction | `/` | Full home composition above |
| Educational product pages | `/how-it-works`, `/copy-trading` | Smaller inner-page H1; sequence or explanation; selective product detail; preserve each page's existing order |
| Decision pages | `/investors`, `/fees`, `/security` | Reading column, labelled facts, optional comparison table only with approved data; risks remain next to the decision |
| Company and support | `/about`, `/faq`, `/contact` | Restrained editorial introduction, section anchors where useful, visible answers and verified contact routes |
| Legal | `/risk-disclosure`, `/terms`, `/policy` | Readable 60ch column, stable headings and anchors, no promotional video or scroll-triggered copy |
| Account access | `/register`, `/login`, `/forgot-password`, `/reset-password` | Focused single-column form using public control sizes; do not force the 112px display role into form pages |
| Recovery | HTTP 404 | Short message and working navigation; actual 404 response |

The [sitemap](./sitemap.md) and [evidence register](./evidence-and-decisions.md) remain authoritative for routes and publication dependencies. This visual brief does not approve fees, custody statements, trader verification, security claims, or automated execution.

## Next implementation and acceptance checks

1. Build the shared marketing shell, public typography roles, and public action size in isolation. Preserve application density.
2. Produce a static home composition using the existing H01–H07 copy and an original labelled product illustration. Check desktop and mobile before adding motion.
3. Review the actual Space Grotesk line breaks, Geist Mono paragraph lengths, and both themes. Adjust only the affected role if content does not fit.
4. Add the small motion sequence and optional below-fold video, then test the poster-only experience.
5. Reuse the approved sections across the remaining page families. Connect only routes and actions that actually work.

Required checks before calling the implementation ready:

- Render 320px, 390px, 800px, 1280px, 1440px, and an ultra-wide viewport; test widths immediately around layout changes.
- Verify 200% zoom, long labels, keyboard order, skip link, menu focus return, and no hidden or horizontally clipped actions.
- Check actual colour contrast in both themes, including yellow actions and muted risk copy. Existing token selection does not prove accessible contrast.
- Verify reduced-motion, video pause, autoplay rejection, failed media requests, and no-JavaScript readability.
- Check media dimensions reserve space and font loading does not cause disruptive movement.
- Validate accurate captions and the absence of invented returns, customer proof, or live-data claims.
- Confirm each CTA destination and retain the publication gates from the content pack.

Reference desktop/mobile inspection is complete. Project browser rendering, accessibility, motion performance, media budgets, and live workflows are not verified by this Markdown brief. The portal is ready for a first layout build, not production sign-off.
