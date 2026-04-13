import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(1).optional(),
  password: z.string().min(1, "Password is required"),
}).refine((data) => data.email ?? data.phone, {
  message: "Either email or phone is required",
  path: ["email"],
});

const registerSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(1).optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
}).refine((data) => data.email ?? data.phone, {
  message: "Either email or phone is required",
  path: ["email"],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

export function parseLoginBody(body: unknown): LoginInput {
  return loginSchema.parse(body);
}

export function parseRegisterBody(body: unknown): RegisterInput {
  return registerSchema.parse(body);
}

export function safeParseLogin(body: unknown): ReturnType<typeof loginSchema.safeParse> {
  return loginSchema.safeParse(body);
}

export function safeParseRegister(body: unknown): ReturnType<typeof registerSchema.safeParse> {
  return registerSchema.safeParse(body);
}
