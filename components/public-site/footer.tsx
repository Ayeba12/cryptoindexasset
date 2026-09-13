import { Brand } from "./brand";
import { PublicDestination, ThemeSelect } from "./frame";
import { CookieSettingsButton } from "./cookie-notice";

const publicGroups = [
  { label: "Explore", links: [["Home", "/"], ["How it works", "/how-it-works"], ["Copy trading", "/copy-trading"], ["About", "/about"], ["Contact", "/contact"]] },
  { label: "Transparency", links: [["Fees", "/fees"], ["Security", "/security"], ["Risk disclosure", "/risk-disclosure"]] },
  { label: "Legal", links: [["Terms and conditions", "/terms"], ["Privacy policy", "/policy"], ["Cookie policy", "/cookie-policy"]] },
  { label: "Your account", links: [["Sign in", "/login"], ["Create account", "/register"]] },
];
const previewGroups = [
  { label: "Explore", links: [["How it works", "/how-it-works"], ["Copy trading", "/copy-trading"], ["For investors", "/investors"], ["About", "/about"]] },
  { label: "Help", links: [["FAQs", "/faq"], ["Fees", "/fees"], ["Security", "/security"], ["Contact", "/contact"]] },
  { label: "Legal", links: [["Risk disclosure", "/risk-disclosure"], ["Terms of service", "/terms"], ["Privacy policy", "/policy"]] },
];

export function PublicFooter({ preview = false }: { preview?: boolean }) {
  return <footer className="pp-footer pp-shell">
    <div className="pp-footer-top">
      <div><Brand footer /><p className="pp-small">Crypto account information and service guides in one place.</p>{!preview && <><ThemeSelect /><CookieSettingsButton /></>}</div>
      {(preview ? previewGroups : publicGroups).map((group) => <nav aria-label={group.label} key={group.label}>
        <h2 className="pp-footer-label">{group.label}</h2>
        <ul>{group.links.map(([label, route]) => <li key={route}><PublicDestination label={label} route={route}>{label}</PublicDestination></li>)}</ul>
      </nav>)}
    </div>
    <div className="pp-footer-bottom">
      <p>Crypto assets can lose value. You could lose all the money you invest. Past performance does not guarantee future results.</p>
      <p>© {new Date().getFullYear()} Crypto Index Asset.</p>
    </div>
  </footer>;
}
