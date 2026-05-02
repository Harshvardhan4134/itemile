import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { isAdminEmail } from "@/lib/adminEmails";

export type AuthRole = "admin" | "moderator" | "user" | null;

interface UseAuthRoleState {
  user: User | null;
  role: AuthRole;
  loading: boolean;
}

const resolveRoleFromClaims = (claims: Record<string, unknown>): AuthRole => {
  const value = claims?.role;
  if (value === "admin" || value === "moderator" || value === "user") {
    return value;
  }
  return null;
};

export const useAuthRole = (): UseAuthRoleState => {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [role, setRole] = useState<AuthRole>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (current) => {
      if (!active) return;

      setUser(current);

      if (!current) {
        setRole(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const tokenResult = await current.getIdTokenResult();
        const fromClaims = resolveRoleFromClaims(tokenResult.claims ?? {});
        const resolvedRole = isAdminEmail(current.email)
          ? "admin"
          : fromClaims;
        setRole(resolvedRole);
      } catch (error) {
        console.warn("Failed to resolve auth role", error);
        setRole(null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return { user, role, loading };
};


