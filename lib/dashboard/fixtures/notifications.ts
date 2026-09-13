/**
 * Notification fixtures: 12 items with 3 unread in the funded scenario. One
 * item links to a record that does not exist (`/dashboard/activity/tx-missing`)
 * so the recoverable not-found view can be reviewed. Financial status always
 * comes from the linked record, never from the notification text.
 */

import type { NotificationKind, NotificationView } from "../contracts";
import { atDay } from "./clock";
import type { ScenarioId } from "./scenarios";
import { sortNewestFirst } from "./transactions";

/** Href of the fixture notification whose linked record does not exist. */
export const MISSING_RECORD_HREF = "/dashboard/activity/tx-missing";

function item(
  seq: number,
  kind: NotificationKind,
  title: string,
  message: string,
  day: number,
  href: string | null,
  read: boolean,
  hour = 12,
): NotificationView {
  return {
    id: `ntf-${String(seq).padStart(4, "0")}`,
    title,
    message,
    kind,
    read,
    createdAt: atDay(day, hour),
    href,
  };
}

/** Notifications for a scenario, newest first. */
export function buildNotifications(scenarioId: ScenarioId): NotificationView[] {
  if (scenarioId === "empty") {
    return sortNewestFirst([
      item(1, "system", "Welcome to your account", "Deposit an asset to start. Nothing is pending yet.", -3, "/dashboard/deposit", false, 9),
      item(2, "verification", "Identity documents needed", "Submit an identity document to enable withdrawals.", -3, "/dashboard/settings/verification", true, 9),
    ]);
  }
  const mfaTitle = scenarioId === "mfa-not-enabled" ? "Authenticator app not enabled" : "Authenticator app enabled";
  const mfaMessage =
    scenarioId === "mfa-not-enabled"
      ? "Your account has no second factor. Enrol an authenticator app in Security."
      : "A second factor was verified for sign-in.";
  return sortNewestFirst([
    item(1, "transaction", "Withdrawal request received", "Your ETH withdrawal request is pending review.", -2, "/dashboard/activity/tx-wdr-0001", false, 9),
    item(2, "allocation", "Stop request pending", "The stop for your Elena Rossi allocation awaits operator confirmation.", -1, "/dashboard/copy-trades/alloc-0004", false, 11),
    item(3, "transaction", "Recorded outcome posted", "A recorded outcome for your Alex Morgan allocation was added to the ledger.", -4, "/dashboard/activity/tx-pnl-0004", false, 16),
    item(4, "transaction", "Deposit approved", "Your USDT deposit was approved. Settlement evidence has not been recorded yet.", -30, "/dashboard/activity/tx-dep-0007", true, 14),
    item(5, "transaction", "Withdrawal declined", "Your USDT withdrawal request was declined. Open the request for the reason.", -19, "/dashboard/activity/tx-wdr-0002", true, 15),
    item(6, "system", "Archived record notice", "A record referenced by this notice has been archived.", -12, MISSING_RECORD_HREF, true, 10),
    item(7, "allocation", "Allocation paused", "Your Maya Chen allocation is paused. Resume it from My copy trades.", -10, "/dashboard/copy-trades/alloc-0002", true, 11),
    item(8, "security", mfaTitle, mfaMessage, -120, "/dashboard/settings/security", true, 10),
    item(9, "verification", "Identity verified", "Your identity documents were reviewed.", -98, "/dashboard/settings/verification", true, 13),
    item(10, "transaction", "Manual adjustment recorded", "The operations desk recorded an adjustment on your USD ledger.", -15, "/dashboard/activity/tx-adj-0001", true, 17),
    item(11, "allocation", "Allocation stopped", "Your Daniel Okafor allocation was stopped and its units released.", -50, "/dashboard/copy-trades/alloc-0003", true, 18),
    item(12, "system", "Deposit network notice: USDT on Tron", "Tron (TRC20) deposits need 20 network confirmations before review.", -60, "/dashboard/deposit", true, 12),
  ]);
}
