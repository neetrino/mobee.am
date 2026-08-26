import { createHash } from "node:crypto";

export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._-]{8,128}$/;

export const CHECKOUT_IDEMPOTENCY_CONFLICT = {
  status: 409,
  type: "https://api.shop.am/problems/conflict",
  title: "Conflict",
  detail: "This idempotency key was already used with a different checkout request.",
} as const;

export const CHECKOUT_IDEMPOTENCY_KEY_INVALID = {
  status: 400,
  type: "https://api.shop.am/problems/validation-error",
  title: "Validation Error",
  detail: "Idempotency-Key must be 8–128 characters and use only letters, digits, and . _ -",
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function targetMentionsIdempotencyFields(target: unknown): boolean {
  if (Array.isArray(target)) {
    const fields = target.filter((item): item is string => typeof item === "string");
    return fields.includes("idempotencyScopeHash") && fields.includes("idempotencyKeyHash");
  }
  if (typeof target === "string") {
    return (
      target.includes("idempotencyScopeHash") ||
      target.includes("orders_idempotency_scope_key_uidx")
    );
  }
  return false;
}

/** SHA-256 hex digest for idempotency hashes stored on orders. */
export function hashCheckoutValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function parseIdempotencyKeyHeader(
  idempotencyKey: string | null,
  xIdempotencyKey: string | null,
): { key: string | null; invalid: boolean } {
  const raw = (idempotencyKey ?? xIdempotencyKey)?.trim() ?? "";
  if (!raw) {
    return { key: null, invalid: false };
  }
  if (!IDEMPOTENCY_KEY_PATTERN.test(raw)) {
    return { key: null, invalid: true };
  }
  return { key: raw, invalid: false };
}

export function normalizeCheckoutEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeCheckoutPhone(phone: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length > 0) {
    return `+${digits}`;
  }
  return trimmed;
}

/**
 * Stable checkout subject: logged-in user id, otherwise guest email+phone.
 * Guest scope avoids random request ids so retries share the same bucket.
 */
export function buildIdempotencyScopeHash(input: {
  userId?: string | null;
  email: string;
  phone: string;
}): string {
  if (input.userId) {
    return hashCheckoutValue(`user:${input.userId}`);
  }
  const email = normalizeCheckoutEmail(input.email);
  const phone = normalizeCheckoutPhone(input.phone);
  return hashCheckoutValue(`guest:${email}|${phone}`);
}

export interface CheckoutFingerprintInput {
  items: Array<{ variantId: string; quantity: number }>;
  email: string;
  phone: string;
  shippingMethod: string;
  paymentMethod: string;
  deliverySpeed?: string;
  city?: string | null;
  promoCode?: string | null;
  userId?: string | null;
  cartId?: string | null;
}

/** Canonical server-side checkout fingerprint; excludes requestId and client shippingAmount. */
export function buildCheckoutRequestFingerprint(input: CheckoutFingerprintInput): string {
  const canonical = {
    cartId: input.cartId && input.cartId !== "guest-cart" ? input.cartId : null,
    city: input.city?.trim() || null,
    deliverySpeed: input.deliverySpeed ?? null,
    email: normalizeCheckoutEmail(input.email),
    items: [...input.items]
      .map((item) => ({ quantity: item.quantity, variantId: item.variantId }))
      .sort((a, b) => a.variantId.localeCompare(b.variantId)),
    paymentMethod: input.paymentMethod,
    phone: normalizeCheckoutPhone(input.phone),
    promoCode: input.promoCode?.trim().toUpperCase() || null,
    shippingMethod: input.shippingMethod,
    userId: input.userId ?? null,
  };
  return hashCheckoutValue(JSON.stringify(canonical));
}

export function buildIdempotencyKeyHash(rawKey: string): string {
  return hashCheckoutValue(rawKey);
}

/** True when Prisma reports a unique conflict on orders idempotency scope+key. */
export function isOrderIdempotencyUniqueConflict(error: unknown): boolean {
  if (!isRecord(error) || error.code !== "P2002") {
    return false;
  }

  const meta = isRecord(error.meta) ? error.meta : null;
  if (targetMentionsIdempotencyFields(meta?.target)) {
    return true;
  }

  const message = typeof error.message === "string" ? error.message : "";
  return /idempotencyScopeHash/i.test(message) && /idempotencyKeyHash/i.test(message);
}

export function assertIdempotencyFingerprintMatch(
  storedFingerprint: string | null,
  requestFingerprint: string,
): void {
  if (storedFingerprint === requestFingerprint) {
    return;
  }
  throw CHECKOUT_IDEMPOTENCY_CONFLICT;
}
