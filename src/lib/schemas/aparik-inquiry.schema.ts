import { z } from "zod";

const currencySchema = z.enum(["USD", "AMD", "EUR", "RUB", "GEL"]);

export const aparikInquirySchema = z.object({
  productId: z.string().trim().min(1, "productId is required"),
  productSlug: z.string().trim().min(1, "productSlug is required"),
  productTitle: z.string().trim().min(1, "productTitle is required"),
  productPrice: z.number().finite().nonnegative(),
  currency: currencySchema,
  productImageUrl: z.string().trim().optional(),
  color: z.string().trim().optional(),
  colorHex: z.string().trim().optional(),
  variantTitle: z.string().trim().optional(),
  sku: z.string().trim().optional(),
  firstName: z.string().trim().min(1, "firstName is required"),
  lastName: z.string().trim().min(1, "lastName is required"),
  email: z.string().trim().min(1, "email is required").email("invalid email"),
  phone: z
    .string()
    .trim()
    .min(1, "phone is required")
    .regex(/^[0-9]{8,15}$/, "invalid phone"),
});

export type AparikInquiryInput = z.infer<typeof aparikInquirySchema>;

export function parseAparikInquiryBody(body: unknown): AparikInquiryInput {
  return aparikInquirySchema.parse(body);
}
