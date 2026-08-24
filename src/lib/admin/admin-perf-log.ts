/**
 * Optional admin API performance logging (server-side).
 * Enable with ADMIN_PERF_LOGS=true
 */

export function isAdminPerfLoggingEnabled(): boolean {
  return process.env.ADMIN_PERF_LOGS === 'true';
}

export interface AdminPerfTimings {
  authMs: number;
  dbMs: number;
  authSource?: string;
}

/**
 * Logs a single admin endpoint timing line when ADMIN_PERF_LOGS is enabled.
 */
export function logAdminPerf(endpoint: string, timings: AdminPerfTimings): void {
  if (!isAdminPerfLoggingEnabled()) {
    return;
  }

  const totalMs = timings.authMs + timings.dbMs;
  const authSourcePart = timings.authSource ? ` authSource=${timings.authSource}` : "";
  console.info(
    `[ADMIN_PERF] endpoint=${endpoint} total=${totalMs}ms auth=${timings.authMs}ms db=${timings.dbMs}ms${authSourcePart}`,
  );
}

/**
 * Block-level analytics timings.
 */
export function logAdminAnalyticsPerf(
  period: string,
  payload: { totalMs: number; blocks: Record<string, number> },
): void {
  if (!isAdminPerfLoggingEnabled()) {
    return;
  }

  const blockParts = Object.entries(payload.blocks)
    .map(([key, ms]) => `${key}=${ms}ms`)
    .join(' ');

  console.info(
    `[ADMIN_PERF] analytics period=${period} total=${payload.totalMs}ms ${blockParts}`,
  );
}

/**
 * Block-level stats calculator timings.
 */
export function logAdminStatsPerf(payload: {
  totalMs: number;
  blocks: Record<string, number>;
}): void {
  if (!isAdminPerfLoggingEnabled()) {
    return;
  }

  const blockParts = Object.entries(payload.blocks)
    .map(([key, ms]) => `${key}=${ms}ms`)
    .join(' ');

  console.info(`[ADMIN_PERF] stats total=${payload.totalMs}ms ${blockParts}`);
}

/**
 * Category product count SQL timings.
 */
export function logAdminCategoryCountsPerf(payload: {
  totalMs: number;
  categories: number;
  rows: number;
}): void {
  if (!isAdminPerfLoggingEnabled()) {
    return;
  }

  console.info(
    `[ADMIN_PERF] categoryCounts total=${payload.totalMs}ms categories=${payload.categories} rows=${payload.rows}`,
  );
}

/**
 * Measures auth + handler phases for an admin route handler.
 */
export async function withAdminPerfLog<T>(
  endpoint: string,
  run: (markAuthComplete: (authSource?: string) => void) => Promise<T>,
): Promise<T> {
  if (!isAdminPerfLoggingEnabled()) {
    return run(() => {});
  }

  const startedAt = Date.now();
  let authEndedAt = startedAt;
  let authSource: string | undefined;

  const markAuthComplete = (source?: string) => {
    if (authEndedAt === startedAt) {
      authEndedAt = Date.now();
      authSource = source;
    }
  };

  const result = await run(markAuthComplete);
  const finishedAt = Date.now();

  logAdminPerf(endpoint, {
    authMs: authEndedAt - startedAt,
    dbMs: finishedAt - authEndedAt,
    authSource,
  });

  return result;
}
