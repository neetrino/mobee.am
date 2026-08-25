import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminInventoryService } from "@/lib/services/admin/admin-inventory.service";
import { runApiRoute } from "@/lib/errors/run-api-route";

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
  return runApiRoute(req, async (ctx) => {
    const authResult = await requireAdminApiContext(req);
    if (authResult instanceof NextResponse) {
      return authResult;
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

    const result = await adminInventoryService.adjustInventory(
      {
        variantId: payload.variantId as string,
        quantityDelta: payload.quantityDelta as number,
        reason: (payload.reason as string).trim(),
        note: payload.note as string | undefined,
      },
      ctx.commerce({ actorUserId: authResult.userId, source: "admin" }),
    );

    return NextResponse.json(result, { status: 200 });
  });
}
