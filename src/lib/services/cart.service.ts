import { db } from "@white-shop/db";
import { logger } from "../utils/logger";
import { extractMediaUrl } from "../utils/extractMediaUrl";

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
        };
      }) => {
        const product = item.product;
        const variant = item.variant;
        const translation =
          product?.translations?.find((t: { locale: string }) => t.locale === locale) ||
          product?.translations?.[0];

        const imageUrl = extractMediaUrl(product?.media);

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

    const [cart, variant] = await Promise.all([
      db.cart.findFirst({
        where: { userId },
        include: { items: true },
      }),
      db.productVariant.findUnique({
        where: { id: variantId },
        select: { id: true, published: true, productId: true, stock: true, price: true },
      }),
    ]);

    let resolvedCart = cart;
    if (!resolvedCart) {
      resolvedCart = await db.cart.create({
        data: {
          userId,
          locale,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          items: { create: [] },
        },
        include: { items: true },
      });
    }

    if (!variant || !variant.published || variant.productId !== productId) {
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Variant not found",
      };
    }

    const existingItem = resolvedCart.items.find((item: { variantId: string }) => item.variantId === variantId);

    // Calculate total quantity that will be in cart after adding
    const totalQuantity = existingItem ? existingItem.quantity + quantity : quantity;

    // Check if total quantity exceeds available stock
    if (totalQuantity > variant.stock) {
      logger.warn("Cart: stock limit exceeded", {
        variantId,
        currentInCart: existingItem?.quantity ?? 0,
        requestedQuantity: quantity,
        totalQuantity,
        availableStock: variant.stock,
      });
      throw {
        status: 422,
        type: "https://api.shop.am/problems/validation-error",
        title: "Insufficient stock",
        detail: `No more stock available. Maximum available: ${variant.stock}, already in cart: ${existingItem?.quantity || 0}, requested: ${quantity}`,
      };
    }

    let item;
    if (existingItem) {
      logger.debug("Cart: updating existing item", {
        itemId: existingItem.id,
        oldQuantity: existingItem.quantity,
        newQuantity: totalQuantity,
      });
      item = await db.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: totalQuantity,
        },
      });
      // Summary from current state: other items + this updated item (no extra DB query)
      const otherItems = resolvedCart.items.filter((i: { id: string }) => i.id !== existingItem.id);
      const itemsForSum = [
        ...otherItems.map((i: { quantity: number; priceSnapshot: unknown }) => ({ q: i.quantity, p: Number(i.priceSnapshot) })),
        { q: totalQuantity, p: Number(item.priceSnapshot) },
      ];
      const itemsCount = itemsForSum.reduce((sum, i) => sum + i.q, 0);
      const total = itemsForSum.reduce((sum, i) => sum + i.q * i.p, 0);
      return {
        item: { id: item.id, variantId, quantity: item.quantity, price: Number(item.priceSnapshot) },
        cartSummary: { itemsCount, total },
      };
    } else {
      logger.debug("Cart: creating new item", { variantId, quantity });
      item = await db.cartItem.create({
        data: {
          cartId: resolvedCart.id,
          variantId,
          productId,
          quantity,
          priceSnapshot: variant.price,
        },
      });
      const itemsForSum = [
        ...resolvedCart.items.map((i: { quantity: number; priceSnapshot: unknown }) => ({ q: i.quantity, p: Number(i.priceSnapshot) })),
        { q: quantity, p: Number(variant.price) },
      ];
      const itemsCount = itemsForSum.reduce((sum, i) => sum + i.q, 0);
      const total = itemsForSum.reduce((sum, i) => sum + i.q * i.p, 0);
      return {
        item: { id: item.id, variantId, quantity: item.quantity, price: Number(item.priceSnapshot) },
        cartSummary: { itemsCount, total },
      };
    }
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
    const variant = await db.productVariant.findUnique({
      where: { id: item.variantId },
    });

    if (!variant || variant.stock < quantity) {
      throw {
        status: 422,
        type: "https://api.shop.am/problems/validation-error",
        title: "Insufficient stock",
        detail: `Requested quantity (${quantity}) exceeds available stock (${variant?.stock || 0})`,
      };
    }

    const updatedItem = await db.cartItem.update({
      where: { id: itemId },
      data: { quantity },
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

    await db.cartItem.delete({
      where: { id: itemId },
    });

    return null;
  }
}

export const cartService = new CartService();

