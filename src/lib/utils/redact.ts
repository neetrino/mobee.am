const REDACTED = "[Redacted]";
const MAX_REDACT_DEPTH = 6;

const SENSITIVE_KEY_RE =
  /password|passwd|token|authorization|cookie|secret|apikey|api_key|accessToken|access_token|refreshToken|refresh_token|database_url|direct_url|jwt|signature|^sig$|card|cvv|pan|bearer|errorMessage|^stack$|providerResponse|rawBody/i;

const SENSITIVE_EXACT_KEYS = new Set([
  "DATABASE_URL",
  "DIRECT_URL",
  "JWT_SECRET",
  "PAYMENT_CALLBACK_SECRET",
  "UPSTASH_REDIS_REST_TOKEN",
  "UPSTASH_REDIS_REST_URL",
  "REDIS_URL",
  "RESEND_API_KEY",
  "R2_SECRET_ACCESS_KEY",
  "R2_ACCESS_KEY_ID",
  "IDRAM_SECRET_KEY",
  "ARCA_SECRET_KEY",
  "authorization",
  "Authorization",
  "cookie",
  "Cookie",
  "errorMessage",
  "stack",
]);

const CONNECTION_STRING_RE =
  /(?:postgres(?:ql)?|redis|rediss|mongodb(?:\+srv)?|mysql|amqp):\/\/[^\s"'`]+/gi;
const BEARER_RE = /Bearer\s+[A-Za-z0-9._\-+=/]+/gi;
const QUERY_SECRET_RE =
  /(?:password|token|secret|signature|sig|apikey|api_key)=[^\s&"']+/gi;

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_EXACT_KEYS.has(key) || SENSITIVE_KEY_RE.test(key);
}

export function redactText(value: string): string {
  return value
    .replace(CONNECTION_STRING_RE, REDACTED)
    .replace(BEARER_RE, `Bearer ${REDACTED}`)
    .replace(QUERY_SECRET_RE, (match) => `${match.split("=")[0]}=${REDACTED}`);
}

function redactUnknown(value: unknown, depth: number): unknown {
  if (depth > MAX_REDACT_DEPTH) {
    return REDACTED;
  }
  if (typeof value === "string") {
    return redactText(value);
  }
  if (typeof value !== "object" || value === null) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactUnknown(item, depth + 1));
  }
  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    output[key] = isSensitiveKey(key) ? REDACTED : redactUnknown(nested, depth + 1);
  }
  return output;
}

export function redactLogContext(
  context: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!context) {
    return undefined;
  }
  return redactUnknown(context, 0) as Record<string, unknown>;
}

export function containsSensitiveValue(value: string): boolean {
  CONNECTION_STRING_RE.lastIndex = 0;
  BEARER_RE.lastIndex = 0;
  QUERY_SECRET_RE.lastIndex = 0;
  return CONNECTION_STRING_RE.test(value) || BEARER_RE.test(value) || QUERY_SECRET_RE.test(value);
}
