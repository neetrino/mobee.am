/** Recipient for installment (aparik) checkout notifications. */
export function getAparikNotificationEmail(): string {
  const email = process.env.APARIK_NOTIFICATION_EMAIL?.trim();
  if (!email) {
    throw new Error("APARIK_NOTIFICATION_EMAIL is not configured");
  }
  return email;
}
