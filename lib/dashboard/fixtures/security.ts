/**
 * Security fixtures: confirmed MFA state per scenario. No session list is
 * fabricated; sessions stay `null` with a reason in every scenario because no
 * session source exists.
 */

import type { SecurityView } from "../contracts";
import { atDay } from "./clock";
import type { ScenarioId } from "./scenarios";

/** Reason shown where a session list would be. */
export const SESSIONS_REASON = "No session source is connected; active sessions cannot be listed here.";

/** Label of the enrolled fixture factor. */
export const FACTOR_LABEL = "Authenticator app";

/** Fixture password accepted as the current password by `changePassword` in preview. */
export const FIXTURE_CURRENT_PASSWORD = "fixture-password";

/** Fixture code accepted by `verifyMfaEnrollment` and `disableMfa` in preview. */
export const FIXTURE_MFA_CODE = "123456";

/** Security view for a scenario. */
export function buildSecurity(scenarioId: ScenarioId): SecurityView {
  const notEnabled = scenarioId === "mfa-not-enabled" || scenarioId === "empty";
  return {
    mfa: notEnabled ? { state: "not-enabled" } : { state: "enabled", factorLabel: FACTOR_LABEL, verifiedAt: atDay(-120, 10) },
    password: { changeAvailable: true },
    sessions: null,
    sessionsReason: SESSIONS_REASON,
  };
}
