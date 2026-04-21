import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import {
  basePublicHandleFromUser,
  isValidPublicHandle,
  resolveUniquePublicHandle,
} from "./publicProfileRoute";
import { sanitizeUserLine } from "./inputSanitizer";

export type AccessMode = "full" | "read_only";

export const STUDENT_EMAIL_DOMAINS = [
  "dcu.ie",
  "mumail.ie",
  "mytudublin.ie",
  "ncirl.ie",
  "rcsi.ie",
  "studentmail.ul.ie",
  "tcd.ie",
  "ucdconnect.ie",
  /** UCC student Umail (Google Workspace); staff may use @ucc.ie */
  "ucc.ie",
  "umail.ucc.ie",
  "universityofgalway.ie",
] as const;

export type UserAccessProfile = {
  studentEmailConfirmed: boolean;
  accessMode: AccessMode;
};

export type UserCredibilityFields = {
  approvedPostsCount: number;
  approvedCommentsCount: number;
  rejectedContentCount: number;
  pendingReviewCount: number;
  cumulativeCommentScore: number;
  cumulativeThreadScore: number;
  helpfulMarksCount: number;
  totalThreadsCount: number;
  totalCommentsCount: number;
  lastContributionAt: unknown;
  activeDays30d: number;
  reportsAgainstCount: number;
  confirmedReportsCount: number;
  credibilityModelVersion: string;
  credibilityScoreCached: number;
  credibilityScoreUpdatedAt: unknown;
};

function getEmailDomain(email?: string | null): string {
  if (!email) return "";
  const trimmed = email.trim().toLowerCase();
  const atIndex = trimmed.lastIndexOf("@");
  if (atIndex === -1) return "";
  return trimmed.slice(atIndex + 1);
}

export function isStudentEmail(email?: string | null): boolean {
  const domain = getEmailDomain(email);
  return STUDENT_EMAIL_DOMAINS.includes(domain as (typeof STUDENT_EMAIL_DOMAINS)[number]);
}

export function deriveAccessFromEmail(email?: string | null): UserAccessProfile {
  const studentEmailConfirmed = isStudentEmail(email);
  return {
    studentEmailConfirmed,
    accessMode: studentEmailConfirmed ? "full" : "read_only",
  };
}

export async function ensureUserProfile(params: {
  uid: string;
  email?: string | null;
  displayName?: string | null;
}): Promise<UserAccessProfile> {
  const { uid, email, displayName } = params;
  const safeDisplayName = sanitizeUserLine(displayName ?? "", 80) || null;
  const userRef = doc(db, "users", uid);
  const existing = await getDoc(userRef);
  const access = deriveAccessFromEmail(email);

  const prev = existing.exists() ? existing.data() : {};
  const prevHandle = typeof prev.publicHandle === "string" ? prev.publicHandle : null;
  let publicHandle = prevHandle;
  if (!publicHandle || !isValidPublicHandle(publicHandle)) {
    const base = basePublicHandleFromUser(email, safeDisplayName);
    publicHandle = await resolveUniquePublicHandle(uid, base);
  }

  await setDoc(
    userRef,
    {
      displayName: safeDisplayName,
      publicHandle,
      studentEmailConfirmed: access.studentEmailConfirmed,
      accessMode: access.accessMode,
      updatedAt: serverTimestamp(),
      ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true }
  );

  return access;
}

export async function getUserAccessProfile(userId: string): Promise<UserAccessProfile> {
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) {
    return { studentEmailConfirmed: false, accessMode: "read_only" };
  }

  const data = snap.data() as Partial<UserAccessProfile> & { email?: string | null };
  if (
    typeof data.studentEmailConfirmed === "boolean" &&
    (data.accessMode === "full" || data.accessMode === "read_only")
  ) {
    return {
      studentEmailConfirmed: data.studentEmailConfirmed,
      accessMode: data.accessMode,
    };
  }

  return deriveAccessFromEmail(data.email);
}
