// Cloud Functions — Layer 2 (Server-side enforcement)
//
// Triggers: onDocumentCreated for threads and posts
// Sets moderationStatus on each document: "approved" | "rejected" | "pending_review"

import { onDocumentCreated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { moderate } from "./moderation";
import { recalculateCommentCredibility, recalculateThreadCredibility } from "./credibilityRecalc";

initializeApp();
const db = getFirestore();

type Vote = "up" | "down" | null;

function asVote(value: unknown): Vote {
  return value === "up" || value === "down" ? value : null;
}

function voteScoreDelta(currentVote: Vote, newVote: Vote): number {
  if (currentVote === null && newVote === "up") return 1;
  if (currentVote === null && newVote === "down") return -1;
  if (currentVote === "up" && newVote === null) return -1;
  if (currentVote === "up" && newVote === "down") return -2;
  if (currentVote === "down" && newVote === null) return 1;
  if (currentVote === "down" && newVote === "up") return 2;
  return 0;
}

function helpfulVoteDelta(currentVote: Vote, newVote: Vote): number {
  if (currentVote === null && newVote === "up") return 1;
  if (currentVote === "up" && newVote === null) return -1;
  if (currentVote === "up" && newVote === "down") return -1;
  if (currentVote === "down" && newVote === "up") return 1;
  return 0;
}

function asStatus(value: unknown): "approved" | "rejected" | "pending_review" | null {
  return value === "approved" || value === "rejected" || value === "pending_review"
    ? value
    : null;
}

function sameStringArray(a: unknown, b: unknown): boolean {
  const aa = Array.isArray(a) ? a : [];
  const bb = Array.isArray(b) ? b : [];
  if (aa.length !== bb.length) return false;
  for (let i = 0; i < aa.length; i++) {
    if (aa[i] !== bb[i]) return false;
  }
  return true;
}

async function bumpUserStats(userId: string, updates: Record<string, unknown>) {
  await db.doc(`users/${userId}`).set(updates, { merge: true });
}

async function updateUserModerationStats(
  authorId: string,
  verdict: "approved" | "rejected" | "pending_review",
  contentType: "thread" | "comment"
) {
  const userRef = db.doc(`users/${authorId}`);
  const updates: Record<string, unknown> = {};

  if (verdict === "approved") {
    if (contentType === "thread") {
      updates.approvedPostsCount = FieldValue.increment(1);
    } else {
      updates.approvedCommentsCount = FieldValue.increment(1);
    }
  } else if (verdict === "rejected") {
    updates.rejectedContentCount = FieldValue.increment(1);
  } else {
    updates.pendingReviewCount = FieldValue.increment(1);
  }

  await userRef.set(updates, { merge: true });
}

// Trigger: new thread created → moderate title + body
export const moderateThread = onDocumentCreated(
  "threads/{threadId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    const title = data.title ?? "";
    const body = data.body ?? "";
    const authorId = data.authorId ?? "";

    const result = await moderate(`${title} ${body}`);

    await db.doc(`threads/${event.params.threadId}`).update({
      moderationStatus: result.verdict,
      moderationMatches: result.matches,
      ...(result.toxicityScore != null && { toxicityScore: result.toxicityScore }),
      ...(result.spamScore != null && { spamScore: result.spamScore }),
    });
    if (authorId) {
      await updateUserModerationStats(authorId, result.verdict, "thread");
    }
    await recalculateThreadCredibility(event.params.threadId);
  }
);

export const trackThreadVoteImpact = onDocumentWritten(
  "threads/{threadId}/votes/{voterId}",
  async (event) => {
    const before = event.data?.before.data() ?? {};
    const after = event.data?.after.data() ?? {};

    const oldVote = asVote(before.vote);
    const newVote = asVote(after.vote);
    if (oldVote === newVote) return;

    const scoreDelta = voteScoreDelta(oldVote, newVote);
    const helpfulDelta = helpfulVoteDelta(oldVote, newVote);
    if (scoreDelta === 0 && helpfulDelta === 0) return;

    const threadSnap = await db.doc(`threads/${event.params.threadId}`).get();
    if (!threadSnap.exists) return;
    const authorId = threadSnap.data()?.authorId as string | undefined;
    if (!authorId || authorId === event.params.voterId) return;

    const updates: Record<string, unknown> = {
      credibilityScoreUpdatedAt: FieldValue.serverTimestamp(),
    };
    if (scoreDelta !== 0) {
      updates.cumulativeThreadScore = FieldValue.increment(scoreDelta);
    }
    if (helpfulDelta !== 0) {
      updates.helpfulMarksCount = FieldValue.increment(helpfulDelta);
    }
    await bumpUserStats(authorId, updates);
    await recalculateThreadCredibility(event.params.threadId);
  }
);

