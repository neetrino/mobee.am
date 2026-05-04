import { z } from "zod";

const shippingAddressSchema = z
  .object({
    firstName: z.string().trim().min(1).optional(),
    lastName: z.string().trim().min(1).optional(),
    address: z.string().trim().min(1).optional(),
    addressLine1: z.string().trim().min(1).optional(),
    addressLine2: z.string().trim().min(1).optional(),
    city: z.string().trim().min(1).optional(),
    state: z.string().trim().min(1).optional(),
    postalCode: z.string().trim().min(1).optional(),
    countryCode: z.string().trim().min(1).optional(),
    phone: z.string().trim().min(1).optional(),
  })
  .strict();

const guestItemSchema = z.object({
  variantId: z.string().trim().min(1, "variantId is required"),
  productId: z.string().trim().min(1, "productId is required"),
  quantity: z.int().positive("quantity must be greater than 0"),
});

const checkoutSchema = z
  .object({
    cartId: z.string().trim().min(1).optional(),
    items: z.array(guestItemSchema).min(1).optional(),
    firstName: z.string().trim().min(1).optional(),
    lastName: z.string().trim().min(1).optional(),
    email: z.string().email("Invalid email"),
    phone: z.string().trim().min(1, "phone is required"),
    shippingMethod: z.enum(["pickup", "delivery"]).default("pickup"),
    shippingAddress: shippingAddressSchema.optional(),
    shippingAmount: z.number().min(0).optional(),
    paymentMethod: z.enum(["idram", "arca", "cash_on_delivery"]).default("idram"),
    promoCode: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? undefined : val),
      z.string().trim().min(1).max(64).optional()
    ),
    locale: z.enum(["en", "hy", "ru"]).optional(),
    billingAddress: shippingAddressSchema.optional(),
  })
  .strict()
  .superRefine((data, context) => {
    if (!data.cartId && (!data.items || data.items.length === 0)) {
      context.addIssue({
        code: "custom",
        message: "Either cartId or items is required",
        path: ["cartId"],
      });
    }

    if (data.shippingMethod === "delivery" && !data.shippingAddress?.city) {
      context.addIssue({
        code: "custom",
        message: "shippingAddress.city is required for delivery",
        path: ["shippingAddress", "city"],
      });
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export function parseCheckoutBody(body: unknown): CheckoutInput {
  return checkoutSchema.parse(body);
}

export function safeParseCheckout(body: unknown): ReturnType<typeof checkoutSchema.safeParse> {
  return checkoutSchema.safeParse(body);
}
