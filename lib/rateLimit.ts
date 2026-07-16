import { NextRequest } from "next/server";

interface RateLimitEntry {
  count: number;
  reset: number;
}

/* NOTE FOR PRODUCTION (VERCEL):
   This in-memory Map is reset on every serverless cold start, meaning rate limiting 
   will be largely ineffective on Vercel. For a production deployment, replace this 
   in-memory store with Upstash Redis (@upstash/ratelimit) which maintains state 
   across serverless function instances. */
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

/** 
 * Extracts the real client IP safely, accounting for proxies like Vercel's edge network.
 * Falls back to x-forwarded-for if x-real-ip is not available.
 */
export function getIP(req: NextRequest): string {
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return "unknown";
}
