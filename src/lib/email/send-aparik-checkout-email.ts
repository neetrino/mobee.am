import {
  formatCatalogMoneyForEmail,
  formatShippingMoneyForEmail,
  getDefaultCurrencyRates,
  toDisplayCatalogAmount,
  toDisplayShippingAmount,
  type CheckoutDisplayCurrency,
} from "../checkout/checkout-email-money";
import { formatPriceInCurrency } from "../currency";
import { getAparikNotificationEmail } from "./aparik-notification.constants";
import { getResendClient, getResendFromEmail } from "./resend-client";
import { logger } from "../utils/logger";

export interface AparikCheckoutItem {
  productTitle: string;
  variantTitle?: string;
  sku: string;
  quantity: number;
  price: number;
  lineTotal: number;
  imageUrl?: string;
  color?: string;
  colorHex?: string;
}

export interface AparikCheckoutEmailPayload {
  orderNumber: string;
  customerEmail: string;
  customerPhone: string;
  firstName?: string;
  lastName?: string;
  shippingMethod: string;
  deliverySpeed?: string;
  shippingAddress?: {
    address?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    countryCode?: string;
    phone?: string;
  } | null;
  locale?: string;
  displayCurrency: CheckoutDisplayCurrency;
  currencyRates?: Record<string, number>;
  promoCode?: string;
  items: AparikCheckoutItem[];
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  total: number;
}

interface EmailMoneyContext {
  displayCurrency: CheckoutDisplayCurrency;
  rates: Record<string, number>;
}

function createEmailMoneyContext(payload: AparikCheckoutEmailPayload): EmailMoneyContext {
  return {
    displayCurrency: payload.displayCurrency,
    rates: payload.currencyRates ?? getDefaultCurrencyRates(),
  };
}

function formatCatalogMoney(amountInUsd: number, context: EmailMoneyContext): string {
  return formatCatalogMoneyForEmail(amountInUsd, context.displayCurrency, context.rates);
}

function formatShippingMoney(amountInAmd: number, context: EmailMoneyContext): string {
  return formatShippingMoneyForEmail(amountInAmd, context.displayCurrency, context.rates);
}

function computeDisplayTotal(payload: AparikCheckoutEmailPayload, context: EmailMoneyContext): number {
  const subtotal = toDisplayCatalogAmount(payload.subtotal, context.displayCurrency, context.rates);
  const discount = toDisplayCatalogAmount(payload.discountAmount, context.displayCurrency, context.rates);
  const tax = toDisplayCatalogAmount(payload.taxAmount, context.displayCurrency, context.rates);
  const shipping = toDisplayShippingAmount(payload.shippingAmount, context.displayCurrency, context.rates);
  return subtotal - discount + tax + shipping;
}

