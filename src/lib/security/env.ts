import { z } from "zod";
import { logger } from "@/lib/utils/logger";

let productionEnvChecked = false;

const productionEnvSchema = z
  .object({
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    UPSTASH_REDIS_REST_URL: z.string().url(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
    PAYMENT_CALLBACK_SECRET: z.string().min(32).optional(),
    APP_URL: z.string().url().optional(),
    CORS_ORIGIN: z.string().min(1).optional(),
  })
  .refine(
    (env) => Boolean(env.APP_URL?.trim() || env.CORS_ORIGIN?.trim()),
    { message: "Set APP_URL or CORS_ORIGIN in production" }
  );

/**
 * Validates critical security env once per process in production.
 * Does not throw — logs errors so misconfiguration is visible in observability.
 */
export function assertProductionSecurityEnv(): void {
  if (productionEnvChecked || process.env.NODE_ENV !== "production") {
    return;
  }
  productionEnvChecked = true;

  const parsed = productionEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    logger.error("Production security env validation failed", {
      issues: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  if (!parsed.data.PAYMENT_CALLBACK_SECRET) {
    logger.error(
      "PAYMENT_CALLBACK_SECRET is not set in production; payment callbacks must not share JWT_SECRET"
    );
  }
}

export function isProductionSecurityEnvValid(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  return productionEnvSchema.safeParse(process.env).success;
}
