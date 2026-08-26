import { getAparikNotificationEmail as readAparikNotificationEmail } from "@/config/env";
import { AppError } from "@/lib/errors/app-error";

/** Recipient for installment (aparik) checkout notifications. */
export function getAparikNotificationEmail(): string {
  const email = readAparikNotificationEmail();
  if (!email) {
    throw AppError.serviceUnavailable();
  }
  return email;
}
