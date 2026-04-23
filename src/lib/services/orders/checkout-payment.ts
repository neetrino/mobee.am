import crypto from "crypto";
import { logger } from "@/lib/utils/logger";

type PaymentProvider = "idram" | "arca" | "cash_on_delivery";

interface SignedPaymentCallbackInput {
  paymentId: string;
  orderNumber: string;
  provider: "idram" | "arca";
  status: "paid" | "failed";
  timestamp: number;
}

interface CreatePaymentUrlInput {
  paymentId: string;
  orderNumber: string;
  amount: number;
  provider: PaymentProvider;
  baseUrl: string;
}

const MAX_CLOCK_SKEW_MS = 10 * 60 * 1000;

function getSigningSecret(): string {
  return process.env.PAYMENT_CALLBACK_SECRET || process.env.JWT_SECRET || "";
}

function safeBuildUrl(pathOrUrl: string, baseUrl: string): URL {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return new URL(pathOrUrl);
  }
  return new URL(pathOrUrl, baseUrl);
}

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function buildSignaturePayload(input: SignedPaymentCallbackInput): string {
  return [
    input.paymentId,
    input.orderNumber,
    input.provider,
    input.status,
    String(input.timestamp),
  ].join(":");
}

export function createSignedCallbackUrl(
  input: SignedPaymentCallbackInput,
  baseUrl: string
): string {
  const secret = getSigningSecret();
  if (!secret) {
    throw new Error("PAYMENT_CALLBACK_SECRET or JWT_SECRET is required");
  }

  const callbackUrl = safeBuildUrl("/api/v1/payments/callback", baseUrl);
  callbackUrl.searchParams.set("paymentId", input.paymentId);
  callbackUrl.searchParams.set("orderNumber", input.orderNumber);
  callbackUrl.searchParams.set("provider", input.provider);
  callbackUrl.searchParams.set("status", input.status);
  callbackUrl.searchParams.set("ts", String(input.timestamp));

  const signature = signPayload(buildSignaturePayload(input), secret);
  callbackUrl.searchParams.set("sig", signature);
  return callbackUrl.toString();
}

export function verifyPaymentCallbackSignature(input: SignedPaymentCallbackInput, sig: string): boolean {
  const secret = getSigningSecret();
  if (!secret || !sig) return false;
  const expected = signPayload(buildSignaturePayload(input), secret);
  const received = Buffer.from(sig, "utf8");
  const target = Buffer.from(expected, "utf8");
  if (received.length !== target.length) return false;
  return crypto.timingSafeEqual(received, target);
}

export function isFreshCallbackTimestamp(timestamp: number, now = Date.now()): boolean {
  return Math.abs(now - timestamp) <= MAX_CLOCK_SKEW_MS;
}

export function createPaymentUrl(input: CreatePaymentUrlInput): string | null {
  if (input.provider === "cash_on_delivery") {
    return null;
  }

  const idramBase = process.env.IDRAM_PAYMENT_URL;
  const arcaBase = process.env.ARCA_PAYMENT_URL;
  const providerBaseUrl = input.provider === "idram" ? idramBase : arcaBase;

  if (!providerBaseUrl) {
    logger.warn("Payment provider URL is not configured", {
      provider: input.provider,
      paymentId: input.paymentId,
      orderNumber: input.orderNumber,
    });
    return null;
  }

  const successCallbackUrl = createSignedCallbackUrl(
    {
      paymentId: input.paymentId,
      orderNumber: input.orderNumber,
      provider: input.provider,
      status: "paid",
      timestamp: Date.now(),
    },
    input.baseUrl
  );

  const failureCallbackUrl = createSignedCallbackUrl(
    {
      paymentId: input.paymentId,
      orderNumber: input.orderNumber,
      provider: input.provider,
      status: "failed",
      timestamp: Date.now(),
    },
    input.baseUrl
  );

  const url = safeBuildUrl(providerBaseUrl, input.baseUrl);
  url.searchParams.set("orderNumber", input.orderNumber);
  url.searchParams.set("paymentId", input.paymentId);
  url.searchParams.set("amount", input.amount.toFixed(2));
  url.searchParams.set("currency", "AMD");
  url.searchParams.set("successUrl", successCallbackUrl);
  url.searchParams.set("failureUrl", failureCallbackUrl);
  return url.toString();
}
