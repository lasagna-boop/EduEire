import { logout } from "../lib/auth";

export function useLogout() {
  return async () => {
    try {
      await logout();
    } catch (e) {
      console.error("Logout failed", e);
    }
  };
}
