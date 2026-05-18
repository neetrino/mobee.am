import { getAppUrl } from "./app-url";
import { getResendClient, getResendFromEmail } from "./resend-client";
import { logger } from "../utils/logger";
import { PASSWORD_RESET_LINK_VALIDITY_HOURS } from "../auth/password-reset.constants";

const PASSWORD_RESET_EXPIRY_LABEL = `${PASSWORD_RESET_LINK_VALIDITY_HOURS} hours`;

function buildResetPasswordHtml(resetUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111827;max-width:480px;margin:0 auto;padding:24px">
  <h1 style="font-size:20px;margin:0 0 16px">Reset your password</h1>
  <p style="margin:0 0 16px">We received a request to reset your password. Click the button below to choose a new password.</p>
  <p style="margin:0 0 24px">
    <a href="${resetUrl}" style="display:inline-block;background:#2DB2FF;color:#fff;text-decoration:none;padding:12px 24px;border-radius:12px;font-weight:600">Reset password</a>
  </p>
  <p style="margin:0 0 8px;font-size:14px;color:#6b7280">This link expires in ${PASSWORD_RESET_EXPIRY_LABEL}. If you did not request this, you can ignore this email.</p>
  <p style="margin:0;font-size:12px;color:#9ca3af;word-break:break-all">${resetUrl}</p>
</body>
</html>`.trim();
}

function buildResetPasswordText(resetUrl: string): string {
  return [
    "Reset your password",
    "",
    "We received a request to reset your password. Open the link below to choose a new password:",
    resetUrl,
    "",
    `This link expires in ${PASSWORD_RESET_EXPIRY_LABEL}. If you did not request this, you can ignore this email.`,
  ].join("\n");
}

export async function sendPasswordResetEmail(
  to: string,
  rawToken: string
): Promise<void> {
  const resetUrl = `${getAppUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const html = buildResetPasswordHtml(resetUrl);
  const text = buildResetPasswordText(resetUrl);

  if (process.env.NODE_ENV === "development" && !process.env.RESEND_API_KEY?.trim()) {
    logger.warn("Password reset email skipped (RESEND_API_KEY missing)", {
      to,
      resetUrl,
    });
    return;
  }

  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: getResendFromEmail(),
    to,
    subject: "Reset your password",
    html,
    text,
  });

  if (error) {
    logger.error("Failed to send password reset email", { error, to });
    throw new Error(error.message || "Failed to send email");
  }

  logger.info("Password reset email sent", { to });
}
