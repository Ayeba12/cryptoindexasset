import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { PublicDestination } from "./frame";
import { ProductImage } from "./product-image";
import { ConceptCaption, ProductCard, wideSizes } from "./product-blocks";
import { AssetMarquee } from "./asset-marquee";
import { PublicMotion } from "./motion";
import { BestServicesSection, TestimonialsSection, TopTradersSection } from "./community";
import type { PublicTraderCard } from "@/lib/traders/public";

const steps = [
  ["Review the service", "Read how the account works, what it costs and which risks apply."],
  ["Create your account", "Enter your details and complete the steps shown during registration."],
  ["Check before you fund", "Confirm the asset, network and deposit instructions in your account before sending money."],
];
const decisions = [
  ["Fees", "Find out what you may pay when funding, investing or withdrawing.", "/fees"],
  ["Account security", "Understand account access and the questions to ask about custody.", "/security"],
  ["Risk disclosure", "Read about market losses, execution differences and access to funds.", "/risk-disclosure"],
];
export function PublicHome({ preview = false, traders }: { preview?: boolean; traders?: PublicTraderCard[] | null }) {
  return <main id={preview ? "preview-main" : "main-content"} tabIndex={-1}>
      <PublicMotion>
        <section className="pp-hero" aria-labelledby="home-heading">
          <div className="pp-shell pp-hero-copy" data-stagger>
            <p className="pp-eyebrow">Your account. In perspective.</p>
            <h1 id="home-heading" className="pp-display" data-reveal><span>Your crypto.</span><span>A clearer view.</span></h1>
            <p className="pp-lead pp-hero-lead" data-reveal>Balances, account activity and copy trading in one place. See the details that matter before you decide to invest.</p>
            <div className="pp-actions pp-actions-centred" data-reveal>
              <PublicDestination variant="default" className="pp-button" label="Create account" route="/register">Create account</PublicDestination>
              <Button asChild variant="outline" className="pp-button"><a href={preview ? "#process" : "/how-it-works"}>See how it works<ArrowRightIcon size={20} aria-hidden="true" /></a></Button>
            </div>
            <p className="pp-risk">Crypto assets can lose value. You could lose all the money you invest.</p>
          </div>
          <div className="pp-shell"><AssetMarquee /></div>
          <figure className="pp-shell pp-hero-figure" data-reveal="image">
            <ProductImage scene="01-hero-overview" alt="Illustrative account overview showing balances, portfolio allocations and fictional strategies. Every figure is demo content." sizes={wideSizes} priority />
            <ConceptCaption />
          </figure>
        </section>

        <section className="pp-section pp-shell pp-statement" aria-labelledby="statement-heading" data-reveal>
          <h2 className="pp-h2" id="statement-heading">Bring your balances,<br />{" "}activity and decisions<br />{" "}into the same view.</h2>
          <p>Start with an overview. Look closer at each asset, follow your account activity and understand a strategy before you copy it.</p>
          <div className="pp-statement-links"><a href="#account">See your account<ArrowRightIcon size={20} aria-hidden="true" /></a><a href="#copy-trading">Explore copy trading<ArrowRightIcon size={20} aria-hidden="true" /></a></div>
        </section>

        <section className="pp-section pp-shell" id="account" tabIndex={-1} aria-labelledby="account-heading">
          <div className="pp-centred-intro" data-reveal>
            <p className="pp-eyebrow">Account overview</p>
            <h2 className="pp-h2" id="account-heading">The overview.<br />And the details.</h2>
            <p>See how your account fits together, then look at the individual balances and activity behind it.</p>
          </div>
          <div className="pp-product-grid pp-account-grid pp-section-content" data-stagger>
            <ProductCard scene="05-portfolio-allocation" title="See balances by asset" alt="Concept portfolio allocation using an asset ring chart and balance rows. Assets and amounts are illustrative, not a supported currency list.">
              Keep each currency in view, with a breakdown of the assets recorded in your account.
            </ProductCard>
            <ProductCard scene="07-mobile-companion" title="Keep your account close" alt="Two illustrative mobile account views containing fictional copy strategies. These are product concepts, not a claim that a native app is available." performance>
              A focused view for smaller screens, with balances and strategy details close at hand.
            </ProductCard>
            <ProductCard scene="06-trade-activity" title="Follow the activity" alt="Concept activity table with demo orders and a transaction detail panel. No item represents a real transaction." wide>
              Review recorded activity and request statuses. A request still needs review before a transfer can be completed.
            </ProductCard>
          </div>
          <p className="pp-section-note">Illustrations show the proposed interface. Availability, assets and account features must be confirmed in the service.</p>
        </section>

        <BestServicesSection />

        <section className="pp-section pp-shell" id="copy-trading" tabIndex={-1} aria-labelledby="copy-heading">
          <div className="pp-story-intro" data-reveal>
            <p className="pp-section-kicker"><span>Copy trading</span><span>01</span></p>
            <h2 className="pp-h2 pp-heading-width" id="copy-heading">Look beyond<br />the return.</h2>
            <p>Copy trading follows another trader&apos;s decisions. Look at the strategy, its holdings and the risks involved. A strong past result is only part of the picture.</p>
            <PublicDestination label="Copy trading" route="/copy-trading" arrow>Explore copy trading</PublicDestination>
          </div>
          <div className="pp-product-grid pp-copy-grid pp-section-content" data-stagger>
            <ProductCard scene="02-trader-discovery" title="Compare the approach" alt="Concept trader discovery cards showing fictional strategies, returns and risk labels. These are demo figures, not verified results." performance>
              Consider how a trader invests, not just the headline number.
            </ProductCard>
            <ProductCard scene="04-copy-settings" title="Review your allocation" alt="Illustrative copy settings with a demo allocation and review button. This is not an interactive investment form." performance>
              Understand the amount, settings and costs before you commit.
            </ProductCard>
            <ProductCard scene="03-strategy-profile" title="Understand the strategy" alt="Concept strategy profile with fictional performance chart, drawdown and risk details. Past results do not guarantee future outcomes." wide performance>
              Look at the history in context. Returns, losses and drawdown all belong in the same conversation.
            </ProductCard>
          </div>
          <p className="pp-section-note">Copy trading involves risk. Execution can differ, and past performance does not guarantee your outcome.</p>
        </section>

        <TopTradersSection initialTraders={traders} />

        <section className="pp-section pp-shell" id="process" tabIndex={-1} aria-labelledby="process-heading">
          <div className="pp-story-intro" data-reveal><p className="pp-section-kicker"><span>Getting started</span><span>02</span></p><h2 className="pp-h2 pp-heading-width" id="process-heading">Know the process<br />before you begin.</h2></div>
          <ol className="pp-process pp-section-content" data-stagger>
            {steps.map(([title, text], index) => <li key={title} data-reveal><span className="pp-step-number" aria-hidden="true">0{index + 1}</span><h3 className="pp-h3">{title}</h3><p>{text}</p></li>)}
          </ol>
          <div className="pp-after-content"><PublicDestination label="Account guide" route={preview ? "/investors" : "/how-it-works"} arrow>{preview ? "Read the investor guide" : "Read the account guide"}</PublicDestination></div>
        </section>

        <section className="pp-section pp-shell pp-editorial" id="details" tabIndex={-1} aria-labelledby="details-heading">
          <div data-reveal><p className="pp-section-kicker"><span>Decision support</span><span>03</span></p><h2 className="pp-h2" id="details-heading">Make room<br />for the details.</h2></div>
          <ul className="pp-decision-links" data-reveal>
            {decisions.map(([title, description, route]) => <li key={route}>{preview ? <PublicDestination className="pp-decision-link" label={title} route={route} arrow><span><span className="pp-h3">{title}</span><span className="pp-decision-description">{description}</span></span></PublicDestination> : <div className="pp-decision-link"><div><h3 className="pp-h3">{title}</h3><p className="pp-decision-description">{description}</p></div></div>}</li>)}
            {!preview && <li><PublicDestination label="Before you begin" route="/how-it-works#before-you-begin" arrow>What to confirm before funding</PublicDestination></li>}
          </ul>
        </section>

        <TestimonialsSection />

        <section className="pp-section pp-shell pp-editorial pp-faq-section" id="questions" tabIndex={-1} aria-labelledby="questions-heading">
          <div data-reveal><p className="pp-section-kicker"><span>Questions</span><span>04</span></p><h2 className="pp-h2" id="questions-heading">Before you create an account.</h2></div>
          <div className="pp-visible-answers" data-reveal>
            <article><h3 className="pp-h3">Are returns guaranteed?</h3><p>No. Crypto assets can lose value, and a trader&apos;s previous results do not guarantee your outcome.</p></article>
            <article><h3 className="pp-h3">Is a withdrawal request an immediate transfer?</h3><p>No. Requests are reviewed. Check the withdrawal conditions and any applicable costs before you submit one.</p></article>
            <PublicDestination label="Request statuses" route={preview ? "/faq" : "/how-it-works#request-statuses"} arrow>{preview ? "Read all FAQs" : "Understand request statuses"}</PublicDestination>
          </div>
        </section>

        <figure className="pp-shell pp-final-product" data-reveal="image">
          <ProductImage scene="08-closing-mockup" alt="Concept copy-trading dashboard on a tablet with a fictional strategy card. All balances and performance figures are demo content." sizes={wideSizes} />
          <ConceptCaption performance />
        </figure>
        <section className="pp-section pp-closing" aria-labelledby="closing-heading" data-reveal>
          <div className="pp-shell"><h2 className="pp-h2" id="closing-heading">Take a closer look.</h2><p>{preview ? "Create an account to continue, or ask us about any details you want to understand first." : "Read the account guide and confirm the service details before you decide to fund an account."}</p><div className="pp-actions pp-actions-centred"><PublicDestination className="pp-button" variant="default" route="/register" label="Create account">Create account</PublicDestination><PublicDestination className="pp-button" variant="outline" route={preview ? "/contact" : "/how-it-works"} label={preview ? "Contact" : "How it works"} arrow>{preview ? "Ask a question" : "How it works"}</PublicDestination></div></div>
        </section>
      </PublicMotion>
    </main>
  ;
}
