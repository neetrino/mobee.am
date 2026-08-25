import { NextRequest, NextResponse } from "next/server";
import { reviewsService } from "@/lib/services/reviews.service";
import { authenticateToken } from "@/lib/middleware/auth";
import { productsService } from "@/lib/services/products.service";
import { runApiRoute } from "@/lib/errors/run-api-route";

export const dynamic = "force-dynamic";

async function resolveProductIdFromSlug(
  slug: string,
  lang: string,
): Promise<string | null> {
  const productId = await productsService.findProductIdBySlug(slug, lang);
  if (productId) {
    return productId;
  }

  if (lang !== "en") {
    return productsService.findProductIdBySlug(slug, "en");
  }

  return null;
}

async function resolveProductId(
  slug: string,
  lang: string,
  productIdParam: string | null,
): Promise<string | null> {
  const fromQuery = productIdParam?.trim();
  if (fromQuery) {
    return fromQuery;
  }

  return resolveProductIdFromSlug(slug, lang);
}

/**
 * GET /api/v1/products/[slug]/reviews
 * Get all reviews for a product (by slug)
 * Query params:
 *   - my=true: Get current user's review (requires authentication)
 *   - productId: Skip slug lookup when provided from PDP
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  return runApiRoute(req, async () => {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const lang = searchParams.get("lang") || "en";
    const myReview = searchParams.get("my") === "true";

    const productId = await resolveProductId(slug, lang, searchParams.get("productId"));
    if (!productId) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/not-found",
          title: "Product not found",
          status: 404,
          detail: `Product with slug '${slug}' does not exist`,
          instance: req.url,
        },
        { status: 404 },
      );
    }

    if (myReview) {
      const user = await authenticateToken(req);
      if (!user) {
        return NextResponse.json(
          {
            type: "https://api.shop.am/problems/unauthorized",
            title: "Unauthorized",
            status: 401,
            detail: "Authentication required",
            instance: req.url,
          },
          { status: 401 },
        );
      }

      const review = await reviewsService.getUserReview(productId, user.id, true);
      return NextResponse.json(review);
    }

    const reviews = await reviewsService.getProductReviews(productId, {
      publishedOnly: true,
    });

    return NextResponse.json(reviews);
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  return runApiRoute(req, async () => {
    const { slug } = await params;
    return NextResponse.json(
      {
        type: "https://api.shop.am/problems/method-not-allowed",
        title: "Method Not Allowed",
        status: 405,
        detail: `Review creation is disabled for v1 read-only scope on product '${slug}'`,
        instance: req.url,
      },
      { status: 405 },
    );
  });
}
