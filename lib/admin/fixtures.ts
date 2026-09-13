import { blankTrader, CURRENCIES, type AdminState } from "./model";
import {
  APPROVED_CONTENT_DATE,
  APPROVED_TRADERS,
} from "@/lib/content/approved-people";

/** Preview state. User and financial records are fictional; trader profiles use operator-approved content. */
export function createAdminFixture(): AdminState {
  const names = [
    "Alex Morgan",
    "Maya Chen",
    "Daniel Okafor",
    "Sofia Rossi",
    "James Carter",
    "Amara Lewis",
  ];
  return {
    account: {
      name: "Preview administrator",
      email: "admin@example.test",
      phone: "",
      jobTitle: "Operations administrator",
      density: "compact",
      reviewAlerts: true,
      twoFactorDemo: false,
    },
    users: names.map((name, i) => ({
      id: `demo-user-${i + 1}`,
      name,
      email: `client${i + 1}@example.test`,
      status: i === 5 ? "Suspended" : "Active",
      verification: i < 2 ? "Pending review" : "Approved",
      joined: `2026-09-0${i + 1}`,
    })),
    wallets: names.flatMap((_, i) =>
      CURRENCIES.map((currency, n) => ({
        id: `wallet-${i + 1}-${currency}`,
        userId: `demo-user-${i + 1}`,
        currency,
        available:
          n === 5 ? "2400.00000000" : n === 0 ? "0.12000000" : "0.00000000",
        reserved: n === 5 ? "250.00000000" : "0.00000000",
        profit: n === 5 ? "120.00000000" : "0.00000000",
        version: 1,
      })),
    ),
    credits: names.map((_, i) => ({
      id: `credit-${i + 1}`,
      walletId: `wallet-${i + 1}-USDT`,
      remaining: "120.00000000",
    })),
    traders: APPROVED_TRADERS.map((trader) => ({
      ...blankTrader(),
      id: `approved-${trader.slug}`,
      name: trader.name,
      avatar: trader.avatar,
      avatarAlt: trader.avatarAlt,
      summary: `${trader.strategy} across ${trader.assets}.`,
      biography: "Biography not supplied with the approved profile.",
      strategy: trader.strategy,
      strategyDetails: `The approved profile identifies ${trader.strategy.toLowerCase()} as the strategy for ${trader.assets}.`,
      assets: trader.assets,
      accuracy: trader.accuracy.toFixed(1),
      period: "Reporting period not supplied",
      metricSource: `Approved operator submission · ${APPROVED_CONTENT_DATE}`,
      updatedAt: APPROVED_CONTENT_DATE,
      copiers: String(trader.copiers),
      rating: trader.rating.toFixed(1),
      communitySource: `Approved operator submission · ${APPROVED_CONTENT_DATE}`,
      eligibility: "Availability is subject to account eligibility and applicable service restrictions.",
      status: "Published",
      featured: true,
      mode: "Unavailable",
      notes: "Approved profile. Measurement period, accuracy sample size, rating count, risk assessment, fees and biography still require supporting records.",
    })),
    requests: names.map((_, i) => ({
      id: `REQ-${String(i + 1).padStart(4, "0")}`,
      userId: `demo-user-${i + 1}`,
      kind: i % 2 ? "Withdrawal" : "Deposit",
      currency: "USDT",
      amount: String((i + 1) * 250) + ".00000000",
      network: "Tron (TRC20)",
      method: "Crypto wallet",
      destination: "Preview address only. Never send funds.",
      status: "Pending review",
      date: "2026-09-08",
      reason: "",
    })),
    audit: [
      {
        id: "audit-1",
        at: "2026-09-08T09:00:00.000Z",
        actor: "Preview administrator",
        action: "Preview opened",
        target: "Isolated workspace",
        reason: "All records are fictional.",
      },
    ],
    receipts: {},
    notifications: [],
    signals: [
      {
        id: "signal-btc",
          title: "BTC market review",
          asset: "BTC",
          direction: "Watch",
          timeframe: "1 day",
          analysis: "Illustrative market review. Wait for confirmation and assess downside risk before making any decision.",
          createdAt: "2026-09-01T09:00:00.000Z",
        enabled: false,
      },
      {
        id: "signal-eth",
          title: "ETH market review",
          asset: "ETH",
          direction: "Watch",
          timeframe: "4 hours",
          analysis: "Illustrative market review. Price volatility can increase losses; this example does not execute a trade.",
          createdAt: "2026-09-01T10:00:00.000Z",
        enabled: true,
      },
    ],
    addresses: CURRENCIES.map((currency) => ({
      id: `address-${currency}`,
      currency,
      network:
        currency === "USDT" ? "Tron (TRC20)" : `${currency} native network`,
      address: "",
      memo: "",
      enabled: false,
    })),
  };
}
