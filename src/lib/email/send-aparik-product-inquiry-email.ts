import { formatCatalogMoneyForEmail, type CheckoutDisplayCurrency } from "../checkout/checkout-email-money";
import type { CurrencyCode } from "../currency";
import { getAparikNotificationEmail } from "./aparik-notification.constants";
import { getResendClient, getResendFromEmail } from "./resend-client";
import { logger } from "../utils/logger";

export interface AparikProductInquiryEmailPayload {
  inquiryId: string;
  productId: string;
  productSlug: string;
  productTitle: string;
  /** Catalog price stored in USD (same as checkout cart lines). */
  productPrice: number;
  currency: CurrencyCode;
  productImageUrl?: string | null;
  color?: string;
  colorHex?: string;
  variantTitle?: string;
  sku?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatCustomerName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}

function resolveAbsoluteImageUrl(imageUrl?: string | null): string | undefined {
  const trimmed = imageUrl?.trim();
  if (!trimmed) {
    return undefined;
  }

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:image/")
  ) {
    return trimmed;
  }

  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return trimmed.startsWith("/") ? `${base}${trimmed}` : `${base}/${trimmed}`;
}

function buildItemImageHtml(imageUrl?: string, title?: string): string {
  if (!imageUrl) {
    return `<div style="width:72px;height:72px;border-radius:8px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:11px">No img</div>`;
  }

  return `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title ?? "Product")}" width="72" height="72" style="display:block;width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb">`;
}

function buildVariantDetailsHtml(payload: AparikProductInquiryEmailPayload): string {
  const parts: string[] = [];

  if (payload.color) {
    const swatch = payload.colorHex
      ? `<span style="display:inline-block;width:14px;height:14px;border-radius:9999px;border:1px solid #d1d5db;background:${escapeHtml(payload.colorHex)};vertical-align:middle;margin-right:6px"></span>`
      : "";
    parts.push(
      `<span style="color:#374151;font-size:13px">Գույն՝ ${swatch}${escapeHtml(payload.color)}</span>`
    );
  }

  if (payload.variantTitle?.trim()) {
    parts.push(
      `<span style="color:#6b7280;font-size:13px">${escapeHtml(payload.variantTitle)}</span>`
    );
  }

  if (parts.length === 0) {
    return "";
  }

  return `<br>${parts.join("<br>")}`;
}

function buildVariantDetailsText(payload: AparikProductInquiryEmailPayload): string {
  const lines: string[] = [];
  if (payload.color) {
    lines.push(`   Գույն: ${payload.color}`);
  }
  if (payload.variantTitle?.trim()) {
    lines.push(`   ${payload.variantTitle}`);
  }
  return lines.join("\n");
}

function formatMoneyHtml(formattedAmount: string): string {
  const withNbsp = formattedAmount.replace(/\u00A0/g, "&nbsp;");
  return `<span style="white-space:nowrap;display:inline-block">${withNbsp}</span>`;
}

function formatCatalogPriceHtml(
  amountInUsd: number,
  displayCurrency: CheckoutDisplayCurrency
): string {
  return formatMoneyHtml(formatCatalogMoneyForEmail(amountInUsd, displayCurrency));
}

