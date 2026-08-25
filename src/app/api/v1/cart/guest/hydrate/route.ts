import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guestCartHydrateService } from "@/lib/services/guest-cart-hydrate.service";
import { runApiRoute } from "@/lib/errors/run-api-route";

export const dynamic = "force-dynamic";

const hydrateBodySchema = z.object({
  lang: z.string().min(2).max(8).optional(),
  items: z
    .array(
      z.object({
        productSlug: z.string().min(1),
        variantId: z.string().min(1),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1)
    .max(50),
});

export async function POST(req: NextRequest) {
  return runApiRoute(req, async () => {
    const parsed = hydrateBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: parsed.error.message,
          instance: req.url,
        },
        { status: 400 },
      );
    }

    const lang = parsed.data.lang ?? "en";
    const result = await guestCartHydrateService.hydrateItems(parsed.data.items, lang);
    return NextResponse.json(result);
  });
}
