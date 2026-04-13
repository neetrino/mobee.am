/**
 * Cache Service
 *
 * Service for Redis caching integration
 * Handles caching operations with graceful fallback if Redis is unavailable.
 * When Redis is not configured, uses in-memory cache (per process) for dev/local.
 */

// Redis client will be initialized lazily
let redisClient: any = null;
/** Upstash REST client when UPSTASH_REDIS_REST_* env vars are set */
let upstashClient: {
  get: (k: string) => Promise<string | null>;
  set: (k: string, v: string, opts?: Record<string, unknown>) => Promise<string | "OK" | null>;
  del: (...keys: string[]) => Promise<number>;
  keys: (pattern: string) => Promise<string[]>;
} | null = null;
let redisAvailable = false;
let connectionAttempted = false;
let errorLogged = false;
let lastErrorTime = 0;
const ERROR_COOLDOWN = 30000; // Only log errors every 30 seconds

/** In-memory fallback when Redis is not configured (dev/local) */
const MEMORY_CACHE_MAX_KEYS = 300;
const memoryCache = new Map<string, { value: string; expiresAt: number }>();

function memoryGet(key: string): string | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

function memorySetex(key: string, seconds: number, value: string): void {
  while (memoryCache.size >= MEMORY_CACHE_MAX_KEYS) {
    const firstKey = memoryCache.keys().next().value;
    if (firstKey) memoryCache.delete(firstKey);
    else break;
  }
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + seconds * 1000,
  });
}

/**
 * Initialize Redis client (Upstash REST or ioredis TCP)
 */
async function initRedis() {
  if (connectionAttempted) {
    return;
  }

  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const redisUrl = process.env.REDIS_URL;

  if (restUrl && restToken) {
    try {
      const { Redis } = await import("@upstash/redis");
      upstashClient = new Redis({ url: restUrl, token: restToken });
      redisAvailable = true;
      connectionAttempted = true;
      return;
    } catch (error: unknown) {
      const err = error as Error;
      connectionAttempted = true;
      redisAvailable = false;
      console.error("❌ [CACHE] Failed to init Upstash Redis:", err?.message ?? error);
      return;
    }
  }

  const useRedisTcp = redisUrl && redisUrl !== "redis://localhost:6379";
  if (!useRedisTcp) {
    connectionAttempted = true;
    return;
  }

  try {
    // Dynamic import for serverless compatibility
    const Redis = (await import('ioredis')).default;
    
    redisClient = new Redis(redisUrl, {
      retryStrategy: (times: number) => {
        if (times > 3) {
          return null; // Stop retrying
        }
        return Math.min(times * 50, 2000);
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
      showFriendlyErrorStack: true,
      enableOfflineQueue: false,
      reconnectOnError: () => false, // Don't auto-reconnect
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected');
      errorLogged = false;
      redisAvailable = true;
    });

    redisClient.on('ready', () => {
      redisAvailable = true;
    });

    redisClient.on('error', (error: Error) => {
      redisAvailable = false;
      const now = Date.now();
      if (!errorLogged || (now - lastErrorTime) > ERROR_COOLDOWN) {
        console.error('⚠️  Redis connection error:', error.message);
        console.error('💡 Check REDIS_URL in .env or start Redis server');
        errorLogged = true;
        lastErrorTime = now;
      }
    });

    await redisClient.connect();
    connectionAttempted = true;
  } catch (error: any) {
    connectionAttempted = true;
    redisAvailable = false;
    console.error('❌ [CACHE] Failed to initialize Redis:', error.message);
  }
}

/**
 * Get value from cache
 */
export async function get(key: string): Promise<string | null> {
  if (!redisAvailable) {
    await initRedis();
  }

  if (!redisAvailable || (!redisClient && !upstashClient)) {
    return memoryGet(key);
  }

  try {
    if (upstashClient) {
      const v = await upstashClient.get(key);
      return v ?? null;
    }
    return await redisClient.get(key);
  } catch (error) {
    return memoryGet(key);
  }
}

/**
 * Set value in cache
 */
export async function set(key: string, value: string): Promise<boolean> {
  if (!redisAvailable) {
    await initRedis();
  }

  if (!redisAvailable || (!redisClient && !upstashClient)) {
    return false;
  }

  try {
    if (upstashClient) {
      await upstashClient.set(key, value);
      return true;
    }
    await redisClient.set(key, value);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Set value in cache with expiration
 */
export async function setex(key: string, seconds: number, value: string): Promise<boolean> {
  if (!redisAvailable) {
    await initRedis();
  }

  if (!redisAvailable || (!redisClient && !upstashClient)) {
    memorySetex(key, seconds, value);
    return true;
  }

  try {
    if (upstashClient) {
      await upstashClient.set(key, value, { ex: seconds });
      return true;
    }
    await redisClient.setex(key, seconds, value);
    return true;
  } catch (error) {
    memorySetex(key, seconds, value);
    return true;
  }
}

/**
 * Delete key from cache
 */
export async function del(key: string): Promise<boolean> {
  if (!redisAvailable) {
    await initRedis();
  }

  memoryCache.delete(key);

  if (!redisAvailable || (!redisClient && !upstashClient)) {
    return true;
  }

  try {
    if (upstashClient) {
      await upstashClient.del(key);
      return true;
    }
    await redisClient.del(key);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get multiple keys matching pattern
 */
export async function keys(pattern: string): Promise<string[]> {
  if (!redisAvailable) {
    await initRedis();
  }

  if (!redisAvailable || (!redisClient && !upstashClient)) {
    return [];
  }

  try {
    if (upstashClient) {
      return await upstashClient.keys(pattern);
    }
    return await redisClient.keys(pattern);
  } catch (error) {
    return [];
  }
}

/**
 * Delete multiple keys matching pattern
 */
export async function deletePattern(pattern: string): Promise<number> {
  if (!redisAvailable) {
    await initRedis();
  }

  const regex = pattern.replace(/\*/g, ".*").replace(/\?/g, ".");
  const re = new RegExp(`^${regex}$`);
  let memoryDeleted = 0;
  for (const key of memoryCache.keys()) {
    if (re.test(key)) {
      memoryCache.delete(key);
      memoryDeleted++;
    }
  }

  if (!redisAvailable || (!redisClient && !upstashClient)) {
    return memoryDeleted;
  }

  try {
    if (upstashClient) {
      const matchingKeys = await upstashClient.keys(pattern);
      if (matchingKeys.length > 0) {
        await upstashClient.del(...matchingKeys);
      }
      return matchingKeys.length + memoryDeleted;
    }
    const matchingKeys = await redisClient.keys(pattern);
    if (matchingKeys.length > 0) {
      await redisClient.del(...matchingKeys);
    }
    return matchingKeys.length + memoryDeleted;
  } catch (error) {
    return memoryDeleted;
  }
}

/**
 * Check if Redis is available
 */
export function isAvailable(): boolean {
  return redisAvailable;
}

export const cacheService = {
  get,
  set,
  setex,
  del,
  keys,
  deletePattern,
  isAvailable,
};

