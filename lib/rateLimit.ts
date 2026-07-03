interface RateLimitEntry {
  count: number;
  reset: number;
}

const store = new Map<string, RateLimitEntry>();

/* Clean up expired entries every 10 minutes to prevent memory growing indefinitely.
   On serverless platforms each function instance has its own store. */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.reset) store.delete(key);
  }
}, 10 * 60 * 1000);

/**
 * Checks whether a request should be allowed based on rate limit rules.
 * Returns true if allowed, false if the limit has been exceeded.
 *
 * @param key      - Unique identifier for the requester (IP address or email)
 * @param max      - Maximum requests allowed in the time window
 * @param windowMs - Length of the time window in milliseconds
 */
export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  /* First request from this key, or the previous window has expired — start fresh */
  if (!entry || now > entry.reset) {
    store.set(key, { count: 1, reset: now + windowMs });
    return true;
  }

  if (entry.count >= max) return false;

  entry.count++;
  return true;
}

/** Returns a standard 429 error response used consistently across all API routes */
export function rateLimitResponse() {
  return {
    error: "Too many requests. Please wait a moment and try again.",
    status: 429,
  };
}
