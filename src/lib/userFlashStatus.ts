import {
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { moderateContentV2 } from "./moderation";

export const USER_FLASH_STATUS_MAX_CHARS = 120;
export const USER_PROFILE_BIO_MAX_CHARS = 200;

const FLASH_MS = 24 * 60 * 60 * 1000;

export type UserFlashStatusSnapshot = {
  text: string;
  expiresAt: unknown | null;
};

export type UserProfileStatusSnapshot = {
  profileBio: string;
  flash: UserFlashStatusSnapshot;
};

export async function fetchUserProfileStatus(uid: string): Promise<UserProfileStatusSnapshot> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) {
    return { profileBio: "", flash: { text: "", expiresAt: null } };
  }
  const data = snap.data();
  const bio = typeof data.profileBio === "string" ? data.profileBio.trim() : "";
  const raw = typeof data.statusFlashText === "string" ? data.statusFlashText : "";
  return {
    profileBio: bio,
    flash: { text: raw.trim(), expiresAt: data.statusFlashExpiresAt ?? null },
  };
}

export async function fetchUserFlashStatus(uid: string): Promise<UserFlashStatusSnapshot> {
  const s = await fetchUserProfileStatus(uid);
  return s.flash;
}

export async function setUserFlashStatus(uid: string, rawText: string): Promise<void> {
  const text = rawText.trim();
  if (!text) {
    await clearUserFlashStatus(uid);
    return;
  }
  if (text.length > USER_FLASH_STATUS_MAX_CHARS) {
    throw new Error(`Status must be at most ${USER_FLASH_STATUS_MAX_CHARS} characters.`);
  }
  const mod = moderateContentV2(text, "");
  if (mod.flagged) {
    throw new Error("Your status contains inappropriate language and cannot be saved.");
  }
  const expires = new Date(Date.now() + FLASH_MS);
  await updateDoc(doc(db, "users", uid), {
    statusFlashText: text,
    statusFlashExpiresAt: Timestamp.fromDate(expires),
    updatedAt: serverTimestamp(),
  });
}

export async function clearUserFlashStatus(uid: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    statusFlashText: deleteField(),
    statusFlashExpiresAt: deleteField(),
    updatedAt: serverTimestamp(),
  });
}

export async function setUserProfileBio(uid: string, rawText: string): Promise<void> {
  const text = rawText.trim();
  if (!text) {
    await clearUserProfileBio(uid);
    return;
  }
  if (text.length > USER_PROFILE_BIO_MAX_CHARS) {
    throw new Error(`Profile line must be at most ${USER_PROFILE_BIO_MAX_CHARS} characters.`);
  }
  const mod = moderateContentV2(text, "");
  if (mod.flagged) {
    throw new Error("Your profile line contains inappropriate language and cannot be saved.");
  }
  await updateDoc(doc(db, "users", uid), {
    profileBio: text,
    updatedAt: serverTimestamp(),
  });
}

export async function clearUserProfileBio(uid: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    profileBio: deleteField(),
    updatedAt: serverTimestamp(),
  });
}
