/**
 * In-memory sliding window rate limiter.
 * Designed for server actions, route handlers, and API endpoints.
 */

type RateLimitRecord = {
  timestamps: number[];
};

const store = new Map<string, RateLimitRecord>();

// Cleanup stale keys every 5 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 3600_000);
      if (record.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, 300_000).unref?.();
}

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
};

/**
 * Checks whether an action keyed by `key` is allowed within a sliding time window.
 *
 * @param key Unique key (e.g. `contact:user@domain.com` or `auth:ip`)
 * @param limit Maximum number of requests allowed in the window
 * @param windowSeconds Window duration in seconds
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const threshold = now - windowMs;

  let record = store.get(key);
  if (!record) {
    record = { timestamps: [] };
    store.set(key, record);
  }

  // Remove timestamps outside the sliding window
  record.timestamps = record.timestamps.filter((ts) => ts > threshold);

  if (record.timestamps.length >= limit) {
    const oldestTimestamp = record.timestamps[0] ?? now;
    const resetSeconds = Math.ceil((oldestTimestamp + windowMs - now) / 1000);
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetSeconds: Math.max(1, resetSeconds),
    };
  }

  record.timestamps.push(now);
  return {
    allowed: true,
    limit,
    remaining: limit - record.timestamps.length,
    resetSeconds: windowSeconds,
  };
}
