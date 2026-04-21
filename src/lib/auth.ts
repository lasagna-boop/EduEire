// small wrapper around firebase auth so ui components don't import firebase directly
// keeps auth logic in one place and avoids spreading sdk calls across the app

import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth } from "./firebase";
import { validatePasswordPolicy } from "./passwordPolicy";
import { ensureUserProfile } from "./userAccess";
import { sanitizeUserEmail } from "./inputSanitizer";

// creates a new user in firebase auth
// optionally sets displayName right after registration
export async function register(email: string, password: string, displayName?: string) {
  const normalizedEmail = sanitizeUserEmail(email);
  const pw = validatePasswordPolicy(password);
  if (!pw.ok) throw new Error(pw.message);

  // Duplicate email: prefer explicit check; if project enables email enumeration protection
  // this may return [] and Firebase still rejects create with auth/email-already-in-use.
  const methods = await fetchSignInMethodsForEmail(auth, normalizedEmail);
  if (methods.includes("password")) {
    throw new Error(
      "This email is already registered. Use Log In or another address."
    );
  }
  if (methods.length > 0) {
    throw new Error(
      "This email is already linked to another sign-in method. Use that provider to sign in."
    );
  }

  const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);

  // if a display name is provided, update the firebase user profile
  if (displayName) await updateProfile(cred.user, { displayName });

  // keep users/{uid} in sync with access mode flags
  await ensureUserProfile({
    uid: cred.user.uid,
    email: cred.user.email ?? normalizedEmail,
    displayName: displayName || cred.user.displayName,
  });

  // return the firebase user object so ui can use uid/displayName/etc
  return cred.user;
}

// signs in an existing user using email + password
export async function login(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, sanitizeUserEmail(email), password);

  // return the firebase user instance
  return cred.user;
}

// signs the current user out
// auth state change will be picked up by authcontext automatically
export async function logout() {
  await signOut(auth);
}