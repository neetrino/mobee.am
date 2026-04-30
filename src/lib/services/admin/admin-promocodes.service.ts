import { db } from "@white-shop/db";

interface PromoCodeInput {
  code: string;
  discountPercent: number;
}

interface PromoCodeStatusInput {
  isActive: boolean;
}

class AdminPromoCodesService {
  async getPromoCodes() {
    const promoCodes = await db.promoCode.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

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

    const existingPromoCode = await db.promoCode.findUnique({
      where: { code: normalizedCode },
    });

    if (existingPromoCode) {
      throw {
        status: 409,
        type: "https://api.shop.am/problems/conflict",
        title: "Promo code already exists",
        detail: `Promo code "${normalizedCode}" already exists`,
      };
    }

    const promoCode = await db.promoCode.create({
      data: {
        code: normalizedCode,
        discountPercent: data.discountPercent,
        isActive: true,
      },
    });

    return { data: promoCode };
  }

  async updatePromoCodeStatus(promoCodeId: string, data: PromoCodeStatusInput) {
    const promoCode = await db.promoCode.findUnique({
      where: { id: promoCodeId },
    });

    if (!promoCode) {
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Promo code not found",
        detail: `Promo code with id "${promoCodeId}" does not exist`,
      };
    }

    const updatedPromoCode = await db.promoCode.update({
      where: { id: promoCodeId },
      data: { isActive: data.isActive },
    });

    return { data: updatedPromoCode };
  }

  async deletePromoCode(promoCodeId: string) {
    const promoCode = await db.promoCode.findUnique({
      where: { id: promoCodeId },
    });

    if (!promoCode) {
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Promo code not found",
        detail: `Promo code with id "${promoCodeId}" does not exist`,
      };
    }

    await db.promoCode.delete({
      where: { id: promoCodeId },
    });

    return { success: true };
  }
}

export const adminPromoCodesService = new AdminPromoCodesService();
