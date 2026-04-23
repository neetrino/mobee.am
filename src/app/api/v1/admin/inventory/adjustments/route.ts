import { NextRequest, NextResponse } from "next/server";
import { authenticateToken, requireAdmin } from "@/lib/middleware/auth";
import { adminInventoryService } from "@/lib/services/admin/admin-inventory.service";

interface AdjustmentPayload {
  variantId?: unknown;
  quantityDelta?: unknown;
  reason?: unknown;
  note?: unknown;
}

function validatePayload(payload: AdjustmentPayload) {
  if (typeof payload.variantId !== "string" || payload.variantId.trim().length === 0) {
    return "Field 'variantId' is required";
  }
  if (!Number.isInteger(payload.quantityDelta) || payload.quantityDelta === 0) {
    return "Field 'quantityDelta' must be a non-zero integer";
  }
  if (typeof payload.reason !== "string" || payload.reason.trim().length === 0) {
    return "Field 'reason' is required";
  }
  if (payload.note !== undefined && typeof payload.note !== "string") {
    return "Field 'note' must be a string";
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateToken(req);
    if (!user || !requireAdmin(user)) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "Admin access required",
          instance: req.url,
        },
        { status: 403 }
      );
    }

    const payload = (await req.json()) as AdjustmentPayload;
    const validationError = validatePayload(payload);
    if (validationError) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: validationError,
          instance: req.url,
        },
        { status: 400 }
      );
    }

    const result = await adminInventoryService.adjustInventory({
      variantId: payload.variantId as string,
      quantityDelta: payload.quantityDelta as number,
      reason: (payload.reason as string).trim(),
      note: payload.note as string | undefined,
      adminUserId: user.id,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const knownError = error as { status?: number; type?: string; title?: string; detail?: string; message?: string };
    return NextResponse.json(
      {
        type: knownError.type || "https://api.shop.am/problems/internal-error",
        title: knownError.title || "Internal Server Error",
        status: knownError.status || 500,
        detail: knownError.detail || knownError.message || "An error occurred",
        instance: req.url,
      },
      { status: knownError.status || 500 }
    );
  }
}
