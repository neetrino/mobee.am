const inflightRequests = new Map<string, Promise<unknown>>();

/**
 * Coalesces concurrent identical admin requests (in-flight only; no result cache).
 */
export function dedupedAdminRequest<T>(cacheKey: string, loader: () => Promise<T>): Promise<T> {
  const existing = inflightRequests.get(cacheKey);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = loader().finally(() => {
    inflightRequests.delete(cacheKey);
  });

  inflightRequests.set(cacheKey, promise);
  return promise;
}

export function clearAdminRequestDedup(): void {
  inflightRequests.clear();
}
