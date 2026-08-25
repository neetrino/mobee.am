import { Resend } from "resend";
import { requireEmailConfig } from "@/config/env";

let resendInstance: Resend | null = null;

export function getResendClient(): Resend {
  const { apiKey } = requireEmailConfig();
  if (!resendInstance) {
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

export function getResendFromEmail(): string {
  return requireEmailConfig().from;
}
