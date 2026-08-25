const MEMORY_CACHE_MAX_KEYS = 300;

type MemoryEntry = { value: string; expiresAt: number };

const memoryCache = new Map<string, MemoryEntry>();

export function isMemoryCacheAllowed(nodeEnv: string | undefined = process.env.NODE_ENV): boolean {
  return nodeEnv !== "production";
}

export function memoryGet(key: string): string | null {
  const entry = memoryCache.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

export function memorySetex(key: string, seconds: number, value: string): void {
  while (memoryCache.size >= MEMORY_CACHE_MAX_KEYS) {
    const firstKey = memoryCache.keys().next().value;
    if (firstKey) {
      memoryCache.delete(firstKey);
    } else {
      break;
    }
  }
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + seconds * 1000,
  });
}

export function memoryDel(key: string): void {
  memoryCache.delete(key);
}

export function memoryDeletePattern(pattern: string): number {
  const regex = pattern.replace(/\*/g, ".*").replace(/\?/g, ".");
  const re = new RegExp(`^${regex}$`);
  let deleted = 0;
  for (const key of memoryCache.keys()) {
    if (re.test(key)) {
      memoryCache.delete(key);
      deleted += 1;
    }
  }
  return deleted;
}

export function clearMemoryCache(): void {
  memoryCache.clear();
}
