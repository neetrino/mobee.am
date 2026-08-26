import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";
import { runApiRoute } from "@/lib/errors/run-api-route";

/**
 * Валидация и нормализация параметров запроса для GET /api/v1/admin/products
 * @param searchParams - Параметры URL запроса
 * @returns Нормализованные фильтры или ошибку валидации
 */
function validateAndNormalizeFilters(searchParams: URLSearchParams): {
  filters?: {
    page: number;
    limit: number;
    search?: string;
    categories?: string[];
    sku?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    stockStatus?: "all" | "inStock" | "outOfStock";
  };
  error?: {
    type: string;
    title: string;
    status: number;
    detail: string;
  };
} {
  const pageParam = searchParams.get("page");
  const page = pageParam ? parseInt(pageParam, 10) : 1;
  if (pageParam && (isNaN(page) || page < 1)) {
    return {
      error: {
        type: "https://api.shop.am/problems/validation-error",
        title: "Validation Error",
        status: 400,
        detail: "Parameter 'page' must be a positive integer",
      },
    };
  }

  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 20;
  if (limitParam && (isNaN(limit) || limit < 1 || limit > 100)) {
    return {
      error: {
        type: "https://api.shop.am/problems/validation-error",
        title: "Validation Error",
        status: 400,
        detail: "Parameter 'limit' must be an integer between 1 and 100",
      },
    };
  }

  const minPriceParam = searchParams.get("minPrice");
  let minPrice: number | undefined;
  if (minPriceParam) {
    minPrice = parseFloat(minPriceParam);
    if (isNaN(minPrice) || minPrice < 0) {
      return {
        error: {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "Parameter 'minPrice' must be a non-negative number",
        },
      };
    }
  }

  const maxPriceParam = searchParams.get("maxPrice");
  let maxPrice: number | undefined;
  if (maxPriceParam) {
    maxPrice = parseFloat(maxPriceParam);
    if (isNaN(maxPrice) || maxPrice < 0) {
      return {
        error: {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "Parameter 'maxPrice' must be a non-negative number",
        },
      };
    }
  }

  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    return {
      error: {
        type: "https://api.shop.am/problems/validation-error",
        title: "Validation Error",
        status: 400,
        detail: "Parameter 'minPrice' cannot be greater than 'maxPrice'",
      },
    };
  }

  const categoryParam = searchParams.get("category");
  const categories = categoryParam ? categoryParam.split(",").filter(Boolean) : undefined;
  const stockParam = searchParams.get("stock")?.trim();
  const stockStatus =
    stockParam === "inStock" || stockParam === "outOfStock" ? stockParam : "all";

  return {
    filters: {
      page,
      limit,
      search: searchParams.get("search")?.trim() || undefined,
      categories,
      sku: searchParams.get("sku")?.trim() || undefined,
      minPrice,
      maxPrice,
      sort: searchParams.get("sort")?.trim() || undefined,
      stockStatus,
    },
  };
}

/**
 * GET /api/v1/admin/products
 * Get list of products with filters and pagination
 *
 * Query parameters:
 * - page: number (default: 1, min: 1)
 * - limit: number (default: 20, min: 1, max: 100)
 * - search: string (optional)
 * - category: string (comma-separated, optional)
 * - sku: string (optional)
 * - minPrice: number (optional, non-negative)
 * - maxPrice: number (optional, non-negative)
 * - sort: string (optional)
 */
export async function GET(req: NextRequest) {
  return runApiRoute(req, async () => {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(req.url);
    const validationResult = validateAndNormalizeFilters(searchParams);

    if (validationResult.error) {
      return NextResponse.json(validationResult.error, { status: validationResult.error.status });
    }

    const filters = validationResult.filters!;
    const result = await adminService.getProducts(filters);
    return NextResponse.json(result);
  });
}

/**
 * POST /api/v1/admin/products
 * Create a new product
 *
 * Request body should contain:
 * - title: string (required)
 * - slug: string (required)
 * - subtitle?: string
 * - descriptionHtml?: string
 * - brandId?: string
 * - primaryCategoryId?: string
 * - categoryIds?: string[]
 * - published: boolean (required)
 * - featured?: boolean
 * - locale: string (required)
 * - media?: any[]
 * - labels?: Array<{type: string, value: string, position: string, color?: string}>
 * - attributeIds?: string[]
 * - variants: Array<{price: string|number, compareAtPrice?: string|number, stock: string|number, sku?: string, color?: string, size?: string, imageUrl?: string, published?: boolean}> (required)
 */
export async function POST(req: NextRequest) {
  return runApiRoute(req, async () => {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "Invalid JSON in request body",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    if (!body.title || typeof body.title !== "string" || body.title.trim().length === 0) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "Field 'title' is required and must be a non-empty string",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    if (!body.slug || typeof body.slug !== "string" || body.slug.trim().length === 0) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "Field 'slug' is required and must be a non-empty string",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    if (typeof body.published !== "boolean") {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "Field 'published' is required and must be a boolean",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    if (!body.locale || typeof body.locale !== "string") {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "Field 'locale' is required and must be a string",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.variants) || body.variants.length === 0) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "Field 'variants' is required and must be a non-empty array",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    const product = await adminService.createProduct(body);
    return NextResponse.json(product, { status: 201 });
  });
}
