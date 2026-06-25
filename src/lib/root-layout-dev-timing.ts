/**
 * Dev-only timing wrapper for root layout data loading.
 * Keeps Date.now out of React component render (eslint react-hooks/purity).
 */
export async function withRootLayoutDevTiming<T>(
  work: () => Promise<T>,
  getLogContext: (result: T) => { isAdminRoute: boolean },
): Promise<T> {
  if (process.env.NODE_ENV !== 'development') {
    return work();
  }

  const start = Date.now();
  const result = await work();
  const { isAdminRoute } = getLogContext(result);
  console.info(`[ROOT_LAYOUT] total=${Date.now() - start}ms admin=${isAdminRoute}`);
  return result;
}
