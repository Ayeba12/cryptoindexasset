# Page not found

Route: any unmatched public URL. Return HTTP 404.

Purpose: recover from an incorrect or retired link. Primary action: Go to home → `/`.

Indexing: noindex; exclude from XML sitemap.

SEO title: Page not found | Crypto Index Asset

Meta description: This page could not be found. Return to Crypto Index Asset or contact support for help.

## Layout

Shared header → E01 compact text block → recovery actions → shared footer.

Use a narrow, centred block with leading-aligned copy. Put the action near the explanation. Mobile retains visible header navigation and content gutters. No decorative full-screen error numeral pushing the action below the fold.

## Page copy

### E01 · Recovery

H1: We couldn't find that page

The link may be out of date, or the address may have been entered incorrectly.

Button: Go to home → `/`

Links: Sign in → `/login` · Contact support → `/contact`

## Interface states

This is a route-not-found state, not a catch-all service failure. Do not silently redirect to Home or return HTTP 200 for a missing page.

## Publication dependencies

Implement the custom page in the active framework. Keep real terms and privacy documents distinct from this state; the legacy policy files currently contain saved Not Found text.
