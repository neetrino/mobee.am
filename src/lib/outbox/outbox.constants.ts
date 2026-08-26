export const OUTBOX_EVENT_TYPE = {
  APARIK_CHECKOUT_EMAIL: "aparik.checkout_email",
} as const;

export const OUTBOX_AGGREGATE_TYPE = {
  ORDER: "Order",
} as const;

export const OUTBOX_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export const OUTBOX_PAYLOAD_VERSION = {
  APARIK_CHECKOUT_EMAIL: 1,
} as const;

export const OUTBOX_MAX_ATTEMPTS = 8;
export const OUTBOX_BACKOFF_BASE_MS = 30_000;
export const OUTBOX_BACKOFF_CAP_MS = 3_600_000;
export const OUTBOX_STALE_PROCESSING_MS = 60_000;
export const OUTBOX_DRAIN_BATCH_SIZE = 10;
