export const COOKIE_NOTICE_KEY = "ca-cookie-notice";
export const COOKIE_NOTICE_VERSION = 1;
export const COOKIE_NOTICE_MAX_AGE = 180 * 24 * 60 * 60 * 1000;

// This acknowledges an information notice. It is not consent for optional tools.
export function hasCurrentCookieNotice(raw: string | null, now = Date.now()): boolean {
  if (!raw) return false;
  try {
    const value = JSON.parse(raw);
    return value?.version === COOKIE_NOTICE_VERSION &&
      typeof value.acknowledgedAt === "number" && Number.isFinite(value.acknowledgedAt) &&
      value.acknowledgedAt <= now && now - value.acknowledgedAt < COOKIE_NOTICE_MAX_AGE;
  } catch { return false; } // Invalid stored data is treated as an unread notice.
}
