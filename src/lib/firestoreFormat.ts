import type { Thread } from "./firestore";

export function parseFirestoreDate(raw: unknown): Date {
  if (
    typeof raw === "object" &&
    raw !== null &&
    "toDate" in raw &&
    typeof (raw as { toDate: () => Date }).toDate === "function"
  ) {
    return (raw as { toDate: () => Date }).toDate();
  }
  return new Date(raw as string | number);
}

/** YYYY-MM-DD for post meta */
export function formatFirestoreDay(ts: unknown): string {
  try {
    return parseFirestoreDate(ts).toISOString().slice(0, 10);
  } catch {
    return "just now";
  }
}

/** Short relative time for comments */
export function timeAgoFromFirestore(ts: unknown): string {
  try {
    const date = parseFirestoreDate(ts);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return date.toISOString().slice(0, 10);
  } catch {
    return "just now";
  }
}

function flashStillActive(flashExpiresAt: unknown, now: number): boolean {
  if (flashExpiresAt == null) return true;
  try {
    return parseFirestoreDate(flashExpiresAt).getTime() > now;
  } catch {
    return true;
  }
}

/** Feed / community list: hide non-approved and expired flash */
export function threadVisibleInFeed(t: Thread, now: number): boolean {
  if (t.moderationStatus && t.moderationStatus !== "approved") return false;
  return flashStillActive(t.flashExpiresAt, now);
}

/** Profile: hide rejected; flash expiry same as feed */
export function threadVisibleOnProfile(t: Thread, now: number): boolean {
  if (t.moderationStatus === "rejected") return false;
  return flashStillActive(t.flashExpiresAt, now);
}
