import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@white-shop/db";
import { getDefaultCurrencyRates } from "@/lib/checkout/checkout-email-money";
import { ordersService } from "@/lib/services/orders.service";
import { adminService } from "@/lib/services/admin.service";
import type { CheckoutData } from "@/lib/types/checkout";
import { drainOutboxBatch } from "@/lib/outbox/drain-outbox";
import {
  OUTBOX_EVENT_TYPE,
  OUTBOX_AGGREGATE_TYPE,
  OUTBOX_STATUS,
} from "@/lib/outbox/outbox.constants";
import { createVariantFixture } from "./phase4-integration.helpers";

const enabled = process.env.PHASE4_INTEGRATION === "1";
const describePhase6 = enabled ? describe : describe.skip;

const sendAparikCheckoutEmail = vi.fn();

vi.mock("@/lib/email/send-aparik-checkout-email", () => ({
  sendAparikCheckoutEmail: (...args: unknown[]) => sendAparikCheckoutEmail(...args),
}));

vi.mock("@/lib/outbox/trigger-outbox-drain", () => ({
  triggerOutboxDrainBestEffort: vi.fn(),
}));

const ACKNOWLEDGEMENTS = {
  deliverySupplyTerms: true,
  inspectionAtDelivery: true,
  orderVerification: true,
  returnsPolicy: true,
} as const;

function checkoutContext() {
  return {
    requestId: randomUUID(),
    actorUserId: null,
    source: "checkout" as const,
  };
}

function aparikGuestCheckout(input: {
  productId: string;
  variantId: string;
  suffix: string;
}): CheckoutData {
  return {
    email: `aparik-${input.suffix}@phase6.test`,
    phone: `+37477${input.suffix.replace(/\D/g, "").padEnd(6, "0").slice(0, 6)}`,
    shippingMethod: "pickup",
    paymentMethod: "aparik",
    items: [{ productId: input.productId, variantId: input.variantId, quantity: 1 }],
    acknowledgements: ACKNOWLEDGEMENTS,
  };
}

describePhase6("Phase 6 outbox integration", () => {
  beforeEach(() => {
    sendAparikCheckoutEmail.mockReset();
    sendAparikCheckoutEmail.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("enqueues one outbox row on aparik first-write checkout", async () => {
    const sku = `p6a-${randomUUID().slice(0, 8)}`;
    const { product, variant } = await createVariantFixture(db, { sku, stock: 2 });
    const payload = aparikGuestCheckout({ productId: product.id, variantId: variant.id, suffix: sku });

    const result = await ordersService.checkout(
      payload,
      undefined,
      "http://localhost:3000",
      checkoutContext(),
    );

    expect(result.nextAction).toBe("view_order");
    expect(await db.outboxEvent.count()).toBe(1);
    const row = await db.outboxEvent.findFirst({
      where: {
        eventType: OUTBOX_EVENT_TYPE.APARIK_CHECKOUT_EMAIL,
        aggregateType: OUTBOX_AGGREGATE_TYPE.ORDER,
        aggregateId: result.order.id,
      },
    });
    expect(row).not.toBeNull();
    expect(row?.payloadVersion).toBe(1);
  });

  it("does not enqueue a second outbox row on Phase 5 replay", async () => {
    const sku = `p6r-${randomUUID().slice(0, 8)}`;
    const { product, variant } = await createVariantFixture(db, { sku, stock: 2 });
    const payload = aparikGuestCheckout({ productId: product.id, variantId: variant.id, suffix: sku });
    const idempotencyKey = `phase6-${sku}-replay`;
    const context = checkoutContext();

    const first = await ordersService.checkout(
      payload,
      undefined,
      "http://localhost:3000",
      context,
      { idempotencyKey },
    );
    await ordersService.checkout(
      payload,
      undefined,
      "http://localhost:3000",
      { ...checkoutContext(), requestId: randomUUID() },
      { idempotencyKey },
    );

    expect(await db.outboxEvent.count({ where: { aggregateId: first.order.id } })).toBe(1);
  });

  it("keeps the order when email delivery fails and records retry state", async () => {
    sendAparikCheckoutEmail.mockRejectedValue(new Error("Resend unavailable"));
    const sku = `p6f-${randomUUID().slice(0, 8)}`;
    const { product, variant } = await createVariantFixture(db, { sku, stock: 2 });
    const payload = aparikGuestCheckout({ productId: product.id, variantId: variant.id, suffix: sku });

    const result = await ordersService.checkout(
      payload,
      undefined,
      "http://localhost:3000",
      checkoutContext(),
    );

    expect(await db.order.count({ where: { id: result.order.id } })).toBe(1);
    await drainOutboxBatch();

    const row = await db.outboxEvent.findFirst({ where: { aggregateId: result.order.id } });
    expect(row?.status).toBe(OUTBOX_STATUS.PENDING);
    expect(row?.attemptCount).toBe(1);
    expect(row?.lastError).toBeTruthy();
  });

  it("marks outbox rows completed after successful drain", async () => {
    const sku = `p6d-${randomUUID().slice(0, 8)}`;
    const { product, variant } = await createVariantFixture(db, { sku, stock: 2 });
    const payload = aparikGuestCheckout({ productId: product.id, variantId: variant.id, suffix: sku });

    const result = await ordersService.checkout(
      payload,
      undefined,
      "http://localhost:3000",
      checkoutContext(),
    );

    await drainOutboxBatch();

    const row = await db.outboxEvent.findFirst({ where: { aggregateId: result.order.id } });
    expect(row?.status).toBe(OUTBOX_STATUS.COMPLETED);
    expect(row?.processedAt).not.toBeNull();
    expect(sendAparikCheckoutEmail).toHaveBeenCalled();
  });

  it("creates order and outbox when getSettings fails before checkout transaction", async () => {
    vi.spyOn(adminService, "getSettings").mockRejectedValueOnce(new Error("settings unavailable"));

    const sku = `p6s-${randomUUID().slice(0, 8)}`;
    const { product, variant } = await createVariantFixture(db, { sku, stock: 2 });
    const payload = aparikGuestCheckout({ productId: product.id, variantId: variant.id, suffix: sku });

    const result = await ordersService.checkout(
      payload,
      undefined,
      "http://localhost:3000",
      checkoutContext(),
    );

    expect(await db.order.count({ where: { id: result.order.id } })).toBe(1);
    const row = await db.outboxEvent.findFirst({ where: { aggregateId: result.order.id } });
    expect(row).not.toBeNull();
    expect(row?.payload).toMatchObject({
      currencyRates: getDefaultCurrencyRates(),
    });
  });
});
