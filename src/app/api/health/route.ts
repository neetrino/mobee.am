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
  } catch {
    const body: { status: string; db: string; detail?: string } = {
      status: "error",
      db: "unavailable",
    };
    if (process.env.NODE_ENV !== "production") {
      body.detail = "Database health check failed";
    }
    return NextResponse.json(body, { status: 503 });
  }
}
