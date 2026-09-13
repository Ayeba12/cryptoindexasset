/**
 * Data-source boundary of the customer dashboard.
 *
 * Screens render the same components in live and preview mode; only the
 * implementation of {@link DashboardData} (reads) and {@link DashboardActions}
 * (writes) differs. The live implementation lives in
 * `queries.server.ts` / `mutations.server.ts` (server-only, scoped to the
 * internal `User.id`); the preview implementation is the in-memory fixture
 * store from `lib/dashboard/fixtures`. The selection happens at the server
 * boundary: no query parameter or storage key can select fixtures on a
 * production account route.
 *
 * This module is client-safe (types plus pure constructors) and is frozen
 * after Stage A.
 */

import {
  CAPABILITY_KEYS,
  type ActionErrorCode,
  type ActionResult,
  type AllocationDetail,
  type AllocationView,
  type AssetBalance,
  type AttentionItem,
  type Capabilities,
  type CopyRequestInput,
  type CopyRequestReceipt,
  type DepositInstruction,
  type DepositOption,
  type DepositProofInput,
  type DepositProofReceipt,
  type MfaEnrollment,
  type MfaStatus,
  type NotificationFilter,
  type NotificationReadResult,
  type NotificationView,
  type NotificationsReadAllResult,
  type Page,
  type PasswordChangeInput,
  type PasswordChangeResult,
  type ProfileInput,
  type ProfileView,
  type RegionResult,
  type SecurityView,
  type SessionAccount,
  type SettlementLedger,
  type SignalsFeed,
  type SupportedCrypto,
  type TraderProfile,
  type TraderQuery,
  type TraderView,
  type TransactionDetail,
  type TransactionQuery,
  type TransactionView,
  type UploadRules,
  type Valuation,
  type ValuationHistory,
  type ValuationPeriod,
  type VerificationInput,
  type VerificationView,
  type WithdrawalOptions,
  type WithdrawalQuote,
  type WithdrawalReceipt,
  type WithdrawalRequestInput,
} from "./contracts";

/** Which implementation is behind the screens. */
export type DashboardMode = "live" | "preview";

/**
 * Every read the dashboard performs, one per data region. All region reads
 * return a {@link RegionResult}; the three identity/meta reads return plain
 * values. Implementations scope every read to the owning `User.id`.
 */
