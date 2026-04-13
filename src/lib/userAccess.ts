import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import {
  basePublicHandleFromUser,
  isValidPublicHandle,
  resolveUniquePublicHandle,
} from "./publicProfileRoute";

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
  "ucc.ie",
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

function defaultCredibilityFields(): UserCredibilityFields {
  return {
    approvedPostsCount: 0,
    approvedCommentsCount: 0,
    rejectedContentCount: 0,
    pendingReviewCount: 0,
    cumulativeCommentScore: 0,
    cumulativeThreadScore: 0,
    helpfulMarksCount: 0,
    totalThreadsCount: 0,
    totalCommentsCount: 0,
    lastContributionAt: null,
    activeDays30d: 0,
    reportsAgainstCount: 0,
    confirmedReportsCount: 0,
    credibilityModelVersion: "v1",
    credibilityScoreCached: 0,
    credibilityScoreUpdatedAt: null,
  };
}

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
  const userRef = doc(db, "users", uid);
  const existing = await getDoc(userRef);
  const access = deriveAccessFromEmail(email);

  const prev = existing.exists() ? existing.data() : {};
  const prevHandle = typeof prev.publicHandle === "string" ? prev.publicHandle : null;
  let publicHandle = prevHandle;
  if (!publicHandle || !isValidPublicHandle(publicHandle)) {
    const base = basePublicHandleFromUser(email, displayName);
    publicHandle = await resolveUniquePublicHandle(uid, base);
  }

  await setDoc(
    userRef,
    {
      email: email ?? null,
      displayName: displayName ?? null,
      publicHandle,
      studentEmailConfirmed: access.studentEmailConfirmed,
      accessMode: access.accessMode,
      ...(!existing.exists() ? defaultCredibilityFields() : {}),
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
