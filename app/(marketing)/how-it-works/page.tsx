import type { Metadata } from "next";
import { PublicDestination } from "@/components/public-site/frame";
import { PublicMotion } from "@/components/public-site/motion";
import { ProductImage } from "@/components/public-site/product-image";
import { ConceptCaption, wideSizes } from "@/components/public-site/product-blocks";

export const metadata: Metadata = {
  title: "How it works",
  description: "Learn the steps for creating an account, checking deposit instructions, reviewing activity and requesting a withdrawal with Crypto Index Asset.",
};

const steps = [
  { id: "create-account", title: "Create your account", text: "Register with your details and follow the account setup instructions. Keep your sign-in details private and use a password you do not use elsewhere." },
  { id: "funding-details", title: "Check the funding details", text: "Sign in to view the deposit instructions. Check the asset and network before you send funds. If the destination or instructions are unclear, contact support before proceeding." },
  { id: "account-activity", title: "Review account activity", text: "Check the balances and entries recorded in your account. If an amount or status looks wrong, contact support with the relevant reference and a description of the issue." },
  { id: "withdrawal-request", title: "Request a withdrawal", text: "Enter the withdrawal details and check the destination carefully. Submitting a request starts the review process. Check the current conditions, fees and expected timing before proceeding." },
];
const statuses = [
  ["Pending review", "The request has been received and is awaiting a decision."],
  ["Approved", "The request has passed review. Check for separate transfer confirmation before treating it as completed."],
  ["Declined", "The request was not approved. Read the reason provided or contact support for help."],
  ["Completed", "Use this status only when the transfer has been confirmed. Keep the available transaction reference for your records."],
];

export default function HowItWorksPage() {
  return <main id="main-content" tabIndex={-1}>
    <PublicMotion>
      <section className="pp-shell pp-guide-hero" aria-labelledby="how-heading">
        <h1 id="how-heading" className="pp-inner-h1">Know each step.<br />Before you fund.</h1>
        <p className="pp-lead">Your account brings together balances, account activity and withdrawal requests. Read the process first so you know what information to check and when a request needs review.</p>
        <div className="pp-actions"><PublicDestination route="/register" label="Create account" variant="default" className="pp-button">Create account</PublicDestination><PublicDestination route="#account-journey" label="Explore the steps" variant="outline" className="pp-button">Explore the steps</PublicDestination></div>
        <p className="pp-small pp-guide-risk">Crypto assets can lose value. Confirm the service conditions before sending funds.</p>
      </section>

      <div className="pp-shell">
        <nav className="pp-guide-contents" aria-label="On this page">
          {steps.map((step) => <a key={step.id} href={`#${step.id}`}>{step.title}</a>)}
        </nav>
      </div>

      <section className="pp-shell pp-section" id="account-journey" tabIndex={-1} aria-label="Account journey">
        <ol className="pp-guide-steps">
          {steps.map((step, index) => <li key={step.id} id={step.id} tabIndex={-1} data-reveal>
            <span className="pp-guide-step-number" aria-hidden="true">0{index + 1}</span>
            <div className="pp-guide-step-copy">
              <h2 className="pp-h2">{step.title}</h2><p>{step.text}</p>
              {index === 0 && <PublicDestination route="/register" label="Create account" arrow>Create account</PublicDestination>}
              {index === 1 && <p className="pp-guide-callout">Do not send funds if the deposit instructions are unavailable or the network is unclear.</p>}
              {index === 2 && <figure className="pp-guide-image"><ProductImage scene="06-trade-activity" sizes={wideSizes} alt="Illustrative account activity with demo orders and a transaction detail panel. No entry represents a real transaction." /><ConceptCaption /></figure>}
              {index === 3 && <PublicDestination route="#request-statuses" label="Understand request statuses" arrow>Understand request statuses</PublicDestination>}
            </div>
          </li>)}
        </ol>
      </section>

      <section className="pp-shell pp-section pp-editorial" id="request-statuses" tabIndex={-1} aria-labelledby="status-heading">
        <div data-reveal><h2 id="status-heading" className="pp-h2">A request has more than one step.</h2><p className="pp-guide-intro">Approval is a review decision. It is not, by itself, evidence that money has arrived.</p></div>
        <div data-reveal>
          <dl className="pp-definition-list">{statuses.map(([name, description]) => <div key={name}><dt className="pp-h3">{name}</dt><dd>{description}</dd></div>)}</dl>
          <p className="pp-section-note">These definitions explain the proposed account journey. The labels and transfer evidence available in the service still need confirmation.</p>
        </div>
      </section>

      <section className="pp-shell pp-section pp-editorial" id="before-you-begin" tabIndex={-1} aria-labelledby="before-heading">
        <div data-reveal><h2 className="pp-h2" id="before-heading">Review the details before you begin.</h2><p className="pp-guide-intro">Do not fund an account until you understand the service terms and can obtain answers to these questions.</p></div>
        <ul className="pp-checklist" data-reveal>
          <li>Which assets and networks are supported, and what limits apply?</li>
          <li>What are the funding, trading and withdrawal costs?</li>
          <li>Who holds the assets, and what happens if access to funds is interrupted?</li>
          <li>How are withdrawal requests reviewed, and how is a completed transfer confirmed?</li>
          <li>Where can you get help, and how are complaints handled?</li>
        </ul>
      </section>

      <section className="pp-section pp-closing" aria-labelledby="next-heading" data-reveal>
        <div className="pp-shell"><h2 className="pp-h2" id="next-heading">Considering copy trading?</h2><p>Read how it works in principle and what to look for in a trader&apos;s record before making a decision.</p><div className="pp-actions pp-actions-centred"><PublicDestination route="/copy-trading" label="Explore copy trading" className="pp-button" variant="default" arrow>Explore copy trading</PublicDestination></div></div>
      </section>
    </PublicMotion>
  </main>;
}
