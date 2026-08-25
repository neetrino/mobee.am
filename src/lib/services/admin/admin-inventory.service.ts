import { db } from "@white-shop/db";
import { ORDER_TX_MAX_WAIT_MS, ORDER_TX_TIMEOUT_MS } from "../orders/order-fsm.constants";
import type { CommerceRequestContext } from "../orders/order-transition.types";
import {
  adjustVariantStock,
  type InventoryAdjustmentFields,
} from "../inventory/adjust-variant-stock";

export interface InventoryListFilters {
  page: number;
  limit: number;
  search?: string;
}

export type InventoryAdjustmentInput = InventoryAdjustmentFields;

function buildInventorySearchWhere(search?: string) {
  const trimmedSearch = search?.trim();
  if (!trimmedSearch) {
    return {};
  }

  return {
    OR: [
      { sku: { contains: trimmedSearch, mode: "insensitive" as const } },
      {
        product: {
          translations: {
            some: {
              title: { contains: trimmedSearch, mode: "insensitive" as const },
            },
          },
        },
      },
    ],
  };
}

class AdminInventoryService {
  async getInventoryList(filters: InventoryListFilters) {
    const where = buildInventorySearchWhere(filters.search);
    const skip = (filters.page - 1) * filters.limit;

    const [items, total] = await Promise.all([
      db.productVariant.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          sku: true,
          stock: true,
          stockReserved: true,
          updatedAt: true,
          product: {
            select: {
              id: true,
              translations: {
                where: { locale: "en" },
                select: { title: true },
                take: 1,
              },
            },
          },
        },
      }),
      db.productVariant.count({ where }),
    ]);

    const data = items.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      stock: variant.stock,
      stockReserved: variant.stockReserved,
      stockAvailable: variant.stock - variant.stockReserved,
      updatedAt: variant.updatedAt.toISOString(),
      productId: variant.product.id,
      productTitle: variant.product.translations[0]?.title ?? "Untitled product",
    }));

    return {
      data,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / filters.limit)),
      },
    };
  }

  async getReconciliationReport() {
    const [totals, lowAvailableStock, recentMovements] = await Promise.all([
      db.productVariant.aggregate({
        _sum: { stock: true, stockReserved: true },
        _count: { _all: true },
      }),
      db.productVariant.findMany({
        where: {
          stock: { gt: 0 },
          OR: [
            { stockReserved: { gt: 0 }, stock: { lte: 10 } },
            { stockReserved: { gt: 0 }, stock: { lte: 5 } },
          ],
        },
        take: 10,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          sku: true,
          stock: true,
          stockReserved: true,
          product: {
            select: {
              translations: {
                where: { locale: "en" },
                select: { title: true },
                take: 1,
              },
            },
          },
        },
      }),
      db.productVariant.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          sku: true,
          stock: true,
          stockReserved: true,
        },
      }),
    ]);

    return {
      summary: {
        variantsCount: totals._count._all,
        stockTotal: totals._sum.stock ?? 0,
        stockReservedTotal: totals._sum.stockReserved ?? 0,
        stockAvailableTotal: (totals._sum.stock ?? 0) - (totals._sum.stockReserved ?? 0),
      },
      lowStock: lowAvailableStock.map((variant) => ({
        variantId: variant.id,
        sku: variant.sku,
        productTitle: variant.product.translations[0]?.title ?? "Untitled product",
        stock: variant.stock,
        stockReserved: variant.stockReserved,
        stockAvailable: variant.stock - variant.stockReserved,
      })),
      movements: recentMovements.map((event) => ({
        id: event.id,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
        sku: event.sku,
        stock: event.stock,
        stockReserved: event.stockReserved,
        stockAvailable: event.stock - event.stockReserved,
      })),
    };
  }

  async adjustInventory(
    input: InventoryAdjustmentInput,
    context: CommerceRequestContext,
  ) {
    return db.$transaction(
      (tx) => adjustVariantStock(tx, input, context),
      { timeout: ORDER_TX_TIMEOUT_MS, maxWait: ORDER_TX_MAX_WAIT_MS },
    );
  }
}

export const adminInventoryService = new AdminInventoryService();
