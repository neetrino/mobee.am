import { db } from "@white-shop/db";
import { cacheService } from "@/lib/services/cache.service";

const ADMIN_VALIDATION_CACHE_TTL_SECONDS = 45;
const MEMORY_CACHE_MAX_KEYS = 200;

interface AdminValidationRecord {
  allowed: boolean;
  expiresAt: number;
}

const memoryCache = new Map<string, AdminValidationRecord>();

function buildCacheKey(userId: string): string {
  return `admin:auth:user:${userId}`;
}

function readMemoryCache(userId: string): boolean | null {
  const entry = memoryCache.get(userId);
  if (!entry) {
    return null;
  }
  if (Date.now() >= entry.expiresAt) {
    memoryCache.delete(userId);
    return null;
  }
  return entry.allowed;
}

function writeMemoryCache(userId: string, allowed: boolean): void {
  while (memoryCache.size >= MEMORY_CACHE_MAX_KEYS) {
    const firstKey = memoryCache.keys().next().value;
    if (!firstKey) {
      break;
    }
    memoryCache.delete(firstKey);
  }

  memoryCache.set(userId, {
    allowed,
    expiresAt: Date.now() + ADMIN_VALIDATION_CACHE_TTL_SECONDS * 1000,
  });
}

async function readDistributedCache(userId: string): Promise<boolean | null> {
  const raw = await cacheService.get(buildCacheKey(userId));
  if (raw === null) {
    return null;
  }

  if (raw === "1") {
    return true;
  }
  if (raw === "0") {
    return false;
  }

  return null;
}

async function writeDistributedCache(userId: string, allowed: boolean): Promise<void> {
  await cacheService.setex(
    buildCacheKey(userId),
    ADMIN_VALIDATION_CACHE_TTL_SECONDS,
    allowed ? "1" : "0",
  );
}

/**
 * Validates admin user is active (not blocked/deleted) with short TTL cache.
 */
export async function isAdminUserActive(userId: string): Promise<boolean> {
  const memoryAllowed = readMemoryCache(userId);
  if (memoryAllowed !== null) {
    return memoryAllowed;
  }

  const distributedAllowed = await readDistributedCache(userId);
  if (distributedAllowed !== null) {
    writeMemoryCache(userId, distributedAllowed);
    return distributedAllowed;
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      blocked: true,
      deletedAt: true,
      roles: true,
    },
  });

  const allowed = Boolean(user && !user.blocked && !user.deletedAt && user.roles.includes("admin"));

  writeMemoryCache(userId, allowed);
  await writeDistributedCache(userId, allowed);

  return allowed;
}

/**
 * Drops cached admin validation after user status/role mutations.
 */
export async function invalidateAdminUserValidationCache(userId: string): Promise<void> {
  memoryCache.delete(userId);
  await cacheService.del(buildCacheKey(userId));
}
