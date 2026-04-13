import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "./firebase";

const HANDLE_RE = /^[a-z0-9][a-z0-9._-]{1,29}$/;

export function isValidPublicHandle(s: string): boolean {
  return HANDLE_RE.test(s);
}

/** Derive a base slug (before uniqueness). */
export function basePublicHandleFromUser(
  email?: string | null,
  displayName?: string | null,
): string {
  if (email?.includes("@")) {
    const local = email.split("@")[0].trim().toLowerCase();
    const s = local.replace(/[^a-z0-9._-]/g, "").slice(0, 24);
    if (s.length >= 2) return s;
  }
  if (displayName?.trim()) {
    const s = displayName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9._-]/g, "")
      .slice(0, 24);
    if (s.length >= 2) return s;
  }
  return "member";
}

/**
 * Pick a unique publicHandle for this uid (Firestore users.publicHandle).
 */
export async function resolveUniquePublicHandle(uid: string, base: string): Promise<string> {
  const normalized = base.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 24) || "member";
  const candidates = [
    normalized,
    `${normalized}-${uid.slice(-4)}`,
    `${normalized}-${uid.slice(-6)}`,
    `u-${uid.slice(-8)}`,
    `id${uid.replace(/[^a-zA-Z0-9]/g, "").slice(-12)}`.toLowerCase(),
  ];
  for (const c of candidates) {
    if (c.length < 2 || c.length > 30) continue;
    if (!HANDLE_RE.test(c)) continue;
    const q = query(collection(db, "users"), where("publicHandle", "==", c), limit(5));
    const snap = await getDocs(q);
    const conflict = snap.docs.some((d) => d.id !== uid);
    if (!conflict) return c;
  }
  const alnum = uid.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const tail = (alnum.length >= 8 ? alnum.slice(-14) : uid.replace(/[^a-zA-Z0-9]/g, "")).toLowerCase();
  const fallback = `u${tail}`.slice(0, 30);
  return HANDLE_RE.test(fallback) ? fallback : `user${uid.slice(0, 10)}`.toLowerCase().replace(/[^a-z0-9]/g, "x");
}

/**
 * URL segment is either Firebase uid (document id) or publicHandle.
 */
export async function resolveProfileKeyToUid(profileKey: string): Promise<string | null> {
  const trimmed = profileKey.trim();
  if (!trimmed) return null;

  const byId = await getDoc(doc(db, "users", trimmed));
  if (byId.exists()) return trimmed;

  const handle = trimmed.toLowerCase();
  const q = query(collection(db, "users"), where("publicHandle", "==", handle), limit(5));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].id;
}
