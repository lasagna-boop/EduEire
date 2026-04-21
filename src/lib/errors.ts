import { FirebaseError } from "firebase/app";

const FIREBASE_AUTH_MESSAGES: Record<string, string> = {
  "auth/email-already-in-use":
    "This email is already registered. Use Log In or another address.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/weak-password":
    "Password is too weak for Firebase. Use at least 8 characters with upper, lower, and a digit.",
  "auth/user-not-found": "No account found for this email.",
  "auth/wrong-password": "Incorrect password.",
  "auth/invalid-credential": "Invalid email or password.",
  "auth/invalid-login-credentials": "Invalid email or password.",
  "auth/too-many-requests": "Too many attempts. Try again later.",
  "auth/network-request-failed": "Network error. Check your connection.",
};

/** Safe message from thrown values (Firebase Auth codes mapped to friendly text). */
export function errorMessage(e: unknown): string {
  if (e instanceof FirebaseError && e.code && FIREBASE_AUTH_MESSAGES[e.code]) {
    return FIREBASE_AUTH_MESSAGES[e.code];
  }
  if (e instanceof Error) return e.message;
  return String(e);
}
