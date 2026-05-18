/**
 * Public site URL for links in emails (reset password, etc.).
 */
export function getAppUrl(): string {
  const url =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "");

  if (!url) {
    throw new Error("APP_URL is not configured");
  }

  return url.replace(/\/$/, "");
}
