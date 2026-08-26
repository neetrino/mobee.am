/** Core production runtime names. Values must never appear in logs or errors. */
export const CORE_ENV_NAMES = [
  "DATABASE_URL",
  "JWT_SECRET",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
] as const;

export const PRODUCTION_ORIGIN_ENV_NAMES = [
  "APP_URL",
  "CORS_ORIGIN",
  "NEXT_PUBLIC_APP_URL",
] as const;

export const JWT_SECRET_MIN_LENGTH = 32;
export const PAYMENT_CALLBACK_SECRET_MIN_LENGTH = 32;

export const EMAIL_ENV_NAMES = ["RESEND_API_KEY", "RESEND_FROM_EMAIL", "EMAIL_FROM"] as const;
export const R2_ENV_NAMES = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_URL",
] as const;

export const PAYMENT_FEATURE_ENV_NAMES = [
  "PAYMENT_CALLBACK_SECRET",
  "IDRAM_PAYMENT_URL",
  "ARCA_PAYMENT_URL",
  "APARIK_NOTIFICATION_EMAIL",
] as const;

export const OUTBOX_FEATURE_ENV_NAMES = ["OUTBOX_DRAIN_SECRET"] as const;

export type CoreEnvName = (typeof CORE_ENV_NAMES)[number];
