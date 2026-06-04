import {
  CURRENCIES,
  formatPriceInCurrency,
  type CurrencyCode,
} from "../currency";
import { CART_MONEY_BASE_CURRENCY } from "./cart-money";

export const CHECKOUT_DISPLAY_CURRENCIES = ["USD", "AMD", "EUR", "RUB", "GEL"] as const;

export type CheckoutDisplayCurrency = (typeof CHECKOUT_DISPLAY_CURRENCIES)[number];

const DEFAULT_CURRENCY_RATES: Record<string, number> = {
  USD: 1,
  AMD: 400,
  EUR: 0.92,
  RUB: 90,
  GEL: 2.7,
};

export function normalizeCheckoutDisplayCurrency(
  value?: string | null
): CheckoutDisplayCurrency {
  if (value && value in CURRENCIES) {
    return value as CheckoutDisplayCurrency;
  }
  return "AMD";
}

function resolveRate(currency: CurrencyCode, rates: Record<string, number>): number {
  const rate = rates[currency];
  if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
    return rate;
  }
  return CURRENCIES[currency].rate;
}

export function convertWithRates(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  rates: Record<string, number>
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }
  const fromRate = resolveRate(fromCurrency, rates);
  const toRate = resolveRate(toCurrency, rates);
  return (amount / fromRate) * toRate;
}

export function toDisplayCatalogAmount(
  amountInUsd: number,
  displayCurrency: CheckoutDisplayCurrency,
  rates: Record<string, number> = DEFAULT_CURRENCY_RATES
): number {
  return convertWithRates(
    amountInUsd,
    CART_MONEY_BASE_CURRENCY,
    displayCurrency,
    rates
  );
}

export function toDisplayShippingAmount(
  amountInAmd: number,
  displayCurrency: CheckoutDisplayCurrency,
  rates: Record<string, number> = DEFAULT_CURRENCY_RATES
): number {
  if (displayCurrency === "AMD") {
    return amountInAmd;
  }
  return convertWithRates(amountInAmd, "AMD", displayCurrency, rates);
}

export function formatCatalogMoneyForEmail(
  amountInUsd: number,
  displayCurrency: CheckoutDisplayCurrency,
  rates: Record<string, number> = DEFAULT_CURRENCY_RATES
): string {
  return formatPriceInCurrency(
    toDisplayCatalogAmount(amountInUsd, displayCurrency, rates),
    displayCurrency
  );
}

export function formatShippingMoneyForEmail(
  amountInAmd: number,
  displayCurrency: CheckoutDisplayCurrency,
  rates: Record<string, number> = DEFAULT_CURRENCY_RATES
): string {
  return formatPriceInCurrency(
    toDisplayShippingAmount(amountInAmd, displayCurrency, rates),
    displayCurrency
  );
}

export function getDefaultCurrencyRates(): Record<string, number> {
  return { ...DEFAULT_CURRENCY_RATES };
}
