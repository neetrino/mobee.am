import * as crypto from "crypto";
import * as bcrypt from "bcryptjs";
import { db } from "@white-shop/db";
import { sendPasswordResetEmail } from "@/lib/email/send-password-reset-email";
import {
  PASSWORD_RESET_EXPIRY_MS,
} from "@/lib/auth/password-reset.constants";
import { logger } from "@/lib/utils/logger";

const TOKEN_BYTES = 32;
const MIN_PASSWORD_LENGTH = 6;

/**
 * Request password reset: create token, save to user, send email.
 * Only for users with email and passwordHash. Does not reveal whether email exists.
 */
export async function requestPasswordReset(email: string): Promise<{ ok: true }> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw {
      status: 400,
      type: "https://api.shop.am/problems/validation-error",
      title: "Validation failed",
      detail: "Email is required",
    };
  }

  const user = await db.user.findFirst({
    where: {
      email: { equals: normalizedEmail, mode: "insensitive" },
      deletedAt: null,
      passwordHash: { not: null },
    },
    select: { id: true, email: true },
  });

  if (!user?.email) {
    return { ok: true };
  }

  const token = crypto.randomBytes(TOKEN_BYTES).toString("hex");
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS);

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: token,
      passwordResetExpires: expiresAt,
    },
  });

  try {
    await sendPasswordResetEmail(user.email, token);
  } catch (error) {
    logger.error("Password reset email failed", { error, userId: user.id });
    await db.user.update({
      where: { id: user.id },
      data: { passwordResetToken: null, passwordResetExpires: null },
    });
    throw {
      status: 500,
      type: "https://api.shop.am/problems/internal-error",
      title: "Failed to send email",
      detail: "Could not send password reset email. Try again later.",
    };
  }

  return { ok: true };
}

/**
 * Check if reset token is valid (exists and not expired). Does not consume the token.
 */
export async function validateResetToken(token: string): Promise<{ valid: boolean }> {
  const trimmedToken = token?.trim();
  if (!trimmedToken) {
    return { valid: false };
  }

  const user = await db.user.findFirst({
    where: {
      passwordResetToken: trimmedToken,
      passwordResetExpires: { gt: new Date() },
      deletedAt: null,
    },
    select: { id: true },
  });

  return { valid: !!user };
}

/**
 * Reset password using token from email link.
 */
export async function resetPasswordByToken(
  token: string,
  newPassword: string
): Promise<{ ok: true }> {
  const trimmedToken = token?.trim();
  if (!trimmedToken) {
    throw {
      status: 400,
      type: "https://api.shop.am/problems/validation-error",
      title: "Validation failed",
      detail: "Token is required",
    };
  }

  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    throw {
      status: 400,
      type: "https://api.shop.am/problems/validation-error",
      title: "Validation failed",
      detail: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    };
  }

  const user = await db.user.findFirst({
    where: {
      passwordResetToken: trimmedToken,
      passwordResetExpires: { gt: new Date() },
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!user) {
    throw {
      status: 400,
      type: "https://api.shop.am/problems/validation-error",
      title: "Invalid or expired link",
      detail: "This reset link is invalid or has expired. Request a new one.",
    };
  }

  const passwordHash = await bcrypt.hash(newPassword.trim(), 10);
  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });

  logger.info("Password reset completed", { userId: user.id });
  return { ok: true };
}
