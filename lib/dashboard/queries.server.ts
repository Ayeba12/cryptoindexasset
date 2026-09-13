/**
 * Server-only read boundary of the customer dashboard.
 *
 * `app/(dashboard)/layout.tsx` and every page call exactly these two
 * functions. Both delegate to the live adapter in
 * `lib/dashboard/adapters/live.ts`, which maps the Supabase session to the
 * internal `User.id` and scopes every Prisma read by that id.
 *
 * Nothing here selects fixtures: preview data is built only by the
 * development-only preview layout from `lib/dashboard/fixtures`.
 */

import "server-only";

import type { SessionAccount } from "./contracts";
import { createUnavailableDashboardData, type DashboardData } from "./data-source";
import { createLiveDashboardData, getLiveSessionAccount } from "./adapters/live";

/** Reason attached to every region when the account cannot be read. */
export const NOT_CONNECTED_REASON = "Not connected";

/** Reason attached to every region for an account without a dashboard record. */
export const UNPROVISIONED_REASON = "This sign-in has no dashboard account yet. Contact support to complete provisioning.";

/**
 * Resolve the current identity: Supabase `auth.getUser()` → Prisma
 * `user.findUnique({ where: { supabaseUid } })`. No user → `unauthenticated`;
 * no row → `unprovisioned`; `SUSPENDED` → `restricted`; else `authenticated`
 * with `userId` = Prisma id. Memoised per request.
 */
export async function getSessionAccount(): Promise<SessionAccount> {
  return getLiveSessionAccount();
}

/**
 * The live {@link DashboardData} for the current session. Non-authenticated
 * states get a data object whose every region is `unavailable`, so the
 * shell can render an access state without querying data.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const account = await getSessionAccount();
  switch (account.state) {
    case "authenticated":
      return createLiveDashboardData(account);
    case "restricted":
      return createUnavailableDashboardData(account.reason, account);
    case "unprovisioned":
      return createUnavailableDashboardData(UNPROVISIONED_REASON, account);
    default:
      return createUnavailableDashboardData(NOT_CONNECTED_REASON, account);
  }
}
