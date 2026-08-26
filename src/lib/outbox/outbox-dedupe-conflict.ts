function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function targetMentionsOutboxDedupeFields(target: unknown): boolean {
  if (Array.isArray(target)) {
    const fields = target.filter((item): item is string => typeof item === "string");
    return (
      fields.includes("eventType") &&
      fields.includes("aggregateType") &&
      fields.includes("aggregateId")
    );
  }
  if (typeof target === "string") {
    return target.includes("outbox_events_dedupe_uidx");
  }
  return false;
}

/** True when Prisma reports a unique conflict on outbox dedupe columns. */
export function isOutboxDedupeConflict(error: unknown): boolean {
  if (!isRecord(error) || error.code !== "P2002") {
    return false;
  }

  const meta = isRecord(error.meta) ? error.meta : null;
  if (targetMentionsOutboxDedupeFields(meta?.target)) {
    return true;
  }

  const message = typeof error.message === "string" ? error.message : "";
  return /outbox_events_dedupe_uidx/i.test(message);
}
