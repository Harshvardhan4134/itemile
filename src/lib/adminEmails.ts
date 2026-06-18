/**
 * Optional client-side admin email hint (route gating uses JWT claims in useAuthRole).
 * Set VITE_ADMIN_EMAILS in .env as comma-separated list, e.g.:
 * VITE_ADMIN_EMAILS=you@itemile.com,ops@itemile.com
 */
const fromEnv =
  import.meta.env.VITE_ADMIN_EMAILS?.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean) ?? [];

export const ADMIN_EMAILS = fromEnv;

export const isAdminEmail = (email?: string | null): boolean =>
  typeof email === "string" && ADMIN_EMAILS.includes(email.toLowerCase());
