import { NextRequest, NextResponse } from "next/server";
import { db } from "@white-shop/db";
import { runApiRoute } from "@/lib/errors/run-api-route";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return runApiRoute(req, async () => {
    const { id } = await params;

    const variant = await db.productVariant.findUnique({
      where: { id },
      select: {
        id: true,
        productId: true,
        stock: true,
        published: true,
      },
    });

    if (!variant) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/not-found",
          title: "Variant not found",
          status: 404,
          detail: `Variant with id '${id}' not found`,
          instance: req.url,
        },
        { status: 404 }
      );
    }

    const available = variant.stock > 0 && variant.published === true;

    return NextResponse.json({
      id: variant.id,
      productId: variant.productId,
      stock: variant.stock,
      available: available,
    });
  });
}
