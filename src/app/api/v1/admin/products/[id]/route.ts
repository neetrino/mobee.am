import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";
import { safeParseAdminProductUpdate } from "@/lib/schemas/admin-product-update.schema";
import { runApiRoute } from "@/lib/errors/run-api-route";
import { logger } from "@/lib/utils/logger";

/**
 * GET /api/v1/admin/products/[id]
 * Get a single product by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return runApiRoute(req, async () => {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    const product = await adminService.getProductById(id);

    return NextResponse.json(product);
  });
}

/**
 * PUT /api/v1/admin/products/[id]
 * Partial or legacy full product update
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return runApiRoute(req, async () => {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    const body: unknown = await req.json();

    const parsed = safeParseAdminProductUpdate(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: parsed.error.flatten(),
          instance: req.url,
        },
        { status: 400 }
      );
    }

    logger.info("ADMIN PRODUCTS PUT request", {
      id,
      format: parsed.format,
      bodyKeys: Object.keys(body as Record<string, unknown>),
    });

    const result = await adminService.updateProduct(id, parsed.data);

    logger.info("ADMIN PRODUCTS Product updated", {
      id,
      productId: result.id,
    });

    return NextResponse.json(result);
  });
}

/**
 * DELETE /api/v1/admin/products/[id]
 * Delete a product (soft delete)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return runApiRoute(req, async () => {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    logger.info("ADMIN PRODUCTS DELETE request", { id });

    await adminService.deleteProduct(id);
    logger.info("ADMIN PRODUCTS Product deleted", { id });

    return NextResponse.json({ success: true });
  });
}