function formatTotalMoney(payload: AparikCheckoutEmailPayload, context: EmailMoneyContext): string {
  return formatPriceInCurrency(computeDisplayTotal(payload, context), context.displayCurrency);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatCustomerName(firstName?: string, lastName?: string): string {
  const parts = [firstName?.trim(), lastName?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "—";
}

function formatShippingAddress(
  shippingMethod: string,
  address: AparikCheckoutEmailPayload["shippingAddress"]
): string {
  if (shippingMethod === "pickup") {
    return "Խանութից վերցնել (pickup)";
  }
  if (!address) {
    return "—";
  }
  const lines = [
    address.addressLine1 ?? address.address,
    address.addressLine2,
    address.city,
    address.state,
    address.postalCode,
    address.countryCode,
    address.phone ? `Tel: ${address.phone}` : undefined,
  ].filter(Boolean);
  return lines.length > 0 ? lines.join(", ") : "—";
}

function formatMoneyHtml(formattedAmount: string): string {
  const withNbsp = formattedAmount.replace(/\u00A0/g, "&nbsp;");
  return `<span style="white-space:nowrap;display:inline-block">${withNbsp}</span>`;
}

function formatCatalogMoneyHtml(amountInUsd: number, context: EmailMoneyContext): string {
  return formatMoneyHtml(formatCatalogMoney(amountInUsd, context));
}

function formatShippingMoneyHtml(amountInAmd: number, context: EmailMoneyContext): string {
  return formatMoneyHtml(formatShippingMoney(amountInAmd, context));
}

function formatTotalMoneyHtml(payload: AparikCheckoutEmailPayload, context: EmailMoneyContext): string {
  return formatMoneyHtml(formatTotalMoney(payload, context));
}

function buildVariantDetailsHtml(item: AparikCheckoutItem): string {
  const parts: string[] = [];

  if (item.color) {
    const swatch = item.colorHex
      ? `<span style="display:inline-block;width:14px;height:14px;border-radius:9999px;border:1px solid #d1d5db;background:${escapeHtml(item.colorHex)};vertical-align:middle;margin-right:6px"></span>`
      : "";
    parts.push(
      `<span style="color:#374151;font-size:13px">Գույն՝ ${swatch}${escapeHtml(item.color)}</span>`
    );
  }

  if (item.variantTitle?.trim()) {
    parts.push(
      `<span style="color:#6b7280;font-size:13px">${escapeHtml(item.variantTitle)}</span>`
    );
  }

  if (parts.length === 0) {
    return "";
  }

  return `<br>${parts.join("<br>")}`;
}

function buildVariantDetailsText(item: AparikCheckoutItem): string {
  const lines: string[] = [];
  if (item.color) {
    lines.push(`   Գույն: ${item.color}`);
  }
  if (item.variantTitle?.trim()) {
    lines.push(`   ${item.variantTitle}`);
  }
  return lines.join("\n");
}

function buildItemImageHtml(imageUrl?: string, title?: string): string {
  if (!imageUrl) {
    return `<div style="width:72px;height:72px;border-radius:8px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:11px">No img</div>`;
  }

  return `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title ?? "Product")}" width="72" height="72" style="display:block;width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb">`;
}

function buildItemsHtml(items: AparikCheckoutItem[], context: EmailMoneyContext): string {
  const rows = items
    .map((item) => {
      return `<tr>
  <td style="padding:12px 8px 12px 0;border-bottom:1px solid #e5e7eb;vertical-align:top;width:80px">${buildItemImageHtml(item.imageUrl, item.productTitle)}</td>
  <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;vertical-align:top">
    <strong style="display:block;font-size:15px;color:#111827">${escapeHtml(item.productTitle)}</strong>
    ${buildVariantDetailsHtml(item)}
    <br><span style="color:#6b7280;font-size:12px">SKU: ${escapeHtml(item.sku)}</span>
  </td>
  <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:center;vertical-align:top;white-space:nowrap">${item.quantity}</td>
  <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:right;vertical-align:top;white-space:nowrap;min-width:96px">${formatCatalogMoneyHtml(item.price, context)}</td>
  <td style="padding:12px 0 12px 8px;border-bottom:1px solid #e5e7eb;text-align:right;vertical-align:top;white-space:nowrap;min-width:96px">${formatCatalogMoneyHtml(item.lineTotal, context)}</td>
</tr>`;
    })
    .join("");

  return `<table style="width:100%;border-collapse:collapse;font-size:14px">
  <thead>
    <tr style="text-align:left;color:#6b7280">
      <th style="padding:8px 8px 8px 0;border-bottom:2px solid #d1d5db">Նկար</th>
      <th style="padding:8px;border-bottom:2px solid #d1d5db">Ապրանք</th>
      <th style="padding:8px;border-bottom:2px solid #d1d5db;text-align:center">Քանակ</th>
      <th style="padding:8px;border-bottom:2px solid #d1d5db;text-align:right">Գին</th>
      <th style="padding:8px 0 8px 8px;border-bottom:2px solid #d1d5db;text-align:right">Ընդամենը</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
}

function buildAparikCheckoutHtml(payload: AparikCheckoutEmailPayload): string {
  const money = createEmailMoneyContext(payload);
  const customerName = formatCustomerName(payload.firstName, payload.lastName);
  const shippingLabel =
    payload.shippingMethod === "delivery"
      ? `Առաքում (${payload.deliverySpeed === "express" ? "շտապ" : "ստանդարտ"})`
      : "Խանութից վերցնել";

  return `
<!DOCTYPE html>
<html lang="hy">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111827;max-width:640px;margin:0 auto;padding:24px">
  <h1 style="font-size:22px;margin:0 0 8px">Նոր ապառիկ պատվեր</h1>
  <p style="margin:0 0 24px;color:#6b7280">Պատվերի համար՝ <strong>${escapeHtml(payload.orderNumber)}</strong></p>

  <h2 style="font-size:16px;margin:0 0 12px">Հաճախորդ</h2>
  <p style="margin:0 0 16px;font-size:14px">
    Անուն՝ ${escapeHtml(customerName)}<br>
    Email՝ ${escapeHtml(payload.customerEmail)}<br>
    Հեռախոս՝ ${escapeHtml(payload.customerPhone)}<br>
    Լեզու՝ ${escapeHtml(payload.locale ?? "—")}<br>
    Արժույթ՝ ${escapeHtml(payload.displayCurrency)}
  </p>

  <h2 style="font-size:16px;margin:0 0 12px">Առաքում և վճարում</h2>
  <p style="margin:0 0 16px;font-size:14px">
    Արաքման եղանակ՝ ${escapeHtml(shippingLabel)}<br>
    Հասցե՝ ${escapeHtml(formatShippingAddress(payload.shippingMethod, payload.shippingAddress))}<br>
    Վճարման եղանակ՝ <strong>Ապառիկ</strong>
    ${payload.promoCode ? `<br>Promo կոդ՝ ${escapeHtml(payload.promoCode)}` : ""}
  </p>

  <h2 style="font-size:16px;margin:0 0 12px">Ապրանքներ (ապառիկ)</h2>
  ${buildItemsHtml(payload.items, money)}

  <table style="width:100%;margin-top:24px;font-size:14px">
    <tr><td style="padding:4px 0">Ենթագումար</td><td style="padding:4px 0;text-align:right;white-space:nowrap">${formatCatalogMoneyHtml(payload.subtotal, money)}</td></tr>
    ${payload.discountAmount > 0 ? `<tr><td style="padding:4px 0">Զեղչ</td><td style="padding:4px 0;text-align:right;white-space:nowrap">−${formatCatalogMoneyHtml(payload.discountAmount, money)}</td></tr>` : ""}
    <tr><td style="padding:4px 0">Առաքում</td><td style="padding:4px 0;text-align:right;white-space:nowrap">${formatShippingMoneyHtml(payload.shippingAmount, money)}</td></tr>
    ${payload.taxAmount > 0 ? `<tr><td style="padding:4px 0">Հարկ</td><td style="padding:4px 0;text-align:right;white-space:nowrap">${formatCatalogMoneyHtml(payload.taxAmount, money)}</td></tr>` : ""}
    <tr><td style="padding:8px 0;font-weight:700;border-top:2px solid #d1d5db">Ընդամենը</td><td style="padding:8px 0;text-align:right;font-weight:700;border-top:2px solid #d1d5db;white-space:nowrap">${formatTotalMoneyHtml(payload, money)}</td></tr>
  </table>
</body>
</html>`.trim();
}

function buildAparikCheckoutText(payload: AparikCheckoutEmailPayload): string {
  const money = createEmailMoneyContext(payload);
  const customerName = formatCustomerName(payload.firstName, payload.lastName);
  const itemsText = payload.items
    .map((item, index) => {
      const variantDetails = buildVariantDetailsText(item);
      return `${index + 1}. ${item.productTitle}${variantDetails ? `\n${variantDetails}` : ""}${item.imageUrl ? `\n   Նկար: ${item.imageUrl}` : ""}\n   SKU: ${item.sku}, qty: ${item.quantity}, price: ${formatCatalogMoney(item.price, money)}, total: ${formatCatalogMoney(item.lineTotal, money)}`;
    })
    .join("\n");

  return [
    "Նոր ապառիկ պատվեր",
    `Պատվերի համար: ${payload.orderNumber}`,
    "",
    "Հաճախորդ",
    `Անուն: ${customerName}`,
    `Email: ${payload.customerEmail}`,
    `Հեռախոս: ${payload.customerPhone}`,
    `Լեզու: ${payload.locale ?? "—"}`,
    `Արժույթ: ${payload.displayCurrency}`,
    "",
    "Առաքում և վճարում",
    `Արաքման եղանակ: ${payload.shippingMethod}${payload.deliverySpeed ? ` (${payload.deliverySpeed})` : ""}`,
    `Հասցե: ${formatShippingAddress(payload.shippingMethod, payload.shippingAddress)}`,
    "Վճարման եղանակ: Ապառիկ",
    payload.promoCode ? `Promo կոդ: ${payload.promoCode}` : undefined,
    "",
    "Ապրանքներ (ապառիկ)",
    itemsText,
    "",
    `Ենթագումար: ${formatCatalogMoney(payload.subtotal, money)}`,
    payload.discountAmount > 0 ? `Զեղչ: −${formatCatalogMoney(payload.discountAmount, money)}` : undefined,
    `Առաքում: ${formatShippingMoney(payload.shippingAmount, money)}`,
    payload.taxAmount > 0 ? `Հարկ: ${formatCatalogMoney(payload.taxAmount, money)}` : undefined,
    `Ընդամենը: ${formatTotalMoney(payload, money)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function sendAparikCheckoutEmail(
  payload: AparikCheckoutEmailPayload
): Promise<void> {
  const to = getAparikNotificationEmail();
  const subject = `Նոր ապառիկ պատվեր #${payload.orderNumber}`;
  const html = buildAparikCheckoutHtml(payload);
  const text = buildAparikCheckoutText(payload);

  if (process.env.NODE_ENV === "development" && !process.env.RESEND_API_KEY?.trim()) {
    logger.warn("Aparik checkout email skipped (RESEND_API_KEY missing)", {
      to,
      orderNumber: payload.orderNumber,
    });
    return;
  }

  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: getResendFromEmail(),
    to,
    subject,
    html,
    text,
  });

  if (error) {
    logger.error("Failed to send aparik checkout email", {
      error,
      to,
      orderNumber: payload.orderNumber,
    });
    throw new Error(error.message || "Failed to send aparik checkout email");
  }

  logger.info("Aparik checkout email sent", {
    to,
    orderNumber: payload.orderNumber,
  });
}
