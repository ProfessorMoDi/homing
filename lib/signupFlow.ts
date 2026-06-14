/** sessionStorage key — one-shot banner on /voice after email link send. */
export const SIGNUP_LINK_SENT_KEY = "homing-signup-link-sent";

/**
 * sessionStorage key — set when signup detects the email already has an
 * account and redirects to /login. /login reads it to prefill the address and
 * show a "you already have an account" notice, then clears it.
 */
export const RETURNING_EMAIL_KEY = "homing-returning-email";
