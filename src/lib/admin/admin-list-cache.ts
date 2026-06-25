import {
  buildAdminSessionCacheKey,
  readAdminSessionCache,
  writeAdminSessionCache,
  ADMIN_SESSION_DEFAULT_TTL_MS,
} from '@/lib/admin/admin-session-cache';
import { dedupedAdminRequest } from '@/lib/admin/admin-request-dedup';

/**
 * Deduped admin list GET with optional session cache read/write.
 */
export async function fetchAdminListWithCache<T>({
  route,
  params,
  fetcher,
  force = false,
}: {
  route: string;
  params: Record<string, string>;
  fetcher: () => Promise<T>;
  force?: boolean;
}): Promise<{ data: T; fromCache: boolean }> {
  const cacheKey = buildAdminSessionCacheKey(route, params);

  if (!force) {
    const cached = readAdminSessionCache<T>(cacheKey);
    if (cached !== null) {
      return { data: cached, fromCache: true };
    }
  }

  const data = await dedupedAdminRequest(`admin-list:${cacheKey}`, fetcher);
  writeAdminSessionCache(cacheKey, data, ADMIN_SESSION_DEFAULT_TTL_MS);
  return { data, fromCache: false };
}

export { buildAdminSessionCacheKey };
