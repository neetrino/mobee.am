import { db } from "@white-shop/db";

/**
 * Extract image from product media
 */
function extractImageFromMedia(media: unknown[] | undefined): string | null {
  if (!Array.isArray(media) || media.length === 0) {
    return null;
  }

  const firstMedia = media[0];
  
  if (typeof firstMedia === "string") {
    return firstMedia;
  }
  
  if (firstMedia && typeof firstMedia === "object" && "url" in firstMedia) {
    const mediaObj = firstMedia as { url?: string };
    return mediaObj.url || null;
  }

  return null;
}

/**
 * Get top products for dashboard
 */
export async function getTopProducts(limit: number = 5) {
  // Get all order items with their variants
  const orderItems = await db.orderItem.findMany({
    include: {
      variant: {
        include: {
          product: {
            include: {
              translations: {
                where: { locale: "en" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  // Group by variant and calculate stats
  const productStats = new Map<
    string,
    {
      variantId: string;
      productId: string;
      title: string;
      sku: string;
      totalQuantity: number;
      totalRevenue: number;
      orderCount: number;
      image?: string | null;
    }
  >();

  orderItems.forEach((item: { 
    variantId: string | null; 
    quantity: number; 
    total: number; 
    variant?: { 
      id: string; 
      productId: string; 
      sku: string | null; 
      product?: { 
        translations?: Array<{ title: string }>; 
        media?: unknown[] 
      } 
    } | null
  }) => {
    if (!item.variant) return;

    const variantId = item.variantId || item.variant.id;
    const productId = item.variant.productId;
    const product = item.variant.product;
    const translations = product?.translations || [];
    const translation = translations[0];
    const title = translation?.title || "Unknown Product";
    const sku = item.variant.sku || "N/A";
    const image = extractImageFromMedia(product?.media);

    if (!productStats.has(variantId)) {
      productStats.set(variantId, {
        variantId,
        productId,
        title,
        sku,
        totalQuantity: 0,
        totalRevenue: 0,
        orderCount: 0,
        image,
      });
    }

    const stats = productStats.get(variantId)!;
    stats.totalQuantity += item.quantity;
    stats.totalRevenue += item.total;
    stats.orderCount += 1;
  });

  // Convert to array and sort by revenue
  const topProducts = Array.from(productStats.values())
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, limit);

  return topProducts;
}




