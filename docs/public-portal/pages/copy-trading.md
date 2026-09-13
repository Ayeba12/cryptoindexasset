# Copy trading

Route: `/copy-trading` | Purpose: answer what copy trading means and help visitors assess the service.

Primary action in this draft: Ask about copy trading → `/contact`.

SEO title: Crypto copy trading explained | Crypto Index Asset

Meta description: Understand crypto copy trading, what to look for in trader information, and how fees, risk and execution can affect your results.

Primary topic: crypto copy trading. Search intent: informational and commercial evaluation.

## Layout

Header → C01 hero and definition → C02 evaluation guide → C03 service questions → C04 optional trader information → C05 FAQs and enquiry → footer.

Use a text-led hero. Beside it, a simple labelled conceptual sequence can show Trader decision → Copying process → Account outcome. Caption: "How copy trading works in principle." This is not a diagram of the current backend.

Desktop C02 uses four short stacked rows. C04 uses a table only if comparable, approved records exist. On mobile, each trader becomes one labelled record with the same fields. Keep missing-data messages visible and never hide losses behind a swipe.

## Page copy

### C01 · Hero

H1: Understand crypto copy trading before you choose a trader

Copy trading is a service that follows another trader's transactions in your account. How closely it follows them depends on the service's rules, timing and available funds. You still face investment risk, and your results can differ from the trader's published record.

Button: Ask about copy trading → `/contact`

Risk line: Past performance does not guarantee future results. Copying a trader can lead to losses.

### C02 · Evaluation guide

H2: Look beyond the return figure

H3: Read the strategy

Check which assets the trader uses and how the approach works. Ask about anything you cannot explain in your own words.

H3: Check the measurement period

Compare figures covering the same dates. Find out whether they include fees and whether they come from actual trading or a simulation.

H3: Understand the losses

A return figure does not show the full path. Review losses as well as gains, and ask how the performance record was calculated.

H3: Know the costs

Check platform charges, trading costs and any trader commission. Find out when each charge applies.

Link: Review fees → `/fees`

### C03 · Service questions

H2: Ask how the service handles your account

Before you begin, establish how trades start, which decisions you control and how you stop participation. Ask what happens to open positions and withdrawal requests when you stop.

Link: Read the investor guide → `/investors`

### C04 · Trader information

H2: Review the information available

A trader profile should explain the strategy, the period covered by its results and the costs involved. If important details are missing, ask for them before deciding.

Empty-state copy: Trader information is not currently available. Contact us to ask about the service.

Button: Ask about the service → `/contact`

### C05 · Questions

H2: Common copy-trading questions

H3: Will my results match the trader's?

They may differ. Timing, available funds and the service's execution rules can affect the outcome. Review how the service handles these differences before participating.

H3: Does a high win rate mean low risk?

A win rate alone does not show the size of losses or the costs involved. Read the performance record in context.

Links: Read the risk disclosure → `/risk-disclosure` · View FAQs → `/faq`

## Interface states

Trader fetch failure: "We couldn't load trader information. Try again." Action: Try again.

Missing metric: "Not available". Do not show zero, invented ratings or a simulated chart as real performance.

If records later support it, table labels: Trader · Strategy · Reporting period · Return after stated fees · Largest decline · Data source · Updated. Define Largest decline alongside the metric. Row action: View trader details. Add a separate detail-page brief before introducing those URLs.

## Publication dependencies

D02 and D08 apply. The draft uses an enquiry CTA because automated copying has not been verified. Do not label administrator-entered profiles verified or independently audited. General concept and execution caveats were checked against [eToro's risk notice](https://www.etoro.com/copytrader/risk-warnings/); that source does not establish this platform's functionality.
