import { db } from "@white-shop/db";
import { Prisma } from "@white-shop/db";
import type { CheckoutData } from "../types/checkout";
import { logger } from "../utils/logger";
import {
  calculateDiscountAmount,
  calculateTotals,
  normalizeCheckoutLocale,
  normalizePercent,
} from "./orders/checkout-calculations";
import { createPaymentUrl } from "./orders/checkout-payment";
import {
  resolveCheckoutShippingAmount,
  type DeliverySpeed,
} from "./orders/checkout-shipping";
import { isDeliveryAvailableForSubtotalAmd } from "../checkout/delivery-eligibility";
import { CART_MONEY_BASE_CURRENCY } from "../checkout/cart-money";
import { MIN_ORDER_SUBTOTAL_FOR_DELIVERY_AMD } from "../constants/checkout-shipping.constants";
import { convertPrice } from "../currency";
import { removeOrphanCartItemsForCart } from "./cart-remove-orphan-items";
import { sendAparikCheckoutEmail } from "../email/send-aparik-checkout-email";
import {
  buildCheckoutCartItemDetails,
  type CheckoutCartItemDetails,
} from "./orders/checkout-cart-item-details";
import {
  assertCartLinePurchasable,
  assertVariantPurchasable,
} from "../products/variant-price-display";
import { normalizeCheckoutDisplayCurrency } from "../checkout/checkout-email-money";
import { adminService } from "./admin.service";
import { availableUnreservedStock, hasUnreservedQuantity } from "./inventory/available-stock";
import { decrementCheckoutStock } from "./inventory/decrement-checkout-stock";
import type { CommerceRequestContext } from "./orders/order-transition.types";
import { ORDER_EVENT_TYPE } from "./orders/order-fsm.constants";

const ORDER_NUMBER_START = 1000;
const ORDER_NUMBER_ADVISORY_LOCK_KEY = 4004001;

/**
 * Generate the next sequential order number (>= 1000).
 * Serializes MAX+1 with a transaction-scoped advisory lock so concurrent
 * checkouts cannot collide. Unique `orders.number` remains a last-resort guard.
 */
async function generateSequentialOrderNumber(
  tx: Prisma.TransactionClient
): Promise<string> {
  await tx.$executeRaw(
    Prisma.sql`SELECT pg_advisory_xact_lock(${ORDER_NUMBER_ADVISORY_LOCK_KEY})`,
  );
  const rows = await tx.$queryRaw<Array<{ max: bigint | null }>>(
    Prisma.sql`SELECT MAX(CAST("number" AS BIGINT)) AS max FROM "orders" WHERE "number" ~ '^[0-9]+$'`
  );
  const currentMax = Number(rows[0]?.max ?? 0);
  const next = Math.max(currentMax + 1, ORDER_NUMBER_START);
  return String(next);
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
        options: {
          include: {
            attributeValue: {
              include: {
                translations: true,
                attribute: true,
              },
            },
          },
        },
      },
    },
  },
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

interface ReorderSkippedItem {
  variantId: string;
  productTitle: string;
  quantity: number;
  reason: "variant_not_found" | "variant_unpublished" | "insufficient_stock";
  availableStock?: number;
}

interface ReorderAddedItem {
  variantId: string;
  productId: string;
  quantity: number;
}

const ORDER_DETAIL_INCLUDE = {
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
} as const;

