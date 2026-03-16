// src/context/AuthContext.tsx
// provides firebase auth state (user + loading) to the whole app

import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import { ensureUserProfile, type AccessMode } from "../lib/userAccess";

type AuthCtx = {
  user: User | null;
  loading: boolean;
  accessMode: AccessMode;
  studentEmailConfirmed: boolean;
  canWrite: boolean;
};

const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: true,
  accessMode: "read_only",
  studentEmailConfirmed: false,
  canWrite: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessMode, setAccessMode] = useState<AccessMode>("read_only");
  const [studentEmailConfirmed, setStudentEmailConfirmed] = useState(false);

  // listen for login/logout/refresh and keep context in sync
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

    // clean up listener when provider unmounts
    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        accessMode,
        studentEmailConfirmed,
        canWrite: accessMode === "full",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// small helper hook so components can access auth state easily
export function useAuth() {
  return useContext(AuthContext);
}