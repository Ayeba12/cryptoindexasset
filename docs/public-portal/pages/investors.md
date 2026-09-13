# For investors

Route: `/investors` | Purpose: give visitors a practical framework for assessing an option.

Primary action: Ask about an option → `/contact`.

SEO title: Investor guide | Crypto Index Asset

Meta description: Review the details that matter before investing: minimum amounts, fees, access to funds, account processes and the risks involved.

Primary topic: Crypto Index Asset investor guide. Search intent: commercial evaluation.

## Layout

Header → I01 hero → I02 decision worksheet → I03 option details → I04 optional scenario tool → I05 next step → footer.

Use a calm editorial layout. I02 is a readable checklist, not a wall of feature cards. I03 is a comparison table only when at least two approved options exist. For one option, use a labelled details panel. Mobile stacks each option with identical labels in identical order.

I04, if built later, places inputs before outputs. Gains and losses have the same emphasis. Keep assumptions and fees visible beside the result. The draft remains useful with no calculator.

## Page copy

### I01 · Hero

H1: Put the details before the decision

Before choosing an investment option, understand what happens to your money, what you may pay and how you can request access to your funds. Use this guide to prepare your questions.

Button: Ask about an option → `/contact`

Risk line: Crypto investing involves a risk of loss, including the full amount invested.

### I02 · Decision worksheet

H2: Check the terms of each option

- What is the minimum amount, and in which currency?
- What activity or strategy does the option involve?
- Who holds the assets, and what rights do you have?
- Which fees apply, and when are they charged?
- Is there a fixed term or any restriction on access?
- How do you request a withdrawal or leave the service?
- Where can you read the full terms before agreeing?

Links: Review fees → `/fees` · Read the risk disclosure → `/risk-disclosure`

### I03 · Option details

H2: Compare the terms that apply to you

Review the current details for an option before funding it. Ask for clarification if an amount, cost or withdrawal condition is unclear.

Unavailable-state copy: Investment option details are not currently available here. Contact us for current information.

Button: Request option details → `/contact`

### I04 · Optional scenario worksheet

H2: Explore a possible outcome

Enter your own assumptions to see how a change in value and stated costs would affect an amount. This is a hypothetical example, not a forecast or a promised return.

Input labels: Starting amount · Assumed change in value, % · Assumed total costs.

Helper: Include a negative percentage to explore a loss. Use the same currency for the starting amount and costs.

Output labels: Value before costs · Assumed costs · Value after costs · Change from starting amount.

### I05 · Next step

H2: Ask the questions you still have

Send us the name of the option you are considering and the details you want explained.

Button: Ask about an option → `/contact`

Link: See how accounts work → `/how-it-works`

## Interface states

Incomplete option terms: "Full details are unavailable. Ask for the terms before proceeding."

Scenario invalid amount: "Enter a starting amount greater than zero."

Scenario missing assumption: "Enter a percentage change, including a minus sign for a loss."

## Publication dependencies

D03 and D04 apply. Do not invent Bronze/Silver/Gold packages, daily returns, minimum amounts or lock periods. A future option table needs name, currency, minimum, maximum if applicable, strategy, fees, duration, withdrawal conditions and terms link.

The optional worksheet uses `value before costs = starting amount × (1 + assumed change / 100)` and `value after costs = value before costs − assumed costs`. This simple model excludes compounding, tax, borrowing and time-based fees. State those limits near the tool; do not connect it to an investment CTA or prefill a positive return. The worksheet is a proposal, not implemented code.
