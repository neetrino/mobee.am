import { NextRequest, NextResponse } from "next/server";
import { reviewsService } from "@/lib/services/reviews.service";
import { authenticateToken } from "@/lib/middleware/auth";
import { productsService } from "@/lib/services/products.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/products/[slug]/reviews
 * Get all reviews for a product (by slug)
 * Query params:
 *   - my=true: Get current user's review (requires authentication)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const lang = searchParams.get("lang") || "en";
    const myReview = searchParams.get("my") === "true";
    
    console.log('📝 [REVIEWS API] GET request for product slug:', slug, { myReview });

    // First, get the product by slug to get the productId
    const product = await productsService.findBySlug(slug, lang);
    if (!product || !product.id) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/not-found",
          title: "Product not found",
          status: 404,
          detail: `Product with slug '${slug}' does not exist`,
          instance: req.url,
        },
        { status: 404 }
      );
    }

    // If my=true, return user's review
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
          { status: 401 }
        );
      }

      const review = await reviewsService.getUserReview(product.id, user.id, true);
      return NextResponse.json(review);
    }

    // Otherwise, return all published reviews
    const reviews = await reviewsService.getProductReviews(product.id, {
      publishedOnly: true,
    });

    return NextResponse.json(reviews);
  } catch (error: any) {
    console.error("❌ [REVIEWS API] GET Error:", error);
    return NextResponse.json(
      {
        type: error.type || "https://api.shop.am/problems/internal-error",
        title: error.title || "Internal Server Error",
        status: error.status || 500,
        detail: error.detail || error.message || "An error occurred",
        instance: req.url,
      },
      { status: error.status || 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  return NextResponse.json(
    {
      type: "https://api.shop.am/problems/method-not-allowed",
      title: "Method Not Allowed",
      status: 405,
      detail: `Review creation is disabled for v1 read-only scope on product '${slug}'`,
      instance: req.url,
    },
    { status: 405 }
  );
}

