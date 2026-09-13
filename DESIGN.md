---
version: alpha
name: Crypto Index Asset Design System
description: Shared visual and interaction language for the public portal, customer dashboard, and administrative back office.
colors:
  background: "oklch(1 0 0)"
  foreground: "oklch(0.141 0.005 285.823)"
  card: "oklch(1 0 0)"
  card-foreground: "oklch(0.141 0.005 285.823)"
  popover: "oklch(1 0 0)"
  popover-foreground: "oklch(0.141 0.005 285.823)"
  primary: "oklch(0.852 0.199 91.936)"
  primary-foreground: "oklch(0.421 0.095 57.708)"
  secondary: "oklch(0.967 0.001 286.375)"
  secondary-foreground: "oklch(0.21 0.006 285.885)"
  muted: "oklch(0.967 0.001 286.375)"
  muted-foreground: "oklch(0.552 0.016 285.938)"
  accent: "oklch(0.967 0.001 286.375)"
  accent-foreground: "oklch(0.21 0.006 285.885)"
  destructive: "oklch(0.577 0.245 27.325)"
  border: "oklch(0.92 0.004 286.32)"
  input: "oklch(0.92 0.004 286.32)"
  ring: "oklch(0.705 0.015 286.067)"
  chart-1: "oklch(0.837 0.128 66.29)"
  chart-2: "oklch(0.705 0.213 47.604)"
  chart-3: "oklch(0.646 0.222 41.116)"
  chart-4: "oklch(0.553 0.195 38.402)"
  chart-5: "oklch(0.47 0.157 37.304)"
  sidebar: "oklch(0.985 0 0)"
  sidebar-foreground: "oklch(0.141 0.005 285.823)"
  sidebar-primary: "oklch(0.681 0.162 75.834)"
  sidebar-primary-foreground: "oklch(0.987 0.026 102.212)"
  sidebar-accent: "oklch(0.967 0.001 286.375)"
  sidebar-accent-foreground: "oklch(0.21 0.006 285.885)"
  sidebar-border: "oklch(0.92 0.004 286.32)"
  sidebar-ring: "oklch(0.705 0.015 286.067)"
typography:
  mono:
    fontFamily: Geist Mono
  heading:
    fontFamily: Space Grotesk
rounded:
  base: 0.45rem
spacing:
  base: 0.25rem
---

## Overview

Crypto Index Asset combines a public investment portal, an authenticated multi-currency customer dashboard, and an administrative back office. The interface uses the compact Mira design language with zinc surfaces, a restrained yellow action accent, an orange data-visualization family, Phosphor icons, and system-responsive light and dark themes. The visual system communicates financial state plainly and never implies that a manual operation is automated.

## Colors

Use semantic surface roles across all three product areas. Primary is reserved for the principal action or current selection; it is not a profit or success signal. Destructive is reserved for irreversible, rejected, failed, blocked, or dangerous actions. Use the chart roles in order for quantitative series and keep transactional status understandable without relying on hue alone.

The approved dashboard extension uses shared success, danger, warning, information and neutral roles. Green identifies successful or approved states, red identifies errors and declines, amber identifies pending states and warnings, blue identifies information, and neutral grey identifies inactive or unavailable states. Keep a visible text label and supporting icon. These roles apply to the customer and admin dashboards, including their dialogs, not to public marketing pages. An approval is not settlement, and a price increase is not trading profit.

## Themes

The default theme follows the operating-system preference. Components must preserve the same semantic role when switching themes; do not replace a semantic token with an unrelated palette color.

