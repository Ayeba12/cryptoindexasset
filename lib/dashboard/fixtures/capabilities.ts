/**
 * Capability hints per scenario. Every available capability is simulated in
 * memory by the fixture actions; nothing reaches a real account. Sessions
 * stay unavailable in every scenario because no session source exists.
 */

import { CAPABILITY_KEYS, type Capabilities, type CapabilityKey } from "../contracts";
import type { ScenarioId } from "./scenarios";
import { SESSIONS_REASON } from "./security";

/** Note attached to every simulated capability. */
export const SIMULATED_NOTE = "Simulated in the design preview; no live account is affected";

/** Reason used when copy actions are unavailable. */
export const NO_EXECUTION_REASON = "No copy execution contract is connected; start, pause and stop are unavailable";

/** Reason used when signals are not entitled. */
export const SIGNALS_DISABLED_REASON = "Signals are not enabled for this account";

/** Capabilities for a scenario. */
export function buildCapabilities(scenarioId: ScenarioId): Capabilities {
  const capabilities = {} as Capabilities;
  for (const key of CAPABILITY_KEYS) capabilities[key] = { available: true, reason: SIMULATED_NOTE };
  capabilities.sessions = { available: false, reason: SESSIONS_REASON };
  const disable = (keys: CapabilityKey[], reason: string) => {
    for (const key of keys) capabilities[key] = { available: false, reason };
  };
  switch (scenarioId) {
    case "allocation-no-execution":
      disable(["copyStart", "copyPause", "copyStop"], NO_EXECUTION_REASON);
      break;
    case "signals-disabled":
      disable(["signals"], SIGNALS_DISABLED_REASON);
      break;
    case "partial-support":
      capabilities.depositInstructions = {
        available: true,
        reason: "LTC and XRP networks are not configured in this environment",
      };
      break;
    default:
      break;
  }
  return capabilities;
}
