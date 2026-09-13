import type { Metadata } from "next";
import { DocumentPage } from "@/components/public-site/document-page";
import { CookieSettingsButton } from "@/components/public-site/cookie-notice";

export const metadata: Metadata = { title: "Cookie policy", description: "See how Crypto Index Asset uses sign-in cookies and browser storage for website settings." };

export default function CookiePolicyPage() {
  return <DocumentPage title="Cookie policy" intro="A plain account of the cookies and browser settings used by this version of the website."
    notice="Implementation inventory. The operator must review the deployed site's cookies, providers and applicable legal requirements before publication. This page does not certify compliance for a particular jurisdiction."
    sections={[
      { id: "what-storage-does", title: "What cookies and storage do", content: <p>Cookies are small values a website can store in your browser and receive on later requests. Local storage keeps settings in that browser. Clearing browser data, changing browsers or using a private window can change which settings the website remembers.</p> },
      { id: "current-inventory", title: "What this website uses", content: <dl className="pp-cookie-inventory">
        <div><dt>Website theme</dt><dd><code>ca-public-theme</code>, local storage. Saves Light, Dark or System after you choose it. It stays until you change the choice or clear browser storage.</dd></div>
        <div><dt>Storage notice</dt><dd><code>ca-cookie-notice</code>, local storage. Saves the notice version and acknowledgement time after Got it. It is treated as expired after 180 days, or if the notice version changes. The stored value remains until replaced or cleared.</dd></div>
        <div><dt>Account sign-in</dt><dd>Supabase session cookies are used when authentication is configured. Their project-specific names may use <code>sb-…-auth-token</code> and numbered chunks. Session settings and expiry depend on the configured authentication service and must be checked before launch. No sign-in cookie is needed just to read these public pages.</dd></div>
      </dl> },
      { id: "optional-tools", title: "Optional analytics and advertising", content: <><p>No optional analytics or advertising scripts are enabled in the current public website. There are no optional cookie categories to accept or reject here.</p><p>Got it acknowledges the information notice. It does not consent to tracking, accept service terms or create an account. Adding optional tools requires a fresh inventory and working controls before those tools load.</p></> },
      { id: "your-controls", title: "Your controls", content: <><p>Use the theme control to change the website appearance. Use Cookie settings in the footer to reopen the notice at any time.</p><CookieSettingsButton /><p>You can also clear or block cookies and local storage in your browser. Blocking account cookies can prevent sign-in. If storage is unavailable, your notice acknowledgement or theme choice may not persist.</p></> },
      { id: "scope-and-changes", title: "Scope and updates", content: <p>This inventory covers the current public and account-entry implementation. It does not establish the cookie inventory of an external website or a future dashboard integration. Changes to storage purposes or optional tools must be reflected here and in the notice.</p> },
    ]} />;
}
