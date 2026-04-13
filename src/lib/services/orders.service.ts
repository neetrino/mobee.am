import { db } from "@white-shop/db";
import { Prisma } from "@prisma/client";
import { customAlphabet } from "nanoid";
import type { CheckoutData } from "../types/checkout";
import { logger } from "../utils/logger";
import { adminDeliveryService } from "./admin/admin-delivery.service";
import { extractMediaUrl } from "../utils/extractMediaUrl";

const orderNumberId = customAlphabet("0123456789ABCDEFGHJKLMNPQRSTUVWXYZ", 10);

function generateOrderNumber(): string {
  const now = new Date();
  const ymd =
    now.getFullYear().toString().slice(-2) +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");
  return `${ymd}-${orderNumberId()}`;
}
type CartItemWithRelations = Prisma.CartItemGetPayload<{
  include: {
    product: {
      include: {
        translations: true;
      };
    };
    variant: {
      include: {
        options: true;
      };
    };
  };
}>;

type ProductVariantWithProduct = Prisma.ProductVariantGetPayload<{
  include: {
    product: {
      include: {
        translations: true;
      };
    };
    options: true;
  };
}>;

type OrderItemWithVariant = Prisma.OrderItemGetPayload<{
  include: {
    variant: {
      include: {
        options: {
          include: {
            attributeValue: {
              include: {
                translations: true;
                attribute: true;
              };
            };
          };
        };
      };
    };
  };
}>;

