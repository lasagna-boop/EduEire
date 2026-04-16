// src/lib/firestore.ts
// firestore helpers for threads, posts, communities, and subscriptions

import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  startAfter,
} from "firebase/firestore";
import type { DocumentData, QueryConstraint, QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { getUserAccessProfile } from "./userAccess";
import { hasReadOnlyAllowedTag } from "./sectionAccess";
import { voteScoreDelta } from "./voteScoreDelta";

function firestoreMillis(ts: unknown): number {
  if (
    typeof ts === "object" &&
    ts !== null &&
    "toMillis" in ts &&
    typeof (ts as { toMillis: () => number }).toMillis === "function"
  ) {
    return (ts as { toMillis: () => number }).toMillis();
  }
  return 0;
}

function getDublinWeekKey(now: Date = new Date()): string {
  // Week resets at Sunday 00:00 Europe/Dublin. We use a "week key" equal to the
  // Dublin-local date (YYYY-MM-DD) of the most recent Sunday.
  // This avoids tricky DST math and is stable across clients.
  const tz = "Europe/Dublin";

  const getDublinDateKey = (d: Date) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(d);
    const year = parts.find((p) => p.type === "year")?.value ?? "0000";
    const month = parts.find((p) => p.type === "month")?.value ?? "00";
    const day = parts.find((p) => p.type === "day")?.value ?? "00";
    return `${year}-${month}-${day}`;
  };

  const getDublinWeekday = (d: Date): number => {
    // returns 0..6 where 0 is Sunday
    const wd = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(d);
    switch (wd) {
      case "Sun":
        return 0;
      case "Mon":
        return 1;
      case "Tue":
        return 2;
      case "Wed":
        return 3;
      case "Thu":
        return 4;
      case "Fri":
        return 5;
      case "Sat":
        return 6;
      default:
        return 0;
    }
  };

  // Walk back to the most recent Sunday in Dublin-local calendar.
  let cursor = now;
  for (let i = 0; i < 7; i++) {
    if (getDublinWeekday(cursor) === 0) break;
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
  }

  return getDublinDateKey(cursor);
}

// ==================== COMMUNITIES ====================

export type Community = {
  id: string;
  name: string;
  fullName: string;
  description: string;
  memberCount: number;
  createdAt?: unknown;
};

// get a single community by ID
export async function getCommunity(communityId: string): Promise<Community | null> {
  const snap = await getDoc(doc(db, "communities", communityId));
  if (!snap.exists()) return null;
  const data = snap.data() as Omit<Community, "id">;
  return { id: snap.id, ...data };
}

// list all communities
export async function listCommunities(): Promise<Community[]> {
  const q = query(collection(db, "communities"), orderBy("name", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as Omit<Community, "id">;
    return { id: d.id, ...data };
  });
}

// create a community (used for seeding)

type CommunitySeed = Pick<Community, "id" | "name" | "fullName" | "description">;

/** Default Irish university communities (Firestore doc id = `id`) */
export const DEFAULT_COMMUNITY_SEEDS: readonly CommunitySeed[] = [
  {
    id: "tud",
    name: "TUD",
    fullName: "Technological University Dublin",
    description: "Community for TU Dublin students and staff",
  },
  {
    id: "trinity",
    name: "Trinity",
    fullName: "Trinity College Dublin",
    description: "Community for Trinity College Dublin students and staff",
  },
  {
    id: "ucd",
    name: "UCD",
    fullName: "University College Dublin",
    description: "Community for UCD students and staff",
  },
  {
    id: "ucc",
    name: "UCC",
    fullName: "University College Cork",
    description:
      "Community for UCC students and staff — a leading research-intensive university in Cork.",
  },
  {
    id: "galway",
    name: "Galway",
    fullName: "University of Galway",
    description:
      "Community for University of Galway students and staff — global strengths in biomedical science and human rights research.",
  },
  {
    id: "ul",
    name: "UL",
    fullName: "University of Limerick",
    description:
      "Community for UL students and staff — high graduate employability and a strong campus-based experience.",
  },
  {
    id: "dcu",
    name: "DCU",
    fullName: "Dublin City University",
    description:
      "Community for DCU students and staff — Ireland's University of Enterprise; technology and business.",
  },
  {
    id: "maynooth",
    name: "Maynooth",
    fullName: "Maynooth University",
    description:
      "Community for Maynooth students and staff — academic excellence in social sciences, humanities, and STEM.",
  },
  {
    id: "rcsi",
    name: "RCSI",
    fullName: "RCSI University of Medicine and Health Sciences",
    description:
      "Community for RCSI students and staff — specialist medical education and research in Dublin.",
  },
  {
    id: "nci",
    name: "NCI",
    fullName: "National College of Ireland",
    description:
      "Community for NCI students and staff — business, computing, and psychology in Dublin city centre.",
  },
] as const;

