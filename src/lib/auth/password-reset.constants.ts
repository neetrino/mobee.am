/** Password reset link lifetime (token in DB and email text must stay in sync). */
export const PASSWORD_RESET_LINK_VALIDITY_HOURS = 24;

export const PASSWORD_RESET_EXPIRY_MS =
  PASSWORD_RESET_LINK_VALIDITY_HOURS * 60 * 60 * 1000;

/** Generic response — do not reveal whether the email exists. */
export const PASSWORD_RESET_REQUEST_MESSAGE =
  "If an account exists for this email, you will receive password reset instructions shortly.";
