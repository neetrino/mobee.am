/**
 * Server-only environment contract.
 * Do not import from Client Components or other browser bundles.
 */
import { z } from "zod";
import {
  JWT_SECRET_MIN_LENGTH,
  PAYMENT_CALLBACK_SECRET_MIN_LENGTH,
} from "@/config/env.constants";
import { collectMissingCoreEnvNames, MissingEnvError } from "@/config/env-core";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/utils/logger";

if (typeof window !== "undefined") {
  throw new Error("src/config/env.ts must not be imported in the client bundle");
}

function optionalEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1).optional(),
  DIRECT_URL: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(1).optional(),
  JWT_EXPIRES_IN: z.string().min(1).optional(),
  APP_URL: z.string().min(1).optional(),
  CORS_ORIGIN: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.string().min(1).optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  REDIS_URL: z.string().min(1).optional(),
  PAYMENT_CALLBACK_SECRET: z.string().min(1).optional(),
  IDRAM_PAYMENT_URL: z.string().min(1).optional(),
  ARCA_PAYMENT_URL: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).optional(),
  APARIK_NOTIFICATION_EMAIL: z.string().min(1).optional(),
  OUTBOX_DRAIN_SECRET: z.string().min(1).optional(),
  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET_NAME: z.string().min(1).optional(),
  R2_PUBLIC_URL: z.string().min(1).optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

function isBuildPhase(): boolean {
  const phase = process.env.NEXT_PHASE;
  return phase === "phase-production-build" || phase === "phase-production-compile";
}

function readEnvInput(): Record<string, string | undefined> {
  return {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: optionalEnv(process.env.DATABASE_URL),
    DIRECT_URL: optionalEnv(process.env.DIRECT_URL),
    JWT_SECRET: optionalEnv(process.env.JWT_SECRET),
    JWT_EXPIRES_IN: optionalEnv(process.env.JWT_EXPIRES_IN),
    APP_URL: optionalEnv(process.env.APP_URL),
    CORS_ORIGIN: optionalEnv(process.env.CORS_ORIGIN),
    NEXT_PUBLIC_APP_URL: optionalEnv(process.env.NEXT_PUBLIC_APP_URL),
    UPSTASH_REDIS_REST_URL: optionalEnv(process.env.UPSTASH_REDIS_REST_URL),
    UPSTASH_REDIS_REST_TOKEN: optionalEnv(process.env.UPSTASH_REDIS_REST_TOKEN),
    REDIS_URL: optionalEnv(process.env.REDIS_URL),
    PAYMENT_CALLBACK_SECRET: optionalEnv(process.env.PAYMENT_CALLBACK_SECRET),
    IDRAM_PAYMENT_URL: optionalEnv(process.env.IDRAM_PAYMENT_URL),
    ARCA_PAYMENT_URL: optionalEnv(process.env.ARCA_PAYMENT_URL),
    RESEND_API_KEY: optionalEnv(process.env.RESEND_API_KEY),
    RESEND_FROM_EMAIL: optionalEnv(process.env.RESEND_FROM_EMAIL),
    EMAIL_FROM: optionalEnv(process.env.EMAIL_FROM),
    APARIK_NOTIFICATION_EMAIL: optionalEnv(process.env.APARIK_NOTIFICATION_EMAIL),
    OUTBOX_DRAIN_SECRET: optionalEnv(process.env.OUTBOX_DRAIN_SECRET),
    R2_ACCOUNT_ID: optionalEnv(process.env.R2_ACCOUNT_ID),
    R2_ACCESS_KEY_ID: optionalEnv(process.env.R2_ACCESS_KEY_ID),
    R2_SECRET_ACCESS_KEY: optionalEnv(process.env.R2_SECRET_ACCESS_KEY),
    R2_BUCKET_NAME: optionalEnv(process.env.R2_BUCKET_NAME),
    R2_PUBLIC_URL: optionalEnv(process.env.R2_PUBLIC_URL),
  };
}

export function resetEnvCache(): void {
  // Env is read per call so tests can mutate process.env safely.
}

export function getEnv(): AppEnv {
  const parsed = envSchema.safeParse(readEnvInput());
  if (!parsed.success) {
    const names = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] || "unknown")))];
    throw new Error(`Invalid environment configuration: ${names.join(", ")}`);
  }

  return parsed.data;
}

/**
 * Returns missing or invalid core variable names. Never includes values.
 */
