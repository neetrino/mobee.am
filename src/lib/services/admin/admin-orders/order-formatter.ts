import type { Prisma } from "@prisma/client";

/**
 * Format order for list response
 */
export function formatOrderForList(order: {
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
  currency: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  createdAt: Date;
  items: Array<unknown>;
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}) {
  const customer = order.user || null;
  const firstName = customer?.firstName || '';
  const lastName = customer?.lastName || '';

  return {
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
    currency: order.currency || 'AMD',
    customerEmail: customer?.email || order.customerEmail || '',
    customerPhone: customer?.phone || order.customerPhone || '',
    customerFirstName: firstName,
    customerLastName: lastName,
    customerId: customer?.id || null,
    itemsCount: order.items.length,
    createdAt: order.createdAt.toISOString(),
  };
}

/**
 * Format variant option for order item
 */
function formatVariantOption(opt: {
  attributeKey: string | null;
  value: string | null;
  valueId: string | null;
  attributeValue: {
    value: string;
    imageUrl: string | null;
    colors: unknown;
    translations: Array<{
      locale: string;
      label: string;
    }>;
    attribute: {
      key: string;
    };
  } | null;
}) {
  // New format: Use AttributeValue if available
  if (opt.attributeValue) {
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
}

/**
 * Format order item for detail response
 */
export function formatOrderItem(item: {
  id: string;
  variantId: string | null;
  productTitle: string | null;
  sku: string | null;
  quantity: number | null;
  total: number | null;
  variant?: {
    id: string;
    sku: string | null;
    options?: Array<{
      attributeKey: string | null;
      value: string | null;
      valueId: string | null;
      attributeValue: {
        value: string;
        imageUrl: string | null;
        colors: unknown;
        translations: Array<{
          locale: string;
          label: string;
        }>;
        attribute: {
          key: string;
        };
      } | null;
    }>;
    product?: {
      id: string;
      translations?: Array<{
        title: string;
      }>;
    } | null;
  } | null;
}) {
  const variant = item.variant;
  const product = variant?.product;
  const translations = product && Array.isArray(product.translations) ? product.translations : [];
  const translation = translations[0] || null;

  const quantity = item.quantity ?? 0;
  const total = item.total ?? 0;
  const unitPrice = quantity > 0 ? Number((total / quantity).toFixed(2)) : total;

  // Extract variant options (color, size, etc.)
  const variantOptions = variant?.options?.map(formatVariantOption) || [];

  return {
    id: item.id,
    variantId: item.variantId || variant?.id || null,
    productId: product?.id || null,
    productTitle: translation?.title || item.productTitle || "Unknown Product",
    sku: variant?.sku || item.sku || "N/A",
    quantity,
    total,
    unitPrice,
    variantOptions,
  };
}

/**
 * Format order for detail response
 */
export function formatOrderForDetail(order: {
  id: string;
  number: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  total: number;
  subtotal: number | null;
  discountAmount: number | null;
  shippingAmount: number | null;
  taxAmount: number | null;
  currency: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  billingAddress: Prisma.JsonValue | null;
  shippingAddress: Prisma.JsonValue | null;
  shippingMethod: string | null;
  notes: string | null;
  adminNotes: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  items: Array<{
    id: string;
    variantId: string | null;
    productTitle: string | null;
    sku: string | null;
    quantity: number | null;
    total: number | null;
    variant?: {
      id: string;
      sku: string | null;
      options?: Array<{
        attributeKey: string | null;
        value: string | null;
        valueId: string | null;
        attributeValue: {
          value: string;
          imageUrl: string | null;
          colors: unknown;
          translations: Array<{
            locale: string;
            label: string;
          }>;
          attribute: {
            key: string;
          };
        } | null;
      }>;
      product?: {
        id: string;
        translations?: Array<{
          title: string;
        }>;
      } | null;
    } | null;
  }>;
  payments: Array<{
    id: string;
    provider: string;
    method: string | null;
    amount: number;
    currency: string;
    status: string;
    cardLast4: string | null;
    cardBrand: string | null;
  }>;
}) {
  const user = order.user;
  const payments = Array.isArray(order.payments) ? order.payments : [];
  const primaryPayment = payments[0] || null;
  const formattedItems = order.items.map(formatOrderItem);

  return {
    id: order.id,
    number: order.number,
    status: order.status,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    total: order.total,
    currency: order.currency || "AMD",
    totals: {
      subtotal: Number(order.subtotal || 0),
      discount: Number(order.discountAmount || 0),
      shipping: Number(order.shippingAmount || 0),
      tax: Number(order.taxAmount || 0),
      total: Number(order.total || 0),
      currency: order.currency || "AMD",
    },
    customerEmail: order.customerEmail || user?.email || undefined,
    customerPhone: order.customerPhone || user?.phone || undefined,
    billingAddress: order.billingAddress || null,
    shippingAddress: order.shippingAddress || null,
    shippingMethod: order.shippingMethod || null,
    notes: order.notes || null,
    adminNotes: order.adminNotes || null,
    ipAddress: order.ipAddress || null,
    userAgent: order.userAgent || null,
    payment: primaryPayment
      ? {
          id: primaryPayment.id,
          provider: primaryPayment.provider,
          method: primaryPayment.method ?? "",
          amount: primaryPayment.amount,
          currency: primaryPayment.currency,
          status: primaryPayment.status,
          cardLast4: primaryPayment.cardLast4,
          cardBrand: primaryPayment.cardBrand,
        }
      : null,
    customer: user
      ? {
          id: user.id,
          email: user.email,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
        }
      : null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt?.toISOString?.() ?? undefined,
    items: formattedItems,
  };
}

