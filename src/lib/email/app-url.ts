import { getAppBaseUrl } from "@/config/env";
import { AppError } from "@/lib/errors/app-error";

/**
 * Public site URL for links in emails (reset password, etc.).
 */
export function getAppUrl(): string {
  const url =
    getAppBaseUrl() ||
    (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "");

  if (!url) {
    throw AppError.serviceUnavailable();
  }

  return url.replace(/\/$/, "");
}
