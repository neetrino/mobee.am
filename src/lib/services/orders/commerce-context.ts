import type { CommerceActorSource, CommerceRequestContext } from "./order-transition.types";

export function createCommerceContext(input: {
  requestId: string;
  actorUserId?: string | null;
  source: CommerceActorSource;
  note?: string;
}): CommerceRequestContext {
  return {
    requestId: input.requestId,
    actorUserId: input.actorUserId ?? null,
    source: input.source,
    note: input.note,
  };
}
