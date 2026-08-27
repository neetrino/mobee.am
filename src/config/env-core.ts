import { JWT_SECRET_MIN_LENGTH } from "@/config/env.constants";

export type OriginEnvValues = {
  APP_URL?: string;
  CORS_ORIGIN?: string;
  NEXT_PUBLIC_APP_URL?: string;
};

export function readOptionalEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function hasConfiguredOrigin(values: OriginEnvValues): boolean {
  return Boolean(values.APP_URL || values.CORS_ORIGIN || values.NEXT_PUBLIC_APP_URL);
}

export function isJwtSecretLengthValid(secret: string | undefined): boolean {
  return Boolean(secret && secret.length >= JWT_SECRET_MIN_LENGTH);
}

export type CoreEnvValues = OriginEnvValues & {
  DATABASE_URL?: string;
  JWT_SECRET?: string;
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
};

/**
 * Returns missing/invalid core names only. Never includes values.
 * Origin (`APP_URL` / CORS) is advisory: same-origin storefront can serve without it.
 */
export function collectMissingCoreEnvNames(input: CoreEnvValues): string[] {
  const missing: string[] = [];
  if (!input.DATABASE_URL) {
    missing.push("DATABASE_URL");
  }
  if (!isJwtSecretLengthValid(input.JWT_SECRET)) {
    missing.push("JWT_SECRET");
  }
  if (!input.UPSTASH_REDIS_REST_URL) {
    missing.push("UPSTASH_REDIS_REST_URL");
  }
  if (!input.UPSTASH_REDIS_REST_TOKEN) {
    missing.push("UPSTASH_REDIS_REST_TOKEN");
  }
  return missing;
}

export function readProcessOriginEnv(): OriginEnvValues {
  return {
    APP_URL: readOptionalEnv(process.env.APP_URL),
    CORS_ORIGIN: readOptionalEnv(process.env.CORS_ORIGIN),
    NEXT_PUBLIC_APP_URL: readOptionalEnv(process.env.NEXT_PUBLIC_APP_URL),
  };
}

export function collectMissingEdgeSecurityEnvNames(): string[] {
  const missing: string[] = [];
  if (!isJwtSecretLengthValid(readOptionalEnv(process.env.JWT_SECRET))) {
    missing.push("JWT_SECRET");
  }
  if (!readOptionalEnv(process.env.UPSTASH_REDIS_REST_URL)) {
    missing.push("UPSTASH_REDIS_REST_URL");
  }
  if (!readOptionalEnv(process.env.UPSTASH_REDIS_REST_TOKEN)) {
    missing.push("UPSTASH_REDIS_REST_TOKEN");
  }
  return missing;
}

export function isEdgeSecurityEnvValid(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  return collectMissingEdgeSecurityEnvNames().length === 0;
}

export function getEdgeJwtSecret(): string | undefined {
  return readOptionalEnv(process.env.JWT_SECRET);
}

export class MissingEnvError extends Error {
  readonly missing: string[];

  constructor(missing: string[]) {
    super(`Missing or invalid environment variables: ${missing.join(", ")}`);
    this.name = "MissingEnvError";
    this.missing = missing;
  }
}
