import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@white-shop/db";
import { applyPaymentCallback } from "@/lib/services/orders/apply-payment-callback";
import { buildProviderEventId } from "@/lib/services/orders/provider-event-id";
import {
  createOrderFixture,
  createPaymentFixture,
  createVariantFixture,
} from "./phase4-integration.helpers";

const enabled = process.env.PHASE4_INTEGRATION === "1";
const describePhase5 = enabled ? describe : describe.skip;

function callbackContext() {
  return {
    requestId: randomUUID(),
    actorUserId: null,
    source: "payment_provider" as const,
  };
}

describePhase5("Phase 5 payment callback replay", () => {
  it("applies a paid callback once and replays the second in parallel", async () => {
    const sku = `p5cb-${randomUUID().slice(0, 8)}`;
    const { variant } = await createVariantFixture(db, { sku, stock: 1 });
    const order = await createOrderFixture(db, {
      number: `C${sku}`,
      variantId: variant.id,
      sku,
      status: "pending",
      paymentStatus: "pending",
    });
    const payment = await createPaymentFixture(db, { orderId: order.id, status: "pending" });
    const input = {
      paymentId: payment.id,
      orderNumber: order.number,
      status: "paid" as const,
      provider: "idram",
    };

    const [first, second] = await Promise.all([
      applyPaymentCallback(input, callbackContext()),
      applyPaymentCallback(input, callbackContext()),
    ]);
    expect([first, second].sort()).toEqual(["applied", "no_op"].sort());

    const after = await db.order.findUnique({
      where: { id: order.id },
      include: { payments: true },
    });
    expect(after?.paymentStatus).toBe("paid");
    expect(after?.status).toBe("pending");
    expect(after?.payments[0]?.status).toBe("paid");

    const providerEventId = buildProviderEventId(input);
    expect(await db.orderEvent.count({ where: { provider: "idram", providerEventId } })).toBe(1);
  });

  it("replays an already paid callback as no_op without changing order status", async () => {
    const sku = `p5rp-${randomUUID().slice(0, 8)}`;
    const { variant } = await createVariantFixture(db, { sku, stock: 1 });
    const order = await createOrderFixture(db, {
      number: `R${sku}`,
      variantId: variant.id,
      sku,
      status: "pending",
      paymentStatus: "pending",
    });
    const payment = await createPaymentFixture(db, { orderId: order.id, status: "pending" });
    const input = {
      paymentId: payment.id,
      orderNumber: order.number,
      status: "paid" as const,
      provider: "arca",
    };
    const context = callbackContext();

    expect(await applyPaymentCallback(input, context)).toBe("applied");
    const paidSnapshot = await db.order.findUnique({ where: { id: order.id } });
    expect(await applyPaymentCallback(input, context)).toBe("no_op");
    const afterReplay = await db.order.findUnique({ where: { id: order.id } });
    expect(afterReplay?.paymentStatus).toBe("paid");
    expect(afterReplay?.status).toBe("pending");
    expect(afterReplay?.updatedAt?.toISOString()).toBe(paidSnapshot?.updatedAt?.toISOString());
  });

  it("keeps idram and arca provider replay ids isolated", async () => {
    const sku = `p5pv-${randomUUID().slice(0, 8)}`;
    const order = await createOrderFixture(db, { number: `P${sku}`, withItem: false });
    const payment = await createPaymentFixture(db, { orderId: order.id, status: "pending" });
    const shared = {
      paymentId: payment.id,
      orderNumber: order.number,
      status: "paid" as const,
    };
    const idramId = buildProviderEventId({ ...shared, provider: "idram" });
    const arcaId = buildProviderEventId({ ...shared, provider: "arca" });
    expect(idramId).not.toBe(arcaId);

    await db.orderEvent.create({
      data: {
        orderId: order.id,
        type: "payment_status_changed",
        fromState: "pending",
        toState: "paid",
        provider: "idram",
        providerEventId: idramId,
        isCustomerVisible: true,
        data: { source: "payment_provider" },
      },
    });

    await expect(
      db.orderEvent.create({
        data: {
          orderId: order.id,
          type: "payment_status_changed",
          fromState: "pending",
          toState: "paid",
          provider: "arca",
          providerEventId: arcaId,
          isCustomerVisible: true,
          data: { source: "payment_provider" },
        },
      }),
    ).resolves.toBeDefined();
  });
});