export function getMissingCoreEnvNames(env: AppEnv = getEnv()): string[] {
  return collectMissingCoreEnvNames({
    DATABASE_URL: env.DATABASE_URL,
    JWT_SECRET: env.JWT_SECRET,
    UPSTASH_REDIS_REST_URL: env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: env.UPSTASH_REDIS_REST_TOKEN,
    APP_URL: env.APP_URL,
    CORS_ORIGIN: env.CORS_ORIGIN,
    NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
  });
}

export function assertProductionCoreEnv(): void {
  if (process.env.NODE_ENV !== "production" || isBuildPhase()) {
    return;
  }

  const env = getEnv();
  const missing = getMissingCoreEnvNames(env);
  if (missing.length > 0) {
    logger.error("Production core env validation failed", { missing });
    throw new MissingEnvError(missing);
  }

  if (!env.PAYMENT_CALLBACK_SECRET || env.PAYMENT_CALLBACK_SECRET.length < PAYMENT_CALLBACK_SECRET_MIN_LENGTH) {
    logger.error("PAYMENT_CALLBACK_SECRET is missing or too short for production payments");
  }
}

function missingFeature(names: string[]): never {
  logger.error("Feature env missing", { missing: names });
  throw AppError.serviceUnavailable();
}

export function requireJwtSecret(): string {
  const secret = getEnv().JWT_SECRET;
  if (!secret) {
    logger.error("JWT_SECRET is not set", { missing: ["JWT_SECRET"] });
    throw AppError.internal();
  }
  if (process.env.NODE_ENV === "production" && secret.length < JWT_SECRET_MIN_LENGTH) {
    logger.error("JWT_SECRET is invalid", { missing: ["JWT_SECRET"] });
    throw AppError.internal();
  }
  return secret;
}

export function requireDatabaseUrl(): string {
  const url = getEnv().DATABASE_URL;
  if (!url) {
    logger.error("DATABASE_URL is not set", { missing: ["DATABASE_URL"] });
    throw AppError.databaseUnavailable();
  }
  return url;
}

export type UpstashRedisConfig = {
  url: string;
  token: string;
};

export function getUpstashRedisConfig(): UpstashRedisConfig | null {
  const env = getEnv();
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return { url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN };
}

export function requireUpstashRedisConfig(): UpstashRedisConfig {
  const config = getUpstashRedisConfig();
  if (!config) {
    missingFeature(["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]);
  }
  return config;
}

export function getEmailConfig(): { apiKey: string; from: string } | null {
  const env = getEnv();
  const from = env.RESEND_FROM_EMAIL || env.EMAIL_FROM;
  if (!env.RESEND_API_KEY || !from) {
    return null;
  }
  return { apiKey: env.RESEND_API_KEY, from };
}

export function requireEmailConfig(): { apiKey: string; from: string } {
  const config = getEmailConfig();
  if (!config) {
    missingFeature(["RESEND_API_KEY", "RESEND_FROM_EMAIL"]);
  }
  return config;
}

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
};

export function getR2Config(): R2Config | null {
  const env = getEnv();
  if (
    !env.R2_ACCOUNT_ID ||
    !env.R2_ACCESS_KEY_ID ||
    !env.R2_SECRET_ACCESS_KEY ||
    !env.R2_BUCKET_NAME ||
    !env.R2_PUBLIC_URL
  ) {
    return null;
  }
  return {
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucketName: env.R2_BUCKET_NAME,
    publicUrl: env.R2_PUBLIC_URL,
  };
}

export function getPaymentCallbackSecretValue(): string | undefined {
  return getEnv().PAYMENT_CALLBACK_SECRET;
}

export function getIdramPaymentUrl(): string | undefined {
  return getEnv().IDRAM_PAYMENT_URL;
}

export function getArcaPaymentUrl(): string | undefined {
  return getEnv().ARCA_PAYMENT_URL;
}

export function getAparikNotificationEmail(): string | undefined {
  return getEnv().APARIK_NOTIFICATION_EMAIL;
}

export function getOutboxDrainSecretValue(): string | undefined {
  return getEnv().OUTBOX_DRAIN_SECRET;
}

export function getRedisTcpUrl(): string | undefined {
  return getEnv().REDIS_URL;
}

export function getJwtExpiresIn(): string | undefined {
  return getEnv().JWT_EXPIRES_IN;
}

export function getAppBaseUrl(): string | undefined {
  const env = getEnv();
  return env.APP_URL || env.NEXT_PUBLIC_APP_URL;
}
