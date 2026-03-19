// Auth provider + context value (hook lives in useAuth.ts for react-refresh / ESLint)

import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import { auth } from "../lib/firebase";
import { ensureUserProfile, type AccessMode } from "../lib/userAccess";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessMode, setAccessMode] = useState<AccessMode>("read_only");
  const [studentEmailConfirmed, setStudentEmailConfirmed] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setLoading(true);
      setUser(u);
      if (!u) {
        setAccessMode("read_only");
        setStudentEmailConfirmed(false);
        setLoading(false);
        return;
      }

      try {
        const access = await ensureUserProfile({
          uid: u.uid,
          email: u.email,
          displayName: u.displayName,
        });
        setAccessMode(access.accessMode);
        setStudentEmailConfirmed(access.studentEmailConfirmed);
      } catch (e) {
        console.error("Failed to load user access profile", e);
        setAccessMode("read_only");
        setStudentEmailConfirmed(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      accessMode,
      studentEmailConfirmed,
      canWrite: accessMode === "full",
    }),
    [user, loading, accessMode, studentEmailConfirmed]
  );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}
