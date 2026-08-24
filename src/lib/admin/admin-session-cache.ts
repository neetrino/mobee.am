const ADMIN_SESSION_PREFIX = 'mobee.admin.session:';
const DEFAULT_ADMIN_SESSION_TTL_MS = 90_000;

interface AdminSessionCacheEntry<T> {
  value: T;
  expiresAt: number;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function buildAdminSessionCacheKey(route: string, params: Record<string, string> = {}): string {
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key] ?? ''}`)
    .join('&');
  return `${route}${sorted ? `?${sorted}` : ''}`;
}

export function readAdminSessionCache<T>(key: string): T | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(`${ADMIN_SESSION_PREFIX}${key}`);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as AdminSessionCacheEntry<T>;
    if (!parsed || typeof parsed.expiresAt !== 'number') {
      return null;
    }

    if (Date.now() >= parsed.expiresAt) {
      sessionStorage.removeItem(`${ADMIN_SESSION_PREFIX}${key}`);
      return null;
    }

    return parsed.value;
  } catch {
    return null;
  }
}

export function writeAdminSessionCache<T>(
  key: string,
  value: T,
  ttlMs: number = DEFAULT_ADMIN_SESSION_TTL_MS,
): void {
  if (!isBrowser()) {
    return;
  }

  const entry: AdminSessionCacheEntry<T> = {
    value,
    expiresAt: Date.now() + ttlMs,
  };

  try {
    sessionStorage.setItem(`${ADMIN_SESSION_PREFIX}${key}`, JSON.stringify(entry));
  } catch {
    // Optional cache — ignore quota errors.
  }
}

export function removeAdminSessionCache(key: string): void {
  if (!isBrowser()) {
    return;
  }

  try {
    sessionStorage.removeItem(`${ADMIN_SESSION_PREFIX}${key}`);
  } catch {
    // ignore
  }
}

export function invalidateAdminSessionCacheByPrefix(prefix: string): void {
  if (!isBrowser()) {
    return;
  }

  const fullPrefix = `${ADMIN_SESSION_PREFIX}${prefix}`;
  try {
    const keysToRemove: string[] = [];
    for (let index = 0; index < sessionStorage.length; index += 1) {
      const storageKey = sessionStorage.key(index);
      if (storageKey?.startsWith(fullPrefix)) {
        keysToRemove.push(storageKey);
      }
    }
    for (const storageKey of keysToRemove) {
      sessionStorage.removeItem(storageKey);
    }
  } catch {
    // ignore
  }
}

export const ADMIN_SESSION_DEFAULT_TTL_MS = DEFAULT_ADMIN_SESSION_TTL_MS;
