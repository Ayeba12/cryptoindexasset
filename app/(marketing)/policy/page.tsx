import type { Metadata } from "next";
import Link from "next/link";
import { DocumentPage } from "@/components/public-site/document-page";

export const metadata: Metadata = {
  title: "Privacy Policy | Crypto Index Asset",
  description: "Learn how Crypto Index Asset collects, protects, processes, and retains your personal data in accordance with GDPR and international data protection laws.",
};

export default function PrivacyPage() {
  return (
    <DocumentPage
      title="Privacy Policy"
      intro="This Privacy Policy outlines how Crypto Index Asset Ltd collects, uses, protects, and retains your personal data when you visit our website, register an account, or use our digital asset services."
      date="Effective 13 September 2026"
      sections={[
        {
          id: "controller",
          title: "1. Data Controller and Contact Information",
          content: (
            <>
              <p>
                The data controller responsible for your personal information is:
              </p>
              <address style={{ fontStyle: "normal", lineHeight: "1.6", margin: "1rem 0" }}>
                <strong>Crypto Index Asset Ltd</strong><br />
                25 Bank Street, Canary Wharf<br />
                London E14 5JP, United Kingdom<br />
                Company Registration No. 14285910<br />
                Data Protection Officer: <code className="pp-code">privacy@cryptoindexasset.com</code>
              </address>
              <p>
                If you have questions regarding this Privacy Policy or wish to exercise any of your data protection rights, please contact our Data Protection Officer at the email above.
              </p>
            </>
          ),
        },
        {
          id: "collection",
          title: "2. Personal Data We Collect",
          content: (
            <>
              <p>We collect personal information across the following categories:</p>
              <ul>
                <li><strong>Identity and Profile Data:</strong> Full legal name, date of birth, nationality, country of residence, and government-issued identification documents (e.g., passport, national ID card, driving licence) submitted during identity verification.</li>
                <li><strong>Contact Data:</strong> Verified email address, phone number, and residential proof-of-address documentation (e.g., utility bills, bank statements).</li>
                <li><strong>Financial and Transaction Data:</strong> Public cryptocurrency wallet addresses, transaction hashes, deposit and withdrawal records, double-entry ledger entries, and copy-trading allocation balances. We never hold or request your external wallet private keys.</li>
                <li><strong>Technical and Telemetry Data:</strong> IP address, browser type and version, operating system, device identifiers, session timestamps, and authentication audit logs.</li>
                <li><strong>Communications Data:</strong> Inquiries, feedback, and support tickets submitted through our contact form, including case references and resolution records.</li>
              </ul>
            </>
          ),
        },
        {
          id: "bases",
          title: "3. Legal Bases and Processing Purposes",
          content: (
            <>
              <p>We process your personal data under the following lawful bases recognized by the UK GDPR and EU GDPR:</p>
              <ul>
                <li><strong>Performance of a Contract (Art. 6(1)(b)):</strong> To register and administer your account, execute copy-trading parameters, process deposits and withdrawals, and calculate ledger balances.</li>
                <li><strong>Compliance with Legal Obligations (Art. 6(1)(c)):</strong> To comply with anti-money laundering (AML), counter-terrorist financing (CTF), sanctions screening, tax reporting, and statutory regulatory requirements.</li>
                <li><strong>Legitimate Interests (Art. 6(1)(f)):</strong> To safeguard platform security, detect and prevent fraud or market abuse, protect network integrity, and improve service performance.</li>
                <li><strong>Consent (Art. 6(1)(a)):</strong> For non-essential cookies and targeted product updates, which you may grant or revoke at any time via cookie settings.</li>
              </ul>
            </>
          ),
        },
        {
          id: "sharing",
          title: "4. Data Sharing and Sub-Processors",
          content: (
            <>
              <p>
                We do not sell, rent, or trade your personal information to third parties. We share data only with verified service providers (&ldquo;Sub-processors&rdquo;) necessary to operate our platform under strict Data Processing Agreements (DPAs):
              </p>
              <ul>
                <li><strong>Cloud Infrastructure & Database:</strong> Supabase Inc. (managed PostgreSQL, authentication, and encrypted storage hosted in AWS EU-West-1, Ireland).</li>
                <li><strong>Identity Verification Providers:</strong> Automated AML and PEP (Politically Exposed Persons) screening services operating in compliance with ISO 27001 standards.</li>
                <li><strong>Regulatory and Law Enforcement Authorities:</strong> Where legally mandated by a valid court order, statutory subpoena, or enforceable regulatory inquiry.</li>
              </ul>
              <p>
                All cross-border data transfers outside the UK and European Economic Area (EEA) are safeguarded by UK International Data Transfer Agreements (IDTA) or EU Standard Contractual Clauses (SCCs).
              </p>
            </>
          ),
        },
        {
          id: "retention",
          title: "5. Data Retention Policy",
          content: (
            <>
              <p>
                We retain personal data only for as long as necessary to fulfill the purposes for which it was collected, subject to statutory retention mandates:
              </p>
              <ul>
                <li><strong>Account and Financial Ledger Data:</strong> Retained for a minimum of <strong>5 years</strong> following account closure, in compliance with UK The Money Laundering, Terrorist Financing and Transfer of Funds Regulations 2017 and EU 5AMLD.</li>
                <li><strong>KYC / AML Identity Records:</strong> Retained for <strong>5 years</strong> after the end of the business relationship.</li>
                <li><strong>Support and Customer Inquiries:</strong> Retained for <strong>12 months</strong> following ticket closure to maintain service continuity and quality assurance.</li>
                <li><strong>Server and Authentication Audit Logs:</strong> Retained for <strong>90 days</strong> in active telemetry and subsequently aggregated or purged.</li>
              </ul>
            </>
          ),
        },
        {
          id: "rights",
          title: "6. Your Data Subject Rights",
          content: (
            <>
              <p>Under applicable data protection laws, you possess the following rights:</p>
              <ul>
                <li><strong>Right of Access:</strong> Request a copy of the personal information we hold about you (Subject Access Request).</li>
                <li><strong>Right to Rectification:</strong> Request correction of inaccurate or incomplete personal data.</li>
                <li><strong>Right to Erasure (&ldquo;Right to be Forgotten&rdquo;):</strong> Request deletion of your data, provided we are not legally required to retain it under financial or AML regulations.</li>
                <li><strong>Right to Restriction of Processing:</strong> Request that we temporarily suspend processing of your personal data under certain conditions.</li>
                <li><strong>Right to Data Portability:</strong> Receive your personal data in a structured, commonly used, machine-readable format (JSON/CSV).</li>
                <li><strong>Right to Object:</strong> Object to processing based on legitimate interests.</li>
              </ul>
              <p>
                To exercise any of these rights, contact our Data Protection Officer at <code className="pp-code">privacy@cryptoindexasset.com</code> or submit an enquiry via our <Link href="/contact">contact desk</Link>. We respond to all verified requests within 30 days without charge.
              </p>
              <p>
                You also have the right to lodge a complaint with the UK Information Commissioner&rsquo;s Office (ICO) or your local EEA supervisory authority.
              </p>
            </>
          ),
        },
        {
          id: "security",
          title: "7. Security Safeguards",
          content: (
            <>
              <p>
                We protect your information using institutional-grade physical, technical, and administrative controls:
              </p>
              <ul>
                <li>256-bit AES encryption for all stored data, identity documents, and credentials.</li>
                <li>Strict Transport Layer Security (TLS 1.3) encryption for all client-to-server and inter-service communications.</li>
                <li>Granular PostgreSQL Row-Level Security (RLS) enforcing strict tenant isolation across all user tables and storage buckets.</li>
                <li>Mandatory two-factor authentication (TOTP) available for all accounts.</li>
              </ul>
              <p>
                Read our full <Link href="/security">Security Architecture</Link> overview for additional technical specifications.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
