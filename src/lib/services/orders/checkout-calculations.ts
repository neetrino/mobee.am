export type SupportedCheckoutLocale = "en" | "hy" | "ru";

const SUPPORTED_LOCALES: SupportedCheckoutLocale[] = ["en", "hy", "ru"];
const MAX_TAX_PERCENT = 100;
const MIN_TAX_PERCENT = 0;

interface TaxConfig {
  percent: number;
  applyOnShipping: boolean;
}

export interface CheckoutTotalsInput {
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  taxConfig: TaxConfig;
}

export interface CheckoutTotalsResult {
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  total: number;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function normalizeCheckoutLocale(value?: string | null): SupportedCheckoutLocale {
  if (!value) return "en";
  const normalized = value.trim().toLowerCase();
  if (SUPPORTED_LOCALES.includes(normalized as SupportedCheckoutLocale)) {
    return normalized as SupportedCheckoutLocale;
  }
  if (normalized.startsWith("hy")) return "hy";
  if (normalized.startsWith("ru")) return "ru";
  return "en";
}

export function normalizePercent(value: string | number | undefined, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < MIN_TAX_PERCENT) return MIN_TAX_PERCENT;
  if (parsed > MAX_TAX_PERCENT) return MAX_TAX_PERCENT;
  return parsed;
}

export function calculateDiscountAmount(subtotal: number, discountPercent: number): number {
  if (subtotal <= 0 || discountPercent <= 0) {
    return 0;
  }
  const clampedPercent = normalizePercent(discountPercent, 0);
  return roundMoney((subtotal * clampedPercent) / 100);
}

export function calculateTotals(input: CheckoutTotalsInput): CheckoutTotalsResult {
  const normalizedSubtotal = roundMoney(Math.max(0, input.subtotal));
  const normalizedDiscount = roundMoney(Math.max(0, input.discountAmount));
  const normalizedShipping = roundMoney(Math.max(0, input.shippingAmount));
  const taxableBase =
    normalizedSubtotal - normalizedDiscount + (input.taxConfig.applyOnShipping ? normalizedShipping : 0);
  const taxPercent = normalizePercent(input.taxConfig.percent, 0);
  const taxAmount = roundMoney(Math.max(0, taxableBase) * (taxPercent / 100));
  const total = roundMoney(Math.max(0, normalizedSubtotal - normalizedDiscount + normalizedShipping + taxAmount));

  return {
    subtotal: normalizedSubtotal,
    discountAmount: normalizedDiscount,
    shippingAmount: normalizedShipping,
    taxAmount,
    total,
  };
}
