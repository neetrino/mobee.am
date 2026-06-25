import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  orderItemGroupBy: vi.fn(),
  orderItemFindMany: vi.fn(),
  orderAggregate: vi.fn(),
  orderGroupBy: vi.fn(),
  orderCount: vi.fn(),
  orderFindFirst: vi.fn(),
  userCount: vi.fn(),
  userFindMany: vi.fn(),
  productCount: vi.fn(),
  productVariantCount: vi.fn(),
  productVariantFindMany: vi.fn(),
}));

vi.mock("@white-shop/db", () => ({
  db: {
    $queryRaw: mocks.queryRaw,
    orderItem: {
      groupBy: mocks.orderItemGroupBy,
      findMany: mocks.orderItemFindMany,
    },
    order: {
      aggregate: mocks.orderAggregate,
      count: mocks.orderCount,
      findFirst: mocks.orderFindFirst,
      groupBy: mocks.orderGroupBy,
    },
    user: {
      count: mocks.userCount,
      findMany: mocks.userFindMany,
    },
    product: { count: mocks.productCount },
    productVariant: {
      count: mocks.productVariantCount,
      findMany: mocks.productVariantFindMany,
    },
  },
}));

import { getTopProducts } from "./top-products";
import { getStats } from "./stats-calculator";
import { getUserActivity } from "./user-activity";

const {
  queryRaw,
  orderItemFindMany,
  orderAggregate,
  orderGroupBy,
  orderFindFirst,
  userCount,
  userFindMany,
  productCount,
  productVariantCount,
  productVariantFindMany,
} = mocks;

describe("getStats dashboard query pattern", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses aggregate for revenue instead of loading all paid orders", async () => {
    userCount.mockResolvedValue(10);
    productCount.mockResolvedValue(20);
    productVariantCount.mockResolvedValue(1);
    queryRaw.mockResolvedValue([{ total: 100, pending: 2, recent: 5 }]);
    orderAggregate.mockResolvedValue({ _sum: { total: 999.5 } });
    orderFindFirst.mockResolvedValue({ currency: "AMD" });

    const result = await getStats();

    expect(queryRaw).toHaveBeenCalled();
    expect(orderAggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
        _sum: { total: true },
      })
    );
    expect(result.orders.total).toBe(100);
    expect(result.orders.pending).toBe(2);
    expect(result.orders.recent).toBe(5);
    expect(result.revenue.total).toBe(999.5);
    expect(result.revenue.currency).toBe("AMD");
  });
});

describe("getTopProducts dashboard query pattern", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("aggregates with SQL and does not scan all line items via findMany", async () => {
    queryRaw.mockResolvedValue([
      {
        variantId: "var-1",
        totalQuantity: 3,
        totalRevenue: 150,
        orderCount: 2,
      },
    ]);
    productVariantFindMany.mockResolvedValue([
      {
        id: "var-1",
        productId: "prod-1",
        sku: "SKU-1",
        product: { media: [], translations: [{ title: "Widget" }] },
      },
    ]);

    const out = await getTopProducts(5);

    expect(orderItemFindMany).not.toHaveBeenCalled();
    expect(queryRaw).toHaveBeenCalled();
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      variantId: "var-1",
      productId: "prod-1",
      title: "Widget",
      sku: "SKU-1",
      totalQuantity: 3,
      totalRevenue: 150,
      orderCount: 2,
    });
  });
});

describe("getUserActivity dashboard query pattern", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads active users via order groupBy instead of nested unbounded orders", async () => {
    const registeredAt = new Date("2026-01-15T12:00:00.000Z");
    userFindMany
      .mockResolvedValueOnce([
        {
          id: "u-new",
          email: "new@example.com",
          phone: null,
          firstName: "N",
          lastName: "User",
          createdAt: registeredAt,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "u1",
          email: "buyer@example.com",
          phone: null,
          firstName: "B",
          lastName: "Buyer",
          createdAt: new Date("2025-06-01T00:00:00.000Z"),
        },
      ]);

    orderGroupBy.mockResolvedValue([
      {
        userId: "u1",
        _count: { id: 4 },
        _sum: { total: 400 },
        _max: { createdAt: new Date("2026-02-01T00:00:00.000Z") },
      },
    ]);

    const result = await getUserActivity(10);

    expect(orderGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["userId"],
        where: { userId: { not: null } },
        _count: { id: true },
        _sum: { total: true },
        _max: { createdAt: true },
      })
    );
    expect(result.recentRegistrations).toHaveLength(1);
    expect(result.activeUsers).toHaveLength(1);
    expect(result.activeUsers[0]).toMatchObject({ id: "u1", orderCount: 4, totalSpent: 400 });
  });
});
