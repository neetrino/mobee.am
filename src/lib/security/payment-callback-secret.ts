import { logger } from "@/lib/utils/logger";

let loggedJwtFallback = false;

/**
 * Dedicated secret for payment callbacks.
 * In production JWT_SECRET fallback is disabled — set PAYMENT_CALLBACK_SECRET.
 */
export function getPaymentCallbackSecret(): string {
  const dedicated = process.env.PAYMENT_CALLBACK_SECRET?.trim();
  if (dedicated) {
    return dedicated;
  }

  if (process.env.NODE_ENV === "production") {
    if (!loggedJwtFallback) {
      loggedJwtFallback = true;
      logger.error(
        "PAYMENT_CALLBACK_SECRET is required in production; payment callbacks are rejected until it is set"
      );
    }
    return "";
  }

  const jwtSecret = process.env.JWT_SECRET?.trim() ?? "";
  if (jwtSecret && !loggedJwtFallback) {
    loggedJwtFallback = true;
    logger.warn(
      "PAYMENT_CALLBACK_SECRET is not set; using JWT_SECRET for payment callbacks in non-production only"
    );
  }

  return jwtSecret;
}
