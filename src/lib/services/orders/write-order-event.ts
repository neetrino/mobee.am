import { Prisma } from "@white-shop/db";
import type { CommerceRequestContext } from "./order-transition.types";

export interface OrderEventWrite {
  orderId: string;
  type: string;
  fromState: string | null;
  toState: string | null;
  isCustomerVisible: boolean;
  data: Prisma.InputJsonValue;
  provider?: string | null;
  providerEventId?: string | null;
}

export async function createOrderEvent(
  tx: Prisma.TransactionClient,
  context: CommerceRequestContext,
  input: OrderEventWrite,
): Promise<void> {
  await tx.orderEvent.create({
    data: {
      orderId: input.orderId,
      type: input.type,
      fromState: input.fromState,
      toState: input.toState,
      actorUserId: context.actorUserId,
      isCustomerVisible: input.isCustomerVisible,
      data: input.data,
      correlationId: context.requestId,
      provider: input.provider ?? null,
      providerEventId: input.providerEventId ?? null,
    },
  });
}
