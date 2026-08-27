import { z } from "zod";
import { JWT_SECRET_MIN_LENGTH } from "@/config/env.constants";
import { hasConfiguredOrigin, readOptionalEnv, readProcessOriginEnv } from "@/config/env-core";
import { logger } from "@/lib/utils/logger";

let productionEnvChecked = false;

const productionEnvSchema = z
  .object({
    JWT_SECRET: z.string().min(JWT_SECRET_MIN_LENGTH, "JWT_SECRET must be at least 32 characters"),
    UPSTASH_REDIS_REST_URL: z.string().url(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
    PAYMENT_CALLBACK_SECRET: z.string().min(JWT_SECRET_MIN_LENGTH).optional(),
    APP_URL: z.string().url().optional(),
    CORS_ORIGIN: z.string().min(1).optional(),
    NEXT_PUBLIC_APP_URL: z.string().min(1).optional(),
  })
  .refine(
    (env) =>
      hasConfiguredOrigin({
        APP_URL: env.APP_URL,
        CORS_ORIGIN: env.CORS_ORIGIN,
        NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
      }),
    { message: "Set APP_URL, CORS_ORIGIN, or NEXT_PUBLIC_APP_URL in production" }
  );

/**
 * Validates critical security env once per process in production.
 * Node-only: logs missing names including origin. Missing APP_URL does not block serving.
 */
export function assertProductionSecurityEnv(): void {
  if (productionEnvChecked || process.env.NODE_ENV !== "production") {
    return;
  }
  productionEnvChecked = true;

  const parsed = productionEnvSchema.safeParse({
    JWT_SECRET: readOptionalEnv(process.env.JWT_SECRET),
    UPSTASH_REDIS_REST_URL: readOptionalEnv(process.env.UPSTASH_REDIS_REST_URL),
    UPSTASH_REDIS_REST_TOKEN: readOptionalEnv(process.env.UPSTASH_REDIS_REST_TOKEN),
    PAYMENT_CALLBACK_SECRET: readOptionalEnv(process.env.PAYMENT_CALLBACK_SECRET),
    ...readProcessOriginEnv(),
  });
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
  return productionEnvSchema.safeParse({
    JWT_SECRET: readOptionalEnv(process.env.JWT_SECRET),
    UPSTASH_REDIS_REST_URL: readOptionalEnv(process.env.UPSTASH_REDIS_REST_URL),
    UPSTASH_REDIS_REST_TOKEN: readOptionalEnv(process.env.UPSTASH_REDIS_REST_TOKEN),
    PAYMENT_CALLBACK_SECRET: readOptionalEnv(process.env.PAYMENT_CALLBACK_SECRET),
    ...readProcessOriginEnv(),
  }).success;
}
