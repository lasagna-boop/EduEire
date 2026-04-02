/**
 * Single place that loads Firestore fields used for credibility and writes
 * score + breakdown + credibilityInputs onto the thread or post document.
 */

import { FieldValue, getFirestore } from "firebase-admin/firestore";
import {
  computeCommentCredibility,
  computeThreadCredibility,
  CREDIBILITY_MODEL_VERSION,
  serializeCommentCredibilityInput,
  serializeThreadCredibilityInput,
  type UserCredibilitySnapshot,
} from "./credibility";

function db() {
  return getFirestore();
}

async function loadAuthorSnapshot(userId: string): Promise<UserCredibilitySnapshot | null> {
  const snap = await db().doc(`users/${userId}`).get();
  if (!snap.exists) return null;
  return snap.data() as UserCredibilitySnapshot;
}

export async function recalculateThreadCredibility(threadId: string): Promise<void> {
  const threadRef = db().doc(`threads/${threadId}`);
  const threadSnap = await threadRef.get();
  if (!threadSnap.exists) return;

  const threadData = threadSnap.data() as Record<string, unknown>;
  const authorId = threadData.authorId as string | undefined;
  if (!authorId) return;

  const author = await loadAuthorSnapshot(authorId);
  if (!author) return;

  const threadInput = {
    author,
    thread: {
      score: threadData.score as number | undefined,
      moderationStatus: threadData.moderationStatus as string | undefined,
      toxicityScore: threadData.toxicityScore as number | undefined,
      spamScore: threadData.spamScore as number | undefined,
      createdAt: threadData.createdAt,
      communityId: threadData.communityId as string | undefined,
    },
  };

  const result = computeThreadCredibility(threadInput);
  const credibilityInputs = serializeThreadCredibilityInput(authorId, threadId, threadInput);

  await threadRef.set(
    {
      credibilityScore: result.score,
      credibilityModelVersion: CREDIBILITY_MODEL_VERSION,
      credibilityScoreUpdatedAt: FieldValue.serverTimestamp(),
      credibilityBreakdown: result.breakdown,
      credibilityInputs,
    },
    { merge: true }
  );
}

export async function recalculateCommentCredibility(
  threadId: string,
  postId: string
): Promise<void> {
  const threadRef = db().doc(`threads/${threadId}`);
  const postRef = db().doc(`threads/${threadId}/posts/${postId}`);

  const [threadSnap, postSnap] = await Promise.all([threadRef.get(), postRef.get()]);
  if (!threadSnap.exists || !postSnap.exists) return;

  const threadData = threadSnap.data() as Record<string, unknown>;
  const postData = postSnap.data() as Record<string, unknown>;
  const authorId = postData.authorId as string | undefined;
  if (!authorId) return;

  const author = await loadAuthorSnapshot(authorId);
  if (!author) return;

  const commentInput = {
    author,
    threadContext: {
      communityId: threadData.communityId as string | undefined,
    },
    comment: {
      score: postData.score as number | undefined,
      moderationStatus: postData.moderationStatus as string | undefined,
      toxicityScore: postData.toxicityScore as number | undefined,
      spamScore: postData.spamScore as number | undefined,
      createdAt: postData.createdAt,
      ancestorIds: postData.ancestorIds as string[] | undefined,
    },
  };

  const result = computeCommentCredibility(commentInput);
  const credibilityInputs = serializeCommentCredibilityInput(
    authorId,
    threadId,
    postId,
    commentInput
  );

  await postRef.set(
    {
      credibilityScore: result.score,
      credibilityModelVersion: CREDIBILITY_MODEL_VERSION,
      credibilityScoreUpdatedAt: FieldValue.serverTimestamp(),
      credibilityBreakdown: result.breakdown,
      credibilityInputs,
    },
    { merge: true }
  );
}