// seed initial communities (safe to call multiple times)
// Important: never merge `memberCount: 0` onto existing docs — that wiped real counts on every run.
export async function seedCommunities() {
  for (const c of DEFAULT_COMMUNITY_SEEDS) {
    const ref = doc(db, "communities", c.id);
    const snap = await getDoc(ref);
    const meta = {
      name: c.name,
      fullName: c.fullName,
      description: c.description,
    };
    if (!snap.exists()) {
      await setDoc(ref, {
        ...meta,
        memberCount: 0,
        createdAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, meta, { merge: true });
    }
  }

  return DEFAULT_COMMUNITY_SEEDS.map((c) => c.id);
}

/**
 * Returns all communities, upserting any missing default seeds (for DBs created before new
 * universities were added). Avoids an extra list round-trip when nothing was missing.
 */
export async function ensureDefaultCommunities(): Promise<Community[]> {
  const list = await listCommunities();
  if (list.length > 0) return list;

  // Security posture: clients no longer write `/communities`.
  // If collection is empty, return local defaults while admins seed trusted docs.
  return DEFAULT_COMMUNITY_SEEDS.map((c) => ({
    ...c,
    memberCount: 0,
  }));
}

// ==================== USER SUBSCRIPTIONS ====================

// get user's subscriptions
export async function getUserSubscriptions(userId: string): Promise<string[]> {
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) return [];
  return snap.data()?.subscriptions || [];
}

// subscribe to a community
export async function subscribeToCommunity(userId: string, communityId: string) {
  const userRef = doc(db, "users", userId);

  await setDoc(userRef, { subscriptions: arrayUnion(communityId) }, { merge: true });
}

// unsubscribe from a community
export async function unsubscribeFromCommunity(userId: string, communityId: string) {
  const userRef = doc(db, "users", userId);

  await updateDoc(userRef, { subscriptions: arrayRemove(communityId) });
}

export type CommunityActiveSubscriber = {
  id: string;
  profileKey: string;
  name: string;
  activityScore: number;
};

export type UserProfileSummary = {
  id: string;
  profileKey: string;
  name: string;
};

export type UserSocialStats = {
  followingCount: number;
  followersCount: number;
};

function userDisplayName(data: { displayName?: string; email?: string }): string {
  const displayName = data.displayName?.trim();
  if (displayName) return displayName;
  if (data.email?.includes("@")) return data.email.split("@")[0];
  return "Member";
}

function userActivityScore(data: {
  totalThreadsCount?: number;
  totalCommentsCount?: number;
  activeDays30d?: number;
}): number {
  const threads = Number(data.totalThreadsCount ?? 0);
  const comments = Number(data.totalCommentsCount ?? 0);
  const activeDays = Number(data.activeDays30d ?? 0);
  return activeDays * 5 + threads * 2 + comments;
}

/**
 * Returns top active subscribers for a community using user-level contribution signals.
 * Activity score combines recent active days and total contributions.
 */
export async function listCommunityTopSubscribers(
  communityId: string,
  topN = 3
): Promise<CommunityActiveSubscriber[]> {
  const q = query(
    collection(db, "users"),
    where("subscriptions", "array-contains", communityId),
    limit(80)
  );
  const snap = await getDocs(q);
  const ranked = snap.docs
    .map((d) => {
      const data = d.data() as {
        displayName?: string;
        email?: string;
        publicHandle?: string;
        totalThreadsCount?: number;
        totalCommentsCount?: number;
        activeDays30d?: number;
      };
      const displayName = data.displayName?.trim();
      const emailPrefix = data.email?.includes("@") ? data.email.split("@")[0] : null;
      const name = displayName || emailPrefix || "Member";
      const threads = Number(data.totalThreadsCount ?? 0);
      const comments = Number(data.totalCommentsCount ?? 0);
      const activeDays = Number(data.activeDays30d ?? 0);
      const activityScore = activeDays * 5 + threads * 2 + comments;
      return {
        id: d.id,
        profileKey: data.publicHandle?.trim() || d.id,
        name,
        activityScore,
      } satisfies CommunityActiveSubscriber;
    })
    .sort((a, b) => {
      if (b.activityScore !== a.activityScore) return b.activityScore - a.activityScore;
      return a.name.localeCompare(b.name);
    })
    .slice(0, topN);
  return ranked;
}

