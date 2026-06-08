import { z } from "zod";

const USER_ROLE_VALUES = ["admin", "customer"] as const;

export const adminUserUpdateSchema = z
  .object({
    blocked: z.boolean().optional(),
    roles: z.array(z.enum(USER_ROLE_VALUES)).min(1).optional(),
  })
  .strict()
  .refine(
    (data) => data.blocked !== undefined || data.roles !== undefined,
    { message: "At least one of blocked or roles is required" }
  );

export type AdminUserUpdateInput = z.infer<typeof adminUserUpdateSchema>;

export function safeParseAdminUserUpdate(
  body: unknown
): ReturnType<typeof adminUserUpdateSchema.safeParse> {
  return adminUserUpdateSchema.safeParse(body);
}
