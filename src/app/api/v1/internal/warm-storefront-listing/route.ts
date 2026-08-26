import { NextResponse } from "next/server";
import { warmStorefrontListingCaches } from "@/lib/cache/storefront-listing-warmup";
import {
  WARMUP_INTERNAL_TOKEN_HEADER,
  getWarmupInternalToken,
} from "@/lib/cache/warmup-internal-token";

function isWarmupEnabled(): boolean {
  return process.env.HOME_CACHE_WARMUP !== "false" || process.env.CACHE_WARM_ON_START === "1";
}

function isWarmupAuthorized(req: Request): boolean {
  const secret = process.env.WARMUP_INTERNAL_SECRET?.trim();
  if (secret && req.headers.get("x-warmup-secret") === secret) {
    return true;
  }
  return req.headers.get(WARMUP_INTERNAL_TOKEN_HEADER) === getWarmupInternalToken();
}

export async function POST(req: Request) {
  if (!isWarmupEnabled()) {
    return NextResponse.json({ ok: false, reason: "disabled" }, { status: 404 });
  }
  if (!isWarmupAuthorized(req)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  await warmStorefrontListingCaches();
  return NextResponse.json({ ok: true });
}
