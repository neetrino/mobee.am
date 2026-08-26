import { NextRequest, NextResponse } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import { runApiRoute } from "@/lib/errors/run-api-route";
import { drainOutboxBatch } from "@/lib/outbox/drain-outbox";
import {
  getOutboxDrainSecret,
  verifyOutboxDrainSecret,
} from "@/lib/security/outbox-drain-secret";

const OUTBOX_DRAIN_SECRET_HEADER = "x-outbox-drain-secret";

export async function POST(req: NextRequest) {
  return runApiRoute(req, async () => {
    if (!getOutboxDrainSecret()) {
      throw AppError.serviceUnavailable();
    }

    const provided = req.headers.get(OUTBOX_DRAIN_SECRET_HEADER);
    if (!verifyOutboxDrainSecret(provided)) {
      throw AppError.unauthorized("Invalid outbox drain credentials");
    }

    const result = await drainOutboxBatch();
    return NextResponse.json(result);
  });
}
