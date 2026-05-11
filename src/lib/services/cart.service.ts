import { db } from "@white-shop/db";
import { Prisma } from "@white-shop/db";
import { resolveCartLineProductImageUrl } from "../cart/resolveCartLineProductImage";
import {
  calculateReservationDelta,
  releaseVariantStockReservation,
  reserveVariantStock,
} from "./inventory/stock-reservation";

class CartService {
  /**
   * Get or create user's cart
   */
  async getCart(userId: string, locale: string = "en") {
    // Get discount settings
    const discountSettings = await db.settings.findMany({
      where: {
        key: {
          in: ["globalDiscount", "categoryDiscounts", "brandDiscounts"],
        },
      },
    });

    const globalDiscount =
      Number(
        discountSettings.find((s: { key: string; value: unknown }) => s.key === "globalDiscount")?.value
      ) || 0;
    
    const categoryDiscountsSetting = discountSettings.find((s: { key: string; value: unknown }) => s.key === "categoryDiscounts");
    const categoryDiscounts = categoryDiscountsSetting ? (categoryDiscountsSetting.value as Record<string, number>) || {} : {};
    
    const brandDiscountsSetting = discountSettings.find((s: { key: string; value: unknown }) => s.key === "brandDiscounts");
    const brandDiscounts = brandDiscountsSetting ? (brandDiscountsSetting.value as Record<string, number>) || {} : {};
    let cart = await db.cart.findFirst({
      where: {
        userId,
      },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    translations: true,
                  },
                },
              },
            },
            product: {
              include: {
                translations: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      cart = await db.cart.create({
        data: {
          userId,
          locale,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          items: {
            create: [],
          },
        },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    include: {
                      translations: true,
                    },
                  },
                },
              },
              product: {
                include: {
                  translations: true,
                },
              },
            },
          },
        },
      });
    }

    // Format items using already-loaded cart data (no N+1: no extra DB calls per item)
    const itemsWithDetails = cart.items.map(
      (item: {
        id: string;
        productId: string;
        variantId: string;
        quantity: number;
        product: {
          id: string;
          media: unknown;
          discountPercent?: number;
          primaryCategoryId?: string | null;
          brandId?: string | null;
          translations: Array<{ locale: string; title?: string; slug?: string }>;
        };
        variant: {
          id: string;
          sku: string | null;
          stock: number;
          price: number;
          compareAtPrice?: number | null;
          imageUrl?: string | null;
        };
      }) => {
        const product = item.product;
        const variant = item.variant;
        const translation =
          product?.translations?.find((t: { locale: string }) => t.locale === locale) ||
          product?.translations?.[0];

        const imageUrl = resolveCartLineProductImageUrl(
          { media: product?.media },
          { imageUrl: variant?.imageUrl ?? null },
        );

        const productDiscount = product?.discountPercent ?? 0;
        let appliedDiscount = 0;
        if (productDiscount > 0) {
          appliedDiscount = productDiscount;
        } else {
          const primaryCategoryId = product?.primaryCategoryId;
          if (primaryCategoryId && categoryDiscounts[primaryCategoryId]) {
            appliedDiscount = categoryDiscounts[primaryCategoryId];
          } else {
            const brandId = product?.brandId;
            if (brandId && brandDiscounts[brandId]) {
              appliedDiscount = brandDiscounts[brandId];
            } else if (globalDiscount > 0) {
              appliedDiscount = globalDiscount;
            }
          }
        }

        const variantOriginalPrice = variant?.price ?? 0;
        let finalPrice = variantOriginalPrice;
        let originalPrice: number | null = null;
        if (appliedDiscount > 0 && variantOriginalPrice > 0) {
          finalPrice = variantOriginalPrice * (1 - appliedDiscount / 100);
          originalPrice = variantOriginalPrice;
        } else if (variant?.compareAtPrice != null && variant.compareAtPrice > variantOriginalPrice) {
          originalPrice = Number(variant.compareAtPrice);
        }

        return {
          id: item.id,
          variant: {
            id: variant?.id ?? item.variantId,
            sku: variant?.sku ?? "",
            stock: variant?.stock ?? 0,
            product: {
              id: product?.id ?? "",
              title: translation?.title ?? "",
              slug: translation?.slug ?? "",
              image: imageUrl,
            },
          },
          quantity: item.quantity,
          price: finalPrice,
          originalPrice,
          total: finalPrice * item.quantity,
        };
      }
    );

    const subtotal = itemsWithDetails.reduce((sum, item) => sum + item.total, 0);

    return {
      cart: {
        id: cart.id,
        items: itemsWithDetails,
        totals: {
          subtotal,
          discount: 0,
          shipping: 0,
          tax: 0,
          total: subtotal,
          currency: "AMD",
        },
        itemsCount: itemsWithDetails.reduce((sum, item) => sum + item.quantity, 0),
      },
    };
  }

  /**
   * Add item to cart
   */
  async addItem(
    userId: string,
    data: { variantId: string; productId: string; quantity?: number },
    locale: string = "en"
  ) {
    const { variantId, productId, quantity = 1 } = data;

    if (!variantId || !productId) {
      throw {
        status: 400,
        type: "https://api.shop.am/problems/validation-error",
        title: "Validation failed",
        detail: "variantId and productId are required",
      };
    }

    const variant = await db.productVariant.findUnique({
      where: { id: variantId },
      select: { id: true, published: true, productId: true, price: true },
    });

    if (!variant || !variant.published) {
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Variant not found",
      };
    }

    /** Trust DB relation — client `productId` can be stale (wishlist/cache); cart row must match variant. */
    const resolvedProductId = variant.productId;

    return db.$transaction(async (tx: Prisma.TransactionClient) => {
      const existingCart = await tx.cart.findFirst({
        where: { userId },
      });
      const resolvedCart = existingCart
        ? existingCart
        : await tx.cart.create({
            data: {
              userId,
              locale,
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });

      const existingItem = await tx.cartItem.findFirst({
        where: {
          cartId: resolvedCart.id,
          variantId,
        },
      });

      const previousQuantity = existingItem?.quantity ?? 0;
      const nextQuantity = previousQuantity + quantity;
      const reservationDelta = calculateReservationDelta({
        previousQuantity,
        nextQuantity,
      });
      await reserveVariantStock(tx, variantId, reservationDelta);

      const item = existingItem
        ? await tx.cartItem.update({
            where: { id: existingItem.id },
            data: { quantity: nextQuantity },
          })
        : await tx.cartItem.create({
            data: {
              cartId: resolvedCart.id,
              variantId,
              productId: resolvedProductId,
              quantity: nextQuantity,
              priceSnapshot: variant.price,
            },
          });

      const cartItems = await tx.cartItem.findMany({
        where: { cartId: resolvedCart.id },
        select: { quantity: true, priceSnapshot: true },
      });

      const itemsCount = cartItems.reduce((sum, cartItem) => sum + cartItem.quantity, 0);
      const total = cartItems.reduce(
        (sum, cartItem) => sum + cartItem.quantity * Number(cartItem.priceSnapshot),
        0
      );

      return {
        item: { id: item.id, variantId, quantity: item.quantity, price: Number(item.priceSnapshot) },
        cartSummary: { itemsCount, total },
      };
    });
  }

  /**
   * Update cart item
   */
  async updateItem(userId: string, itemId: string, quantity: number) {
    if (!quantity || quantity < 1) {
      throw {
        status: 400,
        type: "https://api.shop.am/problems/validation-error",
        title: "Validation failed",
        detail: "quantity must be at least 1",
      };
    }

    const cart = await db.cart.findFirst({
      where: {
        userId,
        items: {
          some: {
            id: itemId,
          },
        },
      },
      include: {
        items: {
          where: { id: itemId },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Cart item not found",
      };
    }

    const item = cart.items[0];
    const reservationDelta = calculateReservationDelta({
      previousQuantity: item.quantity,
      nextQuantity: quantity,
    });
    const updatedItem = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      if (reservationDelta > 0) {
        await reserveVariantStock(tx, item.variantId, reservationDelta);
      } else if (reservationDelta < 0) {
        await releaseVariantStockReservation(tx, item.variantId, Math.abs(reservationDelta));
      }

      return tx.cartItem.update({
        where: { id: itemId },
        data: { quantity },
      });
    });

    return {
      item: {
        id: updatedItem.id,
        quantity: updatedItem.quantity,
      },
    };
  }

  /**
   * Remove item from cart
   */
  async removeItem(userId: string, itemId: string) {
    const cart = await db.cart.findFirst({
      where: {
        userId,
        items: {
          some: {
            id: itemId,
          },
        },
      },
    });

    if (!cart) {
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Cart item not found",
      };
    }

    const item = await db.cartItem.findUnique({
      where: { id: itemId },
      select: { variantId: true, quantity: true },
    });

    if (!item) {
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Cart item not found",
      };
    }

    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      await releaseVariantStockReservation(tx, item.variantId, item.quantity);
      await tx.cartItem.delete({
        where: { id: itemId },
      });
    });

    return null;
  }
}

export const cartService = new CartService();

