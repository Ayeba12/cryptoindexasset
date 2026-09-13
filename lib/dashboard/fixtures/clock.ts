/**
 * Fixture clock helpers.
 *
 * Every fixture timestamp is derived from {@link FIXTURE_CLOCK}; nothing in
 * `lib/dashboard/fixtures` reads the system clock. Offsets are whole days or
 * minutes relative to that instant so the same scenario renders identically
 * on every run.
 */

import { FIXTURE_CLOCK } from "./scenarios";

export { FIXTURE_CLOCK };

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

function toIso(ms: number): string {
  return new Date(ms).toISOString().replace(".000Z", "Z");
}

/** Timestamp `days` days after the clock (negative for the past), at `hour:minute` UTC. */
export function atDay(days: number, hour = 12, minute = 0): string {
  const base = Date.parse(FIXTURE_CLOCK);
  const dayStart = base - 12 * 60 * MINUTE_MS; // the clock is 12:00 UTC; midnight of that day
  return toIso(dayStart + days * DAY_MS + (hour * 60 + minute) * MINUTE_MS);
}

/** Timestamp `minutes` minutes after the clock (negative for the past). */
export function atMinutes(minutes: number): string {
  return toIso(Date.parse(FIXTURE_CLOCK) + minutes * MINUTE_MS);
}

/** True when `at` is at or before `now` (both ISO). */
export function isPast(at: string | null, now: string): boolean {
  if (at === null) return false;
  return Date.parse(at) <= Date.parse(now);
}
