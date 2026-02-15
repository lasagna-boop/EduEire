// small wrapper around firebase auth so ui components don't import firebase directly
// keeps auth logic in one place and avoids spreading sdk calls across the app

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth } from "./firebase";

// creates a new user in firebase auth
// optionally sets displayName right after registration
export async function register(email: string, password: string, displayName?: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);

  // if a display name is provided, update the firebase user profile
  if (displayName) await updateProfile(cred.user, { displayName });

  // return the firebase user object so ui can use uid/displayName/etc
  return cred.user;
}

// signs in an existing user using email + password
export async function login(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);

  // return the firebase user instance
  return cred.user;
}

// signs the current user out
// auth state change will be picked up by authcontext automatically
export async function logout() {
  await signOut(auth);
}