class OrdersService {
  /**
   * Create order (checkout)
   */
  async checkout(data: CheckoutData, userId?: string) {
    try {
      const {
        cartId,
        items: guestItems,
        email,
        phone,
        shippingMethod = 'pickup',
        shippingAddress,
        paymentMethod = 'idram',
      } = data;
      // shippingAmount is ignored — computed server-side from shippingMethod and address

      // Validate required fields
      if (!email || !phone) {
        throw {
          status: 400,
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          detail: "Email and phone are required",
        };
      }

      // Get cart items - either from user cart or guest items
      let cartItems: Array<{
        variantId: string;
        productId: string;
        quantity: number;
        price: number;
        productTitle: string;
        variantTitle?: string;
        sku: string;
        imageUrl?: string;
      }> = [];

      if (userId && cartId && cartId !== 'guest-cart') {
        // Get items from user's cart
        const cart = await db.cart.findFirst({
          where: { id: cartId, userId },
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
                    options: true,
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

        if (!cart || cart.items.length === 0) {
          throw {
            status: 400,
            type: "https://api.shop.am/problems/validation-error",
            title: "Cart is empty",
            detail: "Cannot checkout with an empty cart",
          };
        }

        // Format cart items
        logger.debug('Processing cart items', { count: cart.items.length });
        
        cartItems = await Promise.all(
          cart.items.map(async (item: CartItemWithRelations) => {
            const product = item.product;
            const variant = item.variant;
            
            if (!variant) {
              logger.error('Cart item missing variant', {
                itemId: item.id,
                variantId: item.variantId,
                productId: item.productId,
              });
              throw {
                status: 404,
                type: "https://api.shop.am/problems/not-found",
                title: "Variant not found",
                detail: `Variant ${item.variantId} not found for cart item`,
              };
            }
            
            logger.debug('Processing cart item', {
              itemId: item.id,
              variantId: variant.id,
              productId: product.id,
              quantity: item.quantity,
              variantStock: variant.stock,
              variantSku: variant.sku,
            });
            
            const translation = product.translations?.[0] || product.translations?.[0];

            // Get variant title from options
            const variantTitle = variant.options
              ?.map((opt) => `${opt.attributeKey || ''}: ${opt.value || ''}`)
              .join(', ') || undefined;

            // Get image URL
            const imageUrl = extractMediaUrl(product.media) ?? undefined;

            // Check stock availability
            if (variant.stock < item.quantity) {
              throw {
                status: 422,
                type: "https://api.shop.am/problems/validation-error",
                title: "Insufficient stock",
                detail: `Product "${translation?.title || 'Unknown'}" - insufficient stock. Available: ${variant.stock}, Requested: ${item.quantity}`,
              };
            }

            // Use current variant price from DB (ignore priceSnapshot to prevent outdated/abused prices)
            const currentPrice = Number(variant.price);
            const cartItem = {
              variantId: variant.id,
              productId: product.id,
              quantity: item.quantity,
              price: currentPrice,
              productTitle: translation?.title || 'Unknown Product',
              variantTitle,
              sku: variant.sku || '',
              imageUrl,
            };
            
            logger.debug('Cart item formatted', {
              variantId: cartItem.variantId,
              productId: cartItem.productId,
              quantity: cartItem.quantity,
              sku: cartItem.sku,
            });
            
            return cartItem;
          })
        );
        
        logger.info('All cart items processed', { count: cartItems.length });
      } else if (guestItems && Array.isArray(guestItems) && guestItems.length > 0) {
        // Validate and collect variant IDs
        const variantIds: string[] = [];
        for (const item of guestItems) {
          if (!item.productId || !item.variantId || !item.quantity) {
            throw {
              status: 400,
              type: "https://api.shop.am/problems/validation-error",
              title: "Validation Error",
              detail: "Each item must have productId, variantId, and quantity",
            };
          }
          variantIds.push(item.variantId);
        }
        const uniqueVariantIds = [...new Set(variantIds)];

        // Batch fetch all variants (one query instead of N)
        const variants = await db.productVariant.findMany({
          where: { id: { in: uniqueVariantIds } },
          include: {
            product: { include: { translations: true } },
            options: true,
          },
        });
        const variantMap = new Map(variants.map((v) => [v.id, v]));

        cartItems = guestItems.map((item: { productId: string; variantId: string; quantity: number }) => {
          const variant = variantMap.get(item.variantId);
          if (!variant || variant.productId !== item.productId) {
            throw {
              status: 404,
              type: "https://api.shop.am/problems/not-found",
              title: "Product variant not found",
              detail: `Variant ${item.variantId} not found for product ${item.productId}`,
            };
          }
          if (variant.stock < item.quantity) {
            throw {
              status: 422,
              type: "https://api.shop.am/problems/validation-error",
              title: "Insufficient stock",
              detail: `Insufficient stock. Available: ${variant.stock}, Requested: ${item.quantity}`,
            };
          }
          const translation = variant.product.translations?.[0] || variant.product.translations?.[0];
          const variantTitle = variant.options
            ?.map((opt: { attributeKey?: string | null; value?: string | null }) => `${opt.attributeKey ?? ""}: ${opt.value ?? ""}`)
            .join(", ") ?? undefined;
          const imageUrl = extractMediaUrl(variant.product.media) ?? undefined;
          return {
            variantId: variant.id,
            productId: variant.product.id,
            quantity: item.quantity,
            price: Number(variant.price),
            productTitle: translation?.title ?? "Unknown Product",
            variantTitle,
            sku: variant.sku ?? "",
            imageUrl,
          };
        });
      } else {
        throw {
          status: 400,
          type: "https://api.shop.am/problems/validation-error",
          title: "Cart is empty",
          detail: "Cannot checkout with an empty cart",
        };
      }

      if (cartItems.length === 0) {
        throw {
          status: 400,
          type: "https://api.shop.am/problems/validation-error",
          title: "Cart is empty",
          detail: "Cannot checkout with an empty cart",
        };
      }

      // Calculate totals
      const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const discountAmount = 0; // TODO: Implement discount/coupon logic
      // Shipping: computed server-side only (never trust client-provided amount)
      let shippingAmount = 0;
      if (shippingMethod === 'delivery' && shippingAddress?.city?.trim()) {
        const country = (shippingAddress.countryCode ?? 'Armenia').toString();
        shippingAmount = await adminDeliveryService.getDeliveryPrice(
          shippingAddress.city.trim(),
          country
        );
        if (shippingAmount < 0) shippingAmount = 0;
      }
      const taxAmount = 0; // TODO: Calculate tax if needed
      const total = subtotal - discountAmount + shippingAmount + taxAmount;

      // Generate order number
      const orderNumber = generateOrderNumber();

      // Create order with items in a transaction (timeout to avoid hung connections)
      const order = await db.$transaction(
        async (tx: Prisma.TransactionClient) => {
        // Create order
        const newOrder = await tx.order.create({
          data: {
            number: orderNumber,
            userId: userId || null,
            status: 'pending',
            paymentStatus: 'pending',
            fulfillmentStatus: 'unfulfilled',
            subtotal,
            discountAmount,
            shippingAmount,
            taxAmount,
            total,
            currency: 'AMD',
            customerEmail: email,
            customerPhone: phone,
            customerLocale: 'en', // TODO: Get from request
            shippingMethod,
            shippingAddress: shippingAddress ? JSON.parse(JSON.stringify(shippingAddress)) : null,
            billingAddress: shippingAddress ? JSON.parse(JSON.stringify(shippingAddress)) : null,
            items: {
              create: cartItems.map((item) => ({
                variantId: item.variantId,
                productTitle: item.productTitle,
                variantTitle: item.variantTitle,
                sku: item.sku,
                quantity: item.quantity,
                price: item.price,
                total: item.price * item.quantity,
                imageUrl: item.imageUrl,
              })),
            },
            events: {
              create: {
                type: 'order_created',
                data: {
                  source: userId ? 'user' : 'guest',
                  paymentMethod,
                  shippingMethod,
                },
              },
            },
          },
          include: {
            items: true,
          },
        });

        // Update stock atomically: only decrement if stock >= quantity (avoids race condition)
        logger.debug('Updating stock for variants', { count: cartItems.length });
        
        try {
          for (const item of cartItems) {
            if (!item.variantId) {
              logger.error('Missing variantId for item', { item });
              throw {
                status: 400,
                type: "https://api.shop.am/problems/validation-error",
                title: "Validation Error",
                detail: `Missing variantId for item with SKU: ${item.sku}`,
              };
            }

            const quantity = Number(item.quantity);
            const variantId = item.variantId;
            const updated = await tx.$executeRaw(
              Prisma.sql`UPDATE product_variants SET stock = stock - ${quantity} WHERE id = ${variantId} AND stock >= ${quantity}`
            );
            if (updated === 0) {
              const variant = await tx.productVariant.findUnique({
                where: { id: variantId },
                select: { sku: true, stock: true },
              });
              logger.error('Insufficient stock on atomic decrement', {
                variantId,
                sku: variant?.sku,
                currentStock: variant?.stock,
                requested: quantity,
              });
              throw {
                status: 422,
                type: "https://api.shop.am/problems/validation-error",
                title: "Insufficient stock",
                detail: `Insufficient stock for SKU ${variant?.sku ?? variantId}. Available: ${variant?.stock ?? 0}, requested: ${quantity}`,
              };
            }
            logger.debug('Stock decremented', { variantId, quantity });
          }
          logger.info('All variant stocks updated successfully');
        } catch (stockError: unknown) {
          const err = stockError as { status?: number; type?: string };
          if (err.status && err.type) throw stockError;
          logger.error('Error updating stock', { error: stockError });
          throw stockError;
        }

        // Create payment record
        const payment = await tx.payment.create({
          data: {
            orderId: newOrder.id,
            provider: paymentMethod,
            method: paymentMethod,
            amount: total,
            currency: 'AMD',
            status: 'pending',
          },
        });

        // If user cart, delete cart after successful checkout
        if (userId && cartId && cartId !== 'guest-cart') {
          await tx.cart.delete({
            where: { id: cartId },
          });
        }

        return { order: newOrder, payment };
      },
        { timeout: 10000, maxWait: 5000 }
      );

      // Return order and payment info
      return {
        order: {
          id: order.order.id,
          number: order.order.number,
          status: order.order.status,
          paymentStatus: order.order.paymentStatus,
          total: order.order.total,
          currency: order.order.currency,
        },
        payment: {
          provider: order.payment.provider,
          paymentUrl: null, // TODO: Generate payment URL for Idram/ArCa
          expiresAt: null, // TODO: Set expiration if needed
        },
        nextAction: paymentMethod === 'idram' || paymentMethod === 'arca' 
          ? 'redirect_to_payment' 
          : 'view_order',
      };
    } catch (error: unknown) {
      // Type guard for custom error
      const customError = error as { status?: number; type?: string; message?: string; code?: string; name?: string; meta?: unknown; stack?: string };
      
      // If it's already our custom error, re-throw it
      if (customError.status && customError.type) {
        throw error;
      }

      // Log unexpected errors
      logger.error("Checkout error", {
        error: {
          name: customError?.name,
          message: customError?.message,
          code: customError?.code,
          meta: customError?.meta,
          stack: customError?.stack?.substring(0, 500),
        },
      });

      // Handle Prisma errors
      if (customError?.code === 'P2002') {
        throw {
          status: 409,
          type: "https://api.shop.am/problems/conflict",
          title: "Conflict",
          detail: "Order number already exists, please try again",
        };
      }

      // Generic error
      throw {
        status: 500,
        type: "https://api.shop.am/problems/internal-error",
        title: "Internal Server Error",
        detail: customError?.message || "An error occurred during checkout",
      };
    }
  }

  /**
   * Get user orders list (paginated)
   */
  async list(userId: string, options?: { page?: number; limit?: number }) {
    const page = Math.max(1, options?.page ?? 1);
    const limit = Math.min(100, Math.max(1, options?.limit ?? 20));
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where: { userId },
        include: {
          items: { select: { id: true } },
          payments: { select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.order.count({ where: { userId } }),
    ]);

    return {
      data: orders.map((order: {
        id: string;
        number: string;
        status: string;
        paymentStatus: string;
        fulfillmentStatus: string;
        total: number;
        subtotal: number;
        discountAmount: number;
        shippingAmount: number;
        taxAmount: number;
        currency: string;
        createdAt: Date;
        items: Array<{ id: string }>;
      }) => ({
        id: order.id,
        number: order.number,
        status: order.status,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        total: order.total,
        subtotal: order.subtotal,
        discountAmount: order.discountAmount,
        shippingAmount: order.shippingAmount,
        taxAmount: order.taxAmount,
        currency: order.currency,
        createdAt: order.createdAt,
        itemsCount: order.items.length,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get order by number
   */
  async findByNumber(orderNumber: string, userId: string) {
    const order = await db.order.findFirst({
      where: {
        number: orderNumber,
        userId,
      },
      include: {
        items: {
          include: {
            variant: {
              include: {
                options: {
                  include: {
                    attributeValue: {
                      include: {
                        attribute: true,
                        translations: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        payments: true,
        events: true,
      },
    });

    if (!order) {
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Order not found",
        detail: `Order with number '${orderNumber}' not found`,
      };
    }

    // Parse shipping address if it's a JSON string
    let shippingAddress = order.shippingAddress;
    if (typeof shippingAddress === 'string') {
      try {
        shippingAddress = JSON.parse(shippingAddress);
      } catch {
        shippingAddress = null;
      }
    }

    // Debug logging
    logger.info('Order found', {
      orderNumber: order.number,
      itemsCount: order.items.length,
      items: order.items.map((item: OrderItemWithVariant) => ({
        variantId: item.variantId,
        productTitle: item.productTitle,
        variant: item.variant ? {
          id: item.variant.id,
          optionsCount: item.variant.options?.length || 0,
          options: item.variant.options,
        } : null,
      })),
    });

    return {
      id: order.id,
      number: order.number,
      status: order.status,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      items: order.items.map((item: OrderItemWithVariant) => {
        const variantOptions = item.variant?.options?.map((opt) => {
          // Debug logging for each option
          logger.debug('Processing option', {
            attributeKey: opt.attributeKey,
            value: opt.value,
            valueId: opt.valueId,
            hasAttributeValue: !!opt.attributeValue,
            attributeValueData: opt.attributeValue ? {
              value: opt.attributeValue.value,
              attributeKey: opt.attributeValue.attribute.key,
              imageUrl: opt.attributeValue.imageUrl,
              hasTranslations: opt.attributeValue.translations?.length > 0,
            } : null,
          });

          // New format: Use AttributeValue if available
          if (opt.attributeValue) {
            // Get label from translations (prefer current locale, fallback to first available)
            const translations = opt.attributeValue.translations || [];
            const label = translations.length > 0 ? translations[0].label : opt.attributeValue.value;
            
            return {
              attributeKey: opt.attributeValue.attribute.key || undefined,
              value: opt.attributeValue.value || undefined,
              label: label || undefined,
              imageUrl: opt.attributeValue.imageUrl || undefined,
              colors: opt.attributeValue.colors || undefined,
            };
          }
          // Old format: Use attributeKey and value directly
          return {
            attributeKey: opt.attributeKey || undefined,
            value: opt.value || undefined,
          };
        }) || [];

        logger.debug('Item mapping', {
          productTitle: item.productTitle,
          variantId: item.variantId,
          hasVariant: !!item.variant,
          optionsCount: item.variant?.options?.length || 0,
          variantOptions,
        });

        return {
          variantId: item.variantId || '',
          productTitle: item.productTitle,
          variantTitle: item.variantTitle || '',
          sku: item.sku,
          quantity: item.quantity,
          price: Number(item.price),
          total: Number(item.total),
          imageUrl: item.imageUrl || undefined,
          variantOptions,
        };
      }),
      totals: {
        subtotal: Number(order.subtotal),
        discount: Number(order.discountAmount),
        shipping: Number(order.shippingAmount),
        tax: Number(order.taxAmount),
        total: Number(order.total),
        currency: order.currency,
      },
      customer: {
        email: order.customerEmail || undefined,
        phone: order.customerPhone || undefined,
      },
      shippingAddress: shippingAddress,
      shippingMethod: order.shippingMethod || 'pickup',
      trackingNumber: order.trackingNumber || undefined,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}

export const ordersService = new OrdersService();

