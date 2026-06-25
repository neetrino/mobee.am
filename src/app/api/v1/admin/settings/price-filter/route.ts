import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";
import {
  getCachedAdminReferenceResponse,
  invalidateAdminReferenceServerCache,
} from "@/lib/admin/admin-reference-server-cache";

/**
 * GET /api/v1/admin/settings/price-filter
 * Get price filter settings (minPrice, maxPrice, stepSize, stepSizePerCurrency)
 */
export async function GET(req: NextRequest) {
  try {
    console.log('⚙️ [PRICE FILTER API] GET request received');
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const result = await getCachedAdminReferenceResponse("price-filter-settings", () =>
      adminService.getPriceFilterSettings(),
    );
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("❌ [PRICE FILTER API] GET Error:", error);
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

/**
 * PUT /api/v1/admin/settings/price-filter
 * Update price filter settings (minPrice, maxPrice, stepSize, stepSizePerCurrency)
 */
export async function PUT(req: NextRequest) {
  try {
    console.log('⚙️ [PRICE FILTER API] PUT request received');
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const data = await req.json();
    console.log('📤 [PRICE FILTER API] Update data received:', data);
    
    // Validate input
    if (data.minPrice !== null && data.minPrice !== undefined && (typeof data.minPrice !== 'number' || data.minPrice < 0)) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "minPrice must be a valid positive number or null",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    if (data.maxPrice !== null && data.maxPrice !== undefined && (typeof data.maxPrice !== 'number' || data.maxPrice < 0)) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "maxPrice must be a valid positive number or null",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    if (data.stepSize !== null && data.stepSize !== undefined && (typeof data.stepSize !== 'number' || data.stepSize <= 0)) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "stepSize must be a valid positive number or null",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    // Validate stepSizePerCurrency (optional map: { USD, AMD, RUB, GEL })
    if (data.stepSizePerCurrency !== null && data.stepSizePerCurrency !== undefined) {
      if (typeof data.stepSizePerCurrency !== 'object') {
        return NextResponse.json(
          {
            type: "https://api.shop.am/problems/validation-error",
            title: "Validation Error",
            status: 400,
            detail: "stepSizePerCurrency must be an object map of currency codes to positive numbers or null",
            instance: req.url,
          },
          { status: 400 }
        );
      }

      const allowedCurrencies = ['USD', 'AMD', 'RUB', 'GEL'];
      for (const [code, value] of Object.entries(data.stepSizePerCurrency)) {
        if (!allowedCurrencies.includes(code)) {
          return NextResponse.json(
            {
              type: "https://api.shop.am/problems/validation-error",
              title: "Validation Error",
              status: 400,
              detail: `Unsupported currency code in stepSizePerCurrency: ${code}`,
              instance: req.url,
            },
            { status: 400 }
          );
        }
        if (value !== null && value !== undefined && (typeof value !== 'number' || value <= 0)) {
          return NextResponse.json(
            {
              type: "https://api.shop.am/problems/validation-error",
              title: "Validation Error",
              status: 400,
              detail: `stepSizePerCurrency.${code} must be a valid positive number or null`,
              instance: req.url,
            },
            { status: 400 }
          );
        }
      }
    }

    if (
      data.minPrice !== null && data.minPrice !== undefined &&
      data.maxPrice !== null && data.maxPrice !== undefined &&
      data.minPrice >= data.maxPrice
    ) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "minPrice must be less than maxPrice",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    const result = await adminService.updatePriceFilterSettings(data);
    await invalidateAdminReferenceServerCache("price-filter-settings");
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("❌ [PRICE FILTER API] PUT Error:", error);
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