export async function followUser(userId: string, targetUserId: string): Promise<void> {
  if (!userId || !targetUserId || userId === targetUserId) return;
  await setDoc(
    doc(db, "users", userId),
    { followingUserIds: arrayUnion(targetUserId) },
    { merge: true }
  );
}

export async function unfollowUser(userId: string, targetUserId: string): Promise<void> {
  if (!userId || !targetUserId || userId === targetUserId) return;
  await setDoc(
    doc(db, "users", userId),
    { followingUserIds: arrayRemove(targetUserId) },
    { merge: true }
  );
}

export async function isFollowingUser(userId: string, targetUserId: string): Promise<boolean> {
  if (!userId || !targetUserId || userId === targetUserId) return false;
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) return false;
  const ids = Array.isArray(snap.data()?.followingUserIds) ? snap.data()?.followingUserIds : [];
  return ids.includes(targetUserId);
}

export async function listFollowingUsers(userId: string, topN = 24): Promise<UserProfileSummary[]> {
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) return [];
  const rawIds: unknown[] = Array.isArray(snap.data()?.followingUserIds)
    ? (snap.data()?.followingUserIds as unknown[])
    : [];
  const ids = rawIds.filter((id): id is string => typeof id === "string").slice(0, topN);
  if (ids.length === 0) return [];
  const userDocs = await Promise.all(ids.map((id) => getDoc(doc(db, "users", id))));
  const list: UserProfileSummary[] = [];
  for (const d of userDocs) {
    if (!d.exists()) continue;
    const data = d.data() as { publicHandle?: string; displayName?: string; email?: string };
    list.push({
      id: d.id,
      profileKey: data.publicHandle?.trim() || d.id,
      name: userDisplayName(data),
    });
  }
  return list;
}

export async function listTopActiveFollowers(
  userId: string,
  topN = 3
): Promise<CommunityActiveSubscriber[]> {
  if (!userId) return [];
  const q = query(collection(db, "users"), where("followingUserIds", "array-contains", userId), limit(80));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => {
      const data = d.data() as {
        displayName?: string;
        email?: string;
        publicHandle?: string;
        totalThreadsCount?: number;
        totalCommentsCount?: number;
        activeDays30d?: number;
      };
      return {
        id: d.id,
        profileKey: data.publicHandle?.trim() || d.id,
        name: userDisplayName(data),
        activityScore: userActivityScore(data),
      } satisfies CommunityActiveSubscriber;
    })
    .sort((a, b) => {
      if (b.activityScore !== a.activityScore) return b.activityScore - a.activityScore;
      return a.name.localeCompare(b.name);
    })
    .slice(0, topN);
}

export async function getUserSocialStats(userId: string): Promise<UserSocialStats> {
  if (!userId) return { followersCount: 0, followingCount: 0 };
  const [self, followers] = await Promise.all([
    getDoc(doc(db, "users", userId)),
    getDocs(query(collection(db, "users"), where("followingUserIds", "array-contains", userId), limit(200))),
  ]);
  const followingIds = self.exists() && Array.isArray(self.data()?.followingUserIds)
    ? self.data()?.followingUserIds
    : [];
  return {
    followingCount: followingIds.length,
    followersCount: followers.size,
  };
}

// check if user is subscribed to a community
// ==================== ADMIN / MODERATION ====================

export async function isAdmin(userId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) return false;
  return snap.data()?.role === "admin";
}

export type FlaggedItem = {
  id: string;
  type: "thread" | "comment" | "flair";
  /** Thread id (for threads: same as id; for comments: parent thread) */
  threadId?: string;
  title?: string;
  body: string;
  authorName: string;
  communityId?: string;
  moderationStatus: string;
  moderationMatches: string[];
  toxicityScore?: number;
  spamScore?: number;
  /** Cloud Function–computed credibility 0–100 (threads & comments only) */
  credibilityScore?: number;
  credibilityModelVersion?: string;
  createdAt?: unknown;
};

