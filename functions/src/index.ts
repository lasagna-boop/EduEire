// Cloud Functions — Layer 2 (Server-side enforcement)
//
// Triggers: onDocumentCreated for threads and posts
// Sets moderationStatus on each document: "approved" | "rejected" | "pending_review"

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { moderate } from "./moderation";

initializeApp();
const db = getFirestore();

// Trigger: new thread created → moderate title + body
export const moderateThread = onDocumentCreated(
  "threads/{threadId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    const title = data.title ?? "";
    const body = data.body ?? "";

    const result = await moderate(`${title} ${body}`);

    await db.doc(`threads/${event.params.threadId}`).update({
      moderationStatus: result.verdict,
      moderationMatches: result.matches,
      ...(result.toxicityScore != null && { toxicityScore: result.toxicityScore }),
    });
  }
);

// Trigger: new comment (post) created → moderate body
export const moderatePost = onDocumentCreated(
  "threads/{threadId}/posts/{postId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    const body = data.body ?? "";

    const result = await moderate(body);

    await db
      .doc(`threads/${event.params.threadId}/posts/${event.params.postId}`)
      .update({
        moderationStatus: result.verdict,
        moderationMatches: result.matches,
        ...(result.toxicityScore != null && { toxicityScore: result.toxicityScore }),
      });
  }
);
