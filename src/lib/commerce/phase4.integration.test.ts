import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@white-shop/db";
import { decrementCheckoutStock } from "@/lib/services/inventory/decrement-checkout-stock";
import { adjustVariantStock } from "@/lib/services/inventory/adjust-variant-stock";
import { updateOrderStatuses } from "@/lib/services/orders/order-transition.service";
import {
  assertLocalPhase4DatabaseUrl,
  createOrderFixture,
  createVariantFixture,
} from "./phase4-integration.helpers";

const enabled = process.env.PHASE4_INTEGRATION === "1";
const describePhase4 = enabled ? describe : describe.skip;

function context(source: "checkout" | "admin" = "checkout") {
  return {
    requestId: randomUUID(),
    actorUserId: null,
    source,
  };
}

describePhase4("Phase 4 PostgreSQL integration", () => {
  it("uses a local disposable database", () => {
    assertLocalPhase4DatabaseUrl(process.env.DATABASE_URL ?? "");
  });

  it("allows only one of two parallel checkouts for the last unit", async () => {
    const sku = `p4-${randomUUID().slice(0, 8)}`;
    const { variant } = await createVariantFixture(db, { sku, stock: 1 });
    const orderA = await createOrderFixture(db, { number: `A${sku}`, variantId: variant.id, quantity: 1, sku });
    const orderB = await createOrderFixture(db, { number: `B${sku}`, variantId: variant.id, quantity: 1, sku });

    const run = (orderId: string) =>
      db.$transaction((tx) =>
        decrementCheckoutStock({
          tx,
          context: context("checkout"),
          orderId,
          items: [{ variantId: variant.id, quantity: 1, sku }],
          isUserCartCheckout: false,
        }),
      );

    const results = await Promise.allSettled([run(orderA.id), run(orderB.id)]);
    const fulfilled = results.filter((row) => row.status === "fulfilled");
    const rejected = results.filter((row) => row.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]).toMatchObject({
      status: "rejected",
      reason: expect.objectContaining({ status: 422 }),
    });

    const stock = await db.productVariant.findUnique({ where: { id: variant.id } });
    expect(stock?.stock).toBe(0);
    const movements = await db.stockMovement.findMany({ where: { variantId: variant.id } });
    expect(movements).toHaveLength(1);
    expect(movements[0]?.delta).toBe(-1);
    expect(movements[0]?.reason).toBe("order");
  });

  it("restocks only once under two parallel cancels", async () => {
    const sku = `p4c-${randomUUID().slice(0, 8)}`;
    const { variant } = await createVariantFixture(db, { sku, stock: 0 });
    const order = await createOrderFixture(db, {
      number: `C${sku}`,
      variantId: variant.id,
      quantity: 1,
      sku,
      status: "processing",
    });
    const admin = { requestId: randomUUID(), actorUserId: null, source: "admin" as const };

    const results = await Promise.allSettled([
      updateOrderStatuses(order.id, { status: "cancelled" }, admin),
      updateOrderStatuses(order.id, { status: "cancelled" }, { ...admin, requestId: randomUUID() }),
    ]);
    expect(results.filter((row) => row.status === "fulfilled")).toHaveLength(2);

    const stock = await db.productVariant.findUnique({ where: { id: variant.id } });
    expect(stock?.stock).toBe(1);
    const movements = await db.stockMovement.findMany({ where: { orderId: order.id, reason: "cancel" } });
    expect(movements).toHaveLength(1);
    const events = await db.orderEvent.findMany({ where: { orderId: order.id, type: "order_status_changed" } });
    expect(events).toHaveLength(1);
  });

  it("serializes admin adjustments to a ledger-matching balance", async () => {
    const sku = `p4a-${randomUUID().slice(0, 8)}`;
    const { variant } = await createVariantFixture(db, { sku, stock: 10 });
    const admin = { requestId: randomUUID(), actorUserId: null, source: "admin" as const };

    await Promise.all([
      db.$transaction((tx) =>
        adjustVariantStock(tx, { variantId: variant.id, quantityDelta: 3, reason: "in" }, admin),
      ),
      db.$transaction((tx) =>
        adjustVariantStock(
          tx,
          { variantId: variant.id, quantityDelta: -2, reason: "out" },
          { ...admin, requestId: randomUUID() },
        ),
      ),
    ]);

    const stock = await db.productVariant.findUnique({ where: { id: variant.id } });
    expect(stock?.stock).toBe(11);
    const movements = await db.stockMovement.findMany({
      where: { variantId: variant.id },
      orderBy: { createdAt: "asc" },
    });
    expect(movements).toHaveLength(2);
    expect(movements.reduce((sum, row) => sum + row.delta, 0)).toBe(1);
    expect(movements[movements.length - 1]?.resultingBalance).toBe(11);
  });

  it("rolls back stock, movement, and order when ledger insert is forced to fail", async () => {
    const sku = `p4r-${randomUUID().slice(0, 8)}`;
    const { variant } = await createVariantFixture(db, { sku, stock: 4 });
    await db.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION phase4_fail_stock_movement() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'phase4_forced_failure';
      END;
      $$ LANGUAGE plpgsql;
    `);
    await db.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS phase4_fail_stock_movement_trg ON stock_movements
    `);
    await db.$executeRawUnsafe(`
      CREATE TRIGGER phase4_fail_stock_movement_trg
      BEFORE INSERT ON stock_movements
      FOR EACH ROW EXECUTE PROCEDURE phase4_fail_stock_movement()
    `);

    try {
      await expect(
        db.$transaction(async (tx) => {
          const order = await tx.order.create({
            data: {
              number: `R${sku}`,
              status: "pending",
              paymentStatus: "pending",
              fulfillmentStatus: "unfulfilled",
              subtotal: 1000,
              total: 1000,
              items: {
                create: {
                  variantId: variant.id,
                  productTitle: "Phase4",
                  sku,
                  quantity: 1,
                  price: 1000,
                  total: 1000,
                },
              },
            },
          });
          await decrementCheckoutStock({
            tx,
            context: context("checkout"),
            orderId: order.id,
            items: [{ variantId: variant.id, quantity: 1, sku }],
            isUserCartCheckout: false,
          });
        }),
      ).rejects.toThrow();

      const stock = await db.productVariant.findUnique({ where: { id: variant.id } });
      expect(stock?.stock).toBe(4);
      expect(await db.stockMovement.count({ where: { variantId: variant.id } })).toBe(0);
      expect(await db.order.count({ where: { number: `R${sku}` } })).toBe(0);
    } finally {
      await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS phase4_fail_stock_movement_trg ON stock_movements`);
      await db.$executeRawUnsafe(`DROP FUNCTION IF EXISTS phase4_fail_stock_movement()`);
    }
  });
});