type FlaggedThreadDoc = {
  title?: string;
  body?: string;
  authorName?: string;
  communityId?: string;
  moderationStatus?: string;
  moderationMatches?: string[];
  toxicityScore?: number;
  spamScore?: number;
  credibilityScore?: number;
  credibilityModelVersion?: string;
  createdAt?: unknown;
};

type FlaggedCommentDoc = {
  body?: string;
  authorName?: string;
  moderationStatus?: string;
  moderationMatches?: string[];
  toxicityScore?: number;
  spamScore?: number;
  credibilityScore?: number;
  credibilityModelVersion?: string;
  createdAt?: unknown;
};

type FlaggedFlairDoc = {
  title?: string;
  description?: string;
  authorName?: string;
  moderationStatus?: string;
  moderationMatches?: string[];
  toxicityScore?: number;
  spamScore?: number;
  createdAt?: unknown;
};

export async function listFlaggedThreads(): Promise<FlaggedItem[]> {
  const items: FlaggedItem[] = [];

  const threadQ = query(
    collection(db, "threads"),
    where("moderationStatus", "==", "pending_review")
  );
  const threadSnap = await getDocs(threadQ);
  for (const d of threadSnap.docs) {
    const data = d.data() as FlaggedThreadDoc;
    items.push({
      id: d.id,
      type: "thread",
      threadId: d.id,
      title: data.title,
      body: data.body ?? "",
      authorName: data.authorName ?? "unknown",
      communityId: data.communityId,
      moderationStatus: data.moderationStatus ?? "pending_review",
      moderationMatches: data.moderationMatches ?? [],
      toxicityScore: data.toxicityScore,
      spamScore: data.spamScore,
      credibilityScore: data.credibilityScore,
      credibilityModelVersion: data.credibilityModelVersion,
      createdAt: data.createdAt,
    });
  }

  // Fetch flagged comments from each thread's posts subcollection
  const allThreadsSnap = await getDocs(collection(db, "threads"));
  for (const tDoc of allThreadsSnap.docs) {
    const commentQ = query(
      collection(db, "threads", tDoc.id, "posts"),
      where("moderationStatus", "==", "pending_review")
    );
    const commentSnap = await getDocs(commentQ);
    for (const d of commentSnap.docs) {
      const data = d.data() as FlaggedCommentDoc;
      items.push({
        id: d.id,
        type: "comment",
        threadId: tDoc.id,
        body: data.body ?? "",
        authorName: data.authorName ?? "unknown",
        moderationStatus: data.moderationStatus ?? "pending_review",
        moderationMatches: data.moderationMatches ?? [],
        toxicityScore: data.toxicityScore,
        spamScore: data.spamScore,
        credibilityScore: data.credibilityScore,
        credibilityModelVersion: data.credibilityModelVersion,
        createdAt: data.createdAt,
      });
    }
  }

  // Flagged flairs (discussion topics)
  const flairQ = query(
    collection(db, "flairs"),
    where("moderationStatus", "==", "pending_review")
  );
  const flairSnap = await getDocs(flairQ);
  for (const d of flairSnap.docs) {
    const data = d.data() as FlaggedFlairDoc;
    items.push({
      id: d.id,
      type: "flair",
      title: data.title,
      body: (data.description as string) ?? "",
      authorName: data.authorName ?? "unknown",
      moderationStatus: data.moderationStatus ?? "pending_review",
      moderationMatches: data.moderationMatches ?? [],
      toxicityScore: data.toxicityScore,
      spamScore: data.spamScore,
      createdAt: data.createdAt,
    });
  }

  return items;
}

export async function setModerationStatus(
  path: string,
  status: "approved" | "rejected" | "pending_review"
) {
  await updateDoc(doc(db, path), { moderationStatus: status });
}

// ==================== THREADS ====================

