import { timingSafeEqual } from "node:crypto";
import { getOutboxDrainSecretValue } from "@/config/env";
import { logger } from "@/lib/utils/logger";

let loggedMissingSecret = false;

export function getOutboxDrainSecret(): string {
  const secret = getOutboxDrainSecretValue() ?? "";
  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production" && !loggedMissingSecret) {
    loggedMissingSecret = true;
    logger.error("OUTBOX_DRAIN_SECRET is required in production; outbox drain is rejected until it is set");
  }

  return "";
}

export function verifyOutboxDrainSecret(provided: string | null): boolean {
  const expected = getOutboxDrainSecret();
  if (!expected || !provided) {
    return false;
  }

  const received = Buffer.from(provided, "utf8");
  const target = Buffer.from(expected, "utf8");
  if (received.length !== target.length) {
    return false;
  }

  return timingSafeEqual(received, target);
}
