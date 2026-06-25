'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  readAdminSessionCache,
  writeAdminSessionCache,
  removeAdminSessionCache,
  ADMIN_SESSION_DEFAULT_TTL_MS,
} from '@/lib/admin/admin-session-cache';

type UseAdminCachedQueryOptions<T> = {
  cacheKey: string;
  fetcher: () => Promise<T>;
  enabled?: boolean;
  ttlMs?: number;
};

type UseAdminCachedQueryResult<T> = {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  refetch: (options?: { force?: boolean }) => Promise<void>;
  invalidate: () => void;
  setData: (value: T | null) => void;
};

/**
 * Cache-first admin data hook backed by sessionStorage (short TTL).
 */
export function useAdminCachedQuery<T>({
  cacheKey,
  fetcher,
  enabled = true,
  ttlMs = ADMIN_SESSION_DEFAULT_TTL_MS,
}: UseAdminCachedQueryOptions<T>): UseAdminCachedQueryResult<T> {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const cachedInitial = readAdminSessionCache<T>(cacheKey);
  const [data, setData] = useState<T | null>(cachedInitial);
  const [loading, setLoading] = useState(enabled && cachedInitial === null);
  const [refreshing, setRefreshing] = useState(false);
  const hadCacheRef = useRef(cachedInitial !== null);
  const dataRef = useRef(data);
  dataRef.current = data;

  const refetch = useCallback(
    async (options?: { force?: boolean }) => {
      if (!enabled) {
        return;
      }

      const force = options?.force ?? false;
      const cached = readAdminSessionCache<T>(cacheKey);

      if (!force && cached !== null) {
        setData(cached);
        setLoading(false);
        hadCacheRef.current = true;
        return;
      }

      if (hadCacheRef.current || dataRef.current !== null) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const result = await fetcherRef.current();
        setData(result);
        writeAdminSessionCache(cacheKey, result, ttlMs);
        hadCacheRef.current = true;
      } catch {
        if (!hadCacheRef.current) {
          setData(null);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [cacheKey, enabled, ttlMs],
  );

  const invalidate = useCallback(() => {
    removeAdminSessionCache(cacheKey);
    hadCacheRef.current = false;
  }, [cacheKey]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    void refetch();
  }, [cacheKey, enabled, refetch]);

  return {
    data,
    loading,
    refreshing,
    refetch,
    invalidate,
    setData,
  };
}
