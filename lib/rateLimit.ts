import { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = redisUrl && redisToken ? Redis.fromEnv() : null;

// Cache of ratelimit instances so we don't recreate them on every request
const limiters = new Map<string, Ratelimit>();

interface RateLimitEntry { count: number; reset: number; }
const memoryStore = new Map<string, RateLimitEntry>();

// Clean up memory store every 10 mins (fallback)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (now > entry.reset) memoryStore.delete(key);
  }
}, 10 * 60 * 1000);

/**
 * Checks whether a request should be allowed based on rate limit rules.
 * Automatically uses Upstash Redis if configured, otherwise falls back to memory.
 */
export async function checkRateLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  if (redis) {
    const windowSecs = Math.max(1, Math.floor(windowMs / 1000));
    const limiterKey = `${max}-${windowSecs}s`;
    
    if (!limiters.has(limiterKey)) {
      limiters.set(
        limiterKey,
        new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(max, `${windowSecs} s` as any),
        })
      );
    }
    
    const limiter = limiters.get(limiterKey)!;
    const { success } = await limiter.limit(key);
    return success;
  }

  // Fallback to in-memory
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.reset) {
    memoryStore.set(key, { count: 1, reset: now + windowMs });
    return true;
  }

  if (entry.count >= max) return false;

  entry.count++;
  return true;
}

export function rateLimitResponse() {
  return {
    error: "Too many requests. Please wait a moment and try again.",
    status: 429,
  };
}

export function getIP(req: NextRequest): string {
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return "unknown";
}