function buildProductHtml(payload: AparikProductInquiryEmailPayload): string {
  const displayCurrency = payload.currency as CheckoutDisplayCurrency;
  const productUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/products/${encodeURIComponent(payload.productSlug)}`;
  const imageUrl = resolveAbsoluteImageUrl(payload.productImageUrl);
  const skuLine = payload.sku
    ? `<br><span style="color:#6b7280;font-size:12px">SKU: ${escapeHtml(payload.sku)}</span>`
    : "";

  return `<table style="width:100%;border-collapse:collapse;font-size:14px">
  <thead>
    <tr style="text-align:left;color:#6b7280">
      <th style="padding:8px 8px 8px 0;border-bottom:2px solid #d1d5db">Նկար</th>
      <th style="padding:8px;border-bottom:2px solid #d1d5db">Ապրանք</th>
      <th style="padding:8px 0 8px 8px;border-bottom:2px solid #d1d5db;text-align:right">Գին</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:12px 8px 12px 0;border-bottom:1px solid #e5e7eb;vertical-align:top;width:80px">${buildItemImageHtml(imageUrl, payload.productTitle)}</td>
      <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;vertical-align:top">
        <strong style="display:block;font-size:15px;color:#111827">${escapeHtml(payload.productTitle)}</strong>
        ${buildVariantDetailsHtml(payload)}
        ${skuLine}
        <br><span style="color:#6b7280;font-size:12px">ID: ${escapeHtml(payload.productId)}</span><br>
        <a href="${escapeHtml(productUrl)}" style="color:#2563eb;font-size:13px">Դիտել ապրանքը</a>
      </td>
      <td style="padding:12px 0 12px 8px;border-bottom:1px solid #e5e7eb;text-align:right;vertical-align:top;white-space:nowrap;min-width:96px">${formatCatalogPriceHtml(payload.productPrice, displayCurrency)}</td>
    </tr>
  </tbody>
</table>`;
}

function buildHtml(payload: AparikProductInquiryEmailPayload): string {
  const customerName = formatCustomerName(payload.firstName, payload.lastName);

  return `
<!DOCTYPE html>
<html lang="hy">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111827;max-width:640px;margin:0 auto;padding:24px">
  <h1 style="font-size:22px;margin:0 0 8px">Նոր ապառիկ հարցում</h1>
  <p style="margin:0 0 24px;color:#6b7280">Հարցման համար՝ <strong>${escapeHtml(payload.inquiryId)}</strong></p>

  <h2 style="font-size:16px;margin:0 0 12px">Հաճախորդ</h2>
  <p style="margin:0 0 16px;font-size:14px">
    Անուն՝ ${escapeHtml(customerName)}<br>
    Email՝ ${escapeHtml(payload.email)}<br>
    Հեռախոս՝ ${escapeHtml(payload.phone)}
  </p>

  <h2 style="font-size:16px;margin:0 0 12px">Ապրանք</h2>
  ${buildProductHtml(payload)}

  <p style="margin:24px 0 0;font-size:13px;color:#6b7280">Հարցումը ուղարկվել է ապրանքի քարտից։</p>
</body>
</html>`.trim();
}

function buildText(payload: AparikProductInquiryEmailPayload): string {
  const customerName = formatCustomerName(payload.firstName, payload.lastName);
  const formattedPrice = formatCatalogMoneyForEmail(
    payload.productPrice,
    payload.currency as CheckoutDisplayCurrency
  );
  const productUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/products/${payload.productSlug}`;
  const imageUrl = resolveAbsoluteImageUrl(payload.productImageUrl);
  const variantDetails = buildVariantDetailsText(payload);

  return [
    "Նոր ապառիկ հարցում",
    `Հարցման համար: ${payload.inquiryId}`,
    "",
    "Հաճախորդ",
    `Անուն: ${customerName}`,
    `Email: ${payload.email}`,
    `Հեռախոս: ${payload.phone}`,
    "",
    "Ապրանք",
    `Անվանում: ${payload.productTitle}`,
    variantDetails || undefined,
    payload.sku ? `SKU: ${payload.sku}` : undefined,
    `ID: ${payload.productId}`,
    `Գին: ${formattedPrice}`,
    `Արժույթ: ${payload.currency}`,
    imageUrl ? `Նկար: ${imageUrl}` : undefined,
    `Հղում: ${productUrl}`,
    "",
    "Հարցումը ուղարկվել է ապրանքի քարտից։",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function sendAparikProductInquiryEmail(
  payload: AparikProductInquiryEmailPayload
): Promise<void> {
  const to = getAparikNotificationEmail();
  const subject = `Նոր ապառիկ հարցում — ${payload.productTitle}`;
  const html = buildHtml(payload);
  const text = buildText(payload);

  if (process.env.NODE_ENV === "development" && !process.env.RESEND_API_KEY?.trim()) {
    logger.warn("Aparik product inquiry email skipped (RESEND_API_KEY missing)", {
      to,
      inquiryId: payload.inquiryId,
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
    logger.error("Failed to send aparik product inquiry email", {
      error,
      to,
      inquiryId: payload.inquiryId,
    });
    throw new Error(error.message || "Failed to send aparik product inquiry email");
  }

  logger.info("Aparik product inquiry email sent", {
    to,
    inquiryId: payload.inquiryId,
  });
}
