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
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { getUserAccessProfile } from "./userAccess";

// ==================== COMMUNITIES ====================

export type Community = {
  id: string;
  name: string;
  fullName: string;
  description: string;
  memberCount: number;
  createdAt?: any;
};

// get a single community by ID
export async function getCommunity(communityId: string): Promise<Community | null> {
  const snap = await getDoc(doc(db, "communities", communityId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) };
}

// list all communities
export async function listCommunities(): Promise<Community[]> {
  const q = query(collection(db, "communities"), orderBy("name", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

// create a community (used for seeding)


// seed initial communities (safe to call multiple times - uses setDoc with merge)
export async function seedCommunities() {
  const communities = [
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
  ];

  for (const c of communities) {
    await setDoc(
      doc(db, "communities", c.id),
      {
        name: c.name,
        fullName: c.fullName,
        description: c.description,
        memberCount: 0,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  return communities.map((c) => c.id);
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
  const communityRef = doc(db, "communities", communityId);

  await setDoc(userRef, { subscriptions: arrayUnion(communityId) }, { merge: true });
  await updateDoc(communityRef, { memberCount: increment(1) });
}

// unsubscribe from a community
export async function unsubscribeFromCommunity(userId: string, communityId: string) {
  const userRef = doc(db, "users", userId);
  const communityRef = doc(db, "communities", communityId);

  await updateDoc(userRef, { subscriptions: arrayRemove(communityId) });
  await updateDoc(communityRef, { memberCount: increment(-1) });
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
  type: "thread" | "comment";
  threadId: string;
  title?: string;
  body: string;
  authorName: string;
  communityId?: string;
  moderationStatus: string;
  moderationMatches: string[];
  toxicityScore?: number;
  createdAt?: any;
};

export async function listFlaggedThreads(): Promise<FlaggedItem[]> {
  const items: FlaggedItem[] = [];

  const threadQ = query(
    collection(db, "threads"),
    where("moderationStatus", "==", "pending_review")
  );
  const threadSnap = await getDocs(threadQ);
  for (const d of threadSnap.docs) {
    const data = d.data() as any;
    items.push({
      id: d.id,
      type: "thread",
      threadId: d.id,
      title: data.title,
      body: data.body ?? "",
      authorName: data.authorName ?? "unknown",
      communityId: data.communityId,
      moderationStatus: data.moderationStatus,
      moderationMatches: data.moderationMatches ?? [],
      toxicityScore: data.toxicityScore,
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
      const data = d.data() as any;
      items.push({
        id: d.id,
        type: "comment",
        threadId: tDoc.id,
        body: data.body ?? "",
        authorName: data.authorName ?? "unknown",
        moderationStatus: data.moderationStatus,
        moderationMatches: data.moderationMatches ?? [],
        toxicityScore: data.toxicityScore,
        createdAt: data.createdAt,
      });
    }
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
  createdAt?: any;
  score?: number;
};

// basic shape of a post doc in "threads/{threadId}/posts"
export type Post = {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  createdAt?: any;
  score?: number;
};

// get a single thread by ID
export async function getThread(threadId: string): Promise<Thread | null> {
  const snap = await getDoc(doc(db, "threads", threadId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) };
}

// creates a new thread document
export async function createThread(input: {
  title: string;
  body: string;
  communityId: string;
  tags: string[];
  authorId: string;
  authorName: string;
}) {
  const access = await getUserAccessProfile(input.authorId);
  if (access.accessMode !== "full") {
    throw new Error("Only confirmed student emails can create threads.");
  }

  const ref = await addDoc(collection(db, "threads"), {
    ...input,
    score: 0,
    moderationStatus: "approved",
    createdAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
    postCount: 0,
  });
  return ref.id;
}

// lists threads with optional community/author filter + simple cursor pagination
export async function listThreads(opts: {
  communityId?: string;
  authorId?: string;
  pageSize?: number;
  cursor?: QueryDocumentSnapshot<DocumentData> | null;
}) {
  const pageSize = opts.pageSize ?? 20;
  const base = collection(db, "threads");

  // authorId filter skips orderBy to avoid needing a composite index;
  // results are sorted client-side instead
  if (opts.authorId) {
    const parts: any[] = [where("authorId", "==", opts.authorId), limit(pageSize)];
    if (opts.cursor) parts.push(startAfter(opts.cursor));

    const q = query(base, ...parts);
    const snap = await getDocs(q);

    const threads: Thread[] = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return tb - ta;
      });
    const nextCursor = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
    return { threads, nextCursor };
  }

  const parts: any[] = [orderBy("lastActivityAt", "desc"), limit(pageSize)];

  if (opts.communityId) {
    parts.unshift(where("communityId", "==", opts.communityId));
  }

  if (opts.cursor) parts.push(startAfter(opts.cursor));

  const q = query(base, ...parts);
  const snap = await getDocs(q);

  const threads: Thread[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  const nextCursor = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;

  return { threads, nextCursor };
}

// adds a post inside a thread (subcollection) and bumps the thread's activity
export async function addPost(
  threadId: string,
  input: { body: string; authorId: string; authorName: string }
) {
  const access = await getUserAccessProfile(input.authorId);
  if (access.accessMode !== "full") {
    throw new Error("Only confirmed student emails can add comments.");
  }

  const ref = await addDoc(collection(doc(db, "threads", threadId), "posts"), {
    ...input,
    score: 0,
    moderationStatus: "approved",
    createdAt: serverTimestamp(),
  });

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
export async function listPosts(threadId: string, pageSize = 50) {
  const q = query(
    collection(doc(db, "threads", threadId), "posts"),
    orderBy("createdAt", "asc"),
    limit(pageSize)
  );
  const snap = await getDocs(q);

  const posts: Post[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
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
  
  // calculate score change
  let scoreChange = 0;
  
  if (currentVote === null && newVote === "up") {
    scoreChange = 1;
  } else if (currentVote === null && newVote === "down") {
    scoreChange = -1;
  } else if (currentVote === "up" && newVote === null) {
    scoreChange = -1;
  } else if (currentVote === "up" && newVote === "down") {
    scoreChange = -2;
  } else if (currentVote === "down" && newVote === null) {
    scoreChange = 1;
  } else if (currentVote === "down" && newVote === "up") {
    scoreChange = 2;
  }
  
  // update vote document
  if (newVote === null) {
    // remove vote by setting to null (or we could delete the doc)
    await setDoc(voteRef, { vote: null });
  } else {
    await setDoc(voteRef, { vote: newVote });
  }
  
  // update thread score
  if (scoreChange !== 0) {
    await updateDoc(threadRef, { score: increment(scoreChange) });
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

  let scoreChange = 0;
  if (currentVote === null && newVote === "up") scoreChange = 1;
  else if (currentVote === null && newVote === "down") scoreChange = -1;
  else if (currentVote === "up" && newVote === null) scoreChange = -1;
  else if (currentVote === "up" && newVote === "down") scoreChange = -2;
  else if (currentVote === "down" && newVote === null) scoreChange = 1;
  else if (currentVote === "down" && newVote === "up") scoreChange = 2;

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