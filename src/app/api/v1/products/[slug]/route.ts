import { NextRequest, NextResponse } from "next/server";
import { productsService } from "@/lib/services/products.service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { searchParams } = new URL(req.url);
    const lang = searchParams.get("lang") || "en";
    const { slug } = await params;
    const result = await productsService.findBySlug(slug, lang);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as { status?: number };
    if (err.status !== 404) {
      console.error("❌ [PRODUCTS] Error:", error);
    }
    const e = error as {
      type?: string;
      title?: string;
      status?: number;
      detail?: string;
      message?: string;
    };
    return NextResponse.json(
      {
        type: e.type || "https://api.shop.am/problems/internal-error",
        title: e.title || "Internal Server Error",
        status: e.status || 500,
        detail: e.detail || e.message || "An error occurred",
        instance: req.url,
      },
      { status: e.status || 500 }
    );
  }
}

