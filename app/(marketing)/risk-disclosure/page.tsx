import type { Metadata } from "next";
import Link from "next/link";
import { DocumentPage } from "@/components/public-site/document-page";

export const metadata: Metadata = {
  title: "Risk Disclosure Notice | Crypto Index Asset",
  description: "Important risk warning regarding cryptocurrency market volatility, copy trading execution latency, drawdown potential, and capital loss.",
};

export default function RiskDisclosurePage() {
  return (
    <DocumentPage
      title="Risk Disclosure Notice"
      intro="Investing in digital assets and utilizing automated copy trading involves substantial financial risk. You should not invest funds that you cannot afford to lose completely. Read this notice thoroughly before using our services."
      date="Effective 13 September 2026"
      sections={[
        {
          id: "general-risk",
          title: "1. Nature of Digital Assets and High Volatility",
          content: (
            <>
              <p>
                Cryptocurrency markets operate 24 hours a day, 7 days a week, and are subject to extreme price volatility. Unlike traditional equities or sovereign bonds, digital assets are influenced by rapid shifts in market sentiment, technological developments, macroeconomic factors, and liquidity imbalances.
              </p>
              <p>
                Price movements can result in substantial portfolio declines over short time horizons. In extreme market events, digital assets can suffer rapid devaluation to zero. You must consider whether trading and investing in cryptocurrencies is appropriate for your financial situation and risk tolerance.
              </p>
            </>
          ),
        },
        {
          id: "copy-trading-risk",
          title: "2. Specific Risks of Copy Trading",
          content: (
            <>
              <p>
                Automated copy trading involves specific operational and execution risks that differentiate it from manual discretionary investing:
              </p>
              <ul>
                <li><strong>Execution Latency and Slippage:</strong> When a lead trader initiates or closes an order, copy-trading algorithms transmit corresponding orders for follower accounts. Network transit times, exchange order queues, and market depth can cause follower orders to fill at prices differing from the lead trader (slippage). During turbulent conditions, this divergence can be significant.</li>
                <li><strong>Strategy Drawdown and Loss Clusters:</strong> Lead traders may experience prolonged drawdown periods, consecutive losing trades, or sudden strategy degradation. High historical win rates do not preclude severe future drawdowns.</li>
                <li><strong>Leverage and Liquidation Exposure:</strong> Some copied strategies employ leverage on derivatives venues. Leveraged trading magnifies both potential gains and losses. If market prices move adversely against a leveraged position, the entire allocated balance for that strategy may be liquidated.</li>
                <li><strong>Allocation Sizing and Portfolio Drift:</strong> If you allocate a disproportionate fraction of your balance to a single trader or high-volatility token, your portfolio will experience amplified risk concentration.</li>
              </ul>
            </>
          ),
        },
        {
          id: "past-performance",
          title: "3. Past Performance Disclaimer",
          content: (
            <>
              <p>
                Any metrics presented on this platform—including historical profit and loss (PnL), win rates, Sharpe ratios, total followers, and accuracy percentages—represent past performance under specific historical market conditions.
              </p>
              <p>
                <strong>Past performance is neither a promise nor a reliable indicator of future results.</strong> No representation is made that any copy-trading strategy will achieve profits or results similar to those achieved in the past.
              </p>
            </>
          ),
        },
        {
          id: "regulatory-status",
          title: "4. Regulatory Framework and Absence of Compensation Schemes",
          content: (
            <>
              <p>
                Digital asset services may not be regulated by financial conduct authorities in certain jurisdictions. Consequently, account balances and investments are generally:
              </p>
              <ul>
                <li><strong>Not protected</strong> by government statutory compensation schemes, such as the UK Financial Services Compensation Scheme (FSCS), the US Federal Deposit Insurance Corporation (FDIC), or EU Deposit Guarantee Schemes.</li>
                <li><strong>Not subject</strong> to financial ombudsman dispute resolution services applicable to traditional banking deposits, unless explicitly mandated by statutory decree in your home jurisdiction.</li>
              </ul>
            </>
          ),
        },
        {
          id: "technical-risks",
          title: "5. Technical, Blockchain, and Custodial Risks",
          content: (
            <>
              <p>
                Interacting with blockchain protocols entails technology risks:
              </p>
              <ul>
                <li><strong>Protocol Forks and Network Congestion:</strong> Underlying blockchain networks may experience hard forks, chain reorganizations, or severe network congestion that delays transaction confirmations and elevates miner fees.</li>
                <li><strong>Irreversibility of Blockchain Transactions:</strong> Transfers sent to incorrect addresses or using mismatched network parameters cannot be reversed or recovered by the platform.</li>
                <li><strong>Cybersecurity Threats:</strong> While Crypto Index Asset deploys institutional encryption, cold storage segregation, and continuous penetration audits, no electronic system is immune to zero-day vulnerabilities or targeted cyber attacks.</li>
              </ul>
            </>
          ),
        },
        {
          id: "self-assessment",
          title: "6. Investor Responsibility and Professional Advice",
          content: (
            <>
              <p>
                Crypto Index Asset does not provide individualized investment, financial, legal, or tax advice. All copy-trading allocations and fund transfers are executed at your sole discretion and risk.
              </p>
              <p>
                If you are uncertain about the risks involved in digital asset investing, you should seek independent advice from a certified, licensed financial or tax advisor. For questions regarding our service conditions, review our <Link href="/terms">Terms and Conditions</Link> or consult our <Link href="/fees">Fee Schedule</Link>.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
