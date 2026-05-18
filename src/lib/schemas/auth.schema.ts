import { z } from "zod";

const emptyToUndefined = (value: unknown): unknown =>
  value === "" || value === null ? undefined : value;

const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z
  .object({
    email: z.preprocess(emptyToUndefined, z.string().email().optional()),
    phone: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    password: z.string().min(6, "Password must be at least 6 characters"),
    firstName: z.preprocess(emptyToUndefined, z.string().optional()),
    lastName: z.preprocess(emptyToUndefined, z.string().optional()),
  })
  .refine((data) => data.email ?? data.phone, {
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

const forgotPasswordSchema = z.object({
  email: z.string().email("Valid email is required"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export function safeParseForgotPassword(
  body: unknown
): ReturnType<typeof forgotPasswordSchema.safeParse> {
  return forgotPasswordSchema.safeParse(body);
}

export function safeParseResetPassword(
  body: unknown
): ReturnType<typeof resetPasswordSchema.safeParse> {
  return resetPasswordSchema.safeParse(body);
}
