/**
 * Public surface of the fixture package (development-only, client-safe).
 *
 * The preview provider calls `createFixtureStore(scenarioId)` for the reads
 * and `createFixtureActions(store)` for the writes. Nothing here imports a
 * server module, Prisma or a Node API, so the preview shell can build the
 * store inside a client component. No production route can select a
 * scenario; see `app/design-preview/dashboard/layout.tsx`.
 */

export {
  createFixtureStore,
  buildFixtureState,
  FIXTURE_FACTOR_ID,
  READ_ERROR_MESSAGE,
  NO_QUOTES_REASON,
  NOTIFICATION_PAGE_SIZE,
  RECENT_DEPOSIT_LIMIT,
  BANK_SCHEME,
  WITHDRAWAL_FEES,
  DEPOSIT_PROOF_RULES,
  type FixtureStore,
  type FixtureState,
} from "./store";
export {
  createFixtureActions,
  settlePendingOperations,
  WRITE_FAILURE_MESSAGE,
  UNKNOWN_OUTCOME_MESSAGE,
  FIXTURE_MFA_SECRET,
  FIXTURE_MFA_ISSUER,
  QUOTE_VALIDITY_MINUTES,
  type FixtureActionOptions,
} from "./actions";
export { SCENARIOS, SCENARIO_IDS, DEFAULT_SCENARIO_ID, isScenarioId, scenarioFor, FIXTURE_CLOCK, type Scenario, type ScenarioId } from "./scenarios";
export { FIXTURE_PRICES, FIXTURE_QUOTE_SOURCE } from "./quotes";
export { LONG_ADDRESS, LONG_DISPLAY_NAME, FIXTURE_NETWORKS } from "./accounts";
export { MISSING_RECORD_HREF } from "./notifications";
export { FIXTURE_CURRENT_PASSWORD, FIXTURE_MFA_CODE } from "./security";
export { FIXTURE_DESTINATIONS } from "./transactions";
