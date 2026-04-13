import { NextRequest, NextResponse } from "next/server";
import { productsService } from "@/lib/services/products.service";

export async function GET(req: NextRequest) {
  try {
    let searchParams;
    try {
      const url = req.url || '';
      searchParams = new URL(url).searchParams;
    } catch (urlError) {
      console.error("❌ [PRODUCTS FILTERS] Error parsing URL:", urlError);
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/internal-error",
          title: "Internal Server Error",
          status: 500,
          detail: "Invalid request URL",
          instance: req.url || '',
        },
        { status: 500 }
      );
    }

    const filters = {
      category: searchParams.get("category") || undefined,
      search: searchParams.get("search") || undefined,
      minPrice: searchParams.get("minPrice")
        ? parseFloat(searchParams.get("minPrice")!)
        : undefined,
      maxPrice: searchParams.get("maxPrice")
        ? parseFloat(searchParams.get("maxPrice")!)
        : undefined,
      lang: searchParams.get("lang") || "en",
    };

    const result = await productsService.getFilters(filters);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("❌ [PRODUCTS FILTERS] Error:", error);
    console.error("❌ [PRODUCTS FILTERS] Error stack:", error.stack);
    return NextResponse.json(
      {
        type: error.type || "https://api.shop.am/problems/internal-error",
        title: error.title || "Internal Server Error",
        status: error.status || 500,
        detail: error.detail || error.message || "An error occurred",
        instance: req.url || '',
      },
      { status: error.status || 500 }
    );
  }
}

