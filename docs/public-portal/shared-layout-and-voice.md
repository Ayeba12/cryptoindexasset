# Shared layout and voice

## Editorial direction

The audience is a retail crypto investor who wants to understand the service before moving money. Use professional British English, direct verbs and short explanations. Speak to the reader as "you". Use "we" only for an actual company action or a clearly proposed service commitment.

The positioning is a place to review crypto account information and understand available investment options. Copy trading is an area of interest, with service-specific execution claims held until verified. The name Crypto Index Asset does not establish that the platform offers an index fund, ETF or diversified basket.

| Principle | Use | Avoid |
| --- | --- | --- |
| Be specific | Review your balances and account activity. | Take your wealth to the next level. |
| Explain the next step | Request a withdrawal. | Cash out instantly. |
| Respect the decision | Review the fees before you invest. | Start earning before it's too late. |
| Name the status | Your request is awaiting review. | Your funds are on the way, before transfer confirmation |

Use Create account, Sign in, Sign out, Fees, Request a withdrawal, Account balance and Transaction history consistently. Reserve "wallet" for a real wallet or deposit destination, not as a synonym for an account ledger. Use "return" for a measured result over a stated period. Use "profit" only when the calculation supports it.

## Shared visual layout

Follow `DESIGN.md`: Space Grotesk headings, Geist Mono interface text, zinc surfaces, semantic yellow primary actions and shared component radii. Support the existing light and dark themes. Avoid the green profit styling and decorative glows from the current marketing draft.

Use the [public portal visual direction](./visual-direction.md) for the proposed responsive type scale, shell widths, spacing, cards, imagery, and motion. It replaces this pack's earlier 1,200px container and 48/80px section-padding suggestions. The new layout follows the user's primary Dovetail reference while preserving the project fonts and semantic colours. Its values remain implementation targets until rendered and checked.

Keep long copy at about 60 characters per line. Align text to the leading edge, except the home hero and closing CTA. One H1 per page, H2 for sections, H3 for subordinate topics. Never flatten the page into a grid of equal-looking cards. Use cards where a set of facts or an action belongs together, and ordinary text for explanations.

For each two-column section, place the primary copy first in the document. Stack the illustration or secondary information after it on mobile. Collapse columns when their content stops fitting. Do not use fixed text heights or crop legal text. Give forms a single-column reading order.

Use visible labels, descriptive links and text status indicators. Plan minimum 48px public action and input heights, with minimum 44px icon-only targets. Allow controls to grow for wrapped labels. These public variants must not overwrite compact dashboard defaults. On forms, show errors next to the affected field and a linked error summary on submission. Success text appears only after the relevant operation is confirmed. Preserve non-sensitive input after recoverable failures.

## Shared visitor copy

Header brand: Crypto Index Asset

Header links: How it works · Copy trading · For investors · About · Help

Header actions: Sign in · Create account

Menu controls: Open menu · Close menu

Skip link: Skip to content

Footer introduction:

> Crypto account information, service details and support in one place.

Footer Explore: How it works, Copy trading, For investors, About.

Footer Help: FAQs, Fees, Security, Contact.

Footer Legal: Risk disclosure, Terms of service, Privacy policy.

Footer risk line:

> Crypto assets can lose value. You could lose all the money you invest. Past performance does not guarantee future results.

Footer copyright:

> © [CURRENT_YEAR] Crypto Index Asset.

Use the current year at render time. Add the confirmed legal entity and required disclosures once supplied. Do not infer regulation, insurance or customer asset ownership.

## Content and image rules

Use a real, anonymised interface screenshot only after checking that it depicts available features. Mark a proposed interface "Illustrative account view" and exclude invented balances, earnings and customer names. Do not use a rising chart as a promise of returns. Decorative graphics have empty alternative text; informative visuals get a factual description.

Keep costs and risk beside the decision they affect. Do not hide them solely in the footer or an accordion. No fake testimonials, user counters, partner logos, awards, scarcity timers or preselected marketing consent.

## Shared interface states

| Context | Visitor text | Action |
| --- | --- | --- |
| Loading page data | Loading account information… | No invented completion percentage |
| Public data failed | We couldn't load this information. Try again. | Try again |
| Connection lost | Your connection was interrupted. Reconnect and try again. | Try again |
| Uncertain submission result | We couldn't confirm whether your request was received. Check before sending it again. | Contact support |
| Session expired | Your session has ended. Sign in to continue. | Sign in |
| Unavailable service | This service is currently unavailable. Contact us for help. | Contact support |

## Implementation verification

At implementation, inspect 320px, 390px, tablet and wide desktop layouts, 200% zoom, keyboard navigation, long labels, and both themes. Check focus order against each page's reading order. These checks are **not verified** by Markdown planning. The current task verifies document structure and editorial consistency only.