// thread now uses communityId instead of university
export type Thread = {
  id: string;
  title: string;
  body: string;
  communityId: string;
  tags: string[];
  authorId: string;
  authorName: string;
  /** Denormalized from users/{authorId}.publicHandle for clean profile URLs */
  authorPublicHandle?: string;
  createdAt?: unknown;
  /** Bumped on new comments; used for default “activity” sort */
  lastActivityAt?: unknown;
  score?: number;
  // optional expiry for flash threads; when in the past, thread is hidden from feeds
  flashExpiresAt?: unknown;
  moderationStatus?: string;
  toxicityScore?: number;
  spamScore?: number;
  /** If true, UI shows "Anonymous" for non-admins; authorId/authorName still stored for moderation */
  isAnonymous?: boolean;
  /** legacy field from older data */
  university?: string;
  credibilityScore?: number;
  credibilityModelVersion?: string;
};

// basic shape of a post doc in "threads/{threadId}/posts"
export type Post = {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  authorPublicHandle?: string;
  createdAt?: unknown;
  score?: number;
  moderationStatus?: string;
  toxicityScore?: number;
  spamScore?: number;
  /** If set, this comment is a reply to another post in the same thread */
  parentPostId?: string | null;
  /** Chain from root to parent (for ordering / analytics); recomputed from parent on write */
  ancestorIds?: string[];
};

type ThreadDocData = Omit<Thread, "id">;
type PostDocData = Omit<Post, "id">;

/** Descending sort key for thread list (higher = more relevant first). */
function threadSortValue(
  t: Thread,
  field: "lastActivityAt" | "createdAt" | "score" | "credibilityScore"
): number {
  if (field === "score") {
    const s = t.score;
    return typeof s === "number" && !Number.isNaN(s) ? s : 0;
  }
  if (field === "credibilityScore") {
    const c = t.credibilityScore;
    return typeof c === "number" && !Number.isNaN(c) ? c : 0;
  }
  if (field === "lastActivityAt") {
    const ms = firestoreMillis(t.lastActivityAt);
    if (ms > 0) return ms;
    return firestoreMillis(t.createdAt);
  }
  return firestoreMillis(t.createdAt);
}

function utcDayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function dayDistanceUtc(aDay: string, bDay: string): number {
  const a = new Date(`${aDay}T00:00:00.000Z`).getTime();
  const b = new Date(`${bDay}T00:00:00.000Z`).getTime();
  return Math.floor((a - b) / (24 * 60 * 60 * 1000));
}

async function recordUserContribution(
  userId: string,
  kind: "thread" | "comment"
) {
  const updates =
    kind === "thread"
      ? {
          totalThreadsCount: increment(1),
        }
      : {
          totalCommentsCount: increment(1),
        };

  try {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    const today = utcDayKey();
    const existingKeys = snap.exists()
      ? ((snap.data()?.activeDayKeys as unknown[]) ?? [])
          .filter((v): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v))
      : [];
    const recentKeys = existingKeys.filter((key) => {
      const distance = dayDistanceUtc(today, key);
      return distance >= 0 && distance < 30;
    });
    const nextKeys = recentKeys.includes(today) ? recentKeys : [...recentKeys, today];

    await setDoc(
      userRef,
      {
        ...updates,
        lastContributionAt: serverTimestamp(),
        activeDayKeys: nextKeys,
        activeDays30d: nextKeys.length,
      },
      { merge: true }
    );
  } catch (e) {
    console.warn("Could not update user contribution stats", e);
  }
}

// get a single thread by ID
export async function getThread(threadId: string): Promise<Thread | null> {
  const snap = await getDoc(doc(db, "threads", threadId));
  if (!snap.exists()) return null;
  const data = snap.data() as ThreadDocData;
  return { id: snap.id, ...data };
}

// creates a new thread document
export async function createThread(input: {
  title: string;
  body: string;
  communityId: string;
  tags: string[];
  authorId: string;
  authorName: string;
  flashExpiresAt?: Date | null;
  toxicityScore?: number;
  spamScore?: number;
  isAnonymous?: boolean;
}) {
  const access = await getUserAccessProfile(input.authorId);
  if (access.accessMode !== "full" && !hasReadOnlyAllowedTag(input.tags)) {
    throw new Error(
      "Read-only accounts can create threads only in Admissions or First Year/Transition."
    );
  }

  const authorSnap = await getDoc(doc(db, "users", input.authorId));
  const authorPublicHandle =
    authorSnap.exists() && typeof authorSnap.data()?.publicHandle === "string"
      ? (authorSnap.data()?.publicHandle as string)
      : undefined;

  const ref = await addDoc(collection(db, "threads"), {
    ...input,
    ...(authorPublicHandle ? { authorPublicHandle } : {}),
    isAnonymous: input.isAnonymous === true,
    toxicityScore: input.toxicityScore ?? 0,
    spamScore: input.spamScore ?? 0,
    flashExpiresAt: input.flashExpiresAt ?? null,
    score: 0,
    moderationStatus: "approved",
    createdAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
    postCount: 0,
  });
  void recordUserContribution(input.authorId, "thread");
  return ref.id;
}