| Token | Light | Dark |
|---|---|---|
| background | `oklch(1 0 0)` | `oklch(0.141 0.005 285.823)` |
| foreground | `oklch(0.141 0.005 285.823)` | `oklch(0.985 0 0)` |
| card | `oklch(1 0 0)` | `oklch(0.21 0.006 285.885)` |
| card-foreground | `oklch(0.141 0.005 285.823)` | `oklch(0.985 0 0)` |
| popover | `oklch(1 0 0)` | `oklch(0.21 0.006 285.885)` |
| popover-foreground | `oklch(0.141 0.005 285.823)` | `oklch(0.985 0 0)` |
| primary | `oklch(0.852 0.199 91.936)` | `oklch(0.795 0.184 86.047)` |
| primary-foreground | `oklch(0.421 0.095 57.708)` | `oklch(0.421 0.095 57.708)` |
| secondary | `oklch(0.967 0.001 286.375)` | `oklch(0.274 0.006 286.033)` |
| secondary-foreground | `oklch(0.21 0.006 285.885)` | `oklch(0.985 0 0)` |
| muted | `oklch(0.967 0.001 286.375)` | `oklch(0.274 0.006 286.033)` |
| muted-foreground | `oklch(0.552 0.016 285.938)` | `oklch(0.705 0.015 286.067)` |
| accent | `oklch(0.967 0.001 286.375)` | `oklch(0.274 0.006 286.033)` |
| accent-foreground | `oklch(0.21 0.006 285.885)` | `oklch(0.985 0 0)` |
| destructive | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` |
| border | `oklch(0.92 0.004 286.32)` | `oklch(1 0 0 / 10%)` |
| input | `oklch(0.92 0.004 286.32)` | `oklch(1 0 0 / 15%)` |
| ring | `oklch(0.705 0.015 286.067)` | `oklch(0.552 0.016 285.938)` |
| chart-1 | `oklch(0.837 0.128 66.29)` | `oklch(0.837 0.128 66.29)` |
| chart-2 | `oklch(0.705 0.213 47.604)` | `oklch(0.705 0.213 47.604)` |
| chart-3 | `oklch(0.646 0.222 41.116)` | `oklch(0.646 0.222 41.116)` |
| chart-4 | `oklch(0.553 0.195 38.402)` | `oklch(0.553 0.195 38.402)` |
| chart-5 | `oklch(0.47 0.157 37.304)` | `oklch(0.47 0.157 37.304)` |
| sidebar | `oklch(0.985 0 0)` | `oklch(0.21 0.006 285.885)` |
| sidebar-foreground | `oklch(0.141 0.005 285.823)` | `oklch(0.985 0 0)` |
| sidebar-primary | `oklch(0.681 0.162 75.834)` | `oklch(0.795 0.184 86.047)` |
| sidebar-primary-foreground | `oklch(0.987 0.026 102.212)` | `oklch(0.987 0.026 102.212)` |
| sidebar-accent | `oklch(0.967 0.001 286.375)` | `oklch(0.274 0.006 286.033)` |
| sidebar-accent-foreground | `oklch(0.21 0.006 285.885)` | `oklch(0.985 0 0)` |
| sidebar-border | `oklch(0.92 0.004 286.32)` | `oklch(1 0 0 / 10%)` |
| sidebar-ring | `oklch(0.705 0.015 286.067)` | `oklch(0.552 0.016 285.938)` |

## Typography

Use the mono role for interface copy, navigation, labels, balances, currency amounts, identifiers, timestamps, and tabular data. Use the heading role for page titles, marketing headlines, section headings, and prominent empty-state titles. Preserve tabular numerals for amounts and align decimal values consistently in financial tables.

## Layout

Public pages use a marketing header, bounded content regions, and a footer. Customer and administrator areas share a sidebar-led application shell, using the sidebar roles only for navigation and the standard background and card roles for workspace content. Collapse application navigation into a sheet on narrow viewports and keep the current page title and principal action visible without horizontal scrolling.

Balance summaries, transaction history, and action forms must remain separate regions. A pending withdrawal must remain visible in transaction history until it reaches a terminal state, and the interface must distinguish available, locked, and total balances wherever more than one balance state is present.

Use the base spacing token as a 4pt grid. Structural padding, gaps, offsets, control dimensions, and layout regions use whole multiples of the base token. Half-step adjustments are limited to borders, icon balance, compact type alignment, and other internal optical corrections; they do not define page columns, section spacing, or responsive breakpoints.

## Shapes

Use the shared radius contract for controls, cards, popovers, tables, and navigation states. Do not introduce page-specific corner systems or make financial actions appear more prominent through oversized rounding.

## Components

Use the shared shadcn primitives as owned source components. Primary, secondary, outline, ghost, destructive, and link button treatments retain their semantic purposes across public, customer, and administrator surfaces. Destructive financial or administrative actions require an alert-style confirmation that names the affected account, asset, amount, and consequence.

Use cards for summaries, tables for transaction and user records, badges with visible text for state, labelled inputs for financial forms, skeletons for loading, alerts for recoverable errors, and dedicated empty states when records do not exist. Never expose password hashes, raw authentication tokens, or full wallet and bank details in general-purpose tables.

Charts use the chart roles in order and include a legend or direct label. Profit, loss, and change values require an explicit sign and text or icon cue in addition to color.

## Do's and Don'ts

- Do use semantic tokens for every foundational surface, control, focus ring, border, and chart series.
- Do keep transaction status visible as text through loading, review, approval, decline, failure, and completion.
- Do preserve keyboard focus, programmatic labels, error associations, and touch-sized actions in all financial forms.
- Don't use raw controls when a shared primitive provides the required behavior.
- Don't use primary yellow as shorthand for profit, approval, or account health.
- Don't use gradients, glass effects, or animation to obscure balances, fees, status, or risk.
- Don't nest cards repeatedly or mix unrelated density and radius systems on the same surface.
- Don't present manual deposits, withdrawals, trading signals, or copy-trading operations as automated.
