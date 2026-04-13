import { countPosts, type Thread } from "./firestore";
import { formatFirestoreDay } from "./firestoreFormat";
import type { PostCardPost } from "../types/postCard";

export function threadToPostCardPost(
  t: Thread,
  postCount: number,
  communitySource: "feed" | "default"
): PostCardPost {
  const communityId =
    communitySource === "feed"
      ? (t.communityId ?? t.university ?? "")
      : (t.communityId ?? "");
  return {
    id: t.id,
    title: t.title,
    body: t.body ?? "",
    communityId,
    tags: Array.isArray(t.tags) ? t.tags : [],
    authorId: t.authorId,
    authorProfileKey: t.authorPublicHandle || t.authorId,
    author: t.authorName || "anon",
    createdAt: formatFirestoreDay(t.createdAt),
    score: t.score ?? 0,
    postCount,
    isFlash: !!t.flashExpiresAt,
    isAnonymous: t.isAnonymous === true,
    credibilityScore: t.credibilityScore,
    credibilityModelVersion: t.credibilityModelVersion,
  };
}

export async function threadsToPostCardPosts(
  threads: Thread[],
  communitySource: "feed" | "default"
): Promise<PostCardPost[]> {
  const counts = await Promise.all(threads.map((t) => countPosts(t.id)));
  return threads.map((t, i) => threadToPostCardPost(t, counts[i], communitySource));
}