// lists threads with optional community/author filter + simple cursor pagination
export async function listThreads(opts: {
  communityId?: string;
  authorId?: string;
  pageSize?: number;
  cursor?: QueryDocumentSnapshot<DocumentData> | null;
  sortBy?: "lastActivity" | "createdAt" | "score" | "credibilityScore";
}) {
  const pageSize = opts.pageSize ?? 20;
  const base = collection(db, "threads");

  // authorId filter skips orderBy to avoid needing a composite index;
  // results are sorted client-side instead
  if (opts.authorId) {
    const parts: QueryConstraint[] = [where("authorId", "==", opts.authorId), limit(pageSize)];
    if (opts.cursor) parts.push(startAfter(opts.cursor));

    const q = query(base, ...parts);
    const snap = await getDocs(q);

    const threads: Thread[] = snap.docs
      .map((d) => {
        const data = d.data() as ThreadDocData;
        return { id: d.id, ...data };
      })
      .sort((a, b) => firestoreMillis(b.createdAt) - firestoreMillis(a.createdAt));
    const nextCursor = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
    return { threads, nextCursor };
  }

  const sortFieldMap: Record<
    NonNullable<typeof opts.sortBy>,
    "lastActivityAt" | "createdAt" | "score" | "credibilityScore"
  > = {
    lastActivity: "lastActivityAt",
    createdAt: "createdAt",
    score: "score",
    credibilityScore: "credibilityScore",
  };
  const sortField = sortFieldMap[opts.sortBy ?? "lastActivity"];

  // `where(communityId) + orderBy(...)` needs a composite index (and fails while building).
  // Equality-only query + in-memory sort works immediately; cap fetch for large communities.
  if (opts.communityId) {
    const maxFetch = Math.min(500, Math.max(pageSize * 15, 80));
    const q = query(
      base,
      where("communityId", "==", opts.communityId),
      limit(maxFetch)
    );
    const snap = await getDocs(q);
    let threads: Thread[] = snap.docs.map((d) => {
      const data = d.data() as ThreadDocData;
      return { id: d.id, ...data };
    });
    threads.sort((a, b) => threadSortValue(b, sortField) - threadSortValue(a, sortField));
    threads = threads.slice(0, pageSize);
    return { threads, nextCursor: null };
  }

  const parts: QueryConstraint[] = [orderBy(sortField, "desc"), limit(pageSize)];

  if (opts.cursor) parts.push(startAfter(opts.cursor));

  const q = query(base, ...parts);
  const snap = await getDocs(q);

  const threads: Thread[] = snap.docs.map((d) => {
    const data = d.data() as ThreadDocData;
    return { id: d.id, ...data };
  });
  const nextCursor = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;

  return { threads, nextCursor };
}