class OrdersService {
  private mapOrderDetailResponse(order: {
    id: string;
    number: string;
    status: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    subtotal: Prisma.Decimal | number;
    discountAmount: Prisma.Decimal | number;
    shippingAmount: Prisma.Decimal | number;
    taxAmount: Prisma.Decimal | number;
    total: Prisma.Decimal | number;
    currency: string;
    customerEmail: string | null;
    customerPhone: string | null;
    shippingAddress: Prisma.JsonValue;
    shippingMethod: string | null;
    trackingNumber: string | null;
    createdAt: Date;
    updatedAt: Date;
    items: OrderItemWithVariant[];
  }) {
    let shippingAddress = order.shippingAddress;
    if (typeof shippingAddress === "string") {
      try {
        shippingAddress = JSON.parse(shippingAddress);
      } catch {
        shippingAddress = null;
      }
    }

    logger.info("Order found", {
      orderNumber: order.number,
      itemsCount: order.items.length,
      items: order.items.map((item: OrderItemWithVariant) => ({
        variantId: item.variantId,
        productTitle: item.productTitle,
        variant: item.variant
          ? {
              id: item.variant.id,
              optionsCount: item.variant.options?.length || 0,
              options: item.variant.options,
            }
          : null,
      })),
    });

    return {
      id: order.id,
      number: order.number,
      status: order.status,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      items: order.items.map((item: OrderItemWithVariant) => {
        const variantOptions =
          item.variant?.options?.map((opt) => {
            logger.debug("Processing option", {
              attributeKey: opt.attributeKey,
              value: opt.value,
              valueId: opt.valueId,
              hasAttributeValue: !!opt.attributeValue,
              attributeValueData: opt.attributeValue
                ? {
                    value: opt.attributeValue.value,
                    attributeKey: opt.attributeValue.attribute.key,
                    imageUrl: opt.attributeValue.imageUrl,
                    hasTranslations: opt.attributeValue.translations?.length > 0,
                  }
                : null,
            });

            if (opt.attributeValue) {
              const translations = opt.attributeValue.translations || [];
              const label =
                translations.length > 0 ? translations[0].label : opt.attributeValue.value;

              return {
                attributeKey: opt.attributeValue.attribute.key || undefined,
                value: opt.attributeValue.value || undefined,
                label: label || undefined,
                imageUrl: opt.attributeValue.imageUrl || undefined,
                colors: opt.attributeValue.colors || undefined,
              };
            }

            return {
              attributeKey: opt.attributeKey || undefined,
              value: opt.value || undefined,
            };
          }) || [];

        logger.debug("Item mapping", {
          productTitle: item.productTitle,
          variantId: item.variantId,
          hasVariant: !!item.variant,
          optionsCount: item.variant?.options?.length || 0,
          variantOptions,
        });

        return {
          variantId: item.variantId || "",
          productTitle: item.productTitle,
          variantTitle: item.variantTitle || "",
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
      shippingAddress,
      shippingMethod: order.shippingMethod || "pickup",
      trackingNumber: order.trackingNumber || undefined,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  private async resolvePromoDiscountPercent(code?: string): Promise<number> {
    if (!code) return 0;
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) return 0;

    const promoCode = await db.promoCode.findUnique({
      where: { code: normalizedCode },
      select: { discountPercent: true, isActive: true },
    });

    if (!promoCode || !promoCode.isActive) {
      throw {
        status: 400,
        type: "https://api.shop.am/problems/validation-error",
        title: "Invalid promo code",
        detail: `Promo code "${normalizedCode}" is invalid or inactive`,
      };
    }

    return normalizePercent(promoCode.discountPercent, 0);
  }

  /**
   * Create order (checkout)
   */
  async checkout(
    data: CheckoutData,
    userId: string | undefined,
    baseUrl: string | undefined,
    context: CommerceRequestContext,
  ) {
    try {
      const {
        cartId,
        items: guestItems,
        firstName,
        lastName,
        email,
        phone,
        shippingMethod = 'pickup',
        shippingAddress,
        deliverySpeed: requestedDeliverySpeed,
        paymentMethod = 'idram',
        promoCode,
        locale,
        currency,
        acknowledgements,
      } = data;
      const customerLocale = normalizeCheckoutLocale(locale);
      const displayCurrency = normalizeCheckoutDisplayCurrency(currency);
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
      let cartItems: CheckoutCartItemDetails[] = [];
      const isUserCartCheckout = Boolean(userId && cartId && cartId !== "guest-cart");

      if (isUserCartCheckout && cartId) {
        await removeOrphanCartItemsForCart(cartId);
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
                    options: {
                      include: {
                        attributeValue: {
                          include: {
                            translations: true,
                            attribute: true,
                          },
                        },
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
            
            assertCartLinePurchasable({
              priceSnapshot: item.priceSnapshot,
              variant,
            });

            const cartItemDetails = buildCheckoutCartItemDetails({
              variant,
              product,
              quantity: item.quantity,
              locale: customerLocale,
            });

            // User-cart lines already hold stockReserved; on-hand must still cover quantity.
            if (variant.stock < item.quantity) {
              throw {
                status: 422,
                type: "https://api.shop.am/problems/validation-error",
                title: "Insufficient stock",
                detail: `Product "${cartItemDetails.productTitle || "Unknown"}" - insufficient stock. Available: ${availableUnreservedStock(variant.stock, variant.stockReserved)}, Requested: ${item.quantity}`,
              };
            }

            const cartItem = cartItemDetails;
            
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
            options: {
              include: {
                attributeValue: {
                  include: {
                    translations: true,
                    attribute: true,
                  },
                },
              },
            },
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
          if (!hasUnreservedQuantity(variant.stock, variant.stockReserved, item.quantity)) {
            throw {
              status: 422,
              type: "https://api.shop.am/problems/validation-error",
              title: "Insufficient stock",
              detail: `Insufficient stock. Available: ${availableUnreservedStock(variant.stock, variant.stockReserved)}, Requested: ${item.quantity}`,
            };
          }
          assertVariantPurchasable(variant);
          const cartItemDetails = buildCheckoutCartItemDetails({
            variant,
            product: variant.product,
            quantity: item.quantity,
            locale: customerLocale,
          });
          return cartItemDetails;
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
      const discountPercent = await this.resolvePromoDiscountPercent(promoCode);
      const discountAmount = calculateDiscountAmount(subtotal, discountPercent);
      const subtotalAfterDiscountBase = Math.max(0, subtotal - discountAmount);
      const subtotalAfterDiscountAmd = convertPrice(
        subtotalAfterDiscountBase,
        CART_MONEY_BASE_CURRENCY,
        "AMD"
      );
      if (
        shippingMethod === "delivery" &&
        !isDeliveryAvailableForSubtotalAmd(subtotalAfterDiscountAmd)
      ) {
        throw {
          status: 400,
          type: "https://api.shop.am/problems/validation-error",
          title: "Delivery not available",
          detail: `Delivery is only available for orders of ${MIN_ORDER_SUBTOTAL_FOR_DELIVERY_AMD} AMD or more. Please choose store pickup.`,
        };
      }
      const speed: DeliverySpeed =
        requestedDeliverySpeed === "express" ? "express" : "standard";
      // Shipping: computed server-side only (never trust client-provided amount)
      const shippingResolution = await resolveCheckoutShippingAmount({
        shippingMethod,
        city: shippingAddress?.city,
        country: shippingAddress?.countryCode ?? "Armenia",
        subtotalAfterDiscountAmd,
        deliverySpeed: shippingMethod === "delivery" ? speed : "standard",
      });
      if (shippingResolution.requiresQuote) {
        throw {
          status: 400,
          type: "https://api.shop.am/problems/validation-error",
          title: "Delivery quote required",
          detail:
            "Regional delivery price is calculated separately. Please contact support with your address to complete this order.",
        };
      }
      let shippingAmount = shippingResolution.amount;
      if (shippingAmount < 0) shippingAmount = 0;
      const taxPercent = normalizePercent(process.env.CHECKOUT_TAX_PERCENT, 0);
      const applyTaxOnShipping = process.env.CHECKOUT_TAX_APPLY_ON_SHIPPING === "true";
      const totals = calculateTotals({
        subtotal,
        discountAmount,
        shippingAmount,
        taxConfig: {
          percent: taxPercent,
          applyOnShipping: applyTaxOnShipping,
        },
      });
      const persistedShippingAddress =
        shippingMethod === "delivery" && shippingAddress
          ? { ...shippingAddress, deliverySpeed: speed }
          : shippingAddress;

      // Create order with items in a transaction (timeout to avoid hung connections)
      const order = await db.$transaction(
        async (tx: Prisma.TransactionClient) => {
        // Generate sequential order number inside the transaction so the
        // MAX lookup and the insert are atomic. Unique constraint on
        // `orders.number` still guards against rare races (returns 409).
        const orderNumber = await generateSequentialOrderNumber(tx);

        // Create order
        const newOrder = await tx.order.create({
          data: {
            number: orderNumber,
            userId: userId || null,
            status: 'pending',
            paymentStatus: 'pending',
            fulfillmentStatus: 'unfulfilled',
            subtotal: totals.subtotal,
            discountAmount: totals.discountAmount,
            shippingAmount: totals.shippingAmount,
            taxAmount: totals.taxAmount,
            total: totals.total,
            currency: 'AMD',
            customerEmail: email,
            customerPhone: phone,
            customerLocale,
            shippingMethod,
            correlationId: context.requestId,
            shippingAddress: persistedShippingAddress
              ? JSON.parse(JSON.stringify(persistedShippingAddress))
              : null,
            billingAddress: persistedShippingAddress
              ? JSON.parse(JSON.stringify(persistedShippingAddress))
              : null,
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
                type: ORDER_EVENT_TYPE.CREATED,
                fromState: null,
                toState: "pending",
                actorUserId: context.actorUserId,
                isCustomerVisible: true,
                correlationId: context.requestId,
                data: {
                  source: userId ? 'user' : 'guest',
                  paymentMethod,
                  shippingMethod,
                  deliverySpeed:
                    shippingMethod === "delivery" ? speed : undefined,
                  promoCode: promoCode ?? null,
                  discountPercent,
                  taxPercent,
                  acknowledgements: {
                    deliverySupplyTerms: acknowledgements.deliverySupplyTerms,
                    inspectionAtDelivery: acknowledgements.inspectionAtDelivery,
                    orderVerification: acknowledgements.orderVerification,
                    returnsPolicy: acknowledgements.returnsPolicy,
                  },
                } as Prisma.InputJsonValue,
              },
            },
          },
          include: {
            items: true,
          },
        });

        logger.debug("Updating stock for variants", { count: cartItems.length });
        await decrementCheckoutStock({
          tx,
          context,
          orderId: newOrder.id,
          items: cartItems.map((item) => ({
            variantId: item.variantId,
            quantity: Number(item.quantity),
            sku: item.sku,
          })),
          isUserCartCheckout,
        });
        logger.info("All variant stocks updated successfully");

        // Create payment record
        const payment = await tx.payment.create({
          data: {
            orderId: newOrder.id,
            provider: paymentMethod,
            method: paymentMethod,
            amount: totals.total,
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
      const paymentUrl = createPaymentUrl({
        paymentId: order.payment.id,
        orderNumber: order.order.number,
        amount: Number(order.order.total),
        provider: paymentMethod as "idram" | "arca" | "cash_on_delivery" | "aparik",
        baseUrl: baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      });

      if (paymentMethod === "aparik") {
        try {
          const { currencyRates } = await adminService.getSettings();
          await sendAparikCheckoutEmail({
            orderNumber: order.order.number,
            customerEmail: email,
            customerPhone: phone,
            firstName,
            lastName,
            shippingMethod,
            deliverySpeed: shippingMethod === "delivery" ? speed : undefined,
            shippingAddress: persistedShippingAddress ?? null,
            locale: customerLocale,
            displayCurrency,
            currencyRates,
            promoCode,
            items: cartItems.map((item) => ({
              productTitle: item.productTitle,
              variantTitle: item.variantTitle,
              sku: item.sku,
              quantity: item.quantity,
              price: item.price,
              lineTotal: item.price * item.quantity,
              imageUrl: item.imageUrl,
              color: item.color,
              colorHex: item.colorHex,
            })),
            subtotal: totals.subtotal,
            discountAmount: totals.discountAmount,
            shippingAmount: totals.shippingAmount,
            taxAmount: totals.taxAmount,
            total: totals.total,
          });
        } catch (emailError: unknown) {
          logger.error("Aparik checkout notification email failed", {
            orderNumber: order.order.number,
            error: emailError,
          });
        }
      }

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
          paymentUrl,
          expiresAt: null, // TODO: Set expiration if needed
        },
        nextAction: (paymentMethod === 'idram' || paymentMethod === 'arca') && Boolean(paymentUrl)
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
   * Get order by number (authenticated owner).
   */
  async findByNumber(orderNumber: string, userId: string) {
    const order = await db.order.findFirst({
      where: {
        number: orderNumber,
        userId,
      },
      include: ORDER_DETAIL_INCLUDE,
    });

    if (!order) {
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Order not found",
        detail: `Order with number '${orderNumber}' not found`,
      };
    }

    return this.mapOrderDetailResponse(order);
  }

  /**
   * Guest order lookup: order number + checkout email (guest orders have `userId` null).
   */
  async findByNumberForGuest(orderNumber: string, email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const order = await db.order.findFirst({
      where: {
        number: orderNumber,
        userId: null,
      },
      include: ORDER_DETAIL_INCLUDE,
    });

    if (
      !order ||
      (order.customerEmail?.trim().toLowerCase() ?? "") !== normalizedEmail
    ) {
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Order not found",
        detail: `Order with number '${orderNumber}' not found`,
      };
    }

    return this.mapOrderDetailResponse(order);
  }

  /**
   * Reorder items from a previous order into the user's cart.
   * Adds all valid items in one transaction and reports skipped items.
   */
  async reorder(orderNumber: string, userId: string) {
    const order = await db.order.findFirst({
      where: {
        number: orderNumber,
        userId,
      },
      include: {
        items: {
          select: {
            variantId: true,
            productTitle: true,
            quantity: true,
          },
        },
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

    if (order.items.length === 0) {
      throw {
        status: 400,
        type: "https://api.shop.am/problems/validation-error",
        title: "Order has no items",
        detail: "Cannot reorder an order without items",
      };
    }

    const requestedByVariant = new Map<
      string,
      { variantId: string; productTitle: string; quantity: number }
    >();

    for (const item of order.items) {
      if (item.variantId == null) continue;

      const existing = requestedByVariant.get(item.variantId);
      if (!existing) {
        requestedByVariant.set(item.variantId, {
          variantId: item.variantId,
          productTitle: item.productTitle,
          quantity: item.quantity,
        });
        continue;
      }

      existing.quantity += item.quantity;
    }

    const variantIds = Array.from(requestedByVariant.keys());
    const variants = await db.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: {
        id: true,
        productId: true,
        stock: true,
        published: true,
        price: true,
      },
    });
    const variantsById = new Map(variants.map((variant) => [variant.id, variant]));

    const skipped: ReorderSkippedItem[] = [];
    const toAdd: ReorderAddedItem[] = [];

    for (const requested of requestedByVariant.values()) {
      const variant = variantsById.get(requested.variantId);

      if (!variant) {
        skipped.push({
          variantId: requested.variantId,
          productTitle: requested.productTitle,
          quantity: requested.quantity,
          reason: "variant_not_found",
        });
        continue;
      }

      if (!variant.published) {
        skipped.push({
          variantId: requested.variantId,
          productTitle: requested.productTitle,
          quantity: requested.quantity,
          reason: "variant_unpublished",
          availableStock: variant.stock,
        });
        continue;
      }

      if (variant.stock < requested.quantity) {
        skipped.push({
          variantId: requested.variantId,
          productTitle: requested.productTitle,
          quantity: requested.quantity,
          reason: "insufficient_stock",
          availableStock: variant.stock,
        });
        continue;
      }

      toAdd.push({
        variantId: requested.variantId,
        productId: variant.productId,
        quantity: requested.quantity,
      });
    }

    if (toAdd.length > 0) {
      await db.$transaction(async (tx: Prisma.TransactionClient) => {
        let cart = await tx.cart.findFirst({
          where: { userId },
        });
        if (!cart) {
          cart = await tx.cart.create({
            data: {
              userId,
              locale: "en",
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });
        } else {
          await tx.cart.update({
            where: { id: cart.id },
            data: { updatedAt: new Date() },
          });
        }

        for (const item of toAdd) {
          const variantRow = variantsById.get(item.variantId);
          const priceSnapshot = variantRow?.price ?? 0;

          const existingCartItem = await tx.cartItem.findFirst({
            where: {
              cartId: cart.id,
              variantId: item.variantId,
            },
            select: {
              id: true,
              quantity: true,
            },
          });

          if (!existingCartItem) {
            await tx.cartItem.create({
              data: {
                cartId: cart.id,
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity,
                priceSnapshot,
              },
            });
            continue;
          }

          await tx.cartItem.update({
            where: { id: existingCartItem.id },
            data: {
              quantity: existingCartItem.quantity + item.quantity,
            },
          });
        }
      });
    }

    return {
      orderNumber,
      added: toAdd.length,
      skipped: skipped.length,
      totalRequested: requestedByVariant.size,
      addedItems: toAdd,
      skippedItems: skipped,
      hasPartialFailure: skipped.length > 0,
    };
  }
}

export const ordersService = new OrdersService();

