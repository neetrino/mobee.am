import {
  WARMUP_INTERNAL_TOKEN_HEADER,
  getWarmupInternalToken,
} from "@/lib/cache/warmup-internal-token";

const WARMUP_ROUTE_PATH = "/api/v1/internal/warm-storefront-listing";

function resolveWarmupBaseUrl(): string {
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }
  const port = process.env.PORT ?? "3000";
  return `http://127.0.0.1:${port}`;
}

/**
 * Loopback HTTP trigger so instrumentation never imports the Redis/Prisma chain.
 */
export async function triggerStorefrontListingWarmupRequest(): Promise<void> {
  const secret = process.env.WARMUP_INTERNAL_SECRET?.trim();
  const headers: Record<string, string> = {
    [WARMUP_INTERNAL_TOKEN_HEADER]: getWarmupInternalToken(),
  };
  if (secret) {
    headers["x-warmup-secret"] = secret;
  }

  try {
    await fetch(`${resolveWarmupBaseUrl()}${WARMUP_ROUTE_PATH}`, {
      method: "POST",
      headers,
    });
  } catch {
    // Best-effort: server may still be starting.
  }
}
