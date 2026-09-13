/**
 * Fixture actions for the design preview.
 *
 * `createFixtureActions(store)` returns a {@link DashboardActions} whose
 * every call waits a short simulated latency (so busy states are visible),
 * validates its input the way the live actions do, then mutates the store's
 * in-memory state and notifies subscribers. Nothing reaches a real account.
 *
 * Scenario behaviour:
 * - `write-failure`: every action fails with code `failed`.
 * - `unknown-outcome`: `submitWithdrawal` records the request but returns
 *   `unknown-outcome`; `reconcileWithdrawal` returns the receipt.
 * - `submitWithdrawal` is idempotent per `idempotencyKey`.
 * - `stopAllocation` sets `STOPPING` with a `pendingOperation` that stays
 *   until {@link settlePendingOperations} (or the confirmation timer) runs.
 */

import {
  CURRENCY_META,
  isLedgerCurrency,
  isSupportedCrypto,
  type ActionResult,
  type AllocationDetail,
  type AllocationView,
  type CopyRequestInput,
  type CopyRequestReceipt,
  type DecimalString,
  type DepositProofInput,
  type DepositProofReceipt,
  type MfaEnrollment,
  type MfaStatus,
  type NotificationReadResult,
  type NotificationView,
  type NotificationsReadAllResult,
  type PasswordChangeInput,
  type PasswordChangeResult,
  type ProfileInput,
  type ProfileView,
  type TransactionView,
  type VerificationInput,
  type VerificationView,
  type WithdrawalQuote,
  type WithdrawalReceipt,
  type WithdrawalRequestInput,
} from "../contracts";
import { actionError, actionOk, type DashboardActions } from "../data-source";
import { initialsFor, maskDestination } from "../format";
import { add, compare, isDecimalString, isNegative, isZero, toFixed } from "../money";
import { permittedActionsFor } from "./allocations";
import { FACTOR_LABEL, FIXTURE_CURRENT_PASSWORD, FIXTURE_MFA_CODE } from "./security";
import {
  BANK_SCHEME,
  BANK_WIRE_FEES,
  FIXTURE_FACTOR_ID,
  WITHDRAWAL_FEES,
  clockPlusMinutes,
  sequence,
  settlementBalance,
  toAllocationView,
  toTransactionView,
  type FixtureState,
  type FixtureStore,
} from "./store";
import type { FixtureTransaction } from "./transactions";
import { DOCUMENT_TYPES } from "./verification";

/** Options for {@link createFixtureActions}. */
export interface FixtureActionOptions {
  /** Simulated latency per action in milliseconds (0–400; default 250). */
  latencyMs?: number;
  /**
   * Delay before a pending stop is confirmed automatically, in milliseconds.
   * `null` disables the timer; {@link settlePendingOperations} still works.
   * Default 6000.
   */
  confirmationDelayMs?: number | null;
}

/** Message of every failure in the `write-failure` scenario. */
export const WRITE_FAILURE_MESSAGE = "The fixture service reported a failure (simulated). Nothing was changed.";

/** Message of the simulated timeout in the `unknown-outcome` scenario. */
export const UNKNOWN_OUTCOME_MESSAGE =
  "The request timed out before a response was received. Check its outcome by reference before submitting again.";

/** Issuer shown with the fixture MFA secret. */
export const FIXTURE_MFA_ISSUER = "Crypto Index Asset (fixture)";

/** Fixture TOTP secret; labelled as a fixture and never usable with a real authenticator. */
export const FIXTURE_MFA_SECRET = "FIXTURE SECRET NOT REAL 2345";

/** Quote validity in the preview, in minutes. */
export const QUOTE_VALIDITY_MINUTES = 10;

const MAX_LATENCY_MS = 400;

