# Crypto Index Asset component system

This document records the implementation contract for shared interface components. `DESIGN.md` owns product-wide tokens and usage decisions. Files in `components/ui` own the rendered source. When this document and source disagree, update this document in the same change that updates the component.

The [public component specification](docs/public-portal/components.md) defines the isolated public-website review layer, including responsive type, control sizes, states, spacing and the public-only Dovetail button treatment. It does not change the compact defaults or installed inventory below.

## 4pt spacing grid

The base unit is 4px, or `0.25rem`. Structural layout uses whole multiples of this unit.

| Step | Pixels | Rem | Typical use |
|---:|---:|---:|---|
| 1 | 4px | 0.25rem | Tight icon or inline gap |
| 2 | 8px | 0.5rem | Control padding, compact row gap |
| 3 | 12px | 0.75rem | Compact card spacing |
| 4 | 16px | 1rem | Default content spacing |
| 5 | 20px | 1.25rem | Dense section separation |
| 6 | 24px | 1.5rem | Card and panel padding |
| 8 | 32px | 2rem | Page section gap |
| 10 | 40px | 2.5rem | Large content separation |
| 12 | 48px | 3rem | Page region spacing |
| 16 | 64px | 4rem | Marketing section spacing |

Use 2px only as an internal optical adjustment. Examples include a one-pixel border plus alignment correction, compact vertical input padding, or centering a small icon. Do not use 2px increments for page gutters, columns, card padding, or section gaps.

Compact control heights follow 20px, 24px, 28px, and 32px. A visible compact control may use a larger invisible hit area where its context requires touch input.

## Shared interaction contract

Every interactive component supports keyboard operation, a visible focus ring, disabled styling, and an accessible name. Form controls connect labels, descriptions, and error messages programmatically. Color never carries transaction status by itself.

Loading states preserve the final component dimensions. Destructive account and financial actions require an Alert Dialog before the request is submitted. Overlay components restore focus to their trigger when closed and prevent interaction with obscured content.

## Installed component inventory

The project currently owns 24 shadcn UI components.

| Component | Geometry and spacing | Variants or behavior | Source |
|---|---|---|---|
| Avatar | 32px default, 24px small, 40px large | Image, fallback, badge, group, group count | `components/ui/avatar.tsx` |
| Badge | 20px height, 8px horizontal and 2px vertical padding, 4px gap | Default, secondary, destructive, outline, ghost, link | `components/ui/badge.tsx` |
| Breadcrumb | 6px list gap, 4px item gap, 14px separators | Link, current page, separator, ellipsis | `components/ui/breadcrumb.tsx` |
| Button | 28px default, 20px extra small, 24px small, 32px large; 8px default horizontal padding | Default, outline, secondary, ghost, destructive, link; four icon sizes | `components/ui/button.tsx` |
| Card | 16px default internal spacing, 12px small spacing | Header, title, description, action, content, footer; default and small density | `components/ui/card.tsx` |
| Chart | Consumer controls width and height | Theme-aware chart colors, tooltip, legend | `components/ui/chart.tsx` |
| Checkbox | 16px visible box with an expanded interaction area | Checked, unchecked, disabled, invalid | `components/ui/checkbox.tsx` |
| Collapsible | Consumer controls geometry | Root, trigger, content; open and closed states | `components/ui/collapsible.tsx` |
| Drawer | 8px outer inset, 16px header and footer padding, 8px footer gap | Top, right, bottom, left; bottom and top capped at 80vh | `components/ui/drawer.tsx` |
| Dropdown Menu | 4px menu padding, 128px minimum width, 28px minimum item height, 8px item padding | Item, destructive item, checkbox, radio, submenu, label, separator, shortcut | `components/ui/dropdown-menu.tsx` |
| Field | 16px group gap, 8px field gap, 2px content gap | Vertical, horizontal, responsive; label, description, separator, error | `components/ui/field.tsx` |
| Input | 28px height, 8px horizontal and 2px vertical padding | Default, disabled, invalid, file input | `components/ui/input.tsx` |
| Label | 8px inline gap | Default and disabled | `components/ui/label.tsx` |
| Select | 28px default or 24px small trigger; 8px horizontal trigger padding; 28px minimum item height | Item-aligned or popper content; groups, labels, items, scrolling | `components/ui/select.tsx` |
| Separator | 1px thickness | Horizontal or vertical, semantic or decorative | `components/ui/separator.tsx` |
| Sheet | 75% side width up to 384px; 24px header and footer padding; 8px footer gap | Top, right, bottom, left; optional close button | `components/ui/sheet.tsx` |
| Sidebar | 256px desktop, 288px mobile, 48px collapsed; 8px group padding | Expanded, collapsed, off-canvas, icon, floating, inset; keyboard shortcut | `components/ui/sidebar.tsx` |
| Skeleton | Consumer controls width and height | Pulse loading state | `components/ui/skeleton.tsx` |
| Sonner | Library-managed toast geometry using shared radius and semantic colors | Success, information, warning, error, loading | `components/ui/sonner.tsx` |
| Table | 40px header cells with 8px horizontal padding; body cells use 8px padding | Header, body, footer, row, head, cell, caption | `components/ui/table.tsx` |
| Tabs | 32px horizontal list, 3px optical inset, 6px trigger gap | Default and line; horizontal or vertical | `components/ui/tabs.tsx` |
| Toggle | 28px default, 24px small, 32px large; 8px default horizontal padding | Default or outline; pressed, disabled, invalid | `components/ui/toggle.tsx` |
| Toggle Group | Uses Toggle dimensions; default 8px group gap | Horizontal or vertical; separated or joined items | `components/ui/toggle-group.tsx` |
| Tooltip | 12px horizontal and 6px vertical padding, 320px maximum width | Four sides, zero default delay, keyboard and pointer trigger | `components/ui/tooltip.tsx` |