export interface DashboardData {
  /** Current identity; the layout redirects or renders an access state from this. */
  getSession(): Promise<SessionAccount>;
  /** UX hints for supported workflows; never authorisation. */
  getCapabilities(): Promise<Capabilities>;
  /** Estimated account value from timestamped quotes. `unavailable` when no quote source exists. */
  getValuation(): Promise<RegionResult<Valuation>>;
  /** Account-value history for a period; `empty` for insufficient points. */
  getValuationHistory(period: ValuationPeriod): Promise<RegionResult<ValuationHistory>>;
  /** All six asset rows (disabled wallets included with a reason). */
  getAssets(): Promise<RegionResult<AssetBalance[]>>;
  /** USD settlement ledger row; `empty` when the account has none. */
  getSettlementLedger(): Promise<RegionResult<SettlementLedger>>;
  /** One asset row; `not-found` for an unsupported currency. */
  getAsset(currency: SupportedCrypto): Promise<RegionResult<AssetBalance>>;
  /** Activity filtered to one asset, newest first. */
  getAssetActivity(currency: SupportedCrypto): Promise<RegionResult<TransactionView[]>>;
  /**
   * Ledger page for the filters. A filter that matches nothing returns
   * `ready` with an empty page (the account still has activity); `empty` is
   * reserved for an account with no activity at all.
   */
  listTransactions(query: TransactionQuery): Promise<RegionResult<Page<TransactionView>>>;
  /** Owner-scoped detail; `not-found` for an unknown or foreign id. */
  getTransaction(id: string): Promise<RegionResult<TransactionDetail>>;
  /** Assets and networks that accept deposits. */
  getDepositOptions(): Promise<RegionResult<DepositOption[]>>;
  /** Deposit details for one selection; `unavailable` when nothing is configured for it. */
  getDepositInstruction(currency: SupportedCrypto, networkId: string): Promise<RegionResult<DepositInstruction>>;
  /** Proof upload rules; `unavailable` when proof submission is not supported. */
  getDepositProofRules(): Promise<RegionResult<UploadRules>>;
  /** Recent deposits with their statuses. */
  listRecentDeposits(): Promise<RegionResult<TransactionView[]>>;
  /** Methods, assets and bank scheme for the withdrawal form. */
  getWithdrawalOptions(): Promise<RegionResult<WithdrawalOptions>>;
  /** Trader discovery with search and a defined sort. */
  listTraders(query: TraderQuery): Promise<RegionResult<TraderView[]>>;
  /** Trader profile; `not-found` for an unknown id. */
  getTrader(id: string): Promise<RegionResult<TraderProfile>>;
  /** The customer's allocations. */
  listAllocations(): Promise<RegionResult<AllocationView[]>>;
  /** Owner-scoped allocation detail; `not-found` for an unknown or foreign id. */
  getAllocation(id: string): Promise<RegionResult<AllocationDetail>>;
  /** Signal entitlement and feed; `unavailable` when no feed is connected. */
  getSignals(): Promise<RegionResult<SignalsFeed>>;
  /** Inbox page for the filter (1-based page). */
  listNotifications(filter: NotificationFilter, page: number): Promise<RegionResult<Page<NotificationView>>>;
  /** Count of unread owned notifications; 0 when unknown. */
  getUnreadCount(): Promise<number>;
  /** Personal details. */
  getProfile(): Promise<RegionResult<ProfileView>>;
  /** Confirmed MFA state, password change availability and sessions. */
  getSecurity(): Promise<RegionResult<SecurityView>>;
  /** Identity verification status. */
  getVerification(): Promise<RegionResult<VerificationView>>;
  /** Real pending items; `empty` when nothing needs attention. */
  getNeedsAttention(): Promise<RegionResult<AttentionItem[]>>;
  /** Newest activity rows for the overview. */
  listRecentActivity(limit: number): Promise<RegionResult<TransactionView[]>>;
}

/**
 * Every write the dashboard performs. Each returns an {@link ActionResult}.
 * Live implementations re-validate the session and ownership on every call;
 * preview implementations mutate only in-memory fixture state.
 */
