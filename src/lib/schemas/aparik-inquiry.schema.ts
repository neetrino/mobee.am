import { z } from 'zod';
import { APARIK_BANK_IDS } from '@/lib/aparik/banks.constants';
import { APARIK_DOCUMENT_TYPE_IDS } from '@/lib/aparik/document-types.constants';

const currencySchema = z.enum(['USD', 'AMD', 'EUR', 'RUB', 'GEL']);

export const aparikInquiryFieldsSchema = z.object({
  productId: z.string().trim().min(1, 'productId is required'),
  productSlug: z.string().trim().min(1, 'productSlug is required'),
  productTitle: z.string().trim().min(1, 'productTitle is required'),
  productPrice: z.coerce.number().finite().nonnegative(),
  currency: currencySchema,
  productImageUrl: z.string().trim().optional(),
  color: z.string().trim().optional(),
  colorHex: z.string().trim().optional(),
  variantTitle: z.string().trim().optional(),
  sku: z.string().trim().optional(),
  firstName: z.string().trim().min(1, 'firstName is required'),
  lastName: z.string().trim().min(1, 'lastName is required'),
  email: z.string().trim().min(1, 'email is required').email('invalid email'),
  phone: z
    .string()
    .trim()
    .min(1, 'phone is required')
    .regex(/^[0-9]{8,15}$/, 'invalid phone'),
  bankId: z.enum(APARIK_BANK_IDS),
  acceptedTerms: z.literal(true),
});

export const aparikDocumentMetaSchema = z.object({
  type: z.enum(APARIK_DOCUMENT_TYPE_IDS),
  filename: z.string().trim().min(1).max(180),
});

/** @deprecated Prefer aparikInquiryFieldsSchema + multipart documents. */
export const aparikInquirySchema = aparikInquiryFieldsSchema;

export type AparikInquiryFieldsInput = z.infer<typeof aparikInquiryFieldsSchema>;
export type AparikInquiryInput = AparikInquiryFieldsInput;

export function parseAparikInquiryFields(body: unknown): AparikInquiryFieldsInput {
  return aparikInquiryFieldsSchema.parse(body);
}

/** @deprecated Use parseAparikInquiryFields. */
export function parseAparikInquiryBody(body: unknown): AparikInquiryInput {
  return parseAparikInquiryFields(body);
}
