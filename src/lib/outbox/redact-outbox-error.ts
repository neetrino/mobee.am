const MAX_OUTBOX_ERROR_LENGTH = 240;

function readErrorName(error: unknown): string {
  if (error instanceof Error && error.name) {
    return error.name;
  }
  if (typeof error === "object" && error !== null && "name" in error) {
    const name = (error as { name?: unknown }).name;
    if (typeof name === "string" && name.length > 0) {
      return name;
    }
  }
  return "Error";
}

function readSafeMessage(error: unknown): string | undefined {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : undefined;
  }
  return undefined;
}

/** Stores a short redacted error summary safe for production outbox rows. */
export function redactOutboxError(error: unknown): string {
  const production = process.env.NODE_ENV === "production";
  if (production) {
    return readErrorName(error).slice(0, MAX_OUTBOX_ERROR_LENGTH);
  }

  const message = readSafeMessage(error);
  if (!message) {
    return readErrorName(error).slice(0, MAX_OUTBOX_ERROR_LENGTH);
  }

  return message
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/re_[A-Za-z0-9]+/g, "[redacted]")
    .slice(0, MAX_OUTBOX_ERROR_LENGTH);
}