function wait(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function invalid<T>(message: string, fieldErrors: Record<string, string>): ActionResult<T> {
  return actionError<T>("invalid", message, { fieldErrors });
}

function unavailable<T>(reason: string | undefined, fallback: string): ActionResult<T> {
  return actionError<T>("unavailable", reason ?? fallback);
}

function fingerprintOf(input: WithdrawalRequestInput): string {
  if (input.method === "crypto") {
    return JSON.stringify(["crypto", input.currency, input.networkId, input.address.trim(), input.tag?.trim() ?? "", input.amount]);
  }
  const fields = Object.keys(input.fields)
    .sort()
    .map((key) => [key, input.fields[key].trim()]);
  return JSON.stringify(["bank", input.currency, input.denomination, input.amount, fields]);
}

function availableFor(state: FixtureState, currency: string): DecimalString | null {
  if (isSupportedCrypto(currency)) {
    const entry = state.account.holdings[currency];
    return entry.enabled ? entry.available : null;
  }
  if (currency === "USD") return settlementBalance(state);
  return null;
}

function precisionFor(currency: string): number {
  return isLedgerCurrency(currency) ? CURRENCY_META[currency].precision : 8;
}

function pushNotification(state: FixtureState, notification: Omit<NotificationView, "id" | "createdAt" | "read">): NotificationView {
  state.counters.notification += 1;
  const created: NotificationView = {
    id: `ntf-${sequence(state.counters.notification)}`,
    createdAt: state.clock,
    read: false,
    ...notification,
  };
  state.notifications = [created, ...state.notifications];
  return created;
}

function validateAmount(amount: unknown, currency: string, available: DecimalString | null): { amount: DecimalString } | { error: string } {
  if (!isDecimalString(amount)) return { error: "Enter an amount using digits and a decimal point" };
  if (isNegative(amount) || isZero(amount)) return { error: "Enter an amount above zero" };
  const precision = precisionFor(currency);
  let fixed: DecimalString;
  try {
    fixed = toFixed(amount, precision, "exact");
  } catch {
    return { error: `${currency} supports at most ${precision} decimal places` };
  }
  if (available === null) return { error: "The available balance for this currency is unknown" };
  if (compare(fixed, available) > 0) return { error: `Exceeds the available balance of ${available} ${currency}` };
  return { amount: fixed };
}

/**
 * Confirm every pending operation: `STOPPING` allocations become `STOPPED`
 * and pending copy requests become `ACTIVE`. Exposed for the preview
 * toolbar and tests; the store also schedules it after a stop when a
 * confirmation delay is configured.
 */
export function settlePendingOperations(store: FixtureStore): number {
  let settled = 0;
  store.commit((state) => {
    for (const allocation of state.allocations) {
      if (allocation.status === "STOPPING") {
        allocation.status = "STOPPED";
        allocation.pendingOperation = null;
        allocation.updatedAt = state.clock;
        allocation.permittedActions = permittedActionsFor("STOPPED", allocation.executionMode);
        allocation.timeline.push({ at: state.clock, label: "Stop confirmed; allocated units released" });
        settled += 1;
      } else if (allocation.status === "PENDING") {
        allocation.status = "ACTIVE";
        allocation.pendingOperation = null;
        allocation.updatedAt = state.clock;
        allocation.permittedActions = permittedActionsFor("ACTIVE", allocation.executionMode);
        allocation.timeline.push({ at: state.clock, label: "Allocation activated by operator" });
        settled += 1;
      }
    }
  });
  return settled;
}

/** Build the preview {@link DashboardActions} over a store. */
export function createFixtureActions(store: FixtureStore, options: FixtureActionOptions = {}): DashboardActions {
  const latency = Math.min(MAX_LATENCY_MS, Math.max(0, options.latencyMs ?? 250));
  const confirmationDelay = options.confirmationDelayMs === undefined ? 6000 : options.confirmationDelayMs;

  async function perform<T>(work: (state: FixtureState) => ActionResult<T>): Promise<ActionResult<T>> {
    await wait(latency);
    if (store.scenarioId === "write-failure") return actionError<T>("failed", WRITE_FAILURE_MESSAGE);
    return work(store.state);
  }

  function scheduleConfirmation(): void {
    if (confirmationDelay === null) return;
    const timer = setTimeout(() => {
      settlePendingOperations(store);
    }, confirmationDelay);
    const unref = (timer as { unref?: () => void }).unref;
    if (typeof unref === "function") unref.call(timer);
  }

  function findAllocation(state: FixtureState, id: string): AllocationDetail | undefined {
    return state.allocations.find((allocation) => allocation.id === id);
  }

  function transition(
    id: string,
    action: "pause" | "resume" | "stop",
    capabilityKey: "copyPause" | "copyStart" | "copyStop",
  ): Promise<ActionResult<AllocationView>> {
    return perform((state) => {
      const capability = state.capabilities[capabilityKey];
      if (!capability.available) return unavailable<AllocationView>(capability.reason, "This action is not connected");
      const allocation = findAllocation(state, id);
      if (!allocation) return actionError<AllocationView>("not-found", "This allocation was not found");
      if (!allocation.permittedActions.includes(action)) {
        return actionError<AllocationView>("invalid", `This allocation cannot be ${action === "stop" ? "stopped" : action + "d"} in its current state`);
      }
      return store.commit((current) => {
        if (action === "pause") {
          allocation.status = "PAUSED";
          allocation.timeline.push({ at: current.clock, label: "Paused by you" });
        } else if (action === "resume") {
          allocation.status = "ACTIVE";
          allocation.timeline.push({ at: current.clock, label: "Resumed by you" });
        } else {
          allocation.status = "STOPPING";
          allocation.pendingOperation = { kind: "stop", since: current.clock };
          allocation.timeline.push({ at: current.clock, label: "Stop requested by you; awaiting operator confirmation" });
        }
        allocation.updatedAt = current.clock;
        allocation.permittedActions = permittedActionsFor(allocation.status, allocation.executionMode);
        if (action === "stop") scheduleConfirmation();
        return actionOk(toAllocationView(current, allocation));
      });
    });
  }

  return {
    submitDepositProof: (input: DepositProofInput) =>
      perform((state) => {
        const capability = state.capabilities.depositProof;
        if (!capability.available) return unavailable<DepositProofReceipt>(capability.reason, "Proof submission is not connected");
        const fieldErrors: Record<string, string> = {};
        if (!isSupportedCrypto(input.currency)) fieldErrors.currency = "Choose a supported asset";
        const networks = isSupportedCrypto(input.currency) ? state.account.networks[input.currency] : [];
        if (!networks.some((network) => network.id === input.networkId)) fieldErrors.networkId = "Choose a configured network";
        const txHash = typeof input.txHash === "string" ? input.txHash.trim() : "";
        if (txHash.length < 16) fieldErrors.txHash = "Enter the full transaction hash";
        if (Object.keys(fieldErrors).length > 0) return invalid<DepositProofReceipt>("Check the highlighted fields", fieldErrors);
        return store.commit((current) => {
          current.counters.depositProof += 1;
          const reference = `DEP-REQ-${sequence(current.counters.depositProof)}`;
          current.depositProofs.push({
            reference,
            currency: input.currency,
            networkId: input.networkId,
            txHash,
            note: input.note?.trim() || null,
            fileName: input.fileName?.trim() || null,
            submittedAt: current.clock,
          });
          pushNotification(current, {
            title: "Deposit proof received",
            message: `Proof ${reference} for your ${input.currency} deposit is in review. The balance is credited only after review.`,
            kind: "transaction",
            href: "/dashboard/deposit",
          });
          return actionOk<DepositProofReceipt>({ reference, submittedAt: current.clock, status: "PENDING" });
        });
      }),

    quoteWithdrawal: (input: WithdrawalRequestInput) =>
      perform((state) => {
        const fieldErrors: Record<string, string> = {};
        if (input.method === "crypto") {
          const capability = state.capabilities.withdrawCrypto;
          if (!capability.available) return unavailable<WithdrawalQuote>(capability.reason, "Crypto withdrawals are not connected");
          if (!isSupportedCrypto(input.currency)) fieldErrors.currency = "Choose a supported asset";
          const entry = isSupportedCrypto(input.currency) ? state.account.holdings[input.currency] : undefined;
          if (entry && !entry.enabled) fieldErrors.currency = entry.reason;
          const network = isSupportedCrypto(input.currency)
            ? state.account.networks[input.currency].find((candidate) => candidate.id === input.networkId)
            : undefined;
          if (!network) fieldErrors.networkId = "Choose a configured network";
          const address = typeof input.address === "string" ? input.address.trim() : "";
          if (address.length < 12) fieldErrors.address = "Enter the full destination address";
          if (network?.requiresTag && !(input.tag ?? "").trim()) fieldErrors.tag = `${network.name} transfers need a destination tag`;
          const available = availableFor(state, input.currency);
          const amount = validateAmount(input.amount, input.currency, available);
          if ("error" in amount) fieldErrors.amount = amount.error;
          if (Object.keys(fieldErrors).length > 0 || "error" in amount || !network) {
            return invalid<WithdrawalQuote>("Check the highlighted fields", fieldErrors);
          }
          const fee = WITHDRAWAL_FEES[`${input.currency}:${network.id}`] ?? toFixed("0", precisionFor(input.currency));
          const totalDebit = add(amount.amount, fee);
          if (available === null || compare(totalDebit, available) > 0) {
            return invalid<WithdrawalQuote>("Check the highlighted fields", {
              amount: `Amount plus the ${fee} ${input.currency} fee exceeds the available balance`,
            });
          }
          return store.commit((current) => {
            current.counters.quote += 1;
            const quote: WithdrawalQuote = {
              quoteId: `quote-${sequence(current.counters.quote)}`,
              expiresAt: clockPlusMinutes(QUOTE_VALIDITY_MINUTES),
              fee,
              totalDebit,
              recipientAmount: amount.amount,
              currency: input.currency,
              recipientRef: maskDestination(address) ?? address,
            };
            current.quotes.set(quote.quoteId, { quote, fingerprint: fingerprintOf(input) });
            return actionOk(quote);
          });
        }
        const capability = state.capabilities.withdrawBank;
        if (!capability.available) return unavailable<WithdrawalQuote>(capability.reason, "Bank wires are not connected");
        for (const field of BANK_SCHEME.fields) {
          const value = input.fields?.[field.id]?.trim() ?? "";
          if (field.required && value.length === 0) fieldErrors[`fields.${field.id}`] = `${field.label} is required`;
          if (field.kind === "iban" && value.length > 0 && !/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/i.test(value.replace(/\s+/g, ""))) {
            fieldErrors[`fields.${field.id}`] = "Enter a valid IBAN";
          }
          if (field.kind === "swift" && value.length > 0 && !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/i.test(value)) {
            fieldErrors[`fields.${field.id}`] = "Enter a valid SWIFT / BIC code";
          }
        }
        if (!BANK_SCHEME.denominations.includes(input.denomination)) fieldErrors.denomination = "Choose a payout currency";
        if (!isLedgerCurrency(input.currency)) fieldErrors.currency = "Choose a source ledger";
        const available = availableFor(state, input.currency);
        const amount = validateAmount(input.amount, input.currency, available);
        if ("error" in amount) fieldErrors.amount = amount.error;
        if (Object.keys(fieldErrors).length > 0 || "error" in amount) {
          return invalid<WithdrawalQuote>("Check the highlighted fields", fieldErrors);
        }
        const fee = BANK_WIRE_FEES[input.currency] ?? toFixed("2.50", precisionFor(input.currency));
        const totalDebit = add(amount.amount, fee);
        if (available === null || compare(totalDebit, available) > 0) {
          return invalid<WithdrawalQuote>("Check the highlighted fields", {
            amount: `Amount plus the ${fee} ${input.currency} fee exceeds the available balance`,
          });
        }
        const holder = input.fields.accountHolder.trim();
        const iban = input.fields.iban.replace(/\s+/g, "");
        return store.commit((current) => {
          current.counters.quote += 1;
          const quote: WithdrawalQuote = {
            quoteId: `quote-${sequence(current.counters.quote)}`,
            expiresAt: clockPlusMinutes(QUOTE_VALIDITY_MINUTES),
            fee,
            totalDebit,
            recipientAmount: amount.amount,
            currency: input.currency,
            recipientRef: `${holder}, IBAN ${maskDestination(iban) ?? iban}`,
          };
          current.quotes.set(quote.quoteId, { quote, fingerprint: fingerprintOf(input) });
          return actionOk(quote);
        });
      }),

    submitWithdrawal: (input: WithdrawalRequestInput, quoteId: string, idempotencyKey: string) =>
      perform((state) => {
        const key = typeof idempotencyKey === "string" ? idempotencyKey.trim() : "";
        if (key.length === 0) return invalid<WithdrawalReceipt>("A submission reference is required", { idempotencyKey: "Missing" });
        const existing = state.idempotency.get(key);
        if (existing) return actionOk({ ...existing });
        const record = state.quotes.get(quoteId);
        if (!record) {
          return actionError<WithdrawalReceipt>("invalid", "The quote has expired or was not found. Request a new quote.");
        }
        if (record.fingerprint !== fingerprintOf(input)) {
          return actionError<WithdrawalReceipt>("invalid", "The request changed after it was quoted. Request a new quote.");
        }
        return store.commit((current) => {
          current.counters.withdrawal += 1;
          const seq = current.counters.withdrawal;
          const id = `tx-wdr-req-${sequence(seq)}`;
          const reference = `WDR-2026-${sequence(seq)}`;
          const quote = record.quote;
          const currency = quote.currency;
          const network =
            input.method === "crypto" && isSupportedCrypto(currency)
              ? current.account.networks[currency].find((candidate) => candidate.id === input.networkId) ?? null
              : null;
          const destination = input.method === "crypto" ? input.address.trim() : `${input.fields.accountHolder.trim()}, IBAN ${input.fields.iban.replace(/\s+/g, "")}`;
          const row: FixtureTransaction = {
            id,
            reference,
            type: "WITHDRAWAL",
            sourceLabel: input.method === "crypto" ? "Withdrawal request" : "Bank wire request",
            currency,
            network: network ? { ...network } : null,
            amount: quote.recipientAmount,
            direction: "debit",
            fee: quote.fee,
            status: "PENDING",
            settlement: "not-applicable",
            createdAt: current.clock,
            updatedAt: current.clock,
            destinationMasked: input.method === "crypto" ? maskDestination(destination) : quote.recipientRef,
            txHash: null,
            explorerUrl: null,
            permittedActions: ["cancel"],
            destinationFull: destination,
            tag: input.method === "crypto" ? input.tag?.trim() || null : null,
            notes: null,
            reason: null,
            nextStep: "Awaiting operator review. You can cancel the request while it is pending.",
            timeline: [
              { at: current.clock, label: "Request submitted" },
              { at: current.clock, label: "Pending review" },
            ],
            allocationId: null,
          };
          current.transactions = [row, ...current.transactions];
          current.quotes.delete(quoteId);
          const receipt: WithdrawalReceipt = { requestId: id, reference, status: "PENDING", submittedAt: current.clock };
          current.idempotency.set(key, receipt);
          pushNotification(current, {
            title: "Withdrawal request received",
            message: `Your ${currency} withdrawal request ${reference} is pending review.`,
            kind: "transaction",
            href: `/dashboard/activity/${id}`,
          });
          if (current.scenarioId === "unknown-outcome") {
            return actionError<WithdrawalReceipt>("unknown-outcome", UNKNOWN_OUTCOME_MESSAGE, { reference: key });
          }
          return actionOk({ ...receipt });
        });
      }),

    reconcileWithdrawal: (idempotencyKey: string) =>
      perform((state) => {
        const receipt = state.idempotency.get(typeof idempotencyKey === "string" ? idempotencyKey.trim() : "");
        if (!receipt) return actionError<WithdrawalReceipt>("not-found", "No submission was recorded for this reference");
        return actionOk({ ...receipt });
      }),

    cancelTransaction: (id: string) =>
      perform((state) => {
        const row = state.transactions.find((entry) => entry.id === id);
        if (!row) return actionError<TransactionView>("not-found", "This request was not found");
        if (row.status !== "PENDING" || !row.permittedActions.includes("cancel")) {
          return actionError<TransactionView>("invalid", "This request can no longer be cancelled");
        }
        return store.commit((current) => {
          row.status = "CANCELLED";
          row.updatedAt = current.clock;
          row.permittedActions = [];
          row.nextStep = null;
          row.timeline.push({ at: current.clock, label: "Cancelled by you" });
          pushNotification(current, {
            title: "Withdrawal request cancelled",
            message: `Request ${row.reference} was cancelled. Nothing was debited.`,
            kind: "transaction",
            href: `/dashboard/activity/${row.id}`,
          });
          return actionOk(toTransactionView(row));
        });
      }),

    requestCopy: (traderId: string, input: CopyRequestInput) =>
      perform((state) => {
        const capability = state.capabilities.copyStart;
        if (!capability.available) return unavailable<CopyRequestReceipt>(capability.reason, "Copy requests are not connected");
        const trader = state.traders.find((candidate) => candidate.id === traderId);
        if (!trader) return actionError<CopyRequestReceipt>("not-found", "This trader was not found");
        const fieldErrors: Record<string, string> = {};
        if (input.riskAcknowledged !== true) fieldErrors.riskAcknowledged = "Confirm that you have read the risk statement";
        if (!isLedgerCurrency(input.currency)) fieldErrors.currency = "Choose a source wallet";
        const available = availableFor(state, input.currency);
        const amount = validateAmount(input.amount, input.currency, available);
        if ("error" in amount) fieldErrors.amount = amount.error;
        else if (
          trader.minimumAllocation &&
          trader.minimumAllocation.currency === input.currency &&
          compare(amount.amount, trader.minimumAllocation.amount) < 0
        ) {
          fieldErrors.amount = `The minimum allocation for this trader is ${trader.minimumAllocation.amount} ${trader.minimumAllocation.currency}`;
        }
        if (Object.keys(fieldErrors).length > 0 || "error" in amount) {
          return invalid<CopyRequestReceipt>("Check the highlighted fields", fieldErrors);
        }
        return store.commit((current) => {
          current.counters.allocation += 1;
          current.counters.copyRequest += 1;
          const id = `alloc-${sequence(current.counters.allocation)}`;
          const reference = `COPY-REQ-${sequence(current.counters.copyRequest)}`;
          const mode = trader.executionMode;
          const allocation: AllocationDetail = {
            id,
            traderId: trader.id,
            traderName: trader.name,
            traderPortrait: trader.portrait,
            allocated: { amount: amount.amount, currency: input.currency },
            status: "PENDING",
            executionMode: mode,
            recordedPnl: null,
            createdAt: current.clock,
            updatedAt: current.clock,
            permittedActions: permittedActionsFor("PENDING", mode),
            timeline: [{ at: current.clock, label: "Copy request submitted" }],
            fees: [],
            activity: [],
            stopExplanation: current.allocations[0]?.stopExplanation ?? "Stop ends new copying for this allocation once the operator confirms it.",
            pendingOperation: null,
          };
          current.allocations = [...current.allocations, allocation];
          pushNotification(current, {
            title: "Copy request received",
            message: `Your request to copy ${trader.name} (${reference}) is pending activation.`,
            kind: "allocation",
            href: `/dashboard/copy-trades/${id}`,
          });
          scheduleConfirmation();
          return actionOk<CopyRequestReceipt>({ allocationId: id, reference, status: "PENDING", submittedAt: current.clock });
        });
      }),

    pauseAllocation: (id: string) => transition(id, "pause", "copyPause"),
    resumeAllocation: (id: string) => transition(id, "resume", "copyStart"),
    stopAllocation: (id: string) => transition(id, "stop", "copyStop"),

    markNotificationRead: (id: string) =>
      perform((state) => {
        const capability = state.capabilities.notificationsMarkRead;
        if (!capability.available) return unavailable<NotificationReadResult>(capability.reason, "Notifications cannot be updated");
        const notification = state.notifications.find((entry) => entry.id === id);
        if (!notification) return actionError<NotificationReadResult>("not-found", "This notification was not found");
        return store.commit((current) => {
          notification.read = true;
          return actionOk<NotificationReadResult>({
            notification: { ...notification },
            unreadCount: current.notifications.filter((entry) => !entry.read).length,
          });
        });
      }),

    markAllNotificationsRead: () =>
      perform((state) => {
        const capability = state.capabilities.notificationsMarkRead;
        if (!capability.available) return unavailable<NotificationsReadAllResult>(capability.reason, "Notifications cannot be updated");
        return store.commit((current) => {
          let updated = 0;
          for (const notification of current.notifications) {
            if (!notification.read) {
              notification.read = true;
              updated += 1;
            }
          }
          return actionOk<NotificationsReadAllResult>({ updated, unreadCount: 0 });
        });
      }),

    saveProfile: (input: ProfileInput) =>
      perform((state) => {
        const capability = state.capabilities.profileSave;
        if (!capability.available) return unavailable<ProfileView>(capability.reason, "Profile changes are not connected");
        const fieldErrors: Record<string, string> = {};
        const fullName = input.fullName === undefined ? undefined : input.fullName.trim();
        const phone = input.phone === undefined ? undefined : input.phone.trim();
        const country = input.country === undefined ? undefined : input.country.trim();
        if (fullName !== undefined && (fullName.length < 1 || fullName.length > 80)) fieldErrors.fullName = "Enter a name of 1 to 80 characters";
        if (phone !== undefined && phone.length > 0 && !/^\+?[0-9 ()-]{6,20}$/.test(phone)) fieldErrors.phone = "Enter a phone number with digits, spaces and an optional leading +";
        if (country !== undefined && country.length > 56) fieldErrors.country = "Enter a country name of up to 56 characters";
        if (Object.keys(fieldErrors).length > 0) return invalid<ProfileView>("Check the highlighted fields", fieldErrors);
        return store.commit((current) => {
          const profile = current.account.profile;
          if (fullName !== undefined) {
            profile.fullName = fullName;
            current.account.session.displayName = fullName;
            current.account.session.initials = initialsFor(fullName);
          }
          if (phone !== undefined) profile.phone = phone.length === 0 ? null : phone;
          if (country !== undefined) profile.country = country.length === 0 ? null : country;
          return actionOk<ProfileView>({ ...profile, editable: [...profile.editable] });
        });
      }),

    changePassword: (input: PasswordChangeInput) =>
      perform((state) => {
        const capability = state.capabilities.passwordChange;
        if (!capability.available) return unavailable<PasswordChangeResult>(capability.reason, "Password changes are not connected");
        const fieldErrors: Record<string, string> = {};
        if (input.currentPassword !== FIXTURE_CURRENT_PASSWORD) {
          fieldErrors.currentPassword = `The current password is incorrect (the preview accepts "${FIXTURE_CURRENT_PASSWORD}")`;
        }
        if (typeof input.newPassword !== "string" || input.newPassword.length < 10) {
          fieldErrors.newPassword = "Use at least 10 characters";
        } else if (input.newPassword === input.currentPassword) {
          fieldErrors.newPassword = "Choose a password different from the current one";
        }
        if (Object.keys(fieldErrors).length > 0) return invalid<PasswordChangeResult>("Check the highlighted fields", fieldErrors);
        return store.commit((current) => {
          pushNotification(current, {
            title: "Password changed",
            message: "Your password was changed. If this was not you, contact support.",
            kind: "security",
            href: "/dashboard/settings/security",
          });
          return actionOk<PasswordChangeResult>({ changedAt: current.clock });
        });
      }),

    startMfaEnrollment: () =>
      perform((state) => {
        const capability = state.capabilities.mfaEnrollment;
        if (!capability.available) return unavailable<MfaEnrollment>(capability.reason, "MFA enrollment is not connected");
        if (state.security.mfa.state === "enabled") {
          return actionError<MfaEnrollment>("invalid", "An authenticator app is already enabled. Disable it before enrolling another.");
        }
        return store.commit((current) => {
          current.security.mfa = { state: "enrollment-pending", factorLabel: FACTOR_LABEL };
          current.mfaFactorId = FIXTURE_FACTOR_ID;
          return actionOk<MfaEnrollment>({
            factorId: FIXTURE_FACTOR_ID,
            qrSvg: null,
            secret: FIXTURE_MFA_SECRET,
            issuer: FIXTURE_MFA_ISSUER,
          });
        });
      }),

    verifyMfaEnrollment: (factorId: string, code: string) =>
      perform((state) => {
        if (state.security.mfa.state !== "enrollment-pending" || factorId !== state.mfaFactorId) {
          return actionError<MfaStatus>("invalid", "No enrollment is pending for this factor. Start the enrollment again.");
        }
        if (code.trim() !== FIXTURE_MFA_CODE) {
          return invalid<MfaStatus>("The code was not accepted", { code: `Enter the 6-digit code from your app (the preview accepts ${FIXTURE_MFA_CODE})` });
        }
        return store.commit((current) => {
          current.security.mfa = { state: "enabled", factorLabel: FACTOR_LABEL, verifiedAt: current.clock };
          pushNotification(current, {
            title: "Authenticator app enabled",
            message: "A second factor was verified for sign-in.",
            kind: "security",
            href: "/dashboard/settings/security",
          });
          return actionOk<MfaStatus>({ ...current.security.mfa });
        });
      }),

    disableMfa: (factorId: string, code: string) =>
      perform((state) => {
        if (state.security.mfa.state !== "enabled" || factorId !== state.mfaFactorId) {
          return actionError<MfaStatus>("invalid", "No enabled factor matches this request");
        }
        if (code.trim() !== FIXTURE_MFA_CODE) {
          return invalid<MfaStatus>("The code was not accepted", { code: `Enter the 6-digit code from your app (the preview accepts ${FIXTURE_MFA_CODE})` });
        }
        return store.commit((current) => {
          current.security.mfa = { state: "not-enabled" };
          current.mfaFactorId = null;
          pushNotification(current, {
            title: "Authenticator app disabled",
            message: "Your account no longer has a second factor for sign-in.",
            kind: "security",
            href: "/dashboard/settings/security",
          });
          return actionOk<MfaStatus>({ state: "not-enabled" });
        });
      }),

    submitVerification: (input: VerificationInput) =>
      perform((state) => {
        const capability = state.capabilities.kycUpload;
        if (!capability.available) return unavailable<VerificationView>(capability.reason, "Document upload is not connected");
        if (state.verification.state === "verified") {
          return actionError<VerificationView>("invalid", "Your identity is already verified");
        }
        const rules = state.verification.uploadRules;
        const fieldErrors: Record<string, string> = {};
        if (!DOCUMENT_TYPES.includes(input.documentType)) fieldErrors.documentType = "Choose an accepted document type";
        const files = Array.isArray(input.files) ? input.files : [];
        if (files.length < 1 || files.length > 2) fieldErrors.files = "Upload the front of the document and, when it has one, the back";
        const sides = new Set<string>();
        files.forEach((file, index) => {
          if (sides.has(file.side)) fieldErrors[`files.${index}`] = "Each side can be uploaded once";
          sides.add(file.side);
          if (rules && !rules.acceptedTypes.includes(file.contentType)) {
            fieldErrors[`files.${index}`] = `Accepted types: ${rules.acceptedTypes.join(", ")}`;
          }
          if (rules && file.sizeBytes > rules.maxBytes) {
            fieldErrors[`files.${index}`] = `Files must be ${Math.floor(rules.maxBytes / (1024 * 1024))} MB or smaller`;
          }
        });
        if (files.length > 0 && !sides.has("front")) fieldErrors.files = "The front of the document is required";
        if (Object.keys(fieldErrors).length > 0) return invalid<VerificationView>("Check the highlighted fields", fieldErrors);
        return store.commit((current) => {
          const documents = files.map((file) => {
            current.counters.document += 1;
            return {
              id: `doc-${sequence(current.counters.document)}`,
              type: input.documentType,
              fileName: file.fileName,
              side: file.side,
              uploadedAt: current.clock,
            };
          });
          current.verification = {
            ...current.verification,
            state: "in-review",
            submittedAt: current.clock,
            reviewedAt: null,
            message: null,
            documents,
          };
          pushNotification(current, {
            title: "Identity documents received",
            message: "Your documents are in review. Verification is confirmed only after the review concludes.",
            kind: "verification",
            href: "/dashboard/settings/verification",
          });
          return actionOk<VerificationView>({ ...current.verification, documents: documents.map((document) => ({ ...document })) });
        });
      }),

    removeVerificationDocument: (id: string) =>
      perform((state) => {
        const capability = state.capabilities.kycUpload;
        if (!capability.available) return unavailable<VerificationView>(capability.reason, "Document changes are not connected");
        if (state.verification.state === "verified") {
          return actionError<VerificationView>("invalid", "Verified documents cannot be removed here. Contact support.");
        }
        const document = state.verification.documents.find((candidate) => candidate.id === id);
        if (!document) return actionError<VerificationView>("not-found", "This document was not found");
        return store.commit((current) => {
          const documents = current.verification.documents.filter((candidate) => candidate.id !== id);
          current.verification = {
            ...current.verification,
            documents,
            ...(documents.length === 0 ? { state: "not-submitted" as const, submittedAt: null, reviewedAt: null, message: null } : {}),
          };
          return actionOk<VerificationView>({ ...current.verification, documents: documents.map((entry) => ({ ...entry })) });
        });
      }),
  };
}
