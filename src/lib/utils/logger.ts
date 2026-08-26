import { redactLogContext, redactText } from "@/lib/utils/redact";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

const KNOWN_FIELDS = [
  "requestId",
  "route",
  "method",
  "status",
  "durationMs",
  "errorCode",
  "errorName",
  "userId",
] as const;

const PRODUCTION_STRIP_KEYS = new Set(["errorMessage", "stack", "message", "meta"]);

function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function pickKnownFields(
  context: Record<string, unknown>,
): Record<string, unknown> {
  const known: Record<string, unknown> = {};
  for (const field of KNOWN_FIELDS) {
    if (context[field] !== undefined) {
      known[field] = context[field];
    }
  }
  return known;
}

function stripProductionUnsafe(context: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (PRODUCTION_STRIP_KEYS.has(key)) {
      continue;
    }
    output[key] = value;
  }
  return output;
}

function writeJson(level: LogLevel, message: string, context?: LogContext): void {
  const redacted = redactLogContext(
    isProduction() && context ? stripProductionUnsafe(context) : context,
  );
  const known = redacted ? pickKnownFields(redacted) : {};
  const rest = { ...redacted };
  for (const field of KNOWN_FIELDS) {
    delete rest[field];
  }
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message: redactText(message),
    ...known,
    ...(Object.keys(rest).length > 0 ? { metadata: rest } : {}),
  };

  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.info(line);
}

function writeDev(level: LogLevel, message: string, context?: LogContext): void {
  const redacted = redactLogContext(context);
  const timestamp = new Date().toISOString();
  const contextStr = redacted ? ` ${JSON.stringify(redacted)}` : "";
  const line = `[${timestamp}] [${level.toUpperCase()}] ${redactText(message)}${contextStr}`;
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  if (level === "debug") {
    console.debug(line);
    return;
  }
  console.info(line);
}

class Logger {
  debug(message: string, context?: LogContext): void {
    if (!isDevelopment()) {
      return;
    }
    writeDev("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    if (isProduction()) {
      writeJson("info", message, context);
      return;
    }
    if (isDevelopment()) {
      writeDev("info", message, context);
    }
  }

  warn(message: string, context?: LogContext): void {
    if (isProduction()) {
      writeJson("warn", message, context);
      return;
    }
    writeDev("warn", message, context);
  }

  error(message: string, context?: LogContext): void {
    if (isProduction()) {
      writeJson("error", message, context);
      return;
    }
    writeDev("error", message, context);
  }

  log(message: string, context?: LogContext): void {
    this.info(message, context);
  }
}

export const logger = new Logger();
