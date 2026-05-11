import { z } from "zod";

/** Maps null, undefined, and whitespace-only strings to undefined so `.optional()` matches client `""` payloads. */
function emptyOptionalStringToUndefined(value: unknown): unknown {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

const optionalTrimmedString = (maxLength: number) =>
  z.preprocess(
    emptyOptionalStringToUndefined,
    z.string().min(1).max(maxLength).optional()
  );

const countryCodeSchema = z.string().trim().length(2).toUpperCase();

const profileUpdateSchema = z
  .object({
    firstName: optionalTrimmedString(64),
    lastName: optionalTrimmedString(64),
    locale: z.string().trim().min(2).max(10).optional(),
  })
  .strict();

const addressFieldsSchema = z
  .object({
    firstName: optionalTrimmedString(64),
    lastName: optionalTrimmedString(64),
    company: optionalTrimmedString(128),
    addressLine1: z.string().trim().min(1).max(255),
    addressLine2: optionalTrimmedString(255),
    city: z.string().trim().min(1).max(128),
    state: optionalTrimmedString(128),
    postalCode: optionalTrimmedString(32),
    countryCode: countryCodeSchema,
    phone: optionalTrimmedString(32),
    isDefault: z.boolean().optional(),
  })
  .strict();

const addressCreateSchema = addressFieldsSchema.extend({
  countryCode: countryCodeSchema.default("AM"),
});

const addressUpdateSchema = addressFieldsSchema.partial().refine(
  (value) => Object.values(value).some((field) => field !== undefined),
  {
    message: "At least one field is required",
  }
);

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type AddressCreateInput = z.infer<typeof addressCreateSchema>;
export type AddressUpdateInput = z.infer<typeof addressUpdateSchema>;

export function safeParseProfileUpdate(body: unknown): ReturnType<typeof profileUpdateSchema.safeParse> {
  return profileUpdateSchema.safeParse(body);
}

export function safeParseAddressCreate(body: unknown): ReturnType<typeof addressCreateSchema.safeParse> {
  return addressCreateSchema.safeParse(body);
}

export function safeParseAddressUpdate(body: unknown): ReturnType<typeof addressUpdateSchema.safeParse> {
  return addressUpdateSchema.safeParse(body);
}
