import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { parseAparikInquiryBody } from "@/lib/schemas/aparik-inquiry.schema";
import { sendAparikProductInquiryEmail } from "@/lib/email/send-aparik-product-inquiry-email";
import { logger } from "@/lib/utils/logger";

function createInquiryId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `APR-${timestamp}-${random}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = parseAparikInquiryBody(body);
    const inquiryId = createInquiryId();

    await sendAparikProductInquiryEmail({
      inquiryId,
      productId: data.productId,
      productSlug: data.productSlug,
      productTitle: data.productTitle,
      productPrice: data.productPrice,
      currency: data.currency,
      productImageUrl: data.productImageUrl,
      color: data.color,
      colorHex: data.colorHex,
      variantTitle: data.variantTitle,
      sku: data.sku,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
    });

    logger.info("Aparik product inquiry submitted", {
      inquiryId,
      productId: data.productId,
    });

    return NextResponse.json(
      {
        data: {
          inquiryId,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: error.issues[0]?.message ?? "Invalid request body",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Aparik product inquiry error", { error });
    return NextResponse.json(
      {
        type: "https://api.shop.am/problems/internal-error",
        title: "Internal Server Error",
        status: 500,
        detail: errorMessage || "Failed to submit aparik inquiry",
        instance: req.url,
      },
      { status: 500 }
    );
  }
}
