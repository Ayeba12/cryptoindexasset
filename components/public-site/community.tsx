import { PersonPortrait } from "./person-portrait";
import { CopySimpleIcon, ShieldCheckIcon, StarIcon, TimerIcon } from "@phosphor-icons/react/dist/ssr";
import { CardMarquee } from "./card-marquee";
import { PublicDestination } from "./frame";
import {
  APPROVED_TESTIMONIALS,
} from "@/lib/content/approved-people";

const services = [
  { title: "Secure and stable", Icon: ShieldCheckIcon, text: "Two-factor authentication can add another sign-in check. Protected account pages require an authenticated user." },
  { title: "Transaction visibility", Icon: TimerIcon, text: "Follow the status of a request as it is reviewed. Network confirmations and processing times depend on the asset and network conditions." },
  { title: "Crypto copy trading", Icon: CopySimpleIcon, text: "Compare a trader's approach and risk information before choosing to copy. Results vary, losses are possible and previous performance does not predict your return." },
] as const;

import type { PublicTraderCard } from "@/lib/traders/public";

const PROFILE_PORTRAIT_SIZE = 64;

export function TopTradersSection({ initialTraders }: { initialTraders?: PublicTraderCard[] | null }) {
  const displayTraders = initialTraders ?? [];

  return <section className="pp-section pp-shell pp-community" id="top-traders" tabIndex={-1} aria-labelledby="top-traders-heading">
    <div className="pp-community-intro" data-reveal>
      <h2 className="pp-h2" id="top-traders-heading">Top traders<br />to explore.</h2>
      <div>
        <p>See the person behind a strategy, then look closer at their approach and track record.</p>
        <p className="pp-community-disclosure">
          Trader profiles published by the platform operator. Review the profile details and risk information before acting.
        </p>
        <PublicDestination label="Copy-trading guide" route="/copy-trading" arrow>How copying works</PublicDestination>
      </div>
    </div>
    {displayTraders.length > 0 ? <CardMarquee id="trader-cards" label="traders">
      {displayTraders.map((trader) => {
        const key = trader.id;
        const copyRoute = `/dashboard/traders/${encodeURIComponent(trader.id)}`;
        const reviewsText = trader.reviews ? `${trader.reviews} published reviews` : "No published reviews";
        const footerDisclosure = "Profile data supplied and approved by the platform operator";

        return (
          <li key={key} className="pp-person-card pp-trader-card">
            <div className="pp-trader-identity">
              <PersonPortrait name={trader.name} src={trader.avatar} alt={trader.avatarAlt} size={PROFILE_PORTRAIT_SIZE} />
              <div>
                <h3 className="pp-h3">{trader.name}</h3>
                <p className="pp-small">{trader.style}</p>
              </div>
            </div>
            <p className="pp-trader-assets">{trader.assets}</p>
            <dl className="pp-trader-stats">
              <div><dt>Copiers</dt><dd>{trader.copiers}</dd></div>
              <div><dt>Accuracy</dt><dd>{trader.accuracy}</dd></div>
            </dl>
            <div className="pp-trader-rating">
              <StarIcon size={20} weight={trader.rating ? "fill" : "regular"} aria-hidden="true" />
              <span>
                <strong>{trader.rating ? <>{trader.rating}<span className="pp-small"> / 5</span></> : "Not rated"}</strong>
                <span className="pp-small">{reviewsText}</span>
              </span>
            </div>
            <PublicDestination className="pp-button pp-trader-action" variant="outline" route={copyRoute} label={`Copy ${trader.name}`}>
              Copy trader<span className="pp-sr-only">: {trader.name}</span>
            </PublicDestination>
            <p className="pp-person-disclosure">{footerDisclosure}</p>
          </li>
        );
      })}
    </CardMarquee> : <p className="pp-section-note" role="status">
      {initialTraders == null
        ? "Trader profiles are temporarily unavailable. Please try again later."
        : "No traders are featured yet. Check back for published profiles."}
    </p>}
    <p className="pp-section-note">
      Figures are published by the platform operator. Check each profile&apos;s measurement period, loss history, risk and fees before acting. Past performance does not guarantee future results.
    </p>
  </section>;
}

export function BestServicesSection() {
  return <section className="pp-section pp-shell pp-services" id="services" tabIndex={-1} aria-labelledby="services-heading">
    <div className="pp-services-heading" data-reveal>
      <h2 className="pp-h2" id="services-heading">We ensure<br />best services.</h2>
      <p>Account access, transaction status and copy-trading information should be clear before you act.</p>
    </div>
    <div className="pp-services-list" data-stagger>
      {services.map(({ title, Icon, text }) => <article key={title} data-reveal>
        <Icon size={32} weight="regular" aria-hidden="true" />
        <div><h3 className="pp-h3">{title}</h3><p>{text}</p></div>
      </article>)}
    </div>
    <p className="pp-section-note">Service direction. Production authentication, transaction timing and copy-trading behaviour still require verification.</p>
  </section>;
}

export function TestimonialsSection() {
  return <section className="pp-section pp-shell pp-community" id="testimonials" tabIndex={-1} aria-labelledby="testimonials-heading">
    <div className="pp-community-intro" data-reveal>
      <h2 className="pp-h2" id="testimonials-heading">A place for<br />your perspective.</h2>
      <div><p>Experiences selected for publication by Crypto Index Asset.</p><p className="pp-community-disclosure">Testimonials and portraits supplied and approved by the platform operator.</p></div>
    </div>
    <CardMarquee id="testimonial-cards" label="testimonials" reverse>
      {APPROVED_TESTIMONIALS.map((person) => <li key={person.slug} className="pp-person-card pp-testimonial-card">
        <figure>
          <blockquote><p>&ldquo;{person.quote}&rdquo;</p></blockquote>
          <figcaption><PersonPortrait name={person.name} src={person.avatar} size={PROFILE_PORTRAIT_SIZE} /><div><span className="pp-person-name">{person.name}</span><span className="pp-small">{person.topic}</span></div></figcaption>
        </figure>
        <p className="pp-person-disclosure">Approved testimonial · Supplied by the platform operator</p>
      </li>)}
    </CardMarquee>
  </section>;
}
