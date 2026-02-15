// src/context/AuthContext.tsx
// provides firebase auth state (user + loading) to the whole app

import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../lib/firebase";

type AuthCtx = { user: User | null; loading: boolean };

const AuthContext = createContext<AuthCtx>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // listen for login/logout/refresh and keep context in sync
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    // clean up listener when provider unmounts
    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// small helper hook so components can access auth state easily
export function useAuth() {
  return useContext(AuthContext);
}