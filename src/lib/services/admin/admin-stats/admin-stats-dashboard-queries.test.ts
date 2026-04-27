import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
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
  orderItemGroupBy,
  orderItemFindMany,
  orderAggregate,
  orderGroupBy,
  orderCount,
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
    orderCount.mockImplementation((args?: { where?: { status?: string; createdAt?: { gte: Date } } }) => {
      const w = args?.where;
      if (w && "status" in w && w.status === "pending") return Promise.resolve(2);
      if (w && "createdAt" in w && w.createdAt) return Promise.resolve(5);
      return Promise.resolve(100);
    });
    orderAggregate.mockResolvedValue({ _sum: { total: 999.5 } });
    orderFindFirst.mockResolvedValue({ currency: "AMD" });

    const result = await getStats();

    expect(orderAggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
        _sum: { total: true },
      })
    );
    expect(result.revenue.total).toBe(999.5);
    expect(result.revenue.currency).toBe("AMD");
  });
});

describe("getTopProducts dashboard query pattern", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("aggregates with groupBy and does not scan all line items via findMany", async () => {
    orderItemGroupBy.mockResolvedValue([
      { variantId: "var-1", _sum: { quantity: 3, total: 150 }, _count: { id: 2 } },
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
    expect(orderItemGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["variantId"],
        where: expect.objectContaining({
          variantId: { not: null },
          order: expect.objectContaining({ createdAt: expect.any(Object) }),
        }),
        _sum: expect.objectContaining({ quantity: true, total: true }),
      })
    );
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
