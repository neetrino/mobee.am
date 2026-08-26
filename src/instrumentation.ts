/**
 * Prefer IPv4 DNS order so Neon/Prisma can connect when local IPv6 is unreachable.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  // webpackIgnore: do not let webpack resolve the `node:` scheme into the client graph.
  const dns = await import(/* webpackIgnore: true */ "node:dns");
  try {
    dns.setDefaultResultOrder("ipv4first");
  } catch {
    // Node < 17 — ignore
  }

  const { assertProductionCoreEnv } = await import("@/config/env");
  assertProductionCoreEnv();

  scheduleStorefrontListingWarmup();
}

function scheduleStorefrontListingWarmup(): void {
  if (process.env.HOME_CACHE_WARMUP === "false" && process.env.CACHE_WARM_ON_START !== "1") {
    return;
  }

  const delayMs = Number(process.env.HOME_CACHE_WARMUP_DELAY_MS ?? "2000");
  const safeDelay = Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : 2000;

  globalThis.setTimeout(() => {
    void import("./lib/cache/trigger-storefront-listing-warmup").then((mod) =>
      mod.triggerStorefrontListingWarmupRequest(),
    );
  }, safeDelay);
}
