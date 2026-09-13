# Public portal preview verification

4 September 2026

## Result and scope

The revised homepage is ready for visual review at `/design-preview/home`; the component gallery remains at `/design-preview`. These are development-only routes with `noindex, nofollow`. No live homepage, dashboard, authentication workflow, database or financial action was changed.

The homepage follows the supplied [Dovetail reference](https://dovetail.com/) through its short two-line hero, logo-led navigation, moving logo strip, dominant product image, editorial statements and two-plus-one bento groups. Space Grotesk headings, Geist Mono prose/interface text and the approved type scale remain unchanged. Dovetail's fonts, customer claims, ratings and brand assets were not copied.

## Verified in the browser

The local Next.js preview was exercised in the in-app Chromium browser.

| Check | Evidence |
| --- | --- |
| Responsive widths | 320, 390, 768, 800, 1024, 1180, 1280, 1440 and 1920 CSS pixels; no horizontal document overflow |
| Typography | H1: 48/52 at 320, 56/60 at 390 and 768, 72/80 at 800–1280, 112/112 at 1440 and 1920; Space Grotesk and Geist Mono confirmed |
| Public buttons | Hero actions remain 48px high with an 8px radius at all tested widths |
| Responsive composition | Single-column bento below 800px; two upper cards from 800px; the wide card stacks below 1024px; full navigation from 1180px |
| Branding | CA-only header/footer mark; accessible home link retains the business name; no adjacent full-name lockup |
| Image parity | Eight dark WebP files and eight light WebP files on disk; eight image slots in the page; all eight variants loaded during each theme's review |
| Theme consistency | Light/Dark update every scene; System resolved to the OS dark preference and every image used dark artwork |
| Navigation | Product opens by keyboard; ArrowDown enters its first link; Escape closes; a desktop Account overview link lands about 32px below the viewport top |
| Destination dialog | Resources → Fees opens the preview-only explanation; Escape returns focus to Resources; no real destination action occurs |
| Mobile menu | First link receives focus; Escape returns focus to Open menu; How it works closes the sheet and focuses/scrolls to the process section |
| Marquee | Pause changes the control to Play and stops the animation; Play restores its running intent; the track pauses offscreen |
| Structure | One H1, no duplicate IDs, named navigation and meaningful alt text for all product scenes |
| Metadata | Rendered robots value is `noindex, nofollow` |
| Final runtime | Preview restored after the build and served successfully; theme, pause/play and navigation checks were repeated |

A mobile bug was found and fixed: closing the menu initially focused its trigger after an anchor click, returning the page to the top. Section links now hand focus to their target after the sheet closes. Escape still restores the trigger.

The 4 September viewport screenshots were inspected during the browser session. Existing PNG screenshots under `output/public-portal-preview/screenshots/` document the earlier 3 September version and are not evidence for this revision. Use the running review route for the current composition.

## Motion and accessibility boundaries

- Scroll reveals are one-time opacity/24px transform animations over 640ms. They use IntersectionObserver rather than a continuous scroll listener.
- The logo strip uses a 42s CSS transform loop, with a visible pause/play control. Hover, keyboard focus, offscreen state and hidden tabs pause it.
- Source inspection confirms a static wrapping list under reduced motion, with the duplicate and unnecessary pause button hidden. JavaScript also skips/finishes reveals when reduced motion is requested.
- Reduced-motion emulation, literal 200% browser zoom, forced colours and screen-reader behaviour were not independently exercised in this pass. They remain release checks.
- The marquee is labelled as cryptocurrency assets, not customers or partners. It does not show market prices or claim service availability.
- Essential risk and demo disclosures are real HTML. Artwork contains fictional figures and must not be presented as verified product or trader evidence.

## Static and build checks

- `npx tsc --noEmit` passed after implementation.
- `npm run build` passed production compilation, type checking and generation of all 11 static pages.
- The final small marquee accessibility/fallback refinement passed `npx tsc --noEmit --incremental false` and compiled in the development server.
- Build output reported 207 KB first-load JavaScript for the public homepage review. No external animation dependency was added.
- Lint is not configured in this repository; no standalone lint pass is claimed.
- The production guard remains in `app/design-preview/layout.tsx`. This was source-inspected, not verified on a deployed host.
- The build and development server share `.next`; the build invalidated the running server's manifests. Restarting the development server restored the preview. Stop the dev server before future production builds.

## Asset handoff

[Paired artwork notes](../../output/public-portal-preview/theme-assets/README.md) describe the eight scenes. [The manifest](../../output/public-portal-preview/theme-assets/manifest.json) contains all 16 prompts, source paths, dimensions and web paths. PNG sources are preserved; WebP delivery files are 36–69 KB each. Conversion changes encoding only, without cropping, tinting or resizing.

All dark scenes have dark screens, inset panels and surrounding backgrounds. Light scenes have light equivalents; physical device bezels may remain black. These are concept illustrations, not proof that the actual dashboard features are complete.

## Remaining release gates

- Approve the visual direction and final wording before promoting the preview to public routes.
- Run a full automated accessibility scan and assistive-technology pass. The previous scanner attempt was blocked by its missing shared methodology dependency; no automated compliance claim is made here.
- Approve or replace demo illustrations with verified product captures and cleared commercial claims.
- Implement and test the remaining public routes and real destinations separately.
- Verify production metadata, performance, media-failure states, real form/server errors and analytics consent when the public site is connected.
