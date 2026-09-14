import { add, subtract, compare, toFixed } from "../dashboard/money";
import type { Signal } from "./signals";

export const ADMIN_SECTIONS = [
  ["", "Overview"],
  ["users", "Users & wallets"],
  ["deposits", "Deposits"],
  ["withdrawals", "Withdrawals"],
  ["traders", "Trader profiles"],
  ["verification", "Verification"],
  ["signals", "Trading signals"],
  ["notifications", "Notifications"],
  ["support", "Support queue"],
  ["settings", "Deposit wallets"],
  ["audit", "Audit history"],
  ["account", "Account settings"],
] as const;
export const CURRENCIES = ["BTC", "ETH", "BCH", "LTC", "XRP", "USDT"] as const;
export type Currency = (typeof CURRENCIES)[number];
export type Trader = {
  id: string;
  name: string;
  avatar: string;
  avatarAlt: string;
  summary: string;
  biography: string;
  strategy: string;
  strategyDetails: string;
  assets: string;
  experience: string;
  holdingPeriod: string;
  accuracy: string;
  period: string;
  sampleSize: string;
  metricSource: string;
  updatedAt: string;
  risk: string;
  riskMethod: string;
  returns: string;
  drawdown: string;
  copiers: string;
  rating: string;
  ratingCount: string;
  communitySource: string;
  minimum: string;
  currency: Currency;
  fee: string;
  mode: string;
  eligibility: string;
  status: "Draft" | "Published" | "Archived";
  featured: boolean;
  notes: string;
  version?: number;
};
export type AdminUser = {
  id: string;
  name: string;
  email: string;
  status: "Active" | "Suspended";
  verification: "Pending review" | "Approved" | "Declined";
  joined: string;
};
export type Wallet = {
  id: string;
  userId: string;
  currency: Currency;
  available: string;
  reserved: string;
  profit: string;
  version: number;
};
export type Request = {
  id: string;
  userId: string;
  kind: "Deposit" | "Withdrawal";
  currency: Currency;
  amount: string;
  network: string;
  method: string;
  destination: string;
  status: "Pending review" | "Approved" | "Declined";
  date: string;
  reason: string;
};
export type Audit = {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  reason: string;
  before?: string;
  after?: string;
  currency?: Currency;
};
export type Credit = { id: string; walletId: string; remaining: string };
export type AdminState = {
  account: {
    name: string;
    email: string;
    phone: string;
    jobTitle: string;
    density: "compact" | "comfortable";
    reviewAlerts: boolean;
    twoFactorDemo: boolean;
  };
  users: AdminUser[];
  wallets: Wallet[];
  traders: Trader[];
  requests: Request[];
  audit: Audit[];
  credits: Credit[];
  receipts: Record<string, { auditId: string; fingerprint: string }>;
  notifications: {
    id: string;
    userId: string;
    title: string;
    message: string;
  }[];
  signals: Signal[];
  addresses: {
    id: string;
    currency: Currency;
    network: string;
    address: string;
    memo: string;
    enabled: boolean;
  }[];
};
export type Adjustment = {
  key: string;
  walletId: string;
  userId: string;
  version: number;
  direction: "add" | "remove";
  amount: string;
  reason: string;
  creditId: string;
};

