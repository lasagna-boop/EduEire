// src/lib/firestore.ts
// firestore helpers for threads + posts
// idea: keep db queries here so ui stays cleaner and doesn't import firebase sdk everywhere

import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
  startAfter,
} from "firebase/firestore";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "./firebase";

// basic shape of a thread doc in "threads" collection
// createdAt is a firestore timestamp (right now typed as any for simplicity)
export type Thread = {
  id: string;
  title: string;
  university: string;
  tags: string[];
  authorId: string;
  authorName: string;
  createdAt?: any;
};

// basic shape of a post doc in "threads/{threadId}/posts"
export type Post = {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  createdAt?: any;
};

// creates a new thread document
// also stores lastActivityAt + postCount for sorting and future features
export async function createThread(input: {
  title: string;
  university: string;
  tags: string[];
  authorId: string;
  authorName: string;
}) {
  const ref = await addDoc(collection(db, "threads"), {
    ...input,
    createdAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
    postCount: 0,
  });
  return ref.id;
}

// lists threads with optional university filter + simple cursor pagination
// sorted by lastActivityAt desc (most active first)
export async function listThreads(opts: {
  university?: string;
  pageSize?: number;
  cursor?: QueryDocumentSnapshot<DocumentData> | null;
}) {
  const pageSize = opts.pageSize ?? 20;

  const base = collection(db, "threads");

  // query parts (order + limit + optional where + optional startAfter)
  // note: typed as any[] for now to keep it quick
  const parts: any[] = [orderBy("lastActivityAt", "desc"), limit(pageSize)];

  // filter threads by university if provided
  if (opts.university) parts.unshift(where("university", "==", opts.university));

  // pagination: if we have a last doc snapshot, start after it
  if (opts.cursor) parts.push(startAfter(opts.cursor));

  const q = query(base, ...parts);
  const snap = await getDocs(q);

  // map firestore docs to our Thread type (id + data)
  const threads: Thread[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

  // next cursor is the last doc in this page (or null if no docs)
  const nextCursor = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;

  return { threads, nextCursor };
}

// adds a post inside a thread (subcollection)
// note: currently does not update thread.lastActivityAt/postCount (can be added later)
export async function addPost(
  threadId: string,
  input: { body: string; authorId: string; authorName: string }
) {
  const ref = await addDoc(collection(doc(db, "threads", threadId), "posts"), {
    ...input,
    createdAt: serverTimestamp(),
  });
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