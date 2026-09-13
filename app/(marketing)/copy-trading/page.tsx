import type { Metadata } from "next";
import { PublicDestination } from "@/components/public-site/frame";
import { PublicMotion } from "@/components/public-site/motion";
import { ProductCard } from "@/components/public-site/product-blocks";

export const metadata: Metadata = {
  title: "Crypto copy trading explained",
  description: "Understand crypto copy trading, what to look for in trader information, and how fees, risk and execution can affect your results.",
};

const considerations = [
  ["Read the strategy", "Check which assets the trader uses and how the approach works. Ask about anything you cannot explain in your own words."],
  ["Check the measurement period", "Compare figures covering the same dates. Find out whether they include fees and whether they come from actual trading or a simulation."],
  ["Understand the losses", "A return figure does not show the full path. Review losses as well as gains, and ask how the performance record was calculated."],
  ["Know the costs", "Check platform charges, trading costs and any trader commission. Find out when each charge applies."],
];

export default function CopyTradingPage() {
  return <main id="main-content" tabIndex={-1}>
    <PublicMotion>
      <section className="pp-shell pp-guide-hero" aria-labelledby="copy-guide-heading">
        <h1 id="copy-guide-heading" className="pp-inner-h1">Crypto copy trading.<br />Know what you follow.</h1>
        <p className="pp-lead">Copy trading is a service that follows another trader&apos;s transactions in your account. How closely it follows them depends on the service&apos;s rules, timing and available funds. You still face investment risk, and your results can differ from the trader&apos;s published record.</p>
        <div className="pp-actions"><PublicDestination route="#evaluate" label="What to look for" className="pp-button" variant="default">What to look for</PublicDestination><PublicDestination route="/how-it-works" label="Account guide" className="pp-button" variant="outline">Read the account guide</PublicDestination></div>
        <p className="pp-small pp-guide-risk">Past performance does not guarantee future results. Copying a trader can lead to losses.</p>
      </section>

      <section className="pp-shell pp-concept-section" aria-labelledby="concept-heading">
        <h2 className="pp-footer-label" id="concept-heading">How copy trading works in principle</h2>
        <ol className="pp-concept-sequence">
          <li><span>Trader decision</span><p>A trader places a transaction.</p></li>
          <li><span>Copying process</span><p>The service applies its rules and your available allocation.</p></li>
          <li><span>Account outcome</span><p>Your execution and result may differ.</p></li>
        </ol>
        <p className="pp-section-note">This is a general explanation, not a diagram of the platform&apos;s current execution system. Availability and operating rules must be confirmed before participating.</p>
      </section>

      <section className="pp-shell pp-section pp-editorial" id="evaluate" tabIndex={-1} aria-labelledby="evaluate-heading">
        <div data-reveal><h2 className="pp-h2" id="evaluate-heading">Look beyond the return figure.</h2><p className="pp-guide-intro">A useful performance record explains the approach, the period measured and the losses along the way.</p></div>
        <div className="pp-visible-answers" data-reveal>{considerations.map(([title, description]) => <article key={title}><h3 className="pp-h3">{title}</h3><p>{description}</p></article>)}</div>
      </section>

      <section className="pp-shell pp-section" aria-labelledby="profile-heading">
        <div className="pp-story-intro" data-reveal><h2 className="pp-h2 pp-heading-width" id="profile-heading">See the details.<br />Keep the context.</h2><p>A trader profile should explain the strategy, the period covered by its results and the costs involved. If important details are missing, ask for them before deciding.</p></div>
        <div className="pp-product-grid pp-section-content">
          <ProductCard scene="03-strategy-profile" title="Read the whole record" alt="Illustrative strategy profile showing fictional returns, drawdown and portfolio information. Not verified trader performance." wide performance>Compare the strategy with its history of gains and losses. Check the source and reporting period behind each figure.</ProductCard>
          <ProductCard scene="02-trader-discovery" title="Compare more than a number" alt="Concept trader discovery using fictional strategies and demo metrics. No real trader recommendations are shown." performance>Strategies can carry different exposures and costs. A headline return does not make them directly comparable.</ProductCard>
          <ProductCard scene="04-copy-settings" title="Know what you control" alt="Concept allocation settings with demo values. This image is not a working investment form." performance>Understand the allocation, available controls and stopping conditions before you participate.</ProductCard>
        </div>
        <p className="pp-section-note">Verified trader records are not available on this page. All profiles, balances and performance figures shown above are illustrations.</p>
      </section>

      <section className="pp-shell pp-section pp-editorial" id="service-questions" tabIndex={-1} aria-labelledby="service-heading">
        <div data-reveal><h2 className="pp-h2" id="service-heading">Know how your account is handled.</h2><p className="pp-guide-intro">Before you begin, establish how trades start, which decisions you control and how you stop participation.</p></div>
        <ul className="pp-checklist" data-reveal><li>How are trades copied, and what could cause execution to differ?</li><li>What happens when the account has insufficient available funds?</li><li>How do you stop copying, and what happens to open positions?</li><li>How does stopping affect pending withdrawal requests?</li><li>Which costs remain payable after you stop?</li></ul>
      </section>

      <section className="pp-shell pp-section pp-editorial" id="copy-questions" tabIndex={-1} aria-labelledby="copy-questions-heading">
        <h2 className="pp-h2" id="copy-questions-heading" data-reveal>Common copy-trading questions.</h2>
        <div className="pp-visible-answers" data-reveal>
          <article><h3 className="pp-h3">Will my results match the trader&apos;s?</h3><p>They may differ. Timing, available funds and the service&apos;s execution rules can affect the outcome. Review how the service handles these differences before participating.</p></article>
          <article><h3 className="pp-h3">Does a high win rate mean low risk?</h3><p>A win rate alone does not show the size of losses or the costs involved. Read the performance record in context.</p></article>
        </div>
      </section>

      <section className="pp-section pp-closing" aria-labelledby="copy-next-heading" data-reveal>
        <div className="pp-shell"><h2 className="pp-h2" id="copy-next-heading">Understand the account, too.</h2><p>Check funding instructions, request statuses and the service terms before you commit money.</p><div className="pp-actions pp-actions-centred"><PublicDestination route="/how-it-works" label="See how it works" className="pp-button" variant="default" arrow>See how it works</PublicDestination></div></div>
      </section>
    </PublicMotion>
  </main>;
}
