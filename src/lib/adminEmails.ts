/** Emails allowed to use the admin panel (JWT claim optional). Keep in sync with Firestore rules if you mirror this server-side. */
export const ADMIN_EMAILS = [
  "rentshare11@gmail.com",
  "admin@rentshare.com",
  "gharsha238@gmail.com",
].map((email) => email.toLowerCase());

export const isAdminEmail = (email?: string | null): boolean =>
  typeof email === "string" && ADMIN_EMAILS.includes(email.toLowerCase());