export function blankTrader(): Trader {
  return {
    id: "",
    name: "",
    avatar: "",
    avatarAlt: "",
    summary: "",
    biography: "",
    strategy: "Swing trading",
    strategyDetails: "",
    assets: "BTC, ETH",
    experience: "",
    holdingPeriod: "",
    accuracy: "",
    period: "",
    sampleSize: "",
    metricSource: "",
    updatedAt: "",
    risk: "Not assessed",
    riskMethod: "",
    returns: "",
    drawdown: "",
    copiers: "",
    rating: "",
    ratingCount: "",
    communitySource: "",
    minimum: "",
    currency: "USDT",
    fee: "",
    mode: "Manual requests",
    eligibility: "",
    status: "Draft",
    featured: false,
    notes: "",
    version: 1,
  };
}
export function positiveAmount(value: string, currency: Currency) {
  const precision = currency === "USDT" || currency === "XRP" ? 6 : 8;
  if (
    !new RegExp(`^(0|[1-9]\\d{0,9})(\\.\\d{1,${precision}})?$`).test(value) ||
    compare(value, "0") <= 0
  )
    throw new Error(
      `Enter a positive ${currency} amount with up to ${precision} decimal places.`,
    );
  return value;
}
export function validateTrader(t: Trader): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!t.name.trim()) errors.name = "Enter the trader's display name.";
  if (t.name.length > 100) errors.name = "Use 100 characters or fewer.";
  for (const k of ["accuracy", "drawdown", "fee"] as const)
    if (t[k] && (!/^\d+(\.\d{1,2})?$/.test(t[k]) || compare(t[k], "100") > 0))
      errors[k] =
        "Enter a percentage from 0 to 100, with up to 2 decimal places.";
  if (t.returns && !/^-?\d{1,6}(\.\d{1,2})?$/.test(t.returns))
    errors.returns = "Enter a signed percentage with up to 2 decimal places.";
  for (const k of ["copiers", "ratingCount"] as const)
    if (t[k] && !/^\d{1,9}$/.test(t[k].trim()))
      errors[k] = "Enter a whole number, zero or greater.";
  if (t.sampleSize && (!/\d+/.test(t.sampleSize) || parseInt(t.sampleSize.match(/\d+/)?.[0] ?? "0", 10) === 0))
    errors.sampleSize = "Enter a whole number, zero or greater.";
  if (t.experience && t.experience.length > 100)
    errors.experience = "Use 100 characters or fewer.";
  if (
    t.rating &&
    (!/^\d(\.\d{1,2})?$/.test(t.rating) || compare(t.rating, "5") > 0)
  )
    errors.rating = "Enter a rating from 0 to 5.";
  if (t.minimum) {
    try {
      positiveAmount(t.minimum, t.currency);
    } catch {
      errors.minimum = "Enter a valid positive minimum allocation.";
    }
  }
  if (
    (t.accuracy || t.returns || t.drawdown) &&
    (!t.period.trim() || !t.metricSource.trim() || !t.updatedAt)
  )
    errors.metricSource =
      "Provide the period, source and measurement date for these metrics.";
  if (t.accuracy && (!t.sampleSize || t.sampleSize.trim() === "0" || !/\d+/.test(t.sampleSize)))
    errors.sampleSize =
      "Provide the number of completed trades used for accuracy.";
  if ((t.copiers || t.rating) && !t.communitySource.trim())
    errors.communitySource =
      "Identify the source of manually entered counts or ratings.";
  if (t.rating && (!t.ratingCount || t.ratingCount === "0"))
    errors.ratingCount = "Provide the number of ratings.";
  if (t.risk !== "Not assessed" && !t.riskMethod.trim())
    errors.riskMethod = "Describe how risk was assessed.";
  if (t.avatar && !t.avatarAlt.trim())
    errors.avatarAlt = "Describe the profile picture.";
  if (t.status === "Published")
    for (const k of [
      "summary",
      "biography",
      "strategy",
      "strategyDetails",
      "assets",
      "eligibility",
    ] as const)
      if (!t[k].trim()) errors[k] = "Complete this field before publishing.";
  return errors;
}
/** Explicit public projection: internal notes and evidence never leave this boundary. */
export function publicTrader(t: Trader) {
  return {
    id: t.id,
    name: t.name,
    avatar: t.avatar,
    avatarAlt: t.avatarAlt,
    summary: t.summary,
    strategy: t.strategy,
    assets: t.assets,
    accuracy: t.accuracy,
    period: t.period,
    metricSource: t.metricSource,
    copiers: t.copiers,
    rating: t.rating,
    ratingCount: t.ratingCount,
    communitySource: t.communitySource,
    featured: t.featured,
  };
}
export function publishedTraders(state: AdminState) {
  return state.traders
    .filter((t) => t.status === "Published")
    .map(publicTrader);
}
export function record(
  state: AdminState,
  action: string,
  target: string,
  reason: string,
  at: string,
  extra: Partial<Audit> = {},
) {
  state.audit.unshift({
    id: `audit-${state.audit.length + 1}`,
    at,
    actor: "Preview administrator",
    action,
    target,
    reason,
    ...extra,
  });
}
/** Pure preview transaction. Production must enforce these rules inside a DB transaction. */
export function adjustWallet(
  original: AdminState,
  input: Adjustment,
  at: string,
): AdminState {
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(input.key))
    throw new Error("A valid request key is required.");
  const fingerprint = JSON.stringify([
    input.walletId,
    input.userId,
    input.version,
    input.direction,
    input.amount,
    input.reason,
    input.creditId,
  ]);
  if (Object.prototype.hasOwnProperty.call(original.receipts, input.key)) {
    if (original.receipts[input.key].fingerprint !== fingerprint)
      throw new Error("This request key belongs to a different adjustment.");
    return original;
  }
  const state = structuredClone(original);
  const wallet = state.wallets.find(
    (w) => w.id === input.walletId && w.userId === input.userId,
  );
  if (!wallet)
    throw new Error("The selected user's wallet could not be found.");
  if (wallet.version !== input.version)
    throw new Error(
      "This wallet changed. Close the review and check the latest balance.",
    );
  if (state.users.find((u) => u.id === input.userId)?.status !== "Active")
    throw new Error("Adjustments are disabled for suspended accounts.");
  positiveAmount(input.amount, wallet.currency);
  if (input.reason.trim().length < 8)
    throw new Error("Explain this adjustment in at least 8 characters.");
  const before = wallet.available;
  if (input.direction === "remove") {
    const credit = state.credits.find(
      (c) => c.id === input.creditId && c.walletId === wallet.id,
    );
    if (!credit || compare(credit.remaining, input.amount) < 0)
      throw new Error("Choose a credit with enough unreversed profit.");
    if (
      compare(wallet.available, input.amount) < 0 ||
      compare(wallet.profit, input.amount) < 0
    )
      throw new Error(
        "Insufficient available profit. Reserved funds cannot be removed.",
      );
    credit.remaining = subtract(credit.remaining, input.amount);
    wallet.available = subtract(wallet.available, input.amount);
    wallet.profit = subtract(wallet.profit, input.amount);
  } else {
    wallet.available = add(wallet.available, input.amount);
    wallet.profit = add(wallet.profit, input.amount);
    state.credits.push({
      id: input.key,
      walletId: wallet.id,
      remaining: input.amount,
    });
  }
  wallet.available = toFixed(wallet.available, 8, "exact");
  wallet.version++;
  record(
    state,
    input.direction === "add" ? "Manual profit credit" : "Profit correction",
    `${input.userId} / ${wallet.currency}`,
    input.reason.trim(),
    at,
    { before, after: wallet.available, currency: wallet.currency },
  );
  state.receipts[input.key] = { auditId: state.audit[0].id, fingerprint };
  return state;
}
