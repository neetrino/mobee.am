import { NextRequest, NextResponse } from "next/server";
import { categoriesService } from "@/lib/services/categories.service";
import { runApiRoute } from "@/lib/errors/run-api-route";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  return runApiRoute(req, async () => {
    const { searchParams } = new URL(req.url);
    const lang = searchParams.get("lang") || "en";
    const { slug } = await params;
    const result = await categoriesService.findBySlug(slug, lang);
    return NextResponse.json(result);
  });
}
