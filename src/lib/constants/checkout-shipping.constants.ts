/**
 * Business rules for checkout shipping (AMD).
 * Express surcharge can be tuned via env without code changes.
 */
export const FREE_SHIPPING_THRESHOLD_AMD = 8000;

/** When no admin price is configured and city matches Yerevan. */
export const YEREVAN_FALLBACK_SHIPPING_BELOW_THRESHOLD_AMD = 1000;

const DEFAULT_EXPRESS_SURCHARGE_AMD = 2000;

function parseNonNegativeIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

export const EXPRESS_DELIVERY_SURCHARGE_AMD = parseNonNegativeIntEnv(
  "CHECKOUT_EXPRESS_DELIVERY_SURCHARGE_AMD",
  DEFAULT_EXPRESS_SURCHARGE_AMD
);
