import type { Metadata } from "next";
import Link from "next/link";
import { DocumentPage } from "@/components/public-site/document-page";

export const metadata: Metadata = {
  title: "Security Architecture & Controls | Crypto Index Asset",
  description: "Learn how Crypto Index Asset protects your digital assets, account credentials, personal data, and transaction ledger.",
};

export default function SecurityPage() {
  return (
    <DocumentPage
      title="Security Architecture"
      intro="Crypto Index Asset enforces institutional-grade security across our authentication layers, custodial infrastructure, database design, and operational workflows to safeguard customer capital and sensitive data."
      date="Effective 13 September 2026"
      sections={[
        {
          id: "auth-security",
          title: "1. Authentication & Access Protection",
          content: (
            <>
              <p>
                Account protection begins at the authentication layer. We implement defense-in-depth controls to prevent credential stuffing, unauthorized logins, and session hijacking:
              </p>
              <ul>
                <li><strong>Cryptographic Password Hashing:</strong> Passwords are salted and hashed using industry-standard modern adaptive algorithms (bcrypt with high work factors). Raw passwords are never transmitted in cleartext or logged.</li>
                <li><strong>Two-Factor Authentication (TOTP / MFA):</strong> Users can bind standard time-based one-time password (TOTP) authenticators (Google Authenticator, 1Password, YubiKey Authenticator) to require a secondary cryptographic factor during sign-in and sensitive withdrawal actions.</li>
                <li><strong>Granular Session Management:</strong> Active sessions are bound to cryptographically signed JWT tokens with automated expiration. Users can inspect active devices, view login locations, and remotely terminate all other sessions instantly from the security dashboard.</li>
                <li><strong>Automated Brute-Force & Rate Limiting:</strong> Sign-in and password reset endpoints enforce intelligent sliding-window rate limiting to repel distributed brute-force attempts.</li>
              </ul>
            </>
          ),
        },
        {
          id: "custodial-segregation",
          title: "2. Asset Custody & Financial Ledger Integrity",
          content: (
            <>
              <p>
                We apply strict operational segregation to eliminate single points of failure for digital asset holdings:
              </p>
              <ul>
                <li><strong>Cold Storage Reserves:</strong> The vast majority of user funds are stored offline in geographically distributed, multi-signature cold storage vaults requiring multiple executive keyholders to authorize transfers.</li>
                <li><strong>Hot Wallet Isolation:</strong> Hot wallets utilized for operational withdrawals maintain strictly limited balances governed by automated replenishment thresholds.</li>
                <li><strong>Immutable Double-Entry Ledger:</strong> All deposit, withdrawal, and copy-allocation movements are reconciled across our transactional double-entry ledger (<code className="pp-code">public.ledger_entries</code>), ensuring that account balances strictly equate to verifiable deposits minus approved outlays.</li>
                <li><strong>Reserved Balance Locks:</strong> Active orders and pending withdrawals atomically lock reserved balances (<code className="pp-code">wallets.reserved</code>) to mathematically eliminate double-spending risks.</li>
              </ul>
            </>
          ),
        },
        {
          id: "data-encryption",
          title: "3. Infrastructure & Row-Level Security",
          content: (
            <>
              <p>
                Our backend infrastructure leverages enterprise cloud standards to protect your data:
              </p>
              <ul>
                <li><strong>PostgreSQL Row-Level Security (RLS):</strong> Every user record, transaction, wallet, and uploaded verification document is governed by kernel-level RLS policies. Even in the event of an application vulnerability, a tenant cannot read or modify another user&rsquo;s private data.</li>
                <li><strong>End-to-End Encryption:</strong> All incoming and outgoing web traffic is encrypted using Transport Layer Security (TLS 1.3) with HSTS headers. Stored data and verification documents are encrypted at rest using AES-256.</li>
                <li><strong>Private Storage Buckets:</strong> Identification and proof-of-address documents submitted for KYC are stored in non-public, authenticated buckets (<code className="pp-code">private-kyc</code>) accessible only to authorized compliance reviewers.</li>
              </ul>
            </>
          ),
        },
        {
          id: "user-recommendations",
          title: "4. User Security Best Practices",
          content: (
            <>
              <p>
                While we secure platform infrastructure, you are the primary custodian of your account credentials. We recommend observing these core security habits:
              </p>
              <ul>
                <li>Enable Two-Factor Authentication (2FA) immediately upon registering.</li>
                <li>Use a unique, high-entropy password managed by a reputable password manager.</li>
                <li>Verify the browser URL begins with <code className="pp-code">https://cryptoindexasset.com</code> and check the SSL lock icon to avoid phishing imitations.</li>
                <li>Never share one-time authentication codes or passwords. Our team will never ask you for credentials.</li>
              </ul>
            </>
          ),
        },
        {
          id: "disclosure",
          title: "5. Vulnerability Disclosure & Bug Bounty",
          content: (
            <>
              <p>
                We welcome responsible security research. If you believe you have identified a vulnerability in our application, infrastructure, or smart contract integrations:
              </p>
              <ul>
                <li>Email your findings directly to <code className="pp-code">security@cryptoindexasset.com</code> with detailed reproduction steps.</li>
                <li>Do not access, modify, or disclose user data or disrupt live production trading systems during research.</li>
                <li>We commit to acknowledging reports within 24 business hours and providing regular remediation status updates. Qualifying reports are eligible for discretionary bounty awards based on CVSS severity.</li>
              </ul>
            </>
          ),
        },
      ]}
    />
  );
}
