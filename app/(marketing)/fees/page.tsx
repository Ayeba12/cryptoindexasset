import type { Metadata } from "next";
import Link from "next/link";
import { DocumentPage } from "@/components/public-site/document-page";

export const metadata: Metadata = {
  title: "Fee Schedule | Crypto Index Asset",
  description: "Transparent fee structure for Crypto Index Asset. Zero account fees, zero deposit fees, clear copy-trading performance fees, and direct network withdrawal costs.",
};

export default function FeesPage() {
  return (
    <DocumentPage
      title="Fee Schedule"
      intro="Crypto Index Asset operates with full fee transparency. We do not charge hidden subscription fees, management overheads, or deposit charges. All costs are disclosed upfront."
      date="Effective 13 September 2026"
      sections={[
        {
          id: "account-fees",
          title: "1. Account & Inactivity Fees",
          content: (
            <>
              <p>
                Maintaining an account on Crypto Index Asset is completely free of charge. We believe traders and investors should never be penalized for holding capital or pausing active copy allocations.
              </p>
              <div style={{ overflowX: "auto", margin: "1rem 0" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                      <th style={{ padding: "0.75rem 0.5rem" }}>Service</th>
                      <th style={{ padding: "0.75rem 0.5rem" }}>Fee</th>
                      <th style={{ padding: "0.75rem 0.5rem" }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "0.75rem 0.5rem" }}>Account Creation</td>
                      <td style={{ padding: "0.75rem 0.5rem", fontWeight: "bold" }}>Free (0.00)</td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>Standard tier access upon email confirmation</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "0.75rem 0.5rem" }}>Monthly Maintenance</td>
                      <td style={{ padding: "0.75rem 0.5rem", fontWeight: "bold" }}>Free (0.00)</td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>No recurring subscription or hosting costs</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "0.75rem 0.5rem" }}>Inactivity Fee</td>
                      <td style={{ padding: "0.75rem 0.5rem", fontWeight: "bold" }}>Free (0.00)</td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>No dormant account deductions or penalties</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "0.75rem 0.5rem" }}>KYC & Identity Verification</td>
                      <td style={{ padding: "0.75rem 0.5rem", fontWeight: "bold" }}>Free (0.00)</td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>Identity verification is fully covered by the platform</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          ),
        },
        {
          id: "deposit-fees",
          title: "2. Deposit Fees",
          content: (
            <>
              <p>
                We do not charge any fee when you deposit cryptocurrency into your Crypto Index Asset account.
              </p>
              <p>
                When you initiate a transfer from your external wallet or exchange, you will pay only the standard blockchain network transaction fee required by the respective network miners or validators.
              </p>
              <ul>
                <li><strong>Bitcoin (BTC):</strong> 0% platform deposit fee</li>
                <li><strong>Ethereum (ETH & ERC-20):</strong> 0% platform deposit fee</li>
                <li><strong>Tether (USDT TRC-20 / ERC-20):</strong> 0% platform deposit fee</li>
                <li><strong>Solana (SOL & SPL):</strong> 0% platform deposit fee</li>
              </ul>
            </>
          ),
        },
        {
          id: "copy-trading-fees",
          title: "3. Copy-Trading Performance Fees & High-Water Mark",
          content: (
            <>
              <p>
                Our copy-trading framework aligns incentives: featured lead traders only earn when their followers generate net positive trading returns.
              </p>
              <p>
                Copy trading does <strong>not</strong> incur fixed management fees or asset-under-management (AUM) charges. Instead, a transparent performance fee (typically <strong>10% to 20%</strong>, published on each trader&rsquo;s profile) applies strictly to net realized profits.
              </p>
              <h4>The High-Water Mark Principle</h4>
              <p>
                To ensure total fairness, performance fees are governed by a strict <strong>High-Water Mark (HWM)</strong>:
              </p>
              <ul>
                <li>Fees are calculated and deducted solely on net gains that exceed your account&rsquo;s previous highest net profit mark for that specific trader allocation.</li>
                <li>If a trader incurs a drawdown or losing trade period, <strong>zero performance fees</strong> are charged until the entire cumulative loss has been recouped and a new portfolio high is achieved.</li>
                <li>Performance fees are split transparently: the lead trader receives their performance share, and the platform retains an infrastructure settlement percentage.</li>
              </ul>
            </>
          ),
        },
        {
          id: "withdrawal-fees",
          title: "4. Withdrawal Fees",
          content: (
            <>
              <p>
                Withdrawal fees are dynamically calculated or set as flat network amounts designed to offset on-chain gas costs incurred when transferring funds from cold/hot storage to your external destination.
              </p>
              <div style={{ overflowX: "auto", margin: "1rem 0" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                      <th style={{ padding: "0.75rem 0.5rem" }}>Asset</th>
                      <th style={{ padding: "0.75rem 0.5rem" }}>Network</th>
                      <th style={{ padding: "0.75rem 0.5rem" }}>Estimated Fee</th>
                      <th style={{ padding: "0.75rem 0.5rem" }}>Min Withdrawal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "0.75rem 0.5rem" }}>USDT</td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>TRON (TRC-20)</td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>1.00 USDT</td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>10.00 USDT</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "0.75rem 0.5rem" }}>USDT</td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>Ethereum (ERC-20)</td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>Dynamic Gas (~3.50 USDT)</td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>25.00 USDT</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "0.75rem 0.5rem" }}>BTC</td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>Bitcoin Native</td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>0.00015 BTC</td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>0.001 BTC</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "0.75rem 0.5rem" }}>ETH</td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>Ethereum Native</td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>0.0015 ETH</td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>0.01 ETH</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="pp-small">
                Network conditions may affect withdrawal fees during peak blockchain congestion. Exact withdrawal amounts and fees are always confirmed with you before transaction submission.
              </p>
            </>
          ),
        },
        {
          id: "spreads",
          title: "5. Execution Spreads and Liquidity Venues",
          content: (
            <>
              <p>
                When copy-trading trades are routed through market venues, trades settle against order book liquidity. Typical market spreads range between <strong>0.05% and 0.15%</strong> depending on the liquidity depth of the asset pair.
              </p>
              <p>
                Crypto Index Asset does not widen market spreads or apply hidden markups to client orders. For further information, review our <Link href="/copy-trading">copy-trading documentation</Link> or consult our <Link href="/terms">Terms and Conditions</Link>.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