export interface DashboardActions {
  /** Submit a deposit proof for review. Never credits a balance. */
  submitDepositProof(input: DepositProofInput): Promise<ActionResult<DepositProofReceipt>>;
  /** Validate a request and quote its fee; the quote expires and is invalidated by any edit. */
  quoteWithdrawal(input: WithdrawalRequestInput): Promise<ActionResult<WithdrawalQuote>>;
  /**
   * Submit a quoted withdrawal. The same `idempotencyKey` must never create a
   * second request; a timeout returns `unknown-outcome` and the caller
   * reconciles before offering resubmission.
   */
  submitWithdrawal(
    input: WithdrawalRequestInput,
    quoteId: string,
    idempotencyKey: string,
  ): Promise<ActionResult<WithdrawalReceipt>>;
  /** Look up the outcome of a submission by its idempotency key; `not-found` when nothing was recorded. */
  reconcileWithdrawal(idempotencyKey: string): Promise<ActionResult<WithdrawalReceipt>>;
  /** Cancel a pending owned request when `permittedActions` allows it. */
  cancelTransaction(id: string): Promise<ActionResult<TransactionView>>;
  /** Request to copy a trader. In preview this is "Simulate copy request". */
  requestCopy(traderId: string, input: CopyRequestInput): Promise<ActionResult<CopyRequestReceipt>>;
  /** Pause an active allocation. */
  pauseAllocation(id: string): Promise<ActionResult<AllocationView>>;
  /** Resume a paused allocation. */
  resumeAllocation(id: string): Promise<ActionResult<AllocationView>>;
  /** Stop an allocation; the returned view may carry a pending operation until confirmed. */
  stopAllocation(id: string): Promise<ActionResult<AllocationView>>;
  /** Mark one owned notification read. */
  markNotificationRead(id: string): Promise<ActionResult<NotificationReadResult>>;
  /** Mark every owned notification read. */
  markAllNotificationsRead(): Promise<ActionResult<NotificationsReadAllResult>>;
  /** Save editable profile fields; never the email. */
  saveProfile(input: ProfileInput): Promise<ActionResult<ProfileView>>;
  /** Change the password after provider reauthentication. */
  changePassword(input: PasswordChangeInput): Promise<ActionResult<PasswordChangeResult>>;
  /** Begin MFA enrollment and return provider-issued data. */
  startMfaEnrollment(): Promise<ActionResult<MfaEnrollment>>;
  /** Verify a pending factor with a code. */
  verifyMfaEnrollment(factorId: string, code: string): Promise<ActionResult<MfaStatus>>;
  /** Disable a verified factor with a code. */
  disableMfa(factorId: string, code: string): Promise<ActionResult<MfaStatus>>;
  /** Submit identity documents for review. Never infers Verified from a successful upload. */
  submitVerification(input: VerificationInput): Promise<ActionResult<VerificationView>>;
  /** Remove a submitted document when the provider supports it. */
  removeVerificationDocument(id: string): Promise<ActionResult<VerificationView>>;
}

/** Names of every action. */
export type DashboardActionName = keyof DashboardActions;

/** Every action name, for building complete implementations. */
export const DASHBOARD_ACTION_NAMES: readonly DashboardActionName[] = [
  "submitDepositProof",
  "quoteWithdrawal",
  "submitWithdrawal",
  "reconcileWithdrawal",
  "cancelTransaction",
  "requestCopy",
  "pauseAllocation",
  "resumeAllocation",
  "stopAllocation",
  "markNotificationRead",
  "markAllNotificationsRead",
  "saveProfile",
  "changePassword",
  "startMfaEnrollment",
  "verifyMfaEnrollment",
  "disableMfa",
  "submitVerification",
  "removeVerificationDocument",
];

/* -------------------------------------------------------------------------- */
/* Result constructors                                                        */
/* -------------------------------------------------------------------------- */

/** A ready region. */
export function regionReady<T>(data: T, fetchedAt: string): RegionResult<T> {
  return { status: "ready", data, fetchedAt };
}

/** An empty region (the account has no records). */
export function regionEmpty<T>(reason?: string): RegionResult<T> {
  return reason === undefined ? { status: "empty" } : { status: "empty", reason };
}

/** A not-found region (unknown or foreign record; reveals nothing about other accounts). */
export function regionNotFound<T>(): RegionResult<T> {
  return { status: "not-found" };
}

/** A failed read. */
export function regionError<T>(message: string, retryable = true): RegionResult<T> {
  return { status: "error", message, retryable };
}

/** An unavailable region (missing service or entitlement). */
export function regionUnavailable<T>(reason: string, alternative?: { label: string; href: string }): RegionResult<T> {
  return alternative ? { status: "unavailable", reason, alternative } : { status: "unavailable", reason };
}

/** A successful action. */
export function actionOk<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

/** A failed action. */
export function actionError<T>(
  code: ActionErrorCode,
  message: string,
  extra: { fieldErrors?: Record<string, string>; reference?: string } = {},
): ActionResult<T> {
  return { ok: false, code, message, ...extra };
}

/** A complete {@link Capabilities} record with every capability unavailable for one reason. */
export function createUnavailableCapabilities(reason: string): Capabilities {
  const capabilities = {} as Capabilities;
  for (const key of CAPABILITY_KEYS) capabilities[key] = { available: false, reason };
  return capabilities;
}

