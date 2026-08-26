import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@white-shop/db";
import { ordersService } from "@/lib/services/orders.service";
import type { CheckoutData } from "@/lib/types/checkout";
import { createVariantFixture } from "./phase4-integration.helpers";

const enabled = process.env.PHASE4_INTEGRATION === "1";
const describePhase4 = enabled ? describe : describe.skip;

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
}): CheckoutData {
  return {
    email: `guest-${input.suffix}@phase4.test`,
    phone: `+37455${input.suffix.replace(/\D/g, "").padEnd(6, "0").slice(0, 6)}`,
    shippingMethod: "pickup",
    paymentMethod: "cash_on_delivery",
    items: [{ productId: input.productId, variantId: input.variantId, quantity: 1 }],
    acknowledgements: ACKNOWLEDGEMENTS,
  };
}

async function withForcedLedgerFailure<T>(run: () => Promise<T>): Promise<T | void> {
  await db.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION phase4_fail_stock_movement() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'phase4_forced_failure';
    END;
    $$ LANGUAGE plpgsql;
  `);
  await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS phase4_fail_stock_movement_trg ON stock_movements`);
  await db.$executeRawUnsafe(`
    CREATE TRIGGER phase4_fail_stock_movement_trg
    BEFORE INSERT ON stock_movements
    FOR EACH ROW EXECUTE PROCEDURE phase4_fail_stock_movement()
  `);
  try {
    return await run();
  } finally {
    await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS phase4_fail_stock_movement_trg ON stock_movements`);
    await db.$executeRawUnsafe(`DROP FUNCTION IF EXISTS phase4_fail_stock_movement()`);
  }
}

describePhase4("Phase 4 full checkout", () => {
  it("allows only one of two parallel guest checkouts for the last unit", async () => {
    const sku = `p4g-${randomUUID().slice(0, 8)}`;
    const { product, variant } = await createVariantFixture(db, { sku, stock: 1 });
    const run = (suffix: string) =>
      ordersService.checkout(
        guestCheckout({ productId: product.id, variantId: variant.id, suffix }),
        undefined,
        "http://localhost:3000",
        checkoutContext(),
      );

    const results = await Promise.allSettled([run(`${sku}a`), run(`${sku}b`)]);
    const fulfilled = results.filter((row) => row.status === "fulfilled");
    const rejected = results.filter((row) => row.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    if (rejected[0]?.status === "rejected") {
      expect(rejected[0].reason).toMatchObject({ status: 422 });
    }
    if (fulfilled[0]?.status === "fulfilled") {
      expect(fulfilled[0].value).toEqual({
        order: expect.objectContaining({
          status: "pending",
          paymentStatus: "pending",
        }),
        payment: expect.objectContaining({
          provider: "cash_on_delivery",
        }),
        nextAction: "view_order",
      });
    }

    const stock = await db.productVariant.findUnique({ where: { id: variant.id } });
    expect(stock?.stock).toBe(0);
    expect(await db.order.count({ where: { items: { some: { variantId: variant.id } } } })).toBe(1);
    expect(await db.payment.count({ where: { order: { items: { some: { variantId: variant.id } } } } })).toBe(1);
    expect(await db.orderItem.count({ where: { variantId: variant.id } })).toBe(1);
    expect(await db.stockMovement.count({ where: { variantId: variant.id, reason: "order" } })).toBe(1);
  });

  it("completes user-cart checkout and rolls back when ledger insert is forced to fail", async () => {
    const sku = `p4u-${randomUUID().slice(0, 8)}`;
    const { product, variant } = await createVariantFixture(db, {
      sku,
      stock: 2,
      stockReserved: 1,
    });
    const user = await db.user.create({
      data: {
        email: `user-${sku}@phase4.test`,
        phone: `+37499${sku.replace(/\D/g, "").padEnd(6, "0").slice(0, 6)}`,
      },
    });
    const cart = await db.cart.create({
      data: {
        userId: user.id,
        locale: "en",
        expiresAt: new Date(Date.now() + 86_400_000),
        items: {
          create: {
            variantId: variant.id,
            productId: product.id,
            quantity: 1,
            priceSnapshot: 1000,
          },
        },
      },
    });

    const success = await ordersService.checkout(
      {
        cartId: cart.id,
        email: user.email ?? `user-${sku}@phase4.test`,
        phone: user.phone ?? "+37499111111",
        shippingMethod: "pickup",
        paymentMethod: "cash_on_delivery",
        acknowledgements: ACKNOWLEDGEMENTS,
      },
      user.id,
      "http://localhost:3000",
      { ...checkoutContext(), actorUserId: user.id },
    );
    expect(success).toEqual({
      order: expect.objectContaining({ status: "pending", paymentStatus: "pending" }),
      payment: expect.objectContaining({ provider: "cash_on_delivery" }),
      nextAction: "view_order",
    });
    const afterSuccess = await db.productVariant.findUnique({ where: { id: variant.id } });
    expect(afterSuccess?.stock).toBe(1);
    expect(afterSuccess?.stockReserved).toBe(0);
    expect(await db.cart.findUnique({ where: { id: cart.id } })).toBeNull();
    expect(await db.stockMovement.count({ where: { variantId: variant.id, reason: "order" } })).toBe(1);

    const failSku = `p4f-${randomUUID().slice(0, 8)}`;
    const failFixture = await createVariantFixture(db, {
      sku: failSku,
      stock: 2,
      stockReserved: 1,
    });
    const failUser = await db.user.create({
      data: {
        email: `fail-${failSku}@phase4.test`,
        phone: `+37488${failSku.replace(/\D/g, "").padEnd(6, "0").slice(0, 6)}`,
      },
    });
    const failCart = await db.cart.create({
      data: {
        userId: failUser.id,
        locale: "en",
        expiresAt: new Date(Date.now() + 86_400_000),
        items: {
          create: {
            variantId: failFixture.variant.id,
            productId: failFixture.product.id,
            quantity: 1,
            priceSnapshot: 1000,
          },
        },
      },
    });

    await withForcedLedgerFailure(async () => {
      await expect(
        ordersService.checkout(
          {
            cartId: failCart.id,
            email: failUser.email ?? `fail-${failSku}@phase4.test`,
            phone: failUser.phone ?? "+37488111111",
            shippingMethod: "pickup",
            paymentMethod: "cash_on_delivery",
            acknowledgements: ACKNOWLEDGEMENTS,
          },
          failUser.id,
          "http://localhost:3000",
          { ...checkoutContext(), actorUserId: failUser.id },
        ),
      ).rejects.toThrow();
    });

    const rolled = await db.productVariant.findUnique({ where: { id: failFixture.variant.id } });
    expect(rolled?.stock).toBe(2);
    expect(rolled?.stockReserved).toBe(1);
    expect(await db.cart.findUnique({ where: { id: failCart.id } })).not.toBeNull();
    expect(await db.order.count({ where: { userId: failUser.id } })).toBe(0);
    expect(await db.payment.count({ where: { order: { userId: failUser.id } } })).toBe(0);
    expect(await db.orderItem.count({ where: { variantId: failFixture.variant.id } })).toBe(0);
    expect(await db.stockMovement.count({ where: { variantId: failFixture.variant.id } })).toBe(0);
  });

  it("completes two parallel guest checkouts of different SKUs without a global lock", async () => {
    const skuA = `p4i-${randomUUID().slice(0, 8)}`;
    const skuB = `p4j-${randomUUID().slice(0, 8)}`;
    const fixtureA = await createVariantFixture(db, { sku: skuA, stock: 2 });
    const fixtureB = await createVariantFixture(db, { sku: skuB, stock: 2 });

    const timed = async (productId: string, variantId: string, suffix: string) => {
      const startedAt = Date.now();
      const value = await ordersService.checkout(
        guestCheckout({ productId, variantId, suffix }),
        undefined,
        "http://localhost:3000",
        checkoutContext(),
      );
      return { value, startedAt, finishedAt: Date.now() };
    };

    const wallStarted = Date.now();
    const [first, second] = await Promise.all([
      timed(fixtureA.product.id, fixtureA.variant.id, `${skuA}a`),
      timed(fixtureB.product.id, fixtureB.variant.id, `${skuB}b`),
    ]);
    const wallMs = Date.now() - wallStarted;
    const firstDuration = first.finishedAt - first.startedAt;
    const secondDuration = second.finishedAt - second.startedAt;

    expect(first.value).toEqual({
      order: expect.objectContaining({ status: "pending" }),
      payment: expect.objectContaining({ provider: "cash_on_delivery" }),
      nextAction: "view_order",
    });
    expect(second.value).toEqual({
      order: expect.objectContaining({ status: "pending" }),
      payment: expect.objectContaining({ provider: "cash_on_delivery" }),
      nextAction: "view_order",
    });
    expect(first.value.order.number).not.toBe(second.value.order.number);
    expect(wallMs).toBeLessThan(
      firstDuration + secondDuration - Math.min(firstDuration, secondDuration) * 0.25,
    );
  });

  it("assigns unique numeric numbers to several parallel checkouts", async () => {
    const runs = await Promise.all(
      Array.from({ length: 5 }, async (_, index) => {
        const sku = `p4n${index}-${randomUUID().slice(0, 8)}`;
        const { product, variant } = await createVariantFixture(db, { sku, stock: 1 });
        return ordersService.checkout(
          guestCheckout({ productId: product.id, variantId: variant.id, suffix: sku }),
          undefined,
          "http://localhost:3000",
          checkoutContext(),
        );
      }),
    );

    const numbers = runs.map((row) => row.order.number);
    expect(new Set(numbers).size).toBe(5);
    for (const number of numbers) {
      expect(Number(number)).toBeGreaterThanOrEqual(1000);
    }
  });
});
