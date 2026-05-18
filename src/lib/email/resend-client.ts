import { Resend } from "resend";

let resendInstance: Resend | null = null;

export function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  if (!resendInstance) {
    resendInstance = new Resend(apiKey);
  }

  return resendInstance;
}

export function getResendFromEmail(): string {
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    process.env.EMAIL_FROM?.trim();

  if (!from) {
    throw new Error("RESEND_FROM_EMAIL is not configured");
  }

  return from;
}
