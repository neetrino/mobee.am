import { NextResponse } from "next/server";
import { db } from "@white-shop/db";

const HEALTH_CHECK_TIMEOUT_MS = 5000;

/**
 * GET /api/health
 * Returns 200 if DB is reachable, 503 otherwise.
 * Used by load balancers and monitoring.
 */
export async function GET() {
  const start = Date.now();
  try {
    await Promise.race([
      db.$queryRaw`SELECT 1`,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("DB timeout")), HEALTH_CHECK_TIMEOUT_MS)
      ),
    ]);
    const latencyMs = Date.now() - start;
    return NextResponse.json(
      {
        status: "ok",
        db: "ok",
        latencyMs,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        db: "unavailable",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