// adds a post inside a thread (subcollection) and bumps the thread's activity
export async function addPost(
  threadId: string,
  input: {
    body: string;
    authorId: string;
    authorName: string;
    toxicityScore?: number;
    spamScore?: number;
    parentPostId?: string | null;
  }
) {
  const access = await getUserAccessProfile(input.authorId);
  if (access.accessMode !== "full") {
    const threadSnap = await getDoc(doc(db, "threads", threadId));
    const threadTags = threadSnap.exists()
      ? (threadSnap.data()?.tags as string[] | undefined)
      : undefined;
    if (!hasReadOnlyAllowedTag(threadTags)) {
      throw new Error(
        "Read-only accounts can comment only in Admissions or First Year/Transition threads."
      );
    }
  }

  const parentPostId = input.parentPostId ?? null;
  let ancestorIds: string[] = [];
  if (parentPostId) {
    const parentSnap = await getDoc(
      doc(db, "threads", threadId, "posts", parentPostId)
    );
    if (!parentSnap.exists()) {
      throw new Error("Parent comment not found.");
    }
    const pData = parentSnap.data() as { ancestorIds?: unknown };
    const pAncestors = Array.isArray(pData.ancestorIds)
      ? (pData.ancestorIds as string[])
      : [];
    ancestorIds = [...pAncestors, parentPostId];
  }

  const authorSnap = await getDoc(doc(db, "users", input.authorId));
  const authorPublicHandle =
    authorSnap.exists() && typeof authorSnap.data()?.publicHandle === "string"
      ? (authorSnap.data()?.publicHandle as string)
      : undefined;

  const ref = await addDoc(collection(doc(db, "threads", threadId), "posts"), {
    body: input.body,
    authorId: input.authorId,
    authorName: input.authorName,
    ...(authorPublicHandle ? { authorPublicHandle } : {}),
    toxicityScore: input.toxicityScore ?? 0,
    spamScore: input.spamScore ?? 0,
    parentPostId,
    ancestorIds,
    score: 0,
    moderationStatus: "approved",
    createdAt: serverTimestamp(),
  });
  void recordUserContribution(input.authorId, "comment");

  // best-effort: update thread stats; may fail if rules restrict thread updates
  try {
    await updateDoc(doc(db, "threads", threadId), {
      lastActivityAt: serverTimestamp(),
      postCount: increment(1),
    });
  } catch (e) {
    console.warn("Could not update thread stats (permissions?)", e);
  }

  return ref.id;
}

// lists posts for a thread (oldest -> newest)
// for now just returns first N posts (no pagination yet)
export async function listPosts(threadId: string, pageSize = 120) {
  const q = query(
    collection(doc(db, "threads", threadId), "posts"),
    orderBy("createdAt", "asc"),
    limit(pageSize)
  );
  const snap = await getDocs(q);

  const posts: Post[] = snap.docs.map((d) => {
    const data = d.data() as PostDocData;
    return { id: d.id, ...data };
  });
  return posts;
}

// returns comment count excluding flagged/rejected posts
export async function countPosts(threadId: string): Promise<number> {
  const postsRef = collection(doc(db, "threads", threadId), "posts");
  const snap = await getDocs(postsRef);
  return snap.docs.filter((d) => {
    const status = d.data().moderationStatus;
    return !status || status === "approved";
  }).length;
}

// ==================== VOTING ====================

export type Vote = "up" | "down" | null;

// get user's vote on a thread
export async function getUserVote(threadId: string, userId: string): Promise<Vote> {
  const voteRef = doc(db, "threads", threadId, "votes", userId);
  const snap = await getDoc(voteRef);
  if (!snap.exists()) return null;
  return snap.data()?.vote || null;
}

// vote on a thread (handles up, down, and removing vote)
export async function voteOnThread(
  threadId: string,
  userId: string,
  newVote: Vote
) {
  const voteRef = doc(db, "threads", threadId, "votes", userId);
  const threadRef = doc(db, "threads", threadId);
  
  // get current vote
  const currentSnap = await getDoc(voteRef);
  const currentVote: Vote = currentSnap.exists() ? currentSnap.data()?.vote : null;
  const scoreChange = voteScoreDelta(currentVote, newVote);

  // update vote document
  if (newVote === null) {
    // remove vote by setting to null (or we could delete the doc)
    await setDoc(voteRef, { vote: null });
  } else {
    await setDoc(voteRef, { vote: newVote });
  }
  
  // update thread score
  if (scoreChange !== 0) {
    try {
      await updateDoc(threadRef, { score: increment(scoreChange) });
    } catch (e) {
      // Score is also maintained server-side by Cloud Functions; ignore client-side rule denials.
      console.warn("Could not update thread score directly", e);
    }
  }
  
  return { newVote, scoreChange };
}

// ==================== COMMENT VOTING ====================

