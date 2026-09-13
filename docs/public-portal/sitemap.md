# Proposed public sitemap

Version 1.0 | Proposed routes, not a deployment inventory

## Navigation

Desktop header: brand link to `/`, How it works, Copy trading, For investors, About, Help menu, Sign in, Create account.

Help menu: FAQs, Fees, Security, Contact. Keep it a small labelled disclosure, not a full-screen catalogue. Fees also has a prominent link on For investors.

Mobile header: brand, Sign in and Menu. Opening Menu shows the same navigation order with Create account as the final primary action. All destinations fit in a vertically scrollable panel.

Footer groups: Explore, Help, Legal. Use the exact labels in the shared layout guide. The public footer does not need an administrator link.

```text
Home /
  How it works /how-it-works
  Copy trading /copy-trading
  For investors /investors
    Fees /fees
  About /about
  Help
    FAQs /faq
    Security /security
    Contact /contact
  Legal
    Risk disclosure /risk-disclosure
    Terms of service /terms
    Privacy policy /policy
  Account access
    Create account /register
    Sign in /login
    Forgot password /forgot-password
    Reset password /reset-password
  Page not found, HTTP 404
```

## Route and search plan

| Route | Current repository evidence | Proposed treatment | Search intent / topic |
| --- | --- | --- | --- |
| `/` | Next.js and legacy EJS | Rewrite in place | Brand and crypto account platform |
| `/how-it-works` | New | Add | Crypto account process |
| `/copy-trading` | New standalone page | Add educational page; gate trader listings on evidence | Crypto copy trading |
| `/investors` | Legacy Express route | Restore in Next.js | Investment option evaluation |
| `/fees` | New | Add once the cost schedule is confirmed | Crypto Index Asset fees |
| `/about` | Legacy Express route | Restore | Brand and company information |
| `/security` | New | Add | Crypto Index Asset account security |
| `/faq` | New | Add | Brand support questions |
| `/contact` | Legacy Express route | Restore | Contact Crypto Index Asset |
| `/risk-disclosure` | New | Add | Investment and platform risks |
| `/terms` | Legacy route serves a saved Not Found document | Replace with confirmed terms | Branded policy lookup |
| `/policy` | Legacy route serves a saved Not Found document | Keep familiar URL, label Privacy policy | Branded policy lookup |
| `/register` | Next.js and legacy EJS | Align copy and connect functioning form | Transactional, noindex |
| `/login` | Next.js and legacy EJS | Align copy and connect functioning form | Navigational, noindex |
| `/forgot-password` | Legacy equivalent `/forgotpassword` | Add canonical route and permanent redirect from old GET route | Recovery, noindex |
| `/reset-password` | No confirmed handler | Add only with recovery implementation | Recovery, noindex |
| Unmatched URLs | No confirmed Next.js custom page | Return actual HTTP 404 | noindex |

After launch, include only live, canonical, indexable pages in the XML sitemap. Exclude account-access pages, reset tokens, internal search/filter URLs, dashboards, administrator routes and error pages. Do not advertise draft routes before they work. Use the confirmed production origin for canonical URLs; do not infer it from an old email address.

## Main journeys

1. New visitor: Home → How it works → For investors → Fees and Risk disclosure → Create account.
2. Copy-trading visitor: Copy trading → Trader information, if supported → Fees → Create account. Until execution is verified, the trader enquiry action goes to Contact.
3. Cautious visitor: About → Security → Risk disclosure → Contact.
4. Returning customer: Sign in → Account. Recovery links connect Forgot password → Reset password → Sign in.
5. Visitor with a problem: FAQs → Relevant answer → Contact.

## Deliberately deferred

No separate markets page is needed for a ticker alone. A market snapshot can be a home-page section once there is a reliable feed. No blog, trader detail URL, testimonials page or investment package landing pages are included until there is verified content to sustain them. This avoids empty destinations and duplicate copy. New package or trader pages can be added to this pack when their details are supplied.

Do not redirect unrelated retired content to Home by default. Map a retired URL to its closest equivalent after checking inbound links. Keep authenticated `/user/*` and `/dashboard` routing outside this editorial change.
