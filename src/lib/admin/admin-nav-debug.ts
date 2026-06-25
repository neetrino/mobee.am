/**
 * Temporary admin navigation performance instrumentation.
 * Remove after debug session. Gated by NODE_ENV=development only.
 */

declare global {
  interface Window {
    __adminNavStartedAt?: number;
    __adminNavTarget?: string;
    __adminNavDataStartedAt?: number;
    __adminNavRouteRenderAt?: number;
  }
}

const ENABLED =
  typeof process !== 'undefined' &&
  process.env.NODE_ENV === 'development';

export function adminNavMarkClick(targetPath: string): void {
  if (!ENABLED || typeof window === 'undefined') return;
  const now = performance.now();
  window.__adminNavStartedAt = now;
  window.__adminNavTarget = targetPath;
  window.__adminNavDataStartedAt = undefined;
  window.__adminNavRouteRenderAt = undefined;
  performance.mark(`admin-nav-click:${targetPath}`);
  console.info(`[ADMIN_NAV] click target=${targetPath} t=${now.toFixed(0)}ms`);
}

export function adminNavMarkRouteRender(route: string): void {
  if (!ENABLED || typeof window === 'undefined') return;
  const now = performance.now();
  window.__adminNavRouteRenderAt = now;
  const clickAt = window.__adminNavStartedAt;
  const routeRenderMs = clickAt != null ? Math.round(now - clickAt) : null;
  performance.mark(`admin-page-render:${route}`);
  console.info(
    `[ADMIN_NAV] routeRender route=${route} routeRender=${routeRenderMs ?? '?'}ms`,
  );
}

export function adminNavMarkDataStart(route: string): void {
  if (!ENABLED || typeof window === 'undefined') return;
  window.__adminNavDataStartedAt = performance.now();
  console.info(`[ADMIN_NAV] dataStart route=${route}`);
}

export function adminNavMarkDataDone(route: string): void {
  if (!ENABLED || typeof window === 'undefined') return;
  const dataStart = window.__adminNavDataStartedAt;
  const dataMs = dataStart != null ? Math.round(performance.now() - dataStart) : null;
  console.info(`[ADMIN_NAV] dataDone route=${route} data=${dataMs ?? '?'}ms`);
}

export function adminNavMarkPageReady(route: string): void {
  if (!ENABLED || typeof window === 'undefined') return;
  const now = performance.now();
  const clickAt = window.__adminNavStartedAt;
  const routeRenderAt = window.__adminNavRouteRenderAt;
  const dataStart = window.__adminNavDataStartedAt;

  const totalMs = clickAt != null ? Math.round(now - clickAt) : null;
  const routeRenderMs =
    clickAt != null && routeRenderAt != null
      ? Math.round(routeRenderAt - clickAt)
      : null;
  const dataMs =
    dataStart != null ? Math.round(now - dataStart) : null;
  const renderAfterDataMs =
    dataStart != null && routeRenderAt != null
      ? Math.round(now - Math.max(routeRenderAt, dataStart))
      : null;

  const target = window.__adminNavTarget ?? route;
  try {
    performance.mark(`admin-page-ready:${route}`);
    performance.measure(
      `admin-nav-total:${route}`,
      `admin-nav-click:${target}`,
      `admin-page-ready:${route}`,
    );
  } catch {
    // marks may be missing on direct URL load
  }

  console.info(
    `[ADMIN_NAV] target=${target} total=${totalMs ?? '?'}ms routeRender=${routeRenderMs ?? '?'}ms data=${dataMs ?? '?'}ms render=${renderAfterDataMs ?? '?'}ms`,
  );
}

export function adminNavMarkMount(component: string): () => void {
  if (!ENABLED) return () => undefined;
  console.info(`[MOUNT] ${component}`);
  return () => console.info(`[UNMOUNT] ${component}`);
}
