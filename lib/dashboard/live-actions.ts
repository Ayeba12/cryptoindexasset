/**
 * The live {@link DashboardActions} object.
 *
 * `mutations.server.ts` carries the `"use server"` directive and therefore
 * may only export async functions. This plain module assembles those server
 * actions into the single `DashboardActions` object the authenticated layout
 * passes to `DashboardActionsProvider mode="live"`. Each property is a server
 * action reference, so the object is serialisable as a client-component prop.
 *
 * Do not add logic here: behaviour belongs in `mutations.server.ts`.
 */

import type { DashboardActions } from "./data-source";
import {
  cancelTransaction,
  changePassword,
  disableMfa,
  markAllNotificationsRead,
  markNotificationRead,
  pauseAllocation,
  quoteWithdrawal,
  reconcileWithdrawal,
  removeVerificationDocument,
  requestCopy,
  resumeAllocation,
  saveProfile,
  startMfaEnrollment,
  stopAllocation,
  submitDepositProof,
  submitVerification,
  submitWithdrawal,
  verifyMfaEnrollment,
} from "./mutations.server";

/** Every live server action, keyed by {@link DashboardActions} name. */
export const liveActions: DashboardActions = {
  submitDepositProof,
  quoteWithdrawal,
  submitWithdrawal,
  reconcileWithdrawal,
  cancelTransaction,
  requestCopy,
  pauseAllocation,
  resumeAllocation,
  stopAllocation,
  markNotificationRead,
  markAllNotificationsRead,
  saveProfile,
  changePassword,
  startMfaEnrollment,
  verifyMfaEnrollment,
  disableMfa,
  submitVerification,
  removeVerificationDocument,
};
