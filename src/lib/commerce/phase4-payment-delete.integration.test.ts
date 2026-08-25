import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@white-shop/db";
import { AppError } from "@/lib/errors/app-error";
import { deleteEmptyOrder } from "@/lib/services/orders/delete-empty-order";
import { applyPaymentCallback } from "@/lib/services/orders/apply-payment-callback";
import { updateOrderStatuses } from "@/lib/services/orders/order-transition.service";
import {
  createOrderFixture,
  createPaymentFixture,
  createVariantFixture,
} from "./phase4-integration.helpers";

const enabled = process.env.PHASE4_INTEGRATION === "1";
const describePhase4 = enabled ? describe : describe.skip;

function adminContext() {
  return {
    requestId: randomUUID(),
    actorUserId: null,
    source: "admin" as const,
  };
}

async function deleteVariantIgnoringFk(variantId: string): Promise<void> {
  await db.$executeRawUnsafe("SET session_replication_role = replica");
  try {
    await db.productVariant.delete({ where: { id: variantId } });
  } finally {
    await db.$executeRawUnsafe("SET session_replication_role = origin");
  }
}

describePhase4("Phase 4 payment, restock, and delete", () => {
  it("rejects Order paid + Payment pending → refunded without writes", async () => {
    const sku = `p4p-${randomUUID().slice(0, 8)}`;
    const { variant } = await createVariantFixture(db, { sku, stock: 1 });
    const order = await createOrderFixture(db, {
      number: `P${sku}`,
      variantId: variant.id,
      sku,
      paymentStatus: "paid",
    });
    await createPaymentFixture(db, { orderId: order.id, status: "pending" });

    await expect(
      updateOrderStatuses(order.id, { paymentStatus: "refunded" }, adminContext()),
    ).rejects.toBeInstanceOf(AppError);

    const after = await db.order.findUnique({
      where: { id: order.id },
      include: { payments: true },
    });
    expect(after?.paymentStatus).toBe("paid");
    expect(after?.payments[0]?.status).toBe("pending");
  });

  it("reconciles Order pending + Payment failed → pending", async () => {
    const sku = `p4r-${randomUUID().slice(0, 8)}`;
    const { variant } = await createVariantFixture(db, { sku, stock: 1 });
    const order = await createOrderFixture(db, {
      number: `R${sku}`,
      variantId: variant.id,
      sku,
      status: "pending",
      paymentStatus: "pending",
    });
    await createPaymentFixture(db, { orderId: order.id, status: "failed" });
    const requestId = randomUUID();

    await updateOrderStatuses(order.id, { paymentStatus: "pending" }, {
      requestId,
      actorUserId: null,
      source: "admin",
    });

    const after = await db.order.findUnique({
      where: { id: order.id },
      include: { payments: true },
    });
    expect(after?.paymentStatus).toBe("pending");
    expect(after?.payments[0]?.status).toBe("pending");
    const event = await db.orderEvent.findFirst({
      where: { orderId: order.id, type: "payment_status_changed" },
    });
    expect(event?.data).toMatchObject({
      previousOrderPaymentStatus: "pending",
      previousPaymentStatus: "failed",
      target: "pending",
      reconciliation: true,
    });
    expect(event?.correlationId).toBe(requestId);
    const audit = await db.auditLog.findFirst({
      where: { targetId: order.id, action: "order.update" },
    });
    expect(audit?.beforeDiff).toMatchObject({
      paymentStatus: "pending",
      paymentRowStatus: "failed",
    });
    expect(audit?.requestId).toBe(requestId);
    expect(audit?.correlationId).toBe(requestId);
  });

  it("records null and missing variants in restockSkipped without fake ledger rows", async () => {
    const sku = `p4s-${randomUUID().slice(0, 8)}`;
    const { variant } = await createVariantFixture(db, { sku, stock: 0 });
    const missing = await createVariantFixture(db, { sku: `${sku}-m`, stock: 0 });
    const order = await createOrderFixture(db, {
      number: `S${sku}`,
      variantId: variant.id,
      sku,
      status: "processing",
    });
    await db.orderItem.create({
      data: {
        orderId: order.id,
        variantId: null,
        productTitle: "Phase4",
        sku: `${sku}-null`,
        quantity: 2,
        price: 1000,
        total: 2000,
      },
    });
    await db.orderItem.create({
      data: {
        orderId: order.id,
        variantId: missing.variant.id,
        productTitle: "Phase4",
        sku: `${sku}-m`,
        quantity: 3,
        price: 1000,
        total: 3000,
      },
    });
    await deleteVariantIgnoringFk(missing.variant.id);

    await updateOrderStatuses(order.id, { status: "cancelled" }, adminContext());

    const stock = await db.productVariant.findUnique({ where: { id: variant.id } });
    expect(stock?.stock).toBe(1);
    expect(await db.stockMovement.count({ where: { orderId: order.id, reason: "cancel" } })).toBe(1);
    const event = await db.orderEvent.findFirst({
      where: { orderId: order.id, type: "order_status_changed" },
    });
    expect(event?.data).toMatchObject({
      restockSkipped: expect.arrayContaining([
        expect.objectContaining({
          variantId: null,
          skuSnapshot: `${sku}-null`,
          quantity: 2,
          reason: "variant_reference_missing",
        }),
        expect.objectContaining({
          variantId: missing.variant.id,
          skuSnapshot: `${sku}-m`,
          quantity: 3,
          reason: "variant_not_found",
        }),
      ]),
    });
    const audit = await db.auditLog.findFirst({
      where: { targetId: order.id, action: "order.update" },
    });
    expect(audit?.afterDiff).toMatchObject({
      restockSkipped: expect.arrayContaining([
        expect.objectContaining({ reason: "variant_reference_missing" }),
        expect.objectContaining({ reason: "variant_not_found" }),
      ]),
    });
  });

  it("deletes an empty order with lock and audit, and rejects ledger history", async () => {
    const sku = `p4d-${randomUUID().slice(0, 8)}`;
    const empty = await createOrderFixture(db, { number: `D${sku}`, withItem: false, status: "pending" });
    const requestId = randomUUID();
    await deleteEmptyOrder(empty.id, { requestId, actorUserId: null, source: "admin" });

    expect(await db.order.findUnique({ where: { id: empty.id } })).toBeNull();
    const audit = await db.auditLog.findFirst({
      where: { targetId: empty.id, action: "order.delete_empty" },
    });
    expect(audit).toMatchObject({
      targetType: "Order",
      requestId,
      correlationId: requestId,
      beforeDiff: expect.objectContaining({
        number: `D${sku}`,
        status: "pending",
        paymentStatus: "pending",
        fulfillmentStatus: "unfulfilled",
      }),
    });

    const { variant } = await createVariantFixture(db, { sku, stock: 1 });
    const ledgerOrder = await createOrderFixture(db, {
      number: `L${sku}`,
      withItem: false,
      status: "pending",
    });
    await db.stockMovement.create({
      data: {
        variantId: variant.id,
        variantIdSnapshot: variant.id,
        skuSnapshot: sku,
        delta: 1,
        reason: "order",
        orderId: ledgerOrder.id,
        resultingBalance: 1,
      },
    });
    await expect(
      deleteEmptyOrder(ledgerOrder.id, adminContext()),
    ).rejects.toMatchObject({ status: 409 });
    expect(await db.order.findUnique({ where: { id: ledgerOrder.id } })).not.toBeNull();
  });

  it("serializes empty-order delete against a concurrent item insert", async () => {
    const sku = `p4x-${randomUUID().slice(0, 8)}`;
    const { variant } = await createVariantFixture(db, { sku, stock: 1 });
    const order = await createOrderFixture(db, { number: `X${sku}`, withItem: false, status: "pending" });

    await Promise.allSettled([
      deleteEmptyOrder(order.id, adminContext()),
      db.orderItem.create({
        data: {
          orderId: order.id,
          variantId: variant.id,
          productTitle: "Phase4",
          sku,
          quantity: 1,
          price: 1000,
          total: 1000,
        },
      }),
    ]);

    const leftover = await db.order.findUnique({
      where: { id: order.id },
      include: { items: true },
    });
    if (leftover) {
      expect(leftover.items.length).toBeGreaterThan(0);
    } else {
      expect(await db.orderItem.count({ where: { orderId: order.id } })).toBe(0);
    }
  });

  it("applies a paid callback without changing Order.status", async () => {
    const sku = `p4cb-${randomUUID().slice(0, 8)}`;
    const { variant } = await createVariantFixture(db, { sku, stock: 1 });
    const order = await createOrderFixture(db, {
      number: `CB${sku}`,
      variantId: variant.id,
      sku,
      status: "pending",
      paymentStatus: "pending",
    });
    const payment = await createPaymentFixture(db, { orderId: order.id, status: "pending" });

    await applyPaymentCallback(
      { paymentId: payment.id, orderNumber: order.number, status: "paid", provider: "idram" },
      { requestId: randomUUID(), actorUserId: null, source: "payment_provider" },
    );

    const after = await db.order.findUnique({
      where: { id: order.id },
      include: { payments: true },
    });
    expect(after?.status).toBe("pending");
    expect(after?.paymentStatus).toBe("paid");
    expect(after?.payments[0]?.status).toBe("paid");
  });
});
