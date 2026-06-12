import { Redis } from '@upstash/redis';

// Fallback in-memory cache for local development or if Upstash is not configured
const memoryCache = new Map<string, { value: any; expiry: number }>();
const memoryRateLimits = new Map<string, { count: number; windowStart: number }>();

let redisClient: Redis | null = null;

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch (e) {
  console.warn("Failed to initialize Upstash Redis, falling back to memory.");
}

export async function cacheGet(key: string): Promise<any | null> {
  if (redisClient) {
    return await redisClient.get(key);
  } else {
    const item = memoryCache.get(key);
    if (item && item.expiry > Date.now()) {
      return item.value;
    }
    return null;
  }
}

export async function cacheSet(key: string, value: any, ttlSeconds: number = 86400): Promise<void> {
  if (redisClient) {
    await redisClient.set(key, value, { ex: ttlSeconds });
  } else {
    memoryCache.set(key, { value, expiry: Date.now() + ttlSeconds * 1000 });
  }
}

export async function checkRateLimit(ip: string): Promise<{ success: boolean; limit: number; remaining: number }> {
  const LIMIT = 10;
  const WINDOW_MS = 60 * 60 * 1000; // 1 hour

  if (redisClient) {
    // Basic sliding window or fixed window rate limit using Redis
    const key = `ratelimit:${ip}`;
    const current = await redisClient.incr(key);
    if (current === 1) {
      await redisClient.expire(key, 3600);
    }
    return {
      success: current <= LIMIT,
      limit: LIMIT,
      remaining: Math.max(0, LIMIT - current),
    };
  } else {
    const now = Date.now();
    let record = memoryRateLimits.get(ip);

    if (!record || now - record.windowStart > WINDOW_MS) {
      record = { count: 0, windowStart: now };
    }

    record.count += 1;
    memoryRateLimits.set(ip, record);

    return {
      success: record.count <= LIMIT,
      limit: LIMIT,
      remaining: Math.max(0, LIMIT - record.count),
    };
  }
}
