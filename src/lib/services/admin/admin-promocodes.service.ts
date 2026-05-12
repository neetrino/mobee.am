import { db } from "@white-shop/db";
import { logger } from "../../utils/logger";

interface PromoCodeInput {
  code: string;
  discountPercent: number;
}

interface PromoCodeStatusInput {
  isActive: boolean;
}

const MIGRATION_HINT_DETAIL =
  "Table `promo_codes` is missing or inaccessible. Apply Prisma migrations: `pnpm db:migrate` locally, or `pnpm db:migrate:deploy` in production (migration `20260423120000_add_promo_codes`).";

/**
 * Maps Prisma "table does not exist" (and similar) to a structured API error for clearer admin UI / logs.
 */
function throwIfMissingPromoCodesTable(error: unknown): void {
  if (typeof error !== "object" || error === null) {
    return;
  }
  const prismaCode =
    "code" in error ? String((error as { code: unknown }).code) : "";
  const message = error instanceof Error ? error.message : String(error);
  const mentionsPromoCodes = /promo_codes/i.test(message);
  const missingRelation =
    prismaCode === "P2021" ||
    (mentionsPromoCodes &&
      /does not exist|existiert nicht|n\x27existe pas|не существует/i.test(message));
  if (!missingRelation) {
    return;
  }
  throw {
    status: 503,
    type: "https://api.shop.am/problems/database-migration-required",
    title: "Database migration required",
    detail: MIGRATION_HINT_DETAIL,
  };
}

async function runPromoQuery<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    logger.error(`[admin-promocodes] ${label} failed`, {
      message: e instanceof Error ? e.message : String(e),
    });
    throwIfMissingPromoCodesTable(e);
    throw e;
  }
}

class AdminPromoCodesService {
  async getPromoCodes() {
    const promoCodes = await runPromoQuery("getPromoCodes", () =>
      db.promoCode.findMany({
        orderBy: {
          createdAt: "desc",
        },
      }),
    );

    return {
      data: promoCodes,
    };
  }

  async createPromoCode(data: PromoCodeInput) {
    const normalizedCode = data.code.trim().toUpperCase();
    const hasCode = normalizedCode.length > 0;
    const validDiscount = data.discountPercent > 0 && data.discountPercent <= 100;

    if (!hasCode) {
      throw {
        status: 400,
        type: "https://api.shop.am/problems/validation-error",
        title: "Validation Error",
        detail: "Promo code is required",
      };
    }

    if (!validDiscount) {
      throw {
        status: 400,
        type: "https://api.shop.am/problems/validation-error",
        title: "Validation Error",
        detail: "Discount percent must be greater than 0 and less than or equal to 100",
      };
    }

    const existingPromoCode = await runPromoQuery("createPromoCode.findUnique", () =>
      db.promoCode.findUnique({
        where: { code: normalizedCode },
      }),
    );

    if (existingPromoCode) {
      throw {
        status: 409,
        type: "https://api.shop.am/problems/conflict",
        title: "Promo code already exists",
        detail: `Promo code "${normalizedCode}" already exists`,
      };
    }

    const promoCode = await runPromoQuery("createPromoCode.create", () =>
      db.promoCode.create({
        data: {
          code: normalizedCode,
          discountPercent: data.discountPercent,
          isActive: true,
        },
      }),
    );

    return { data: promoCode };
  }

  async updatePromoCodeStatus(promoCodeId: string, data: PromoCodeStatusInput) {
    const promoCode = await runPromoQuery("updatePromoCodeStatus.findUnique", () =>
      db.promoCode.findUnique({
        where: { id: promoCodeId },
      }),
    );

    if (!promoCode) {
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Promo code not found",
        detail: `Promo code with id "${promoCodeId}" does not exist`,
      };
    }

    const updatedPromoCode = await runPromoQuery("updatePromoCodeStatus.update", () =>
      db.promoCode.update({
        where: { id: promoCodeId },
        data: { isActive: data.isActive },
      }),
    );

    return { data: updatedPromoCode };
  }

  async deletePromoCode(promoCodeId: string) {
    const promoCode = await runPromoQuery("deletePromoCode.findUnique", () =>
      db.promoCode.findUnique({
        where: { id: promoCodeId },
      }),
    );

    if (!promoCode) {
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Promo code not found",
        detail: `Promo code with id "${promoCodeId}" does not exist`,
      };
    }

    await runPromoQuery("deletePromoCode.delete", () =>
      db.promoCode.delete({
        where: { id: promoCodeId },
      }),
    );

    return { success: true };
  }
}

export const adminPromoCodesService = new AdminPromoCodesService();
