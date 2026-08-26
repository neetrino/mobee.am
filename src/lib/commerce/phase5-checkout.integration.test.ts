import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@white-shop/db";
import { ordersService } from "@/lib/services/orders.service";
import type { CheckoutData } from "@/lib/types/checkout";
import { createVariantFixture } from "./phase4-integration.helpers";

const enabled = process.env.PHASE4_INTEGRATION === "1";
const describePhase5 = enabled ? describe : describe.skip;

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

function guestCheckout(input: {
  productId: string;
  variantId: string;
  suffix: string;
  quantity?: number;
}): CheckoutData {
  return {
    email: `guest-${input.suffix}@phase5.test`,
    phone: `+37455${input.suffix.replace(/\D/g, "").padEnd(6, "0").slice(0, 6)}`,
    shippingMethod: "pickup",
    paymentMethod: "cash_on_delivery",
    items: [{
      productId: input.productId,
      variantId: input.variantId,
      quantity: input.quantity ?? 1,
    }],
    acknowledgements: ACKNOWLEDGEMENTS,
  };
}

describePhase5("Phase 5 checkout idempotency", () => {
  it("allows only one order for two parallel checkouts with the same idempotency key on last unit", async () => {
    const sku = `p5i-${randomUUID().slice(0, 8)}`;
    const { product, variant } = await createVariantFixture(db, { sku, stock: 1 });
    const idempotencyKey = `phase5-${sku}-same-key`;
    const payload = guestCheckout({ productId: product.id, variantId: variant.id, suffix: sku });
    const run = () =>
      ordersService.checkout(
        payload,
        undefined,
        "http://localhost:3000",
        checkoutContext(),
        { idempotencyKey },
      );

    const results = await Promise.allSettled([run(), run()]);
    const fulfilled = results.filter((row) => row.status === "fulfilled");
    expect(fulfilled).toHaveLength(2);
    const first = fulfilled[0]?.status === "fulfilled" ? fulfilled[0].value : null;
    const second = fulfilled[1]?.status === "fulfilled" ? fulfilled[1].value : null;
    expect(first?.order.number).toBe(second?.order.number);
    expect(first?.order.id).toBe(second?.order.id);

    expect(await db.order.count({ where: { items: { some: { variantId: variant.id } } } })).toBe(1);
    expect(await db.payment.count({ where: { order: { items: { some: { variantId: variant.id } } } } })).toBe(1);
    expect(await db.stockMovement.count({ where: { variantId: variant.id, reason: "order" } })).toBe(1);
    const stock = await db.productVariant.findUnique({ where: { id: variant.id } });
    expect(stock?.stock).toBe(0);
  });

  it("creates two orders for different idempotency keys when stock allows", async () => {
    const sku = `p5d-${randomUUID().slice(0, 8)}`;
    const { product, variant } = await createVariantFixture(db, { sku, stock: 2 });
    const payload = guestCheckout({ productId: product.id, variantId: variant.id, suffix: sku });

    const first = await ordersService.checkout(
      payload,
      undefined,
      "http://localhost:3000",
      checkoutContext(),
      { idempotencyKey: `${sku}-key-a` },
    );
    const second = await ordersService.checkout(
      payload,
      undefined,
      "http://localhost:3000",
      checkoutContext(),
      { idempotencyKey: `${sku}-key-b` },
    );

    expect(first.order.number).not.toBe(second.order.number);
    expect(await db.order.count({ where: { items: { some: { variantId: variant.id } } } })).toBe(2);
    expect(await db.stockMovement.count({ where: { variantId: variant.id, reason: "order" } })).toBe(2);
  });

  it("returns 409 and leaves stock untouched when the same key has a different body", async () => {
    const sku = `p5c-${randomUUID().slice(0, 8)}`;
    const { product, variant } = await createVariantFixture(db, { sku, stock: 1 });
    const idempotencyKey = `${sku}-conflict-key`;
    const basePayload = guestCheckout({ productId: product.id, variantId: variant.id, suffix: sku });

    await ordersService.checkout(
      basePayload,
      undefined,
      "http://localhost:3000",
      checkoutContext(),
      { idempotencyKey },
    );

    await expect(
      ordersService.checkout(
        {
          ...basePayload,
          paymentMethod: "idram",
        },
        undefined,
        "http://localhost:3000",
        checkoutContext(),
        { idempotencyKey },
      ),
    ).rejects.toMatchObject({ status: 409 });

    expect(await db.order.count({ where: { items: { some: { variantId: variant.id } } } })).toBe(1);
    expect(await db.stockMovement.count({ where: { variantId: variant.id, reason: "order" } })).toBe(1);
    const stock = await db.productVariant.findUnique({ where: { id: variant.id } });
    expect(stock?.stock).toBe(0);
  });

  it("keeps Phase 4 behavior without an idempotency key on last unit", async () => {
    const sku = `p5m-${randomUUID().slice(0, 8)}`;
    const { product, variant } = await createVariantFixture(db, { sku, stock: 1 });
    const payload = guestCheckout({ productId: product.id, variantId: variant.id, suffix: sku });
    const run = () =>
      ordersService.checkout(payload, undefined, "http://localhost:3000", checkoutContext());

    const results = await Promise.allSettled([run(), run()]);
    const fulfilled = results.filter((row) => row.status === "fulfilled");
    const rejected = results.filter((row) => row.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    if (rejected[0]?.status === "rejected") {
      expect(rejected[0].reason).toMatchObject({ status: 422 });
    }
    expect(await db.order.count({ where: { items: { some: { variantId: variant.id } } } })).toBe(1);
    expect(await db.stockMovement.count({ where: { variantId: variant.id, reason: "order" } })).toBe(1);
  });

  it("persists idempotency hashes on first write and leaves them null without a key", async () => {
    const sku = `p5h-${randomUUID().slice(0, 8)}`;
    const { product, variant } = await createVariantFixture(db, { sku, stock: 1 });
    const payload = guestCheckout({ productId: product.id, variantId: variant.id, suffix: sku });
    const withKey = await ordersService.checkout(
      payload,
      undefined,
      "http://localhost:3000",
      checkoutContext(),
      { idempotencyKey: `${sku}-persist-key` },
    );
    const keyedOrder = await db.order.findUnique({ where: { id: withKey.order.id } });
    expect(keyedOrder?.idempotencyScopeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(keyedOrder?.idempotencyKeyHash).toMatch(/^[a-f0-9]{64}$/);
    expect(keyedOrder?.requestFingerprint).toMatch(/^[a-f0-9]{64}$/);

    const skuNoKey = `p5n-${randomUUID().slice(0, 8)}`;
    const fixtureNoKey = await createVariantFixture(db, { sku: skuNoKey, stock: 1 });
    const withoutKey = await ordersService.checkout(
      guestCheckout({
        productId: fixtureNoKey.product.id,
        variantId: fixtureNoKey.variant.id,
        suffix: skuNoKey,
      }),
      undefined,
      "http://localhost:3000",
      checkoutContext(),
    );
    const plainOrder = await db.order.findUnique({ where: { id: withoutKey.order.id } });
    expect(plainOrder?.idempotencyScopeHash).toBeNull();
    expect(plainOrder?.idempotencyKeyHash).toBeNull();
    expect(plainOrder?.requestFingerprint).toBeNull();
  });
});
