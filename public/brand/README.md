# Crypto Index Asset monogram

Custom CA lettering, drawn as vector paths. The C's lower curve continues into the A's rising stem. The A sits slightly higher, and its crossbar is inset. A separate baseline dot completes CA•. Flat zinc ink, square terminals, and a consistent stroke give the mark a restrained financial identity.

Based on the project identity in memory.md, the zinc light/dark palette in DESIGN.md, and the public header and dashboard sidebar in app/. No stock glyphs, fonts, images, scripts, or external resources are required by the SVG assets.

## Files

- `ca-on-light.svg`: dark ink on a transparent background.
- `ca-on-dark.svg`: near-white ink on a transparent background.
- `ca.svg`: currentColor version for inline SVG use. CSS from the parent does not pass through an img element. Give repeated inline instances unique title IDs.
- `favicon.svg`: square favicon that follows the browser's light/dark preference.
- `favicon-light.svg`, `favicon-dark.svg`: fixed-color square favicon versions.

Favicon strokes and the dot are slightly heavier for small-size rendering. The tile has a fixed background for contrast. Theme preference refers to the browser/OS, not an application's manually selected theme.

## Placement

For headers and sidebars, use the transparent monogram at 64px wide or larger with its original aspect ratio. Allow at least one stroke-width of clear space around it. Use the square favicon for compact 16px, 24px, or 32px slots.

Public-website instruction, 4 September 2026: use the CA mark alone, without an adjacent full company name. Keep the business name in the home link's accessible label and in legal/copyright text where needed. Dark backgrounds use `ca-on-dark.svg`; light backgrounds use `ca-on-light.svg`. This public presentation rule does not change dashboard controls or layouts.

```html
<img src="/brand/ca-on-dark.svg" width="80" height="52" alt="Crypto Index Asset">
<link rel="icon" href="/brand/favicon.svg" type="image/svg+xml" sizes="any">
```

The asset paths work from the existing public directory. The public design preview now uses them explicitly; the SVG files themselves remain unchanged. Other application surfaces are not replaced automatically.

The monogram is newly drawn for this project. Trademark availability has not been checked.
