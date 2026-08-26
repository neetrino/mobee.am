export const ORDER_EVENT_TYPE = {
  CREATED: "order_created",
  ORDER_STATUS: "order_status_changed",
  PAYMENT_STATUS: "payment_status_changed",
  FULFILLMENT_STATUS: "fulfillment_status_changed",
} as const;

export const STOCK_MOVEMENT_REASON = {
  ORDER: "order",
  CANCEL: "cancel",
  RETURN: "return",
  ADMIN_ADJUSTMENT: "admin_adjustment",
  IMPORT: "import",
} as const;

export const AUDIT_ACTION = {
  ORDER_UPDATE: "order.update",
  ORDER_DELETE_EMPTY: "order.delete_empty",
  INVENTORY_ADJUST: "inventory.adjust",
} as const;

export const RESTOCK_SKIP_REASON = {
  VARIANT_REFERENCE_MISSING: "variant_reference_missing",
  VARIANT_NOT_FOUND: "variant_not_found",
} as const;

export type RestockSkipReason =
  (typeof RESTOCK_SKIP_REASON)[keyof typeof RESTOCK_SKIP_REASON];

export const AUDIT_TARGET = {
  ORDER: "Order",
  PRODUCT_VARIANT: "ProductVariant",
} as const;

export const LEGACY_ORDER_STATUS_CONFIRMED = "confirmed";

export const ORDER_TX_TIMEOUT_MS = 10_000;
export const ORDER_TX_MAX_WAIT_MS = 5_000;