/**
 * A {@link DashboardData} whose every region is `unavailable` for `reason`,
 * whose session is `session` (default `unauthenticated`), whose capabilities
 * are all unavailable and whose unread count is 0. Used by the Stage A stub
 * and by access states that must render the shell without querying data.
 */
export function createUnavailableDashboardData(
  reason: string,
  session: SessionAccount = { state: "unauthenticated" },
): DashboardData {
  const unavailable = <T>(): Promise<RegionResult<T>> => Promise.resolve(regionUnavailable<T>(reason));
  return {
    getSession: () => Promise.resolve(session),
    getCapabilities: () => Promise.resolve(createUnavailableCapabilities(reason)),
    getValuation: () => unavailable<Valuation>(),
    getValuationHistory: () => unavailable<ValuationHistory>(),
    getAssets: () => unavailable<AssetBalance[]>(),
    getSettlementLedger: () => unavailable<SettlementLedger>(),
    getAsset: () => unavailable<AssetBalance>(),
    getAssetActivity: () => unavailable<TransactionView[]>(),
    listTransactions: () => unavailable<Page<TransactionView>>(),
    getTransaction: () => unavailable<TransactionDetail>(),
    getDepositOptions: () => unavailable<DepositOption[]>(),
    getDepositInstruction: () => unavailable<DepositInstruction>(),
    getDepositProofRules: () => unavailable<UploadRules>(),
    listRecentDeposits: () => unavailable<TransactionView[]>(),
    getWithdrawalOptions: () => unavailable<WithdrawalOptions>(),
    listTraders: () => unavailable<TraderView[]>(),
    getTrader: () => unavailable<TraderProfile>(),
    listAllocations: () => unavailable<AllocationView[]>(),
    getAllocation: () => unavailable<AllocationDetail>(),
    getSignals: () => unavailable<SignalsFeed>(),
    listNotifications: () => unavailable<Page<NotificationView>>(),
    getUnreadCount: () => Promise.resolve(0),
    getProfile: () => unavailable<ProfileView>(),
    getSecurity: () => unavailable<SecurityView>(),
    getVerification: () => unavailable<VerificationView>(),
    getNeedsAttention: () => unavailable<AttentionItem[]>(),
    listRecentActivity: () => unavailable<TransactionView[]>(),
  };
}

/**
 * A {@link DashboardActions} whose every action fails with `unavailable` and
 * `message`. Used by the Stage A stub and by access states.
 */
export function createUnavailableDashboardActions(message: string): DashboardActions {
  const fail = <T>(): Promise<ActionResult<T>> => Promise.resolve(actionError<T>("unavailable", message));
  return {
    submitDepositProof: () => fail<DepositProofReceipt>(),
    quoteWithdrawal: () => fail<WithdrawalQuote>(),
    submitWithdrawal: () => fail<WithdrawalReceipt>(),
    reconcileWithdrawal: () => fail<WithdrawalReceipt>(),
    cancelTransaction: () => fail<TransactionView>(),
    requestCopy: () => fail<CopyRequestReceipt>(),
    pauseAllocation: () => fail<AllocationView>(),
    resumeAllocation: () => fail<AllocationView>(),
    stopAllocation: () => fail<AllocationView>(),
    markNotificationRead: () => fail<NotificationReadResult>(),
    markAllNotificationsRead: () => fail<NotificationsReadAllResult>(),
    saveProfile: () => fail<ProfileView>(),
    changePassword: () => fail<PasswordChangeResult>(),
    startMfaEnrollment: () => fail<MfaEnrollment>(),
    verifyMfaEnrollment: () => fail<MfaStatus>(),
    disableMfa: () => fail<MfaStatus>(),
    submitVerification: () => fail<VerificationView>(),
    removeVerificationDocument: () => fail<VerificationView>(),
  };
}