export const trackCommentVoteImpact = onDocumentWritten(
  "threads/{threadId}/posts/{postId}/votes/{voterId}",
  async (event) => {
    const before = event.data?.before.data() ?? {};
    const after = event.data?.after.data() ?? {};

    const oldVote = asVote(before.vote);
    const newVote = asVote(after.vote);
    if (oldVote === newVote) return;

    const scoreDelta = voteScoreDelta(oldVote, newVote);
    const helpfulDelta = helpfulVoteDelta(oldVote, newVote);
    if (scoreDelta === 0 && helpfulDelta === 0) return;

    const postSnap = await db
      .doc(`threads/${event.params.threadId}/posts/${event.params.postId}`)
      .get();
    if (!postSnap.exists) return;
    const authorId = postSnap.data()?.authorId as string | undefined;
    if (!authorId || authorId === event.params.voterId) return;

    const updates: Record<string, unknown> = {
      credibilityScoreUpdatedAt: FieldValue.serverTimestamp(),
    };
    if (scoreDelta !== 0) {
      updates.cumulativeCommentScore = FieldValue.increment(scoreDelta);
    }
    if (helpfulDelta !== 0) {
      updates.helpfulMarksCount = FieldValue.increment(helpfulDelta);
    }
    await bumpUserStats(authorId, updates);
    await recalculateCommentCredibility(event.params.threadId, event.params.postId);
  }
);

export const trackThreadModerationReports = onDocumentWritten(
  "threads/{threadId}",
  async (event) => {
    const before = event.data?.before.data() ?? {};
    const after = event.data?.after.data() ?? {};

    const beforeStatus = asStatus(before.moderationStatus);
    const afterStatus = asStatus(after.moderationStatus);
    if (beforeStatus === afterStatus) return;

    const authorId = (after.authorId ?? before.authorId) as string | undefined;
    if (!authorId) return;

    const updates: Record<string, unknown> = {};
    const beforeMatches = before.moderationMatches ?? [];
    const afterMatches = after.moderationMatches ?? [];

    if (
      afterStatus === "pending_review" &&
      beforeStatus !== "pending_review" &&
      sameStringArray(beforeMatches, afterMatches)
    ) {
      updates.reportsAgainstCount = FieldValue.increment(1);
    }

    if (beforeStatus === "pending_review" && afterStatus === "rejected") {
      updates.confirmedReportsCount = FieldValue.increment(1);
    }

    if (Object.keys(updates).length > 0) {
      updates.credibilityScoreUpdatedAt = FieldValue.serverTimestamp();
      await bumpUserStats(authorId, updates);
    }
    // Always refresh credibility when moderation status changes (not only when report counters move).
    await recalculateThreadCredibility(event.params.threadId);
  }
);

export const trackCommentModerationReports = onDocumentWritten(
  "threads/{threadId}/posts/{postId}",
  async (event) => {
    const before = event.data?.before.data() ?? {};
    const after = event.data?.after.data() ?? {};

    const beforeStatus = asStatus(before.moderationStatus);
    const afterStatus = asStatus(after.moderationStatus);
    if (beforeStatus === afterStatus) return;

    const authorId = (after.authorId ?? before.authorId) as string | undefined;
    if (!authorId) return;

    const updates: Record<string, unknown> = {};
    const beforeMatches = before.moderationMatches ?? [];
    const afterMatches = after.moderationMatches ?? [];

    if (
      afterStatus === "pending_review" &&
      beforeStatus !== "pending_review" &&
      sameStringArray(beforeMatches, afterMatches)
    ) {
      updates.reportsAgainstCount = FieldValue.increment(1);
    }

    if (beforeStatus === "pending_review" && afterStatus === "rejected") {
      updates.confirmedReportsCount = FieldValue.increment(1);
    }

    if (Object.keys(updates).length > 0) {
      updates.credibilityScoreUpdatedAt = FieldValue.serverTimestamp();
      await bumpUserStats(authorId, updates);
    }
    await recalculateCommentCredibility(event.params.threadId, event.params.postId);
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
    const authorId = data.authorId ?? "";

    const result = await moderate(body);

    await db
      .doc(`threads/${event.params.threadId}/posts/${event.params.postId}`)
      .update({
        moderationStatus: result.verdict,
        moderationMatches: result.matches,
        ...(result.toxicityScore != null && { toxicityScore: result.toxicityScore }),
        ...(result.spamScore != null && { spamScore: result.spamScore }),
      });
    if (authorId) {
      await updateUserModerationStats(authorId, result.verdict, "comment");
    }
    await recalculateCommentCredibility(event.params.threadId, event.params.postId);
  }
);
