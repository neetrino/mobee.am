import { getRedisTcpUrl, getUpstashRedisConfig } from "@/config/env";
import { logger } from "@/lib/utils/logger";
import {
  isMemoryCacheAllowed,
  memoryDel,
  memoryDeletePattern,
  memoryGet,
  memorySetex,
} from "@/lib/services/cache-memory";

type UpstashClient = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, opts?: Record<string, unknown>) => Promise<string | "OK" | null>;
  del: (...keys: string[]) => Promise<number>;
  keys: (pattern: string) => Promise<string[]>;
};

type TcpRedisClient = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<unknown>;
  setex: (key: string, seconds: number, value: string) => Promise<unknown>;
  del: (key: string) => Promise<unknown>;
  keys: (pattern: string) => Promise<string[]>;
  connect: () => Promise<unknown>;
  on: (event: string, listener: (error?: Error) => void) => void;
};

let redisClient: TcpRedisClient | null = null;
let upstashClient: UpstashClient | null = null;
let redisAvailable = false;
let connectionAttempted = false;
let errorLogged = false;
let lastErrorTime = 0;
const ERROR_COOLDOWN_MS = 30000;

async function initRedis(): Promise<void> {
  if (connectionAttempted) {
    return;
  }

  const rest = getUpstashRedisConfig();
  if (rest) {
    try {
      const { Redis } = await import("@upstash/redis");
      upstashClient = new Redis({ url: rest.url, token: rest.token });
      redisAvailable = true;
      connectionAttempted = true;
      return;
    } catch (error: unknown) {
      connectionAttempted = true;
      redisAvailable = false;
      logger.error("Failed to init Upstash Redis", {
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }
  }

  const redisUrl = getRedisTcpUrl();
  const useRedisTcp = Boolean(redisUrl && redisUrl !== "redis://localhost:6379");
  if (!useRedisTcp || !redisUrl) {
    connectionAttempted = true;
    return;
  }

  await connectTcpRedis(redisUrl);
}

async function connectTcpRedis(redisUrl: string): Promise<void> {
  try {
    const Redis = (await import("ioredis")).default;
    redisClient = new Redis(redisUrl, {
      retryStrategy: (times: number) => {
        if (times > 3) {
          return null;
        }
        return Math.min(times * 50, 2000);
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
      showFriendlyErrorStack: true,
      enableOfflineQueue: false,
      reconnectOnError: () => false,
    }) as unknown as TcpRedisClient;

    redisClient.on("connect", () => {
      errorLogged = false;
      redisAvailable = true;
    });
    redisClient.on("ready", () => {
      redisAvailable = true;
    });
    redisClient.on("error", (error?: Error) => {
      redisAvailable = false;
      const now = Date.now();
      if (!errorLogged || now - lastErrorTime > ERROR_COOLDOWN_MS) {
        logger.error("Redis connection error", { error: error?.message });
        errorLogged = true;
        lastErrorTime = now;
      }
    });

    await redisClient.connect();
    connectionAttempted = true;
  } catch (error: unknown) {
    connectionAttempted = true;
    redisAvailable = false;
    logger.error("Failed to initialize Redis", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function fallbackGet(key: string): string | null {
  return isMemoryCacheAllowed() ? memoryGet(key) : null;
}

function fallbackSetex(key: string, seconds: number, value: string): boolean {
  if (!isMemoryCacheAllowed()) {
    return false;
  }
  memorySetex(key, seconds, value);
  return true;
}

export async function get(key: string): Promise<string | unknown | null> {
  if (!redisAvailable) {
    await initRedis();
  }
  if (!redisAvailable || (!redisClient && !upstashClient)) {
    return fallbackGet(key);
  }
  try {
    if (upstashClient) {
      return (await upstashClient.get(key)) ?? null;
    }
    return redisClient ? await redisClient.get(key) : fallbackGet(key);
  } catch (error: unknown) {
    logger.warn("Cache read failed; continuing without cache", {
      error: error instanceof Error ? error.message : String(error),
    });
    return fallbackGet(key);
  }
}

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
    if (redisClient) {
      await redisClient.set(key, value);
      return true;
    }
    return false;
  } catch (error: unknown) {
    logger.warn("Cache write failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function setex(key: string, seconds: number, value: string): Promise<boolean> {
  if (!redisAvailable) {
    await initRedis();
  }
  if (!redisAvailable || (!redisClient && !upstashClient)) {
    return fallbackSetex(key, seconds, value);
  }
  try {
    if (upstashClient) {
      await upstashClient.set(key, value, { ex: seconds });
      return true;
    }
    if (redisClient) {
      await redisClient.setex(key, seconds, value);
      return true;
    }
    return fallbackSetex(key, seconds, value);
  } catch (error: unknown) {
    logger.warn("Cache write failed; catalog will continue without cache", {
      error: error instanceof Error ? error.message : String(error),
    });
    return fallbackSetex(key, seconds, value);
  }
}

export async function del(key: string): Promise<boolean> {
  if (!redisAvailable) {
    await initRedis();
  }
  memoryDel(key);
  if (!redisAvailable || (!redisClient && !upstashClient)) {
    return true;
  }
  try {
    if (upstashClient) {
      await upstashClient.del(key);
      return true;
    }
    if (redisClient) {
      await redisClient.del(key);
    }
    return true;
  } catch {
    return false;
  }
}

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
    return redisClient ? await redisClient.keys(pattern) : [];
  } catch {
    return [];
  }
}

export async function deletePattern(pattern: string): Promise<number> {
  if (!redisAvailable) {
    await initRedis();
  }
  const memoryDeleted = memoryDeletePattern(pattern);
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
    if (!redisClient) {
      return memoryDeleted;
    }
    const matchingKeys = await redisClient.keys(pattern);
    if (matchingKeys.length > 0) {
      await Promise.all(matchingKeys.map((key) => redisClient?.del(key)));
    }
    return matchingKeys.length + memoryDeleted;
  } catch {
    return memoryDeleted;
  }
}

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