// get user's vote on a comment (post)
export async function getCommentVote(
  threadId: string,
  postId: string,
  userId: string
): Promise<Vote> {
  const ref = doc(db, "threads", threadId, "posts", postId, "votes", userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data()?.vote || null;
}

// vote on a comment (post)
export async function voteOnComment(
  threadId: string,
  postId: string,
  userId: string,
  newVote: Vote
) {
  const voteRef = doc(db, "threads", threadId, "posts", postId, "votes", userId);
  const postRef = doc(db, "threads", threadId, "posts", postId);

  const currentSnap = await getDoc(voteRef);
  const currentVote: Vote = currentSnap.exists() ? currentSnap.data()?.vote : null;
  const scoreChange = voteScoreDelta(currentVote, newVote);

  await setDoc(voteRef, { vote: newVote });

  if (scoreChange !== 0) {
    try {
      await updateDoc(postRef, { score: increment(scoreChange) });
    } catch (e) {
      console.warn("Could not update comment score", e);
    }
  }

  return { newVote, scoreChange };
}

// ==================== FLairs ====================
// "Flairs" are discussion topics users can propose and vote on.
// (In your current UI they likely map to what users previously entered as freeform tags.)

export type Flair = {
  id: string;
  title: string;
  description?: string;
  authorId: string;
  authorName: string;
  createdAt?: unknown;
  score?: number;
  moderationStatus?: string;
  moderationMatches?: string[];
  toxicityScore?: number;
  spamScore?: number;
};

export async function getFlair(flairId: string): Promise<Flair | null> {
  const snap = await getDoc(doc(db, "flairs", flairId));
  if (!snap.exists()) return null;
  const data = snap.data() as Omit<Flair, "id">;
  return { id: snap.id, ...data };
}

export async function listFlairs(opts?: { pageSize?: number }): Promise<Flair[]> {
  const pageSize = opts?.pageSize ?? 50;
  const q = query(collection(db, "flairs"), orderBy("score", "desc"), limit(pageSize));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => {
      const data = d.data() as Omit<Flair, "id">;
      return { id: d.id, ...data };
    })
    .filter((f) => !f.moderationStatus || f.moderationStatus === "approved");
}

export async function createFlair(input: {
  title: string;
  description?: string;
  authorId: string;
  authorName: string;
  toxicityScore?: number;
  spamScore?: number;
}) {
  const access = await getUserAccessProfile(input.authorId);
  if (access.accessMode !== "full") {
    throw new Error("Only confirmed student emails can create flairs.");
  }

  // Weekly rate limit: 1 flair per user per Dublin-week (resets Sundays 00:00 Europe/Dublin).
  const currentWeekKey = getDublinWeekKey(new Date());
  const userRef = doc(db, "users", input.authorId);
  const userSnap = await getDoc(userRef);
  type UserFlairMeta = { lastFlairWeekKey?: string };
  const lastWeekKey: string | null = userSnap.exists()
    ? (userSnap.data() as UserFlairMeta).lastFlairWeekKey ?? null
    : null;

  if (lastWeekKey === currentWeekKey) {
    throw new Error("You can propose only 1 flair per week. Limit resets Sunday 00:00 (Dublin).");
  }

  const ref = await addDoc(collection(db, "flairs"), {
    title: input.title,
    description: input.description ?? "",
    authorId: input.authorId,
    authorName: input.authorName,
    toxicityScore: input.toxicityScore ?? 0,
    spamScore: input.spamScore ?? 0,
    score: 0,
    moderationStatus: "approved",
    createdAt: serverTimestamp(),
  });

  // Track user's weekly flair creation (for client-side enforcement + simple rules support).
  await setDoc(
    userRef,
    {
      lastFlairWeekKey: currentWeekKey,
      lastFlairAt: serverTimestamp(),
    },
    { merge: true }
  );

  return ref.id;
}

export async function getUserFlairVote(flairId: string, userId: string): Promise<Vote> {
  const voteRef = doc(db, "flairs", flairId, "votes", userId);
  const snap = await getDoc(voteRef);
  if (!snap.exists()) return null;
  return snap.data()?.vote || null;
}

export async function voteOnFlair(flairId: string, userId: string, newVote: Vote) {
  const voteRef = doc(db, "flairs", flairId, "votes", userId);
  const flairRef = doc(db, "flairs", flairId);

  const currentSnap = await getDoc(voteRef);
  const currentVote: Vote = currentSnap.exists() ? currentSnap.data()?.vote : null;
  const scoreChange = voteScoreDelta(currentVote, newVote);

  if (newVote === null) {
    await setDoc(voteRef, { vote: null });
  } else {
    await setDoc(voteRef, { vote: newVote });
  }

  if (scoreChange !== 0) {
    try {
      await updateDoc(flairRef, { score: increment(scoreChange) });
    } catch (e) {
      // Score is also maintained server-side by Cloud Functions; ignore client-side rule denials.
      console.warn("Could not update flair score directly", e);
    }
  }

  return { newVote, scoreChange };
}