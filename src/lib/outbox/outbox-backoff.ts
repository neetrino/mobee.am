import {
  OUTBOX_BACKOFF_BASE_MS,
  OUTBOX_BACKOFF_CAP_MS,
} from "./outbox.constants";

/** Exponential backoff from the first retry attempt, capped at one hour. */
export function computeOutboxBackoffMs(attemptCount: number): number {
  const exponent = Math.max(0, attemptCount - 1);
  const delay = OUTBOX_BACKOFF_BASE_MS * 2 ** exponent;
  return Math.min(delay, OUTBOX_BACKOFF_CAP_MS);
}

export function computeOutboxRetryAvailableAt(attemptCount: number, now = new Date()): Date {
  return new Date(now.getTime() + computeOutboxBackoffMs(attemptCount));
}
