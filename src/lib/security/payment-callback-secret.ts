import { logger } from "@/lib/utils/logger";

let loggedJwtFallback = false;

/**
 * Dedicated secret for payment callbacks; falls back to JWT_SECRET for existing deploys.
 */
export function getPaymentCallbackSecret(): string {
  const dedicated = process.env.PAYMENT_CALLBACK_SECRET?.trim();
  if (dedicated) {
    return dedicated;
  }

  const jwtSecret = process.env.JWT_SECRET?.trim() ?? "";
  if (jwtSecret && !loggedJwtFallback) {
    loggedJwtFallback = true;
    logger.warn(
      "PAYMENT_CALLBACK_SECRET is not set; using JWT_SECRET for payment callbacks. Set PAYMENT_CALLBACK_SECRET in production."
    );
  }

  return jwtSecret;
}
