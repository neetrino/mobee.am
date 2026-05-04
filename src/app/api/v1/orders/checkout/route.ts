import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { authenticateToken } from "@/lib/middleware/auth";
import { parseCheckoutBody } from "@/lib/schemas/checkout.schema";
import { ordersService } from "@/lib/services/orders.service";
import { normalizeCheckoutLocale } from "@/lib/services/orders/checkout-calculations";
import { toApiError } from "@/lib/types/errors";
import { logger } from "@/lib/utils/logger";

export async function POST(req: NextRequest) {
  try {
    logger.info("Checkout request received");
    const user = await authenticateToken(req);

    if (!user) {
      return NextResponse.json(
        {
          status: 401,
          type: "https://api.shop.am/problems/unauthorized",
          title: "Unauthorized",
          detail: "Authentication required to place an order",
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const data = parseCheckoutBody(body);
    const acceptLanguage = req.headers.get("accept-language");
    const requestLocale = normalizeCheckoutLocale(data.locale || user.locale || acceptLanguage);
    const checkoutData = { ...data, locale: requestLocale };
    
    logger.debug("Checkout data", {
      userId: user.id,
      cartId: data.cartId,
      itemsCount: data.items?.length || 0,
      email: data.email,
      phone: data.phone,
      paymentMethod: data.paymentMethod,
      shippingMethod: data.shippingMethod,
      locale: requestLocale,
    });
    
    const result = await ordersService.checkout(checkoutData, user.id, req.nextUrl.origin);
    
    logger.info("Checkout successful", {
      orderNumber: result.order?.number,
      orderId: result.order?.id,
      total: result.order?.total,
    });
    
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      const validationError = {
        status: 400,
        type: "https://api.shop.am/problems/validation-error",
        title: "Validation Error",
        detail: "Invalid checkout request payload",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      };
      return NextResponse.json(validationError, { status: validationError.status });
    }

    logger.error("Checkout error", { error });
    if (error instanceof Error) {
      logger.error("Checkout error details", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }
    const apiError = toApiError(error, req.url);
    return NextResponse.json(apiError, { status: apiError.status || 500 });
  }
}