## Required components not installed

These components are needed for the planned customer and administrator workflows. They do not have a local geometry contract until their source is installed and reviewed.

| Component | Required use |
|---|---|
| Accordion | Progressive disclosure for policy, help, and secondary account details |
| Alert | Recoverable errors, warnings, and persistent system notices |
| Alert Dialog | Deposit, withdrawal, account suspension, and destructive confirmations |
| Dialog | Focused non-destructive tasks that must interrupt the current view |
| Textarea | Support messages, rejection reasons, and administrative notes |
| Radio Group | Exclusive funding, risk, and preference choices |
| Switch | Binary account and notification settings |
| Progress | KYC, onboarding, upload, and long-running task status |
| Popover | Compact filters, contextual details, and date controls |
| Command | Keyboard-first search and administrative navigation |
| Calendar and Date Picker | Transaction and report date ranges |
| Pagination | Long transaction, user, deposit, and withdrawal tables |
| Scroll Area | Bounded menus and panels where native overflow is insufficient |
| Empty | Designed zero-record states |
| Spinner | Short indeterminate waits inside controls |

## External registries

`@8starlabs-ui` and `@aceternity` are registered sources, not approved component sets. A component from either registry enters this system only after installation, source review, accessibility review, token mapping, and documentation here. Registry components must not introduce a competing color palette, spacing grid, radius system, icon set, or motion language.

## Composition rules

Use Button, Input, Label, Field, Select, Checkbox, and validation messaging together for forms. Use Card for summary regions, not as a wrapper around every subsection. Use Table for comparable records and preserve horizontal scrolling at narrow widths.

Use Sheet for mobile navigation and complementary side tasks. Use Drawer for touch-led bottom or edge interactions. Use Tooltip only for supplementary information, never for required labels, balances, fees, status, or risk.

Use compact density for tables, filters, sidebar navigation, identifiers, and administrative tools. Use default density for authentication, deposits, withdrawals, KYC, and any workflow where input errors carry financial consequences.

## Change checklist

- Keep geometry on the 4pt grid, except documented internal 2px optical adjustments.
- Use semantic color and radius tokens instead of palette utilities or local values.
- Record new variants, dimensions, and state behavior in this file.
- Test keyboard navigation, focus return, disabled behavior, error association, and narrow layouts.
- Run TypeScript and the production build after changing shared components.
