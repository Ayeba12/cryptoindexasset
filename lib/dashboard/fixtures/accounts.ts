/**
 * Per-scenario account identity, holdings and network catalogue.
 *
 * The funded accounting (BTC 0.10000000 = 0.08000000 + 0.02000000, ETH
 * 2.00000000 = 1.50000000 + 0.50000000, USDT 1250.000000 = 1000.000000 +
 * 250.000000, zero enabled BCH/LTC/XRP wallets) is the reference layout
 * fixture from the specification. Every other scenario derives from it.
 */

import {
  CURRENCY_META,
  SUPPORTED_CRYPTO,
  type AuthenticatedAccount,
  type DecimalString,
  type NetworkRef,
  type ProfileView,
  type SupportedCrypto,
} from "../contracts";
import { initialsFor } from "../format";
import { add, toFixed } from "../money";
import { atDay } from "./clock";
import type { ScenarioId } from "./scenarios";

/** Networks configured per asset in the preview. Network is a separate field from currency. */
export const FIXTURE_NETWORKS: Record<SupportedCrypto, NetworkRef[]> = {
  BTC: [{ id: "bitcoin", name: "Bitcoin", requiresTag: false }],
  ETH: [{ id: "ethereum", name: "Ethereum (ERC20)", requiresTag: false }],
  BCH: [{ id: "bitcoin-cash", name: "Bitcoin Cash", requiresTag: false }],
  LTC: [{ id: "litecoin", name: "Litecoin", requiresTag: false }],
  XRP: [{ id: "xrp-ledger", name: "XRP Ledger", requiresTag: true }],
  USDT: [
    { id: "ethereum", name: "Ethereum (ERC20)", requiresTag: false },
    { id: "tron", name: "Tron (TRC20)", requiresTag: false },
  ],
};

/** A wallet that exists for the account: available + reserved = total, disjoint buckets. */
export interface HoldingFixture {
  enabled: true;
  available: DecimalString;
  reserved: DecimalString;
  /** Why units are reserved; shown as help text next to the reserved bucket. */
  reservedReason: string;
}

/** A wallet that does not exist or is unsupported for the account. */
export interface DisabledHoldingFixture {
  enabled: false;
  reason: string;
}

export type HoldingEntry = HoldingFixture | DisabledHoldingFixture;

/** Identity and holdings for one scenario. */
export interface AccountFixture {
  session: AuthenticatedAccount;
  profile: ProfileView;
  holdings: Record<SupportedCrypto, HoldingEntry>;
  /** Networks per asset for this scenario (partial-support removes some). */
  networks: Record<SupportedCrypto, NetworkRef[]>;
  /** Assets whose networks are not configured in this scenario. */
  unsupported: SupportedCrypto[];
}

/** Reason attached to reserved buckets in the funded scenario. */
export const RESERVED_REASON = "Copy-trade allocations; pending withdrawal requests are deducted on approval";

const ZERO_RESERVED = "Nothing is reserved for this asset";

function zero(currency: SupportedCrypto): DecimalString {
  return toFixed("0", CURRENCY_META[currency].precision);
}

function holding(currency: SupportedCrypto, available: DecimalString, reserved: DecimalString, reason?: string): HoldingFixture {
  const precision = CURRENCY_META[currency].precision;
  return {
    enabled: true,
    available: toFixed(available, precision, "exact"),
    reserved: toFixed(reserved, precision, "exact"),
    reservedReason: reason ?? RESERVED_REASON,
  };
}

function zeroHolding(currency: SupportedCrypto): HoldingFixture {
  return holding(currency, zero(currency), zero(currency), ZERO_RESERVED);
}

/** Total holdings of an enabled wallet (available + reserved), at ledger precision. */
export function holdingTotal(entry: HoldingFixture): DecimalString {
  return add(entry.available, entry.reserved);
}

/** 42-character display name for the long-values scenario. */
export const LONG_DISPLAY_NAME = "Alexandria Catherine Montgomery-Whitfields";

/** 88-character destination address for the long-values scenario (fixture, not a real address). */
export const LONG_ADDRESS =
  "bc1pfixture0longvalue0destination0address0for0layout0review0only0not0a0real0address0zz99";

const FUNDED_EMAIL = "jordan.avery@example.com";

function session(displayName: string, email: string, accountStatus: AuthenticatedAccount["accountStatus"] = "ACTIVE"): AuthenticatedAccount {
  return {
    state: "authenticated",
    userId: "user-fixture-0001",
    supabaseUid: "00000000-0000-4000-8000-000000000001",
    email,
    displayName,
    initials: initialsFor(displayName),
    accountStatus,
    restrictions: [],
  };
}

function profile(fullName: string, email: string, memberSinceDays: number): ProfileView {
  return {
    email,
    fullName,
    phone: "+44 20 7946 0000",
    country: "United Kingdom",
    memberSince: atDay(memberSinceDays, 9, 30),
    editable: ["fullName", "phone", "country"],
  };
}

function fundedHoldings(): Record<SupportedCrypto, HoldingEntry> {
  return {
    BTC: holding("BTC", "0.08000000", "0.02000000"),
    ETH: holding("ETH", "1.50000000", "0.50000000"),
    BCH: zeroHolding("BCH"),
    LTC: zeroHolding("LTC"),
    XRP: zeroHolding("XRP"),
    USDT: holding("USDT", "1000.000000", "250.000000"),
  };
}

function emptyHoldings(): Record<SupportedCrypto, HoldingEntry> {
  const entries = {} as Record<SupportedCrypto, HoldingEntry>;
  for (const currency of SUPPORTED_CRYPTO) entries[currency] = zeroHolding(currency);
  return entries;
}

/** Account identity, holdings and networks for a scenario. */
export function accountFor(scenarioId: ScenarioId): AccountFixture {
  const base: AccountFixture = {
    session: session("Jordan Avery", FUNDED_EMAIL),
    profile: profile("Jordan Avery", FUNDED_EMAIL, -140),
    holdings: fundedHoldings(),
    networks: { ...FIXTURE_NETWORKS },
    unsupported: [],
  };

  switch (scenarioId) {
    case "empty": {
      const email = "new.customer@example.com";
      return {
        ...base,
        session: session("New Customer", email, "PENDING_KYC"),
        profile: { ...profile("New Customer", email, -3), phone: null, country: null },
        holdings: emptyHoldings(),
      };
    }
    case "partial-support": {
      const holdings = fundedHoldings();
      const reason = "Not supported in this environment: no network is configured";
      holdings.LTC = { enabled: false, reason };
      holdings.XRP = { enabled: false, reason };
      return {
        ...base,
        holdings,
        networks: { ...FIXTURE_NETWORKS, LTC: [], XRP: [] },
        unsupported: ["LTC", "XRP"],
      };
    }
    case "long-values": {
      const holdings = fundedHoldings();
      holdings.BTC = holding("BTC", "123456789.10345678", "0.02000000");
      return {
        ...base,
        session: session(LONG_DISPLAY_NAME, "alexandria.montgomery-whitfields@example-mail-provider.example"),
        profile: profile(LONG_DISPLAY_NAME, "alexandria.montgomery-whitfields@example-mail-provider.example", -140),
        holdings,
      };
    }
    case "large-amounts": {
      const holdings = fundedHoldings();
      holdings.USDT = holding("USDT", "98765432101.123456", "1234567890.000000");
      holdings.BTC = holding("BTC", "2100.00000000", "150.00000000");
      return { ...base, holdings };
    }
    default:
      return base;
  }
}
