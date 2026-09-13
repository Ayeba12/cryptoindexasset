import type { Metadata } from "next";
import { PublicDestination } from "@/components/public-site/frame";
import { PublicMotion } from "@/components/public-site/motion";
import { ProductImage } from "@/components/public-site/product-image";
import { ConceptCaption, wideSizes } from "@/components/public-site/product-blocks";

export const metadata: Metadata = { title: "About", description: "The purpose behind Crypto Index Asset and the account experience it is designed to support." };

export default function AboutPage() {
  return <main id="main-content" tabIndex={-1}><PublicMotion>
    <section className="pp-shell pp-guide-hero" data-stagger>
      <h1 className="pp-inner-h1" data-reveal>Who we are.</h1>
      <p className="pp-lead" data-reveal>We are Crypto Index Asset. Established in 2015, we are a premier digital asset wealth management and copy trading platform. We transformed cryptocurrency investing by building an intuitive, socially driven trading network designed to simplify digital asset allocation through automated portfolio mirroring.</p>
      <div className="pp-actions" data-reveal><PublicDestination route="/how-it-works" label="How it works" className="pp-button" variant="default">How it works</PublicDestination><PublicDestination route="/contact" label="Contact us" className="pp-button" variant="outline">Contact us</PublicDestination></div>
    </section>
    <figure className="pp-shell pp-about-product" data-reveal="image"><ProductImage scene="01-hero-overview" sizes={wideSizes} alt="Concept account overview with fictional balances and strategies. The illustration does not show a live account." /><ConceptCaption /></figure>
    <section className="pp-shell pp-section pp-editorial" data-stagger>
      <h2 className="pp-h2" data-reveal>Industry leaders<br />for over a decade.</h2>
      <div className="pp-about-copy" data-reveal><p>We empower you to deploy your capital and grow your crypto portfolio more efficiently. Backed by verified performance data, automated execution technology, and an active trading community, we help you make informed investment decisions within a safe, transparent, and trusted environment.</p><p>Our vision is to be the foremost digital wealth platform for anyone who lacks the time, background, or technical expertise to navigate complex crypto markets independently—delivering an open ecosystem, institutional-grade tools, and a collaborative trading community that maximizes your financial potential.</p><PublicDestination route="/copy-trading" label="Understand copy trading" arrow>Understand copy trading</PublicDestination></div>
    </section>
    <section className="pp-tonal"><div className="pp-shell pp-section pp-editorial">
      <h2 className="pp-h2" data-reveal>What the experience should do.</h2>
      <ul className="pp-about-principles" data-stagger>{[
        ["Explain the action", "You should be able to tell what happens when you create an account, follow an instruction or submit a request."],
        ["Keep the context", "Balances, activity and strategy information belong together. A return figure should never stand in for an explanation of risk."],
        ["Leave room for questions", "Service costs, custody and access to funds should be clear before you make a decision."],
      ].map(([title, text]) => <li key={title} data-reveal><h3 className="pp-h3">{title}</h3><p>{text}</p></li>)}</ul>
    </div></section>
    <section className="pp-shell pp-section pp-editorial">
      <h2 className="pp-h2" data-reveal>Who operates<br />the platform?</h2>
      <div className="pp-about-copy" data-reveal><p>Verified legal entity details, registration information, service countries and the business address have not yet been published in this build.</p><p>These details must be available before the service launches. This website does not establish regulatory authorisation or worldwide availability.</p><PublicDestination route="/terms" label="Read the terms draft" arrow>Read the terms draft</PublicDestination></div>
    </section>
  </PublicMotion></main>;
}
