import type { Metadata } from "next";
import { PublicMotion } from "@/components/public-site/motion";
import { PublicDestination } from "@/components/public-site/frame";
import { ContactForm } from "@/components/public-site/contact-form";

export const metadata: Metadata = { title: "Contact", description: "Find account guides and see the information to prepare when contacting Crypto Index Asset." };

export default function ContactPage() {
  return <main id="main-content" tabIndex={-1}><PublicMotion>
    <section className="pp-shell pp-guide-hero" data-stagger><h1 className="pp-inner-h1" data-reveal>Let&apos;s talk about<br />the details.</h1><p className="pp-lead" data-reveal>Whether you are reviewing the service or looking into an account issue, start with the question you need answered.</p></section>
    <div className="pp-shell pp-contact-layout">
      <aside className="pp-contact-guidance" aria-label="Contact guidance">
        <section><h2 className="pp-h3">Before you write</h2><p>Describe what happened, when it happened and what you need help with. Keep a relevant transaction or request reference available.</p></section>
        <section><h2 className="pp-h3">Support contact</h2><p>A verified support address has not yet been published. No response hours or delivery times are promised in this build.</p><p>Do not send funds to obtain support or share secret credentials.</p></section>
        <section><h2 className="pp-h3">Find an answer now</h2><div className="pp-help-links"><PublicDestination route="/how-it-works" label="Account guide" arrow>Account guide</PublicDestination><PublicDestination route="/how-it-works#request-statuses" label="Request statuses" arrow>Request statuses</PublicDestination><PublicDestination route="/login" label="User sign in" arrow>User sign in</PublicDestination><PublicDestination route="/admin/login" label="Admin sign in" arrow>Admin sign in</PublicDestination></div></section>
      </aside>
      <ContactForm />
    </div>
  </PublicMotion></main>;
}
