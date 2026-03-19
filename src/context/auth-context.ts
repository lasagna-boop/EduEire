import { createContext } from "react";
import type { User } from "firebase/auth";
import type { AccessMode } from "../lib/userAccess";

export type AuthCtx = {
  user: User | null;
  loading: boolean;
  accessMode: AccessMode;
  studentEmailConfirmed: boolean;
  canWrite: boolean;
};

export const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: true,
  accessMode: "read_only",
  studentEmailConfirmed: false,
  canWrite: false,
});
