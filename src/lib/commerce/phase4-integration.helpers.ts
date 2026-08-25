import { db } from "@white-shop/db";

type DbClient = typeof db;

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);
const CLOUD_HOST_RE = /neon|amazonaws|supabase|render\.com|azure|pooler/i;

export function assertLocalPhase4DatabaseUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("PHASE4_INTEGRATION requires a valid local disposable DATABASE_URL");
  }
  const host = parsed.hostname.toLowerCase();
  if (!LOCAL_HOSTS.has(host) || CLOUD_HOST_RE.test(host)) {
    throw new Error("PHASE4_INTEGRATION requires a local disposable DATABASE_URL");
  }
}

export async function createVariantFixture(
  client: DbClient,
  input: { sku: string; stock: number; stockReserved?: number },
) {
  const product = await client.product.create({
    data: {
      published: true,
      translations: {
        create: { locale: "en", title: "Phase4", slug: `phase4-${input.sku}` },
      },
      variants: {
        create: {
          sku: input.sku,
          price: 1000,
          stock: input.stock,
          stockReserved: input.stockReserved ?? 0,
        },
      },
    },
    include: { variants: true },
  });
  const variant = product.variants[0];
  if (!variant) {
    throw new Error("Failed to create variant fixture");
  }
  return { product, variant };
}

export async function createOrderFixture(
  client: DbClient,
  input: {
    number: string;
    variantId?: string | null;
    quantity?: number;
    status?: string;
    paymentStatus?: string;
    sku?: string;
    withItem?: boolean;
  },
) {
  const withItem = input.withItem !== false && input.variantId !== undefined;
  return client.order.create({
    data: {
      number: input.number,
      status: input.status ?? "processing",
      paymentStatus: input.paymentStatus ?? "pending",
      fulfillmentStatus: "unfulfilled",
      subtotal: withItem ? 1000 : 0,
      total: withItem ? 1000 : 0,
      currency: "AMD",
      ...(withItem
        ? {
            items: {
              create: {
                variantId: input.variantId ?? null,
                productTitle: "Phase4",
                sku: input.sku ?? "SKU",
                quantity: input.quantity ?? 1,
                price: 1000,
                total: 1000,
              },
            },
          }
        : {}),
    },
  });
}

export async function createPaymentFixture(
  client: DbClient,
  input: { orderId: string; status?: string },
) {
  return client.payment.create({
    data: {
      orderId: input.orderId,
      provider: "cash_on_delivery",
      method: "cash_on_delivery",
      amount: 1000,
      currency: "AMD",
      status: input.status ?? "pending",
    },
  });
}